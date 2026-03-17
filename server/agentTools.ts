/**
 * Agent Tool-Use System
 * Defines tools the AI agent can invoke autonomously during conversations.
 * Uses OpenAI-compatible function calling format.
 */

import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import type { Tool, ToolCall } from "./_core/llm";
import dns from "dns/promises";
import https from "https";
import http from "http";
import { URL } from "url";

// ─── Tool Definitions (sent to LLM) ───

export const AGENT_TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "generate_image",
      description:
        "Gera uma imagem usando IA a partir de um prompt descritivo. Use para criar diagramas de rede, fluxogramas de segurança, ilustrações técnicas, logos, ou qualquer imagem solicitada pelo usuário.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description:
              "Descrição detalhada da imagem a ser gerada em inglês. Seja específico sobre estilo, cores, elementos e composição.",
          },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_code",
      description:
        "Executa código Python de forma segura em uma sandbox isolada. Use para cálculos, análise de dados, processamento de texto, scripts de automação, validação de configurações, ou qualquer tarefa que precise de execução de código.",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Código Python a ser executado. Pode usar bibliotecas padrão.",
          },
          language: {
            type: "string",
            enum: ["python", "bash"],
            description: "Linguagem do código. Default: python.",
          },
        },
        required: ["code"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dns_lookup",
      description:
        "Realiza consulta DNS para um domínio. Retorna registros A, AAAA, MX, TXT, NS, CNAME e SOA. Use para diagnóstico de DNS, verificação de configuração de domínio e troubleshooting de rede.",
      parameters: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "Nome de domínio para consulta (ex: example.com)",
          },
          recordType: {
            type: "string",
            enum: ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "ALL"],
            description: "Tipo de registro DNS. Use ALL para consultar todos os tipos.",
          },
        },
        required: ["domain"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ssl_check",
      description:
        "Verifica o certificado SSL/TLS de um domínio. Retorna informações sobre validade, emissor, algoritmo, SANs e dias até expiração. Use para auditoria de segurança e verificação de certificados.",
      parameters: {
        type: "object",
        properties: {
          hostname: {
            type: "string",
            description: "Hostname para verificar o certificado SSL (ex: example.com)",
          },
          port: {
            type: "number",
            description: "Porta para conexão TLS. Default: 443.",
          },
        },
        required: ["hostname"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "http_check",
      description:
        "Verifica o status HTTP de uma URL. Retorna código de status, headers de segurança, tempo de resposta e informações do servidor. Use para diagnóstico de websites, verificação de uptime e auditoria de headers de segurança.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL completa para verificar (ex: https://example.com)",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "whois_lookup",
      description:
        "Consulta informações WHOIS de um domínio. Retorna dados de registro, proprietário, datas de criação/expiração e nameservers. Use para investigação de domínios e verificação de propriedade.",
      parameters: {
        type: "object",
        properties: {
          domain: {
            type: "string",
            description: "Domínio para consulta WHOIS (ex: example.com)",
          },
        },
        required: ["domain"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Tool Execution Functions ───

async function executeGenerateImage(args: { prompt: string }): Promise<{
  type: "image";
  url: string;
  prompt: string;
}> {
  const result = await generateImage({ prompt: args.prompt });
  if (!result.url) throw new Error("Falha ao gerar imagem");
  return { type: "image", url: result.url, prompt: args.prompt };
}

async function executeCode(args: {
  code: string;
  language?: string;
}): Promise<{ type: "code"; output: string; language: string; code: string; exitCode: number }> {
  const lang = args.language || "python";
  const { spawn } = await import("child_process");

  return new Promise((resolve) => {
    const timeout = 30000; // 30s max
    let output = "";
    let errorOutput = "";

    const cmd = lang === "bash" ? "bash" : "python3";
    const proc = spawn(cmd, ["-c", args.code], {
      timeout,
      env: {
        ...process.env,
        PATH: process.env.PATH,
        HOME: "/tmp",
        PYTHONDONTWRITEBYTECODE: "1",
      },
      cwd: "/tmp",
    });

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
      if (output.length > 50000) {
        proc.kill();
        output = output.slice(0, 50000) + "\n... [output truncado]";
      }
    });

    proc.stderr.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      const fullOutput = output + (errorOutput ? `\n[stderr]\n${errorOutput}` : "");
      resolve({
        type: "code",
        output: fullOutput || "(sem output)",
        language: lang,
        code: args.code,
        exitCode: code ?? 1,
      });
    });

    proc.on("error", (err) => {
      resolve({
        type: "code",
        output: `Erro ao executar: ${err.message}`,
        language: lang,
        code: args.code,
        exitCode: 1,
      });
    });
  });
}

async function executeDnsLookup(args: {
  domain: string;
  recordType?: string;
}): Promise<{ type: "dns"; domain: string; records: Record<string, any> }> {
  const domain = args.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const recordType = args.recordType || "ALL";
  const records: Record<string, any> = {};

  const queries: Array<{ type: string; fn: () => Promise<any> }> = [
    { type: "A", fn: () => dns.resolve4(domain) },
    { type: "AAAA", fn: () => dns.resolve6(domain) },
    { type: "MX", fn: () => dns.resolveMx(domain) },
    { type: "TXT", fn: () => dns.resolveTxt(domain) },
    { type: "NS", fn: () => dns.resolveNs(domain) },
    { type: "CNAME", fn: () => dns.resolveCname(domain) },
    { type: "SOA", fn: () => dns.resolveSoa(domain) },
  ];

  const toRun =
    recordType === "ALL"
      ? queries
      : queries.filter((q) => q.type === recordType);

  for (const q of toRun) {
    try {
      records[q.type] = await q.fn();
    } catch (e: any) {
      records[q.type] = e.code === "ENODATA" || e.code === "ENOTFOUND" ? "Não encontrado" : `Erro: ${e.code}`;
    }
  }

  return { type: "dns", domain, records };
}

async function executeSslCheck(args: {
  hostname: string;
  port?: number;
}): Promise<{ type: "ssl"; hostname: string; certificate: Record<string, any> }> {
  const hostname = args.hostname.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const port = args.port || 443;

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname,
        port,
        method: "HEAD",
        rejectUnauthorized: false,
        timeout: 10000,
      },
      (res) => {
        const socket = res.socket as any;
        const cert = socket.getPeerCertificate?.();

        if (!cert || !cert.subject) {
          resolve({
            type: "ssl",
            hostname,
            certificate: { error: "Não foi possível obter o certificado" },
          });
          return;
        }

        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.floor(
          (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        resolve({
          type: "ssl",
          hostname,
          certificate: {
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: validFrom.toISOString(),
            validTo: validTo.toISOString(),
            daysUntilExpiry,
            isExpired: daysUntilExpiry < 0,
            serialNumber: cert.serialNumber,
            fingerprint256: cert.fingerprint256,
            subjectAltNames: cert.subjectaltname,
            protocol: socket.getProtocol?.() || "unknown",
          },
        });
      }
    );

    req.on("error", (err) => {
      resolve({
        type: "ssl",
        hostname,
        certificate: { error: `Falha na conexão: ${err.message}` },
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        type: "ssl",
        hostname,
        certificate: { error: "Timeout na conexão" },
      });
    });

    req.end();
  });
}

