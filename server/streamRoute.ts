import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import {
  getConversation,
  getMessages,
  addMessage,
  updateConversationTitle,
} from "./db";
import { AGENT_TOOLS, executeToolCall } from "./agentTools";
import type { ToolCall } from "./_core/llm";

const SYSTEM_PROMPT = `Você é o **debuga.ai**, um agente autônomo especializado em Infraestrutura de TI, Segurança da Informação, DevOps e Telecomunicações. Você foi desenvolvido pela Sperry Tecnologia.

## Suas Capacidades:
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

## Ferramentas Disponíveis:
Você tem acesso a ferramentas que pode usar automaticamente. Quando o usuário pedir algo que requer uma ferramenta, USE-A sem pedir permissão:
- **generate_image**: Para criar imagens, diagramas, fluxogramas
- **execute_code**: Para rodar scripts Python ou Bash
- **dns_lookup**: Para consultas DNS
- **ssl_check**: Para verificar certificados SSL/TLS
- **http_check**: Para verificar status e segurança de websites
- **whois_lookup**: Para consultar informações de domínio

## Diretrizes:
1. Sempre responda em português brasileiro
2. Seja técnico e preciso, mas acessível
3. USE as ferramentas proativamente quando relevante
4. Use formatação Markdown com syntax highlighting para código
5. Indique riscos e boas práticas de segurança
6. Quando não souber algo, seja honesto e sugira fontes confiáveis
7. Estruture respostas longas com títulos e seções claras

## Formato de Resposta:
- Use \`\`\`linguagem para blocos de código
- Use **negrito** para termos importantes
- Use tabelas quando comparar opções
- Inclua avisos de segurança quando relevante com ⚠️`;

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

// Helper: send SSE event
function sendSSE(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Helper: call LLM with streaming and collect full response
async function streamLLMResponse(
  messages: any[],
  res: Response,
  useTools: boolean = true
): Promise<{
  content: string;
  toolCalls: ToolCall[];
  finishReason: string;
}> {
  const apiUrl = resolveApiUrl();
  const body: any = {
    model: "gemini-2.5-flash",
    messages,
    stream: true,
    max_tokens: 32768,
  };

  if (useTools) {
    body.tools = AGENT_TOOLS;
    body.tool_choice = "auto";
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text();
    throw new Error(errText);
  }

  let fullContent = "";
  const toolCalls: ToolCall[] = [];
  let finishReason = "stop";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

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
            if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
          }
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return { content: fullContent, toolCalls: toolCalls.filter(Boolean), finishReason };
}

export function registerStreamRoute(app: Express) {
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { conversationId, content } = req.body;
      if (!conversationId || !content) {
        res.status(400).json({ error: "Missing conversationId or content" });
        return;
      }

      // Verify conversation ownership
      const conv = await getConversation(conversationId, user.id);
      if (!conv) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      // Save user message
      await addMessage({ conversationId, role: "user", content });

      // Get history
      const history = await getMessages(conversationId);

      // Build messages for LLM
      const llmMessages: any[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      // Agent loop: LLM can call tools and then continue
      let maxIterations = 5; // Prevent infinite loops
      let iteration = 0;
      let finalContent = "";

      while (iteration < maxIterations) {
        iteration++;

        const { content: responseContent, toolCalls, finishReason } =
          await streamLLMResponse(llmMessages, res, iteration <= 3);

        finalContent += responseContent;

        // If no tool calls, we're done
        if (toolCalls.length === 0 || finishReason !== "tool_calls") {
          break;
        }

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

        // Execute each tool call
        for (const toolCall of toolCalls) {
          sendSSE(res, {
            type: "tool_start",
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            args: toolCall.function.arguments,
          });

          const result = await executeToolCall(toolCall);

          // Send tool result to client for rendering
          sendSSE(res, {
            type: "tool_result",
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            result: result.result,
          });

          // Add tool result to LLM context
          llmMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.result),
          });
        }

        // Send step update
        sendSSE(res, {
          type: "step",
          step: "thinking",
          content: "Analisando resultados...",
        });
      }

      // Save assistant message with full content
      if (finalContent) {
        await addMessage({
          conversationId,
          role: "assistant",
          content: finalContent,
        });
      }

      // Auto-title on first exchange
      if (history.length <= 1) {
        try {
          const apiUrl = resolveApiUrl();
          const titleResponse = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${ENV.forgeApiKey}`,
            },
            body: JSON.stringify({
              model: "gemini-2.5-flash",
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
      console.error("[Stream] Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        sendSSE(res, { type: "error", content: "Erro interno do servidor" });
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
