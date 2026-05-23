import type { Express, Request, Response } from "express";
import { ENV, resolveLLMProvider, resolveFallbackProvider, logLLMConfig, type LLMProviderConfig } from "./_core/env";
import { sdk } from "./_core/sdk";
import {
  getConversation,
  getMessages,
  addMessage,
  updateConversationTitle,
  getOrCreateCredits,
  updateCreditsUsage,
  addUsageLog,
  getActiveSubscription,
  getTodayMessageCount,
  getMonthConversationCount,
  resetCreditsIfNeeded,
  recordMessageSent,
  recordConversationStarted,
  listInstructions,
  listKnowledge,
  createProviderLog,
} from "./db";
import { AGENT_TOOLS, executeToolCall, type ToolContext } from "./agentTools";
import { buildSystemPrompt } from "./agentIdentity";
import { PLANS, type Plan } from "./products";
import type { Tool, ToolCall } from "./_core/llm";
import { resolveChatCompletionsUrl } from "./_core/llmUrl";

// ── Capability Routing Modules ──
import { classifyIntent, getTaskTypePromptEnhancement, type TaskType, type IntentResult } from "./intentClassifier";
import { routeToProvider, type RoutingDecision } from "./capabilityRouter";
import { generateImage, isImageGenerationAvailable, parseImageRequest, type ImageGenerationResult } from "./imageProvider";
import { saveInteraction } from "./learningMemory";
import { searchKnowledge, buildAugmentedPrompt, type KnowledgeContext } from "./knowledgeReuse";
import { checkCapabilityAccess, recordUsage, checkCostSafety, type UsageCheckResult } from "./capabilityLimits";
import { submitVideoGeneration, isVideoGenerationAvailable, type VideoJobResult } from "./videoProvider";
import { getInternalUrl, storageGetBuffer } from "./storage";
import { getDiagramSystemPrompt, processDiagramResponse, isDiagramGenerationAvailable, type DiagramType } from "./diagramProvider";
import { transcribeAudio } from "./_core/voiceTranscription";
import { buildAccountContext, formatAccountContextBlock } from "./accountContext";
import { getDb } from "./db";
import { generatedAssets } from "../drizzle/schema";

// ── Feature-gating: tools available per plan tier ──
// Tools available to all plans (read-only, account info)
const UNIVERSAL_TOOLS = ["get_account_usage"];
const BASIC_TOOLS = ["dns_lookup", "ssl_check", "http_check", "whois_lookup", "web_fetch"];
const PRO_TOOLS = [...BASIC_TOOLS, "port_scan", "generate_image", "execute_code"];

function getToolsForPlan(plan: Plan): Tool[] | null {
  if (plan.id === "free") {
    // Free: only universal tools (account usage)
    return AGENT_TOOLS.filter(t => UNIVERSAL_TOOLS.includes(t.function.name));
  }
  if (plan.id === "starter") {
    // Starter: basic network tools + universal
    return AGENT_TOOLS.filter(t => [...BASIC_TOOLS, ...UNIVERSAL_TOOLS].includes(t.function.name));
  }
  // Pro & Enterprise: all tools
  return AGENT_TOOLS;
}

// ── Technical capabilities block (kept separate from identity for modularity) ──
const TECHNICAL_CAPABILITIES = `## Capacidades Técnicas:
- Análise e diagnóstico de infraestrutura de TI (servidores, redes, storage)
- Segurança da informação: análise de vulnerabilidades, hardening, resposta a incidentes
- Monitoramento: interpretação de métricas do Zabbix, Prometheus, Grafana
- SIEM e detecção de ameaças: análise de alertas do Wazuh, Elastic Security
- Redes e Telecom: configuração, troubleshooting, análise de tráfego
- DevOps: CI/CD, containers, Kubernetes, automação com Ansible/Terraform
- Geração de imagens: diagramas de rede, fluxogramas, ilustrações técnicas
- Execução de código: scripts Python e Bash para automação e análise
- Verificação de segurança: DNS, SSL/TLS, HTTP headers, WHOIS
- Documentação técnica e relatórios de segurança
- **Análise visual de prints/screenshots**: interpreta capturas de tela de erros, dashboards, configurações, logs visuais
- **Análise de documentos**: lê e analisa PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML, XML, SQL anexados pelo usuário

## Análise de Imagens/Prints:
Quando o usuário enviar uma imagem ou print, analise o conteúdo visual com profundidade técnica:
1. **Identifique** o que aparece na imagem (software, tela, erro, dashboard, configuração)
2. **Diagnostique** a provável causa do problema ou situação mostrada
3. **Avalie riscos** de segurança, performance ou disponibilidade visíveis
4. **Recomende** próximos passos concretos com comandos ou verificações quando aplicável
5. **Contextualize** para o ambiente (Windows, Linux, Docker, cloud, firewall, Zabbix, Grafana, Cloudflare, Stripe, banco de dados, rede)
6. Use linguagem clara e técnica. Não repita o óbvio — vá direto ao diagnóstico e solução.
7. Se a imagem mostrar dados sensíveis (senhas, tokens, IPs internos), alerte o usuário sobre o risco de exposição.

## Análise de Documentos Anexados:
Quando o usuário enviar um documento (PDF, DOCX, TXT, LOG, CONF, JSON, CSV, YAML, XML, SQL), o conteúdo extraído será incluído na mensagem. Analise com profundidade técnica:
1. **Identifique** o tipo de documento (log de sistema, configuração, relatório, export, script, dados)
2. **Analise** o conteúdo: erros, padrões, configurações incorretas, riscos de segurança
3. **Resuma** os pontos principais de forma clara e estruturada
4. **Recomende** ações concretas: correções, melhorias, investigações adicionais
5. **Alerte** sobre dados sensíveis expostos (senhas, tokens, IPs internos, chaves privadas)
6. Se o documento estiver truncado, informe que analisou a parte disponível e sugira enviar partes específicas se necessário
7. NUNCA diga "não consigo acessar arquivos anexados" — se o conteúdo do documento está na mensagem, analise-o normalmente

## Ferramentas Disponíveis:
Você tem acesso a ferramentas que pode usar automaticamente. Quando o usuário pedir algo que requer uma ferramenta, USE-A sem pedir permissão:
- **generate_image**: Para criar imagens, diagramas, fluxogramas
- **execute_code**: Para rodar scripts Python ou Bash (ambiente isolado)
- **dns_lookup**: Para consultas DNS
- **ssl_check**: Para verificar certificados SSL/TLS
- **http_check**: Para verificar status e segurança de websites
- **whois_lookup**: Para consultar informações de domínio
- **web_fetch**: Para acessar e ler conteúdo de páginas web (navegação autônoma)
- **port_scan**: Para escanear portas abertas em hosts (auditoria de segurança)
- **get_account_usage**: Para consultar plano, uso, limites e informações da conta do usuário

## Consultas sobre Conta/Plano/Uso:
Você recebe um bloco [ACCOUNT_CONTEXT] no prompt com dados atualizados do plano e uso do usuário. USE esses dados para responder perguntas sobre conta, plano, uso, limites, renovação, upgrade e suporte.
- Quando o usuário perguntar sobre créditos, plano, uso, limites, renovação, upgrade ou suporte humano, RESPONDA usando os dados do [ACCOUNT_CONTEXT] diretamente.
- Se precisar de dados mais detalhados (histórico, assinatura completa), USE a ferramenta get_account_usage como complemento.
- NÃO responda genericamente que "não tem acesso" aos dados da conta — você TEM os dados no contexto.
- NÃO invente números de uso ou limites. Use APENAS os dados do [ACCOUNT_CONTEXT] ou da ferramenta.
- Responda de forma natural e amigável, por exemplo:
  "Você está no plano X. Tem acesso a todas as ferramentas de diagnóstico, geração e análise."
- Sempre oriente sobre onde encontrar mais detalhes: "Menu lateral → Minha Conta".
- Para perguntas sobre planos: "Você pode explorar os planos disponíveis pelo menu lateral ou na página de planos."
- NUNCA mencione limites numéricos explícitos (ex: "5 mensagens", "3 conversas") ao usuário. Se atingir limite, diga apenas "Limite temporário atingido" ou "Disponível em breve".
- NUNCA exponha: IDs internos, stripeCustomerId, subscriptionId, userId, custos em USD, tokens, nomes de providers, nomes de modelos de IA, ou detalhes de infraestrutura.
- Se o [ACCOUNT_CONTEXT] mostrar planId="unknown", oriente: "Você pode acessar Plano e Uso no menu lateral."

## Diretrizes Operacionais:
1. Sempre responda em português brasileiro
2. Seja técnico e preciso, mas acessível
3. USE as ferramentas proativamente quando relevante
4. Use formatação Markdown com syntax highlighting para código
5. Indique riscos e boas práticas de segurança
6. Quando não souber algo, seja honesto e sugira fontes confiáveis
7. Estruture respostas longas com títulos e seções claras
8. NUNCA mencione erros internos de ferramentas, nomes de funções internas (web_fetch, dns_lookup, etc.), falhas de schema, parâmetros inválidos ou detalhes técnicos de execução. Se uma ferramenta falhar, tente novamente silenciosamente ou informe de forma natural e amigável que não foi possível completar a verificação, sugerindo que o usuário tente novamente ou informe outro alvo.
9. Não narre o processo de retry ou correção de parâmetros. Apenas apresente o resultado final ao usuário.
10. REGRA CRÍTICA DE EVIDÊNCIA: NUNCA invente ou alucie portas abertas, serviços detectados, status de vulnerabilidade ou riscos de segurança. Só apresente dados que foram CONFIRMADOS por uma ferramenta real (port_scan, http_check, dns_lookup, ssl_check, whois_lookup). Se não verificou com ferramenta, diga explicitamente "não verificado" ou "não confirmado". Diferencie claramente: "serviço esperado" (informado pelo usuário, não confirmado) vs "porta verificada como aberta" (confirmada por ferramenta real) vs "não verificado" (sem dados). Nunca liste portas comuns como abertas por suposição. Se nenhuma ferramenta confirmou portas, diga "nenhuma porta aberta foi confirmada nesta verificação".
11. SEGURANÇA DEFENSIVA: Nunca sugira exploração, brute force, bypass, enumeração agressiva ou ataque. Apenas recomende defesa, hardening, monitoramento e boas práticas.

## Formato de Resposta:
- Use \`\`\`linguagem para blocos de código
- Use **negrito** para termos importantes
- Use tabelas quando comparar opções
- Inclua avisos de segurança quando relevante com ⚠️`;