async function executeHttpCheck(args: {
  url: string;
}): Promise<{ type: "http"; url: string; result: Record<string, any> }> {
  const startTime = Date.now();
  const urlObj = new URL(args.url);
  const client = urlObj.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const req = client.request(
      args.url,
      {
        method: "HEAD",
        timeout: 15000,
        rejectUnauthorized: false,
      },
      (res) => {
        const elapsed = Date.now() - startTime;
        const headers = res.headers;

        // Check security headers
        const securityHeaders: Record<string, string | boolean> = {
          "Strict-Transport-Security": headers["strict-transport-security"] ? "Presente" : "Ausente",
          "Content-Security-Policy": headers["content-security-policy"] ? "Presente" : "Ausente",
          "X-Content-Type-Options": (headers["x-content-type-options"] as string) || "Ausente",
          "X-Frame-Options": (headers["x-frame-options"] as string) || "Ausente",
          "X-XSS-Protection": (headers["x-xss-protection"] as string) || "Ausente",
          "Referrer-Policy": (headers["referrer-policy"] as string) || "Ausente",
          "Permissions-Policy": headers["permissions-policy"] ? "Presente" : "Ausente",
        };

        resolve({
          type: "http",
          url: args.url,
          result: {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            responseTimeMs: elapsed,
            server: headers["server"] || "Não informado",
            poweredBy: headers["x-powered-by"] || "Não informado",
            contentType: headers["content-type"] || "Não informado",
            securityHeaders,
          },
        });
      }
    );

    req.on("error", (err) => {
      resolve({
        type: "http",
        url: args.url,
        result: { error: `Falha na conexão: ${err.message}` },
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        type: "http",
        url: args.url,
        result: { error: "Timeout na conexão (15s)" },
      });
    });

    req.end();
  });
}

async function executeWhoisLookup(args: {
  domain: string;
}): Promise<{ type: "whois"; domain: string; data: string }> {
  const domain = args.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const net = await import("net");

  return new Promise((resolve) => {
    let data = "";
    const tld = domain.split(".").pop()?.toLowerCase();
    const whoisServer =
      tld === "br" ? "whois.registro.br" :
      tld === "com" ? "whois.verisign-grs.com" :
      tld === "net" ? "whois.verisign-grs.com" :
      tld === "org" ? "whois.pir.org" :
      tld === "io" ? "whois.nic.io" :
      "whois.iana.org";

    const socket = net.createConnection(43, whoisServer, () => {
      socket.write(domain + "\r\n");
    });

    socket.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });

    socket.on("end", () => {
      resolve({ type: "whois", domain, data: data.slice(0, 5000) });
    });

    socket.on("error", (err: Error) => {
      resolve({ type: "whois", domain, data: `Erro: ${err.message}` });
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve({ type: "whois", domain, data: "Timeout na consulta WHOIS" });
    });
  });
}

// ─── Tool Dispatcher ───

export type ToolResult = {
  toolCallId: string;
  name: string;
  result: any;
};

export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: any;

  try {
    args = JSON.parse(argsStr);
  } catch {
    return {
      toolCallId: toolCall.id,
      name,
      result: { error: "Argumentos inválidos" },
    };
  }

  try {
    let result: any;

    switch (name) {
      case "generate_image":
        result = await executeGenerateImage(args);
        break;
      case "execute_code":
        result = await executeCode(args);
        break;
      case "dns_lookup":
        result = await executeDnsLookup(args);
        break;
      case "ssl_check":
        result = await executeSslCheck(args);
        break;
      case "http_check":
        result = await executeHttpCheck(args);
        break;
      case "whois_lookup":
        result = await executeWhoisLookup(args);
        break;
      default:
        result = { error: `Ferramenta desconhecida: ${name}` };
    }

    return { toolCallId: toolCall.id, name, result };
  } catch (error: any) {
    return {
      toolCallId: toolCall.id,
      name,
      result: { error: `Erro ao executar ${name}: ${error.message}` },
    };
  }
}