// Build the full system prompt from centralized identity + technical capabilities
const BASE_SYSTEM_PROMPT = buildSystemPrompt(TECHNICAL_CAPABILITIES);

// Dynamically build system prompt with admin-configured instructions and knowledge base
// (Legacy path — used when capability routing is DISABLED)
async function buildDynamicSystemPrompt(): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT;

  // Inject current date/time (NEVER use placeholders like strftime or {{ }})
  prompt += `\n\n## Informações Temporais:\n${getCurrentDateForPrompt()}\nSempre use esta data/hora real ao responder perguntas sobre data, hora ou dia da semana. NUNCA use placeholders, variáveis de template ou código como strftime.\n`;

  try {
    // Load active instructions from database
    const instructions = await listInstructions("default", true);
    if (instructions.length > 0) {
      prompt += "\n\n## Instruções Administrativas:\n";
      for (const instr of instructions) {
        prompt += `\n### ${instr.title} [${instr.category}]\n${instr.content}\n`;
      }
    }

    // Load active knowledge base items (with limits matching capability routing path)
    // Limits: max 5 items, max ~2000 tokens (≈8000 chars) to prevent excessive context consumption
    const LEGACY_KB_MAX_ITEMS = 5;
    const LEGACY_KB_MAX_CHARS = 8000; // ~2000 tokens at 4 chars/token
    const knowledge = await listKnowledge("default", { onlyActive: true });
    if (knowledge.length > 0) {
      prompt += "\n\n## Base de Conhecimento:\n";
      prompt += "Use as informações abaixo como referência para responder perguntas dos usuários:\n";
      let injectedCount = 0;
      let injectedChars = 0;
      for (const item of knowledge) {
        if (injectedCount >= LEGACY_KB_MAX_ITEMS) break;
        const itemText = `\n### ${item.title}${item.category ? ` [${item.category}]` : ""}\n${item.content}\n`;
        if (injectedChars + itemText.length > LEGACY_KB_MAX_CHARS && injectedCount > 0) break;
        prompt += itemText;
        injectedCount++;
        injectedChars += itemText.length;
      }
      console.log(`[Stream] Legacy KB: injected ${injectedCount}/${knowledge.length} items (${injectedChars} chars)`);
    }
  } catch (err) {
    console.warn("[Stream] Failed to load dynamic instructions/knowledge:", err);
    // Non-blocking: continue with base prompt
  }

  return prompt;
}

// ══════════════════════════════════════════════════════════════
// Provider Resolution with GPU-first + Fallback
// ══════════════════════════════════════════════════════════════

type ProviderResult = {
  provider: LLMProviderConfig;
  fallbackUsed: boolean;
  fallbackReason?: string;
  originalProvider?: string;
};

/**
 * Resolve the active LLM provider config with priority logic.
 */
function getActiveProvider(): LLMProviderConfig {
  const provider = resolveLLMProvider();
  if (!provider) {
    throw new Error("[LLM] No LLM provider configured. Set LLM_CLOUD_API_URL+LLM_CLOUD_API_KEY or GEMINI_API_URL+GEMINI_API_KEY in .env");
  }
  return provider;
}

/**
 * Get the primary provider based on LOCAL_LLM_PRIORITY.
 */
function getPrimaryProvider(): LLMProviderConfig {
  if (ENV.localLlmEnabled && ENV.localLlmPriority === "first") {
    return {
      name: "local_gpu",
      apiUrl: ENV.localLlmBaseUrl,
      apiKey: "",
      model: ENV.localLlmModel,
    };
  }
  if (ENV.localLlmEnabled && ENV.localLlmPriority === "only") {
    return {
      name: "local_gpu",
      apiUrl: ENV.localLlmBaseUrl,
      apiKey: "",
      model: ENV.localLlmModel,
    };
  }
  return getActiveProvider();
}

/**
 * Get the fallback provider (opposite of primary).
 */
function getFallbackProvider(): LLMProviderConfig | null {
  if (!ENV.localLlmFallbackEnabled) return null;
  if (ENV.localLlmPriority === "only") return null;

  if (ENV.localLlmEnabled && ENV.localLlmPriority === "first") {
    const cloudProvider = resolveLLMProvider();
    if (cloudProvider && cloudProvider.name !== "local_gpu") return cloudProvider;
    return resolveFallbackProvider();
  }

  if (ENV.localLlmEnabled && ENV.localLlmPriority === "last") {
    return {
      name: "local_gpu",
      apiUrl: ENV.localLlmBaseUrl,
      apiKey: "",
      model: ENV.localLlmModel,
    };
  }

  return resolveFallbackProvider();
}

/** Resolve the LLM API endpoint URL for a provider */
function resolveApiUrl(provider?: LLMProviderConfig): string {
  const p = provider || getPrimaryProvider();
  return resolveChatCompletionsUrl(p.apiUrl);
}

/** Get the API key for a provider */
function getApiKey(provider?: LLMProviderConfig): string {
  return (provider || getPrimaryProvider()).apiKey;
}

/** Get the model for a provider */
function getModel(provider?: LLMProviderConfig): string {
  return (provider || getPrimaryProvider()).model;
}

/** Get the provider name for logging */
function getProviderName(provider?: LLMProviderConfig): string {
  return (provider || getPrimaryProvider()).name;
}

// Log the resolved LLM config at startup (safe — never exposes keys)
logLLMConfig();

// ── In-memory rate limiter ──
const rateLimitMap = new Map<number, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // max 20 messages per minute per user

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitMap.entries());
  for (const [userId, entry] of entries) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(userId);
    }
  }
}, 5 * 60_000);

// Helper: resolve user's plan from subscription
// Source of truth: credits.planId (updated by Stripe webhook on subscription change)
async function getUserPlan(userId: number) {
  // 1. Check credits table for the authoritative planId
  const creds = await getOrCreateCredits(userId, "free");
  if (creds && creds.planId !== "free") {
    const plan = PLANS.find((p) => p.id === creds.planId);
    if (plan) return plan;
  }

  // 2. Default: free plan (no active paid subscription)
  return PLANS.find((p) => p.id === "free")!;
}

// Helper: send SSE event
function sendSSE(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Helper: call LLM with streaming and collect full response
/**
 * Per-model max completion token limits.
 * These are hard limits from each provider's API documentation.
 */
const MODEL_MAX_COMPLETION_TOKENS: Record<string, number> = {
  // OpenAI models
  "gpt-4o-mini": 16384,
  "gpt-4o": 16384,
  "gpt-4-turbo": 4096,
  "gpt-4": 8192,
  "gpt-3.5-turbo": 4096,
  "o1-mini": 65536,
  "o1": 100000,
  "o3-mini": 100000,
  // Gemini models (generous limits)
  "gemini-2.5-flash": 65536,
  "gemini-2.5-pro": 65536,
  "gemini-2.0-flash": 65536,
  "gemini-1.5-flash": 65536,
  "gemini-1.5-pro": 65536,
};

/**
 * Clamp max_tokens to the model's supported maximum.
 * If model is unknown, defaults to 16384 (safe for most models).
 */
function clampMaxTokens(requestedTokens: number, model: string): number {
  // Find exact match first
  let modelLimit = MODEL_MAX_COMPLETION_TOKENS[model];
  
  // If no exact match, try prefix matching (e.g., "gpt-4o-mini-2024-07-18")
  if (!modelLimit) {
    for (const [key, limit] of Object.entries(MODEL_MAX_COMPLETION_TOKENS)) {
      if (model.startsWith(key)) {
        modelLimit = limit;
        break;
      }
    }
  }
  
  // Default safe limit for unknown models
  if (!modelLimit) {
    modelLimit = 16384;
  }
  
  const effectiveTokens = Math.min(requestedTokens, modelLimit);
  if (effectiveTokens !== requestedTokens) {
    console.log(`[Stream] max_tokens clamped: ${requestedTokens} → ${effectiveTokens} (model: ${model}, limit: ${modelLimit})`);
  }
  return effectiveTokens;
}

async function streamLLMResponse(
  messages: any[],
  res: Response,
  tools: Tool[] | null,
  maxTokens: number = 32768,
  providerOverride?: LLMProviderConfig
): Promise<{
  content: string;
  toolCalls: ToolCall[];
  finishReason: string;
}> {
  const activeProvider = providerOverride || getPrimaryProvider();
  const apiUrl = resolveApiUrl(activeProvider);
  const apiKey = getApiKey(activeProvider);
  const model = getModel(activeProvider);
  // Clamp max_tokens to model's supported maximum
  const effectiveMaxTokens = clampMaxTokens(maxTokens, model);
  const body: any = {
    model,
    messages,
    stream: true,
    max_tokens: effectiveMaxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  // Keep model loaded in VRAM for local GPU (prevents cold start on next request)
  if (activeProvider.name === "local_gpu") {
    body.keep_alive = "30m";
  }

  // Apply timeout for local GPU (longer inference time)
  const timeoutMs = activeProvider.name === "local_gpu"
    ? ENV.localLlmTimeoutSeconds * 1000
    : 120_000; // 2 min for cloud APIs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: globalThis.Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr.name === "AbortError") {
      throw new Error(`[LLM] ${activeProvider.name} timeout after ${timeoutMs / 1000}s`);
    }
    throw new Error(`[LLM] ${activeProvider.name} connection failed: ${fetchErr.message}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok || !response.body) {
    const errText = await response.text();
    console.error(`[LLM] API error: provider=${activeProvider.name} status=${response.status} url=${apiUrl} body=${errText.slice(0, 500)}`);
    throw new Error(`LLM API returned ${response.status}: ${errText.slice(0, 200)}`);
  }

  let fullContent = "";
  const toolCalls: ToolCall[] = [];
  let finishReason = "stop";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Chunk timeout: if no data arrives for 45s after stream opens, abort
  const CHUNK_TIMEOUT_MS = 45_000;
  let chunkTimer: ReturnType<typeof setTimeout> | null = null;
  const resetChunkTimer = () => {
    if (chunkTimer) clearTimeout(chunkTimer);
    chunkTimer = setTimeout(() => {
      console.error(`[Stream] Chunk timeout: no data for ${CHUNK_TIMEOUT_MS / 1000}s, aborting reader`);
      reader.cancel("chunk_timeout").catch(() => {});
    }, CHUNK_TIMEOUT_MS);
  };
  resetChunkTimer(); // Start timer when stream opens

  try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    resetChunkTimer(); // Reset on each chunk received

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (choice.finish_reason) {
          finishReason = choice.finish_reason;
        }

        // Handle text content
        if (delta?.content) {
          fullContent += delta.content;
          sendSSE(res, { type: "chunk", content: delta.content });
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id: tc.id || `call_${idx}`,
                type: "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tc.id) toolCalls[idx].id = tc.id;
            if (tc.function?.name) {
              if (toolCalls[idx].function.name === "") {
                toolCalls[idx].function.name = tc.function.name;
              }
            }
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }
  } finally {
    if (chunkTimer) clearTimeout(chunkTimer);
  }

  return { content: fullContent, toolCalls: toolCalls.filter(Boolean), finishReason };
}

// ══════════════════════════════════════════════════════════════
// Capability Routing Helpers
// ══════════════════════════════════════════════════════════════

/** Check if capability routing is enabled */
function isCapabilityRoutingEnabled(): boolean {
  return process.env.ENABLE_CAPABILITY_ROUTING === "true";
}

/** Check if learning/memory is enabled */
function isLearningEnabled(): boolean {
  return process.env.ENABLE_LEARNING === "true";
}

/** Check if knowledge reuse is enabled */
function isKnowledgeReuseEnabled(): boolean {
  return process.env.ENABLE_KNOWLEDGE_REUSE === "true";
}

/** Check if image generation is enabled */
function isImageGenEnabled(): boolean {
  // Accept both env var names for backwards compatibility
  const enabled = process.env.ENABLE_IMAGE_GENERATION === "true" || process.env.IMAGE_GENERATION_ENABLED === "true";
  return enabled && isImageGenerationAvailable();
}

/** Check if video generation is enabled */
function isVideoGenEnabled(): boolean {
  return process.env.ENABLE_VIDEO_GENERATION === "true" && isVideoGenerationAvailable();
}

/** Check if diagram generation is enabled */
function isDiagramGenEnabled(): boolean {
  return process.env.ENABLE_DIAGRAM_GENERATION !== "false" && isDiagramGenerationAvailable();
}

/** Get current date/time string for system prompt injection */
function getCurrentDateTimeString(): string {
  const tz = process.env.APP_TIMEZONE || "America/Sao_Paulo";
  const locale = process.env.APP_LOCALE || "pt-BR";
  const now = new Date();
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(now);
}

/** Get current date formatted for injection */
function getCurrentDateForPrompt(): string {
  const tz = process.env.APP_TIMEZONE || "America/Sao_Paulo";
  const locale = process.env.APP_LOCALE || "pt-BR";
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `Data atual: ${dateFormatter.format(now)}. Hora atual: ${timeFormatter.format(now)} (fuso: ${tz}). ${new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long" }).format(now)}.`;
}

export function registerStreamRoute(app: Express) {
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const hasCookie = !!req.headers.cookie?.includes("app_session_id");
      console.log(`[Stream] POST /api/chat/stream — cookie_present=${hasCookie}, origin=${req.headers.origin || "same-origin"}, ip=${req.ip}`);
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        console.warn(`[Stream] Auth failed: no valid session. cookie_header=${req.headers.cookie ? "present" : "missing"}`);
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      console.log(`[Stream] Auth OK: user=${user.id} (${user.email}), role=${user.role}, provider=${user.authProvider}`);

      const { conversationId } = req.body;
      let content: string = req.body.content;
      if (!conversationId || !content) {
        res.status(400).json({ error: "Missing conversationId or content" });
        return;
      }

      // ── Rate limiting (admin bypass) ──
      if (user.role !== "admin" && !checkRateLimit(user.id)) {
        res.status(429).json({
          error: "Alta demanda no momento. Aguarde um instante antes de enviar outra mensagem.",
          code: "RATE_LIMITED",
        });
        return;
      }

      // ── Plan limits enforcement ──
      const plan = await getUserPlan(user.id);
      const isAdmin = user.role === "admin";

      // Reset credits if monthly cycle has passed
      if (!isAdmin) {
        await resetCreditsIfNeeded(user.id);
      }

      if (!isAdmin) {
        // Check daily message limit
        const todayMessages = await getTodayMessageCount(user.id);
        if (todayMessages >= plan.limits.messagesPerDay) {
          res.status(402).json({
            error: "Alta demanda no momento. Novas mensagens estarão disponíveis em breve.",
            code: "DAILY_LIMIT_REACHED",
            limit: plan.limits.messagesPerDay,
            used: todayMessages,
            planId: plan.id,
          });
          return;
        }

        // Check monthly conversation limit (only if this is the first message in conversation)
        const existingMsgs = await getMessages(conversationId);
        const isFirstUserMsg = existingMsgs.filter(m => m.role === "user").length === 0;
        if (isFirstUserMsg) {
          const monthConversations = await getMonthConversationCount(user.id);
          if (monthConversations >= plan.limits.conversationsPerMonth) {
            res.status(402).json({
              error: "Limite temporário atingido. Novas conversas estarão disponíveis em breve.",
              code: "MONTHLY_CONV_LIMIT_REACHED",
              limit: plan.limits.conversationsPerMonth,
              used: monthConversations,
              planId: plan.id,
            });
            return;
          }
        }

        // Note: Credits system removed from gating — daily message limit (messagesPerDay)
        // and monthly conversation limit (conversationsPerMonth) are the real gates.
        // The credits table is kept for analytics/tracking only.
        // Token usage is still recorded via updateCreditsUsage() after response.
      }

      // Verify conversation ownership
      const conv = await getConversation(conversationId, user.id);
      if (!conv) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Record usage events (independent counters - cannot be bypassed by deleting chats)
      await recordMessageSent(user.id, conversationId);
      await recordConversationStarted(user.id, conversationId);

      // Save user message
      await addMessage({ conversationId, role: "user", content });

      // Get history
      const history = await getMessages(conversationId);

      // ══════════════════════════════════════════════════════════════
      // CAPABILITY ROUTING PIPELINE
      // ══════════════════════════════════════════════════════════════

      let intentResult: IntentResult | null = null;
      let routingDecision: RoutingDecision | null = null;
      let knowledgeContext: KnowledgeContext | null = null;
      let taskTypeEnhancement = "";

      if (isCapabilityRoutingEnabled()) {
        // Step 1: Classify user intent
        const historyForClassifier = history.map(m => ({ role: m.role, content: m.content }));
        intentResult = classifyIntent(content, historyForClassifier);
        console.log(`[Stream] Intent: ${intentResult.taskType} (confidence: ${(intentResult.confidence * 100).toFixed(0)}%, complexity: ${intentResult.estimatedComplexity})`);

        // Step 2: Route to optimal provider
        routingDecision = routeToProvider(intentResult.taskType, intentResult.suggestedMaxTokens);
        if (routingDecision) {
          console.log(`[Stream] Routing: ${routingDecision.provider.name} — ${routingDecision.reason}`);
        }

        // Step 3: Get task-type-specific prompt enhancement
        taskTypeEnhancement = getTaskTypePromptEnhancement(intentResult.taskType);
      }

      // Step 4: Knowledge reuse (RAG-style retrieval)
      if (isKnowledgeReuseEnabled()) {
        knowledgeContext = await searchKnowledge(content);
        if (knowledgeContext.items.length > 0) {
          console.log(`[RAG] user=${user.id} query="${content.substring(0, 80)}" matched=${knowledgeContext.items.length} tokens=${knowledgeContext.injectedTokenEstimate}`);
          console.log(`[RAG] items: ${knowledgeContext.items.map((i: any) => `[${i.id}] ${(i.title || '').substring(0, 40)}`).join(', ')}`);
        } else {
          console.log(`[RAG] user=${user.id} query="${content.substring(0, 80)}" matched=0`);
        }
      } else {
        console.log(`[RAG] disabled (ENABLE_KNOWLEDGE_REUSE != true)`);
      }

      // ══════════════════════════════════════════════════════════════
      // CAPABILITY LIMITS CHECK
      // ══════════════════════════════════════════════════════════════

      if (isCapabilityRoutingEnabled() && intentResult && !isAdmin) {
        const capCheck = checkCapabilityAccess(user.id, plan.id, intentResult.taskType);
        if (!capCheck.allowed) {
          console.log(`[Stream] Capability blocked: user=${user.id} plan=${plan.id} task=${intentResult.taskType} reason=${capCheck.reason}`);

          // Log the blocked attempt
          try {
            await createProviderLog({
              userId: user.id,
              conversationId,
              provider: "blocked",
              model: "none",
              endpoint: "capability_check",
              tokenCount: 0,
              responseTimeMs: 0,
              success: false,
              errorMessage: capCheck.reason || "Capability not allowed for plan",
              fallbackUsed: false,
              fallbackProvider: null,
              taskType: intentResult.taskType,
              capabilityScore: 0,
              routingReason: `Blocked: ${capCheck.reason}`,
              estimatedCostUsd: null,
              knowledgeSource: null,
              knowledgeItemsUsed: 0,
            });
          } catch (_) {}

          res.status(403).json({
            error: capCheck.reason,
            code: "CAPABILITY_BLOCKED",
            taskType: intentResult.taskType,
            suggestedUpgrade: capCheck.suggestedUpgrade,
            remaining: capCheck.remaining,
            limit: capCheck.limit,
            used: capCheck.used,
          });
          return;
        }

        // Check cost safety for expensive operations
        if (["image_generation", "image_editing", "video_generation"].includes(intentResult.taskType)) {
          const estimatedCost = intentResult.taskType === "video_generation" ? 0.50 : 0.04;
          const costCheck = checkCostSafety(user.id, plan.id, estimatedCost);
          if (!costCheck.allowed) {
            console.log(`[Stream] Cost safety triggered: user=${user.id} reason=${costCheck.reason}`);
            res.status(402).json({
              error: costCheck.reason,
              code: "COST_LIMIT_REACHED",
              taskType: intentResult.taskType,
            });
            return;
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // IMAGE GENERATION INTERCEPT
      // ══════════════════════════════════════════════════════════════

      let imageGenFailed = false;
      let imageGenFailReason = "";

      if (
        isImageGenEnabled() &&
        intentResult?.taskType === "image_generation" &&
        intentResult.confidence > 0.6
      ) {
        // Set SSE headers
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });

        const streamStartTime = Date.now();
        sendSSE(res, { type: "step", step: "image_gen", content: "Gerando imagem..." });

        try {
          // Silent retry: attempt once, if retryable error wait 2s and try again
          let imageResult: ImageGenerationResult;
          try {
            imageResult = await generateImage({ prompt: content, userId: user.id });
          } catch (firstAttemptErr: any) {
            if (firstAttemptErr?.retryable) {
              console.log(`[Stream] Image gen first attempt failed (${firstAttemptErr.code}), retrying in 2s...`);
              await new Promise(r => setTimeout(r, 2000));
              imageResult = await generateImage({ prompt: content, userId: user.id });
            } else {
              throw firstAttemptErr;
            }
          }

          // Send image result as a special message
          // Log technical details server-side only (never expose to user)
          console.log(`[Image] Generated: model=${imageResult.model} size=${imageResult.size} cost=$${imageResult.cost.toFixed(4)}`);
          const imageMarkdown = `![Imagem gerada](${imageResult.url})`;
          sendSSE(res, { type: "step", step: "image_gen_done", content: "Imagem gerada com sucesso!" });
          sendSSE(res, { type: "chunk", content: imageMarkdown });

          // Save assistant message
          await addMessage({ conversationId, role: "assistant", content: imageMarkdown, tokenCount: 50 });

          // Log provider usage
          await createProviderLog({
            userId: user.id,
            conversationId,
            provider: imageResult.provider,
            model: imageResult.model,
            endpoint: "images/generations",
            tokenCount: 50,
            responseTimeMs: imageResult.generationTimeMs,
            success: true,
            errorMessage: null,
            fallbackUsed: false,
            fallbackProvider: null,
            taskType: "image_generation",
            capabilityScore: 5,
            routingReason: "Image generation via DALL-E",
            estimatedCostUsd: imageResult.cost.toFixed(6),
            knowledgeSource: null,
            knowledgeItemsUsed: 0,
          });

          // Record usage for capability limits
          recordUsage(user.id, "image_generation", imageResult.cost);

          // Save to generated_assets table
          try {
            const dbConn = await getDb();
            if (dbConn) {
              await dbConn.insert(generatedAssets).values({
                userId: user.id,
                conversationId,
                assetType: "image",
                prompt: content,
                revisedPrompt: imageResult.revisedPrompt || null,
                url: imageResult.url,
                storageKey: imageResult.storageKey || null,
                provider: imageResult.provider,
                model: imageResult.model,
                generationTimeMs: imageResult.generationTimeMs,
                estimatedCostUsd: imageResult.cost.toFixed(6),
                status: "completed",
              });
            }
          } catch (assetErr: any) {
            console.error("[Stream] Failed to save generated asset:", assetErr.message);
          }

          // Learning: save interaction (fire-and-forget)
          if (isLearningEnabled()) {
            saveInteraction({
              userId: user.id,
              conversationId,
              userMessage: content,
              assistantResponse: imageMarkdown,
              taskType: "image_generation",
              providerUsed: imageResult.provider,
              tokensUsed: 50,
              responseTimeMs: imageResult.generationTimeMs,
            }).catch((err: any) => {
              console.warn("[Learning] save failed (image, non-blocking):", err?.message || err);
            });
          }
          sendSSE(res, { type: "done" });
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } catch (imgErr: any) {
          console.error("[Stream] Image generation failed:", imgErr.error || imgErr.message || imgErr);;

          // Log the failed image generation attempt
          try {
            await createProviderLog({
              userId: user.id,
              conversationId,
              provider: imgErr?.provider || "openai_image",
              model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
              endpoint: "images/generations",
              tokenCount: 0,
              responseTimeMs: Date.now() - streamStartTime,
              success: false,
              errorMessage: imgErr?.error || imgErr?.message || "Image generation failed",
              fallbackUsed: false,
              fallbackProvider: null,
              taskType: "image_generation",
              capabilityScore: 0,
              routingReason: `Image generation failed: ${imgErr?.code || "UNKNOWN"} (${imgErr?.retryable ? "retryable" : "non-retryable"})`,
              estimatedCostUsd: null,
              knowledgeSource: null,
              knowledgeItemsUsed: 0,
            });
          } catch (_) {}

          // Save failed asset to generated_assets
          try {
            const dbConn = await getDb();
            if (dbConn) {
              await dbConn.insert(generatedAssets).values({
                userId: user.id,
                conversationId,
                assetType: "image",
                prompt: content,
                provider: imgErr?.provider || "openai_image",
                model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
                generationTimeMs: Date.now() - streamStartTime,
                status: "failed",
                errorMessage: imgErr?.error || imgErr?.message || "Image generation failed",
              });
            }
          } catch (_) {}

          // Fall through to text generation with proper context
          imageGenFailed = true;
          imageGenFailReason = imgErr?.code || imgErr?.error || imgErr?.message || "provider indisponível";
          sendSSE(res, { type: "step", step: "fallback", content: "Geração de imagem indisponível, respondendo em texto..." });
        }
      }

      // ══════════════════════════════════════════════════════════════
      // IMAGE EDITING INTERCEPT (image-to-image transformation)
      // ══════════════════════════════════════════════════════════════
      if (
        !imageGenFailed &&
        isImageGenEnabled() &&
        intentResult?.taskType === "image_editing" &&
        intentResult.confidence > 0.5
      ) {
        // Extract attached image URL from the content
        const imageUrlRegex = /\[Imagem anexada: [^\]]+\] URL: ((?:https?:\/\/|data:image\/)[^\s]+)/;
        const imageMatch = content.match(imageUrlRegex);
        if (imageMatch && imageMatch[1]) {
          const sourceImageUrl = imageMatch[1];
          // Set SSE headers
          if (!res.headersSent) {
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            });
          }
          const editStartTime = Date.now();
          sendSSE(res, { type: "step", step: "image_edit", content: "Editando imagem..." });
          try {
            // Extract just the user's instruction (remove the attachment text)
            const userInstruction = content.replace(/\n*---\nArquivos anexados:\n.*$/s, "").trim();
            const parsedReq = parseImageRequest(userInstruction);
            const imageRequest = {
              prompt: userInstruction || "Transform this image as requested",
              size: parsedReq.size || "auto",
              quality: parsedReq.quality || "auto",
              style: parsedReq.style,
              userId: user.id,
              conversationId,
              originalImages: [{ url: sourceImageUrl, mimeType: "image/png" }] as Array<{url: string; mimeType: string}>,
            };
            // Silent retry: attempt once, if retryable error wait 2s and try again
            let imageResult: ImageGenerationResult;
            try {
              imageResult = await generateImage(imageRequest);
            } catch (firstAttemptErr: any) {
              if (firstAttemptErr?.retryable) {
                console.log(`[Stream] Image edit first attempt failed (${firstAttemptErr.code}), retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                imageResult = await generateImage(imageRequest);
              } else {
                throw firstAttemptErr;
              }
            }
            sendSSE(res, { type: "step", step: "image_edit_done", content: "Imagem editada com sucesso!" });
            const imageMarkdown = `![Imagem editada](${imageResult.url})`;
            sendSSE(res, { type: "chunk", content: imageMarkdown });
            await addMessage({ conversationId, role: "assistant", content: imageMarkdown, tokenCount: 50 });
            await createProviderLog({
              userId: user.id,
              conversationId,
              provider: imageResult.provider,
              model: imageResult.model,
              endpoint: "images/edits",
              tokenCount: 50,
              responseTimeMs: imageResult.generationTimeMs,
              success: true,
              errorMessage: null,
              fallbackUsed: false,
              fallbackProvider: null,
              taskType: "image_editing",
              capabilityScore: 5,
              routingReason: "Image editing via provider",
              estimatedCostUsd: imageResult.cost.toFixed(6),
              knowledgeSource: null,
              knowledgeItemsUsed: 0,
            });
            recordUsage(user.id, "image_editing", imageResult.cost);
            try {
              const dbConn = await getDb();
              if (dbConn) {
                await dbConn.insert(generatedAssets).values({
                  userId: user.id,
                  conversationId,
                  assetType: "image",
                  prompt: userInstruction,
                  revisedPrompt: imageResult.revisedPrompt || null,
                  url: imageResult.url,
                  storageKey: imageResult.storageKey || null,
                  provider: imageResult.provider,
                  model: imageResult.model,
                  generationTimeMs: imageResult.generationTimeMs,
                  estimatedCostUsd: imageResult.cost.toFixed(6),
                  status: "completed",
                });
              }
            } catch (assetErr: any) {
              console.error("[Stream] Failed to save edited asset:", assetErr.message);
            }
            if (isLearningEnabled()) {
              saveInteraction({
                userId: user.id,
                conversationId,
                userMessage: content,
                assistantResponse: imageMarkdown,
                taskType: "image_editing",
                providerUsed: imageResult.provider,
                tokensUsed: 50,
                responseTimeMs: imageResult.generationTimeMs,
              }).catch((err: any) => {
                console.warn("[Learning] save failed (image edit, non-blocking):", err?.message || err);
              });
            }
            sendSSE(res, { type: "done" });
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          } catch (imgErr: any) {
            console.error("[Stream] Image editing failed:", imgErr.error || imgErr.message || imgErr);
            try {
              await createProviderLog({
                userId: user.id,
                conversationId,
                provider: imgErr?.provider || "openai_image",
                model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
                endpoint: "images/edits",
                tokenCount: 0,
                responseTimeMs: Date.now() - editStartTime,
                success: false,
                errorMessage: imgErr?.error || imgErr?.message || "Image editing failed",
                fallbackUsed: false,
                fallbackProvider: null,
                taskType: "image_editing",
                capabilityScore: 0,
                routingReason: `Image editing failed: ${imgErr?.code || "UNKNOWN"}`,
                estimatedCostUsd: null,
                knowledgeSource: null,
                knowledgeItemsUsed: 0,
              });
            } catch (_) {}
            // Fall through to text generation with context
            imageGenFailed = true;
            imageGenFailReason = imgErr?.code || imgErr?.error || imgErr?.message || "edição de imagem indisponível";
            sendSSE(res, { type: "step", step: "fallback", content: "Edição de imagem indisponível, respondendo em texto..." });
          }
        }
      }

      // If image gen/edit is NOT enabled but user asked for image, mark as failed gracefully
      if (
        !imageGenFailed &&
        !isImageGenEnabled() &&
        (intentResult?.taskType === "image_generation" || intentResult?.taskType === "image_editing") &&
        intentResult!.confidence > 0.6
      ) {
        imageGenFailed = true;
        imageGenFailReason = "provider não configurado";
      }

      // ══════════════════════════════════════════════════════════════
      // VIDEO GENERATION INTERCEPT (async job)
      // ══════════════════════════════════════════════════════════════

      if (
        isVideoGenEnabled() &&
        intentResult?.taskType === "video_generation" &&
        intentResult.confidence > 0.6
      ) {
        // Set SSE headers
        if (!res.headersSent) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });
        }

        const streamStartTime = Date.now();
        sendSSE(res, { type: "step", step: "video_gen", content: "Iniciando geração de vídeo (processo assíncrono)..." });

        try {
          const videoJob: VideoJobResult = await submitVideoGeneration({
            prompt: content,
            userId: user.id,
            conversationId,
          });

          const videoMessage = `🎥 **Vídeo em geração**\n\nSeu vídeo está sendo processado.\n\n- **Status:** ${videoJob.status}\n- **Duração estimada:** ${videoJob.estimatedDuration || 60}s\n\n_Você será notificado quando o vídeo estiver pronto._`;

          sendSSE(res, { type: "chunk", content: videoMessage });

          // Save assistant message
          await addMessage({ conversationId, role: "assistant", content: videoMessage, tokenCount: 50 });

          // Record usage
          recordUsage(user.id, "video_generation", videoJob.cost || 0.50);

          // Log provider usage
          await createProviderLog({
            userId: user.id,
            conversationId,
            provider: videoJob.provider,
            model: videoJob.model,
            endpoint: "video/generations",
            tokenCount: 50,
            responseTimeMs: Date.now() - streamStartTime,
            success: true,
            errorMessage: null,
            fallbackUsed: false,
            fallbackProvider: null,
            taskType: "video_generation",
            capabilityScore: 5,
            routingReason: `Video generation via ${videoJob.provider}`,
            estimatedCostUsd: (videoJob.cost || 0.50).toFixed(6),
            knowledgeSource: null,
            knowledgeItemsUsed: 0,
          });

          // Learning: save interaction (fire-and-forget)
          if (isLearningEnabled()) {
            saveInteraction({
              userId: user.id,
              conversationId,
              userMessage: content,
              assistantResponse: videoMessage,
              taskType: "video_generation",
              providerUsed: videoJob.provider,
              tokensUsed: 50,
              responseTimeMs: Date.now() - streamStartTime,
             }).catch((err: any) => {
              console.warn("[Learning] save failed (video, non-blocking):", err?.message || err);
            });
          }
          sendSSE(res, { type: "done" });
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } catch (vidErr: any) {
          console.error("[Stream] Video generation failed:", vidErr.error || vidErr.message || vidErr);

          // Log the failed video generation attempt
          try {
            await createProviderLog({
              userId: user.id,
              conversationId,
              provider: vidErr?.provider || "video_provider",
              model: vidErr?.model || "unknown",
              endpoint: "video/generations",
              tokenCount: 0,
              responseTimeMs: Date.now() - (Date.now()),
              success: false,
              errorMessage: vidErr?.error || vidErr?.message || "Video generation failed",
              fallbackUsed: false,
              fallbackProvider: null,
              taskType: "video_generation",
              capabilityScore: 0,
              routingReason: `Video generation failed: ${vidErr?.code || "UNKNOWN"}`,
              estimatedCostUsd: null,
              knowledgeSource: null,
              knowledgeItemsUsed: 0,
            });
          } catch (_) {}

          sendSSE(res, { type: "step", step: "fallback", content: "Geração de vídeo indisponível, respondendo em texto..." });
          // Fall through to text generation
        }
      }

      // ══════════════════════════════════════════════════════════════
      // AUDIO TRANSCRIPTION INTERCEPT
      // ══════════════════════════════════════════════════════════════
      // If the message contains audio file references that weren't transcribed by the frontend,
      // auto-transcribe them here as a safety net
      const audioUrlMatch = content.match(/\[Arquivo anexado:\s*([^\]]+?)\s*\(audio\/[^)]+\)\]/i);
      if (audioUrlMatch && !content.includes("[Áudio anexado:") && !content.includes("Transcrição:")) {
        // Extract the audio URL from the message context
        const audioUrlInContent = content.match(/URL:\s*(https?:\/\/[^\s]+)/i);
        const audioFileRef = content.match(/\[Arquivo anexado:\s*([^\(]+?)\s*\(audio\/([^,]+)/i);
        if (audioFileRef) {
          const audioFilename = audioFileRef[1].trim();
          // Find the URL in the uploaded files context or construct from S3
          const urlMatch = content.match(new RegExp(`${audioFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*URL:\\s*(https?:\/\/[^\s]+)`, 'i'));
          const audioUrl = urlMatch?.[1] || audioUrlInContent?.[1];
          
          if (audioUrl) {
            try {
              console.log(`[Stream] Auto-transcribing audio: ${audioFilename}`);
              // Set SSE headers if not already sent
              if (!res.headersSent) {
                res.writeHead(200, {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  Connection: "keep-alive",
                });
              }
              sendSSE(res, { type: "step", step: "audio_transcription", content: "Transcrevendo áudio..." });
              const transcriptionResult = await transcribeAudio({ audioUrl, language: "pt" });
              if ('text' in transcriptionResult && transcriptionResult.text) {
                // Replace the audio file reference with the transcription
                content = content.replace(
                  /\[Arquivo anexado:\s*[^\]]*?\(audio\/[^)]+\)\]/i,
                  `[Áudio anexado: ${audioFilename}] Transcrição:\n${transcriptionResult.text}`
                );
                console.log(`[Stream] Audio transcribed successfully: ${transcriptionResult.text.slice(0, 100)}...`);
                sendSSE(res, { type: "step", step: "audio_transcription_done", content: "Áudio transcrito com sucesso" });
              } else {
                console.log(`[Stream] Audio transcription failed:`, transcriptionResult);
              }
            } catch (err) {
              console.error(`[Stream] Audio transcription error:`, err);
            }
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // DIAGRAM GENERATION INTERCEPT
      // ══════════════════════════════════════════════════════════════

      if (
        isDiagramGenEnabled() &&
        intentResult &&
        ["network_diagram", "architecture_diagram", "flowchart_diagram"].includes(intentResult.taskType) &&
        intentResult.confidence > 0.5
      ) {
        // For diagrams, we inject the diagram-specific system prompt and let the LLM generate Mermaid code
        // The processDiagramResponse will extract and validate the code after LLM responds
        taskTypeEnhancement = getDiagramSystemPrompt(intentResult.taskType as DiagramType);
        console.log(`[Stream] Diagram mode activated: type=${intentResult.taskType}`);

        // Record usage for diagrams
        recordUsage(user.id, intentResult.taskType, 0.01);
      }

      // ══════════════════════════════════════════════════════════════
      // BUILD SYSTEM PROMPT
      // ══════════════════════════════════════════════════════════════

      let systemPrompt: string;

      if (isCapabilityRoutingEnabled() && knowledgeContext) {
        // Use augmented prompt with knowledge context + date/time injection
        const dateTimeBlock = `\n\n## Informações Temporais:\n${getCurrentDateForPrompt()}\nSempre use esta data/hora real ao responder perguntas sobre data, hora ou dia da semana. NUNCA use placeholders, variáveis de template ou código como strftime.\n`;
        const baseWithEnhancement = BASE_SYSTEM_PROMPT + dateTimeBlock + taskTypeEnhancement;

        // Get active instructions for augmented prompt
        const { getActiveInstructions } = await import("./knowledgeReuse");
        const instructions = await getActiveInstructions();

        systemPrompt = buildAugmentedPrompt(baseWithEnhancement, knowledgeContext, instructions);
      } else {
        // Legacy path: use dynamic system prompt (loads all KB + instructions)
        systemPrompt = await buildDynamicSystemPrompt();
        systemPrompt += taskTypeEnhancement;
      }

      // ══════════════════════════════════════════════════════════════
      // INJECT ACCOUNT CONTEXT (non-blocking)
      // ══════════════════════════════════════════════════════════════
      try {
        const accountCtx = await buildAccountContext(user.id);
        const accountBlock = formatAccountContextBlock(accountCtx);
        systemPrompt += accountBlock;
        if (accountCtx.planId !== "unknown") {
          console.log(`[AccountContext] Injected: user=${user.id} plan=${accountCtx.planName} msgs=${accountCtx.messagesUsedToday}/${accountCtx.messagesLimitDaily}`);
        }
      } catch (err: any) {
        console.warn(`[AccountContext] Failed for user=${user.id}: ${err.message}`);
        // Non-blocking: continue without account context
      }

      // Build messages for LLM with multimodal support
      // Determine provider early so we know how to handle images
      const targetProvider: LLMProviderConfig = (isCapabilityRoutingEnabled() && routingDecision)
        ? routingDecision.provider
        : getPrimaryProvider();
      const isLocalProvider = targetProvider.name === "local_gpu";

      // Process history messages - convert image attachments to multimodal format
      // For cloud providers: fetch image bytes and send as base64 data URI
      // For local providers: send internal S3 URL (container-to-container access)
      const processedHistory = await Promise.all(
        history.map(async (m: { role: string; content: string }) => {
          if (m.role === "user") {
            const imageUrlRegex = /\[Imagem anexada: [^\]]+\] URL: ((?:https?:\/\/|\/api\/assets\/)[^\s]+)/g;
            const imageMatches = Array.from(m.content.matchAll(imageUrlRegex));

            if (imageMatches.length > 0) {
              const contentParts: any[] = [];
              const textContent = m.content.replace(/\[Imagem anexada: [^\]]+\] URL: (?:https?:\/\/|\/api\/assets\/)[^\s]+/g, "").trim();
              if (textContent) {
                contentParts.push({ type: "text", text: textContent });
              } else {
                contentParts.push({ type: "text", text: "Analise esta imagem:" });
              }

              for (const match of imageMatches) {
                const rawUrl = match[1];
                let imageUrl: string;

                if (isLocalProvider) {
                  // Local GPU (Ollama): use internal S3 URL directly (container-to-container)
                  imageUrl = getInternalUrl(rawUrl);
                  console.log(`[Stream] Vision (local): sending internal URL to ${targetProvider.name}`);
                } else {
                  // Cloud provider (OpenAI/Gemini/Anthropic): fetch bytes and convert to base64
                  try {
                    const proxyPrefix = "/api/assets/";
                    let key: string;
                    if (rawUrl.startsWith(proxyPrefix)) {
                      key = decodeURIComponent(rawUrl.slice(proxyPrefix.length));
                    } else if (rawUrl.startsWith("http")) {
                      // Already a full URL — try to extract key or use as-is
                      // If it's our own S3 URL, extract key; otherwise pass through
                      const s3Endpoint = process.env.S3_ENDPOINT || "";
                      const bucket = process.env.S3_BUCKET || "";
                      const prefix = `${s3Endpoint}/${bucket}/`;
                      if (rawUrl.startsWith(prefix)) {
                        key = rawUrl.slice(prefix.length);
                      } else {
                        // External URL — pass directly (provider can fetch it)
                        imageUrl = rawUrl;
                        contentParts.push({
                          type: "image_url",
                          image_url: { url: imageUrl, detail: "auto" },
                        });
                        continue;
                      }
                    } else {
                      key = rawUrl;
                    }

                    const result = await storageGetBuffer(key);
                    if (result) {
                      const base64 = result.buffer.toString("base64");
                      const mimeType = result.contentType || "image/png";
                      imageUrl = `data:${mimeType};base64,${base64}`;
                      console.log(`[Stream] Vision (cloud): converted image to base64 (${(result.buffer.length / 1024).toFixed(1)}KB) for ${targetProvider.name}`);
                    } else {
                      console.warn(`[Stream] Vision: image not found in S3 for key: ${key}`);
                      imageUrl = getInternalUrl(rawUrl); // fallback
                    }
                  } catch (err: any) {
                    console.error(`[Stream] Vision: failed to fetch image for base64 conversion:`, err?.message);
                    // Fallback: send internal URL (may not work for cloud providers)
                    imageUrl = getInternalUrl(rawUrl);
                  }
                }

                contentParts.push({
                  type: "image_url",
                  image_url: { url: imageUrl, detail: "auto" },
                });
              }
              return { role: m.role, content: contentParts };
            }
          }
          return { role: m.role, content: m.content };
        })
      );

      const llmMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...processedHistory,
      ];

      // ── IMAGE GEN/EDIT FALLBACK: inject context so LLM provides useful response ──
      if (imageGenFailed) {
        const isEditTask = intentResult?.taskType === "image_editing";
        const fallbackInstruction = isEditTask
          ? `\n\n## IMPORTANTE — Edição de Imagem Indisponível:\nA ferramenta de edição de imagem falhou (motivo: ${imageGenFailReason}).\nVocê NÃO pode editar imagens agora. Em vez disso, faça o seguinte:\n1. Reconheça que não foi possível editar a imagem no momento.\n2. Crie um prompt detalhado de edição/transformação que o usuário pode usar em ferramentas como DALL-E (images/edits), Midjourney, ou Photoshop AI.\n3. Descreva como a imagem ficaria após a transformação: estilo, mudanças, efeitos aplicados.\n4. Sugira que o usuário tente novamente mais tarde ou use o prompt em outra ferramenta.\n5. Após responder sobre a imagem, continue a conversa normalmente.\nNUNCA mostre erro técnico ao usuário. Sempre forneça valor.`
          : `\n\n## IMPORTANTE — Geração de Imagem Indisponível:\nA ferramenta de geração de imagem falhou (motivo: ${imageGenFailReason}).\nVocê NÃO pode gerar imagens agora. Em vez disso, faça o seguinte:\n1. Reconheça que não foi possível gerar a imagem no momento.\n2. Crie um prompt visual profissional e detalhado que o usuário pode usar em ferramentas como DALL-E, Midjourney, Stable Diffusion ou Leonardo AI.\n3. Descreva a imagem que seria gerada: estilo, composição, cores, iluminação, perspectiva.\n4. Sugira que o usuário tente novamente mais tarde ou use o prompt em outra ferramenta.\n5. Após responder sobre a imagem, continue a conversa normalmente — responda qualquer próxima pergunta do usuário sem mencionar a falha anterior.\nNUNCA mostre erro técnico, stack trace ou mensagem de sistema ao usuário.\nNUNCA diga apenas "ocorreu um erro". Sempre forneça valor ao usuário.`;
        llmMessages[0].content += fallbackInstruction;
        console.log(`[Stream] Image ${isEditTask ? "edit" : "gen"} fallback injected: reason=${imageGenFailReason}`);
      }

      // Set SSE headers (if not already set by image gen intercept)
      if (!res.headersSent) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
      }

      // ══════════════════════════════════════════════════════════════
      // AGENT LOOP
      // ══════════════════════════════════════════════════════════════

      const streamStartTime = Date.now();
      let maxIterations = 5;
      let iteration = 0;
      let finalContent = "";
      let totalTokensEstimate = 0;
      console.log("[Stream] Starting agent loop for conversation:", conversationId);

      // Determine tools available for this plan
      let planTools = isAdmin ? AGENT_TOOLS : getToolsForPlan(plan);
      // Remove generate_image tool when image gen is unavailable to prevent LLM from calling broken tool
      if (imageGenFailed || !isImageGenEnabled()) {
        planTools = planTools?.filter(t => t.function.name !== "generate_image") || null;
      }
      // Admin always gets high token limit; diagram tasks need minimum 8192
      const isDiagramTask = intentResult && ["network_diagram", "architecture_diagram", "flowchart_diagram"].includes(intentResult.taskType);
      const maxTokens = isAdmin ? 65536 : isDiagramTask ? Math.max(plan.limits.maxTokensPerMessage, 8192) : plan.limits.maxTokensPerMessage;

      // Use the provider already determined for image handling
      let usedProvider: LLMProviderConfig = targetProvider;

      let fallbackUsed = false;
      let fallbackReason: string | undefined;
      let originalProviderName: string | undefined;

      while (iteration < maxIterations) {
        iteration++;

        // Only allow tools in first 3 iterations to prevent infinite loops
        const iterationTools = iteration <= 3 ? planTools : null;
        let responseContent: string;
        let toolCalls: ToolCall[];
        let finishReason: string;

        try {
          const result = await streamLLMResponse(llmMessages, res, iterationTools, maxTokens, usedProvider);
          responseContent = result.content;
          toolCalls = result.toolCalls;
          finishReason = result.finishReason;
        } catch (primaryErr: any) {
          console.error(`[Stream] Primary provider (${usedProvider.name}) failed:`, primaryErr.message);

          // Try fallback if available and not already on fallback
          if (!fallbackUsed) {
            // Use routing decision's alternative, or getFallbackProvider()
            const fallback = (isCapabilityRoutingEnabled() && routingDecision?.alternativeProvider)
              ? routingDecision.alternativeProvider
              : getFallbackProvider();

            if (fallback) {
              console.log(`[Stream] Switching to fallback provider: ${fallback.name}`);
              originalProviderName = usedProvider.name;
              fallbackReason = primaryErr.message;
              usedProvider = fallback;
              fallbackUsed = true;

              console.log(`[Stream] Provider fallback: ${originalProviderName} -> ${fallback.name}`);
              sendSSE(res, {
                type: "step",
                step: "fallback",
                content: "Reconectando...",
              });

              try {
                const result = await streamLLMResponse(llmMessages, res, iterationTools, maxTokens, usedProvider);
                responseContent = result.content;
                toolCalls = result.toolCalls;
                finishReason = result.finishReason;
              } catch (fallbackErr: any) {
                console.error(`[Stream] Fallback provider (${usedProvider.name}) also failed:`, fallbackErr.message);
                // Save a contextual fallback message so the chat history stays consistent
                const contextualFallback = imageGenFailed
                  ? "Não consegui processar a imagem no momento. Posso ajudar de outra forma — por exemplo, criando um prompt visual detalhado para você usar em outra ferramenta, ou respondendo qualquer outra dúvida. Tente novamente em alguns instantes."
                  : "Estou com dificuldades técnicas temporárias, mas posso tentar novamente em instantes. Por favor, envie sua mensagem novamente ou me pergunte outra coisa.";
                sendSSE(res, { type: "chunk", content: contextualFallback });
                sendSSE(res, { type: "done" });
                // Save to DB so next message works normally
                try {
                  await addMessage({ conversationId, role: "assistant", content: contextualFallback, tokenCount: 30 });
                } catch (_) {}
                res.end();
                try {
                  await createProviderLog({
                    userId: user.id,
                    conversationId,
                    provider: usedProvider.name,
                    model: usedProvider.model,
                    endpoint: resolveApiUrl(usedProvider),
                    tokenCount: 0,
                    responseTimeMs: Date.now() - streamStartTime,
                    success: false,
                    errorMessage: `Primary: ${primaryErr.message} | Fallback: ${fallbackErr.message}`,
                    fallbackUsed: true,
                    fallbackProvider: usedProvider.name,
                    taskType: intentResult?.taskType ?? null,
                    capabilityScore: null,
                    routingReason: routingDecision?.reason ?? null,
                    estimatedCostUsd: null,
                    knowledgeSource: knowledgeContext?.source ?? null,
                    knowledgeItemsUsed: knowledgeContext?.items.length ?? 0,
                  });
                } catch (_) {}
                return;
              }
            } else {
              console.error(`[Stream] Provider ${usedProvider.name} unavailable, no fallback configured`);
              const contextualFallback = imageGenFailed
                ? "Não consegui processar a imagem no momento. Posso ajudar de outra forma — por exemplo, criando um prompt visual detalhado para você usar em outra ferramenta, ou respondendo qualquer outra dúvida. Tente novamente em alguns instantes."
                : "Estou com dificuldades técnicas temporárias, mas posso tentar novamente em instantes. Por favor, envie sua mensagem novamente ou me pergunte outra coisa.";
              sendSSE(res, { type: "chunk", content: contextualFallback });
              sendSSE(res, { type: "done" });
              try {
                await addMessage({ conversationId, role: "assistant", content: contextualFallback, tokenCount: 30 });
              } catch (_) {}
              res.end();
              try {
                await createProviderLog({
                  userId: user.id,
                  conversationId,
                  provider: usedProvider.name,
                  model: usedProvider.model,
                  endpoint: resolveApiUrl(usedProvider),
                  tokenCount: 0,
                  responseTimeMs: Date.now() - streamStartTime,
                  success: false,
                  errorMessage: primaryErr.message,
                  fallbackUsed: false,
                  taskType: intentResult?.taskType ?? null,
                  capabilityScore: null,
                  routingReason: routingDecision?.reason ?? null,
                  estimatedCostUsd: null,
                  knowledgeSource: knowledgeContext?.source ?? null,
                  knowledgeItemsUsed: knowledgeContext?.items.length ?? 0,
                });
              } catch (_) {}
              return;
            }
          } else {
            const contextualFallback = imageGenFailed
              ? "Não consegui processar a imagem no momento. Posso ajudar de outra forma — por exemplo, criando um prompt visual detalhado para você usar em outra ferramenta, ou respondendo qualquer outra dúvida. Tente novamente em alguns instantes."
              : "Estou com dificuldades técnicas temporárias, mas posso tentar novamente em instantes. Por favor, envie sua mensagem novamente ou me pergunte outra coisa.";
            sendSSE(res, { type: "chunk", content: contextualFallback });
            sendSSE(res, { type: "done" });
            try {
              await addMessage({ conversationId, role: "assistant", content: contextualFallback, tokenCount: 30 });
            } catch (_) {}
            res.end();
            return;
          }
        }

        finalContent += responseContent;
        totalTokensEstimate += Math.ceil((responseContent.length + content.length) / 4);
        console.log(`[Stream] Iteration ${iteration}: content=${responseContent.length}chars, toolCalls=${toolCalls.length}, finishReason=${finishReason}`);

        // If no tool calls, we're done
        if (toolCalls.length === 0) {
          console.log("[Stream] No tool calls, breaking loop");
          break;
        }
        console.log(`[Stream] Tool calls detected: ${toolCalls.map(tc => tc.function.name).join(', ')}`);

        // Process tool calls
        sendSSE(res, {
          type: "step",
          step: "tools",
          content: `Executando ${toolCalls.length} ferramenta(s)...`,
          tools: toolCalls.map((tc) => tc.function.name),
        });

        // Add assistant message with tool calls to context
        llmMessages.push({
          role: "assistant",
          content: responseContent || null,
          tool_calls: toolCalls,
        });

        // Execute each tool call with silent retry for internal errors
        for (const toolCall of toolCalls) {
          sendSSE(res, {
            type: "tool_start",
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            args: toolCall.function.arguments,
          });

          const toolContext: ToolContext = { userId: user.id };
          let result = await executeToolCall(toolCall, toolContext);

          // Silent retry: if the error is internal (parse/validation), retry once
          if (result.result?._retryable && result.result?._internalError) {
            console.log(`[Stream] Tool ${toolCall.function.name} failed with internal error, retrying silently...`);
            await new Promise(r => setTimeout(r, 500));
            result = await executeToolCall(toolCall, toolContext);
            if (result.result?._internalError) {
              console.warn(`[Stream] Tool ${toolCall.function.name} failed after retry. Sending friendly error to LLM.`);
              result.result = {
                error: "Não consegui concluir essa verificação agora. O alvo pode estar indisponível, lento ou bloqueando a consulta. Tente novamente em instantes ou informe outro site.",
                _internalError: true,
              };
            }
          }

          if (!result.result?._internalError) {
            sendSSE(res, {
              type: "tool_result",
              toolCallId: toolCall.id,
              name: toolCall.function.name,
              result: result.result,
            });
          } else {
            sendSSE(res, {
              type: "step",
              step: "retry",
              content: "Refazendo verificação...",
            });
          }

          // Add tool result to LLM context
          const llmResult = { ...result.result };
          delete llmResult._retryable;
          delete llmResult._internalError;
          delete llmResult._internal;
          llmMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(llmResult),
          });

          totalTokensEstimate += 50;
        }

        sendSSE(res, {
          type: "step",
          step: "thinking",
          content: "Analisando resultados...",
        });
      }

      // Save assistant message with full content
      console.log(`[Stream] Final content length: ${finalContent.length}`);
      if (finalContent) {
        await addMessage({
          conversationId,
          role: "assistant",
          content: finalContent,
          tokenCount: totalTokensEstimate,
        });
        console.log("[Stream] Assistant message saved to DB");
      } else {
        // If image gen failed and LLM returned empty, save a fallback message
        if (imageGenFailed) {
          const fallbackMsg = "Não consegui gerar a imagem no momento, mas estou aqui para ajudar com qualquer outra questão. Posso criar um prompt visual profissional para você usar em outra ferramenta, ou responder qualquer outra dúvida.";
          await addMessage({
            conversationId,
            role: "assistant",
            content: fallbackMsg,
            tokenCount: 50,
          });
          // Stream the fallback message to the user
          sendSSE(res, { type: "chunk", content: fallbackMsg });
          finalContent = fallbackMsg;
          console.log("[Stream] Image gen fallback message saved (LLM returned empty)");
        } else {
          console.log("[Stream] WARNING: No final content to save!");
        }
      }

      // ── AI Provider Log (with capability routing fields) ──
      try {
        await createProviderLog({
          userId: user.id,
          conversationId,
          provider: usedProvider.name,
          model: usedProvider.model,
          endpoint: resolveApiUrl(usedProvider),
          tokenCount: totalTokensEstimate,
          responseTimeMs: Date.now() - streamStartTime,
          success: true,
          errorMessage: null,
          fallbackUsed,
          fallbackProvider: fallbackUsed ? usedProvider.name : null,
          // Capability routing fields
          taskType: intentResult?.taskType ?? null,
          capabilityScore: routingDecision ? (routingDecision.isOptimal ? 5 : 3) : null,
          routingReason: routingDecision?.reason ?? null,
          estimatedCostUsd: routingDecision?.estimatedCost?.toFixed(6) ?? null,
          inputTokens: Math.ceil(content.length / 4),
          outputTokens: Math.ceil(finalContent.length / 4),
          knowledgeSource: knowledgeContext?.source ?? null,
          knowledgeItemsUsed: knowledgeContext?.items.length ?? 0,
        });
      } catch (logErr) {
        console.warn("[Stream] Failed to save provider log:", logErr);
      }

      // Record usage for capability limits (text/code messages)
      if (intentResult) {
        const estimatedCost = routingDecision?.estimatedCost ?? 0.002;
        recordUsage(user.id, intentResult.taskType, estimatedCost);
      }

      // ── Learning: save interaction (fire-and-forget) ──
      if (isLearningEnabled() && finalContent) {
        saveInteraction({
          userId: user.id,
          conversationId,
          userMessage: content,
          assistantResponse: finalContent,
          taskType: intentResult?.taskType,
          providerUsed: usedProvider.name,
          tokensUsed: totalTokensEstimate,
          responseTimeMs: Date.now() - streamStartTime,
          knowledgeItemsMatched: knowledgeContext?.items.length ?? 0,
        }).catch((err) => {
          console.warn("[Stream] Learning save failed (non-blocking):", err);
        });
      }

      // ── Credit consumption ──
      if (!isAdmin && totalTokensEstimate > 0) {
        try {
          await getOrCreateCredits(user.id, plan.id);
          await updateCreditsUsage(user.id, totalTokensEstimate);
          await addUsageLog({
            userId: user.id,
            conversationId,
            tokensUsed: totalTokensEstimate,
            description: `Chat message (${iteration} iteration${iteration > 1 ? "s" : ""})`,
          });
          console.log(`[Stream] Credits debited: ${totalTokensEstimate} tokens for user ${user.id}`);
        } catch (err) {
          console.error("[Stream] Failed to update credits:", err);
        }
      }

      // Auto-title on first exchange
      if (history.length <= 1) {
        try {
          const titleApiUrl = resolveApiUrl(usedProvider);
          const titleApiKey = getApiKey(usedProvider);
          const titleModel = getModel(usedProvider);
          const titleResponse = await fetch(titleApiUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(titleApiKey ? { authorization: `Bearer ${titleApiKey}` } : {}),
            },
            body: JSON.stringify({
              model: titleModel,
              messages: [
                {
                  role: "system",
                  content:
                    "Gere um título curto (máximo 40 caracteres) para esta conversa baseado na primeira mensagem do usuário. Responda APENAS com o título, sem aspas ou explicações.",
                },
                { role: "user", content },
              ],
              max_tokens: 60,
            }),
          });
          if (titleResponse.ok) {
            const titleData = (await titleResponse.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const title =
              titleData.choices?.[0]?.message?.content?.slice(0, 60) ||
              "Nova conversa";
            await updateConversationTitle(conversationId, user.id, title);
            sendSSE(res, { type: "title", content: title });
          }
        } catch {
          // Non-critical
        }
      }

      sendSSE(res, { type: "done" });
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("[Stream] Error:", error?.message || error);

      let userMessage = "Ocorreu um erro inesperado. Tente novamente.";
      if (error?.message?.includes("LLM API returned")) {
        if (error.message.includes("401") || error.message.includes("403")) {
          userMessage = "Erro de configuração do serviço. Contate o suporte.";
          console.error("[Stream] Auth error - check API key configuration");
        } else if (error.message.includes("404")) {
          userMessage = "Serviço não encontrado. Contate o suporte.";
          console.error("[Stream] 404 - check LLM endpoint configuration");
        } else if (error.message.includes("429")) {
          userMessage = "Muitas solicitações simultâneas. Aguarde um momento e tente novamente.";
        } else if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
          userMessage = "Serviço temporariamente indisponível. Tente novamente em instantes.";
        } else {
          userMessage = "Erro de comunicação. Tente novamente em instantes.";
        }
      } else if (error?.message?.includes("fetch failed") || error?.message?.includes("ECONNREFUSED")) {
        userMessage = "Serviço temporariamente inacessível. Tente novamente em instantes.";
      }

      // Log the unhandled error
      try {
        await createProviderLog({
          userId: 0, // user may not be in scope if auth failed
          conversationId: req.body?.conversationId ?? null,
          provider: "unknown",
          model: "unknown",
          endpoint: "chat/stream",
          tokenCount: 0,
          responseTimeMs: 0,
          success: false,
          errorMessage: error?.message || "Unhandled error in stream route",
          fallbackUsed: false,
          fallbackProvider: null,
          taskType: null,
          capabilityScore: null,
          routingReason: "Unhandled error in main catch block",
          estimatedCostUsd: null,
          knowledgeSource: null,
          knowledgeItemsUsed: 0,
        });
      } catch (_) {}

      // Always save a message to DB so the next message works normally
      const conversationId = req.body?.conversationId;
      if (conversationId) {
        try {
          await addMessage({ conversationId, role: "assistant", content: userMessage, tokenCount: 10 });
        } catch (_) {}
      }
      if (!res.headersSent) {
        res.status(500).json({ error: userMessage });
      } else {
        // Send as chunk (not error) so the frontend displays it as a normal message
        sendSSE(res, { type: "chunk", content: userMessage });
        sendSSE(res, { type: "done" });
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
