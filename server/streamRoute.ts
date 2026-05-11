import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
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
} from "./db";
import { AGENT_TOOLS, executeToolCall } from "./agentTools";
import { PLANS, type Plan } from "./products";
import type { Tool, ToolCall } from "./_core/llm";

// ── Feature-gating: tools available per plan tier ──
const BASIC_TOOLS = ["dns_lookup", "ssl_check", "http_check", "whois_lookup", "web_fetch"];
const PRO_TOOLS = [...BASIC_TOOLS, "port_scan", "generate_image", "execute_code"];

function getToolsForPlan(plan: Plan): Tool[] | null {
  if (plan.id === "free") {
    // Free: no tools
    return null;
  }
  if (plan.id === "starter") {
    // Starter: basic network tools only
    return AGENT_TOOLS.filter(t => BASIC_TOOLS.includes(t.function.name));
  }
  // Pro & Enterprise: all tools
  return AGENT_TOOLS;
}

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
- **execute_code**: Para rodar scripts Python ou Bash (sandbox isolada)
- **dns_lookup**: Para consultas DNS
- **ssl_check**: Para verificar certificados SSL/TLS
- **http_check**: Para verificar status e segurança de websites
- **whois_lookup**: Para consultar informações de domínio
- **web_fetch**: Para acessar e ler conteúdo de páginas web (navegação autônoma)
- **port_scan**: Para escanear portas abertas em hosts (auditoria de segurança)

## Diretrizes:
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

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

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
async function getUserPlan(userId: number) {
  const sub = await getActiveSubscription(userId);
  if (!sub || !sub.stripePriceId) {
    return PLANS.find((p) => p.id === "free")!;
  }

  // Check the credits table for planId (set by webhook on subscription)
  const creds = await getOrCreateCredits(userId, "free");
  if (creds && creds.planId !== "free") {
    const plan = PLANS.find((p) => p.id === creds.planId);
    if (plan) return plan;
  }

  // Fallback: if subscription is active, at least give starter
  return PLANS.find((p) => p.id === "starter")!;
}

// Helper: send SSE event
function sendSSE(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// Helper: call LLM with streaming and collect full response
async function streamLLMResponse(
  messages: any[],
  res: Response,
  tools: Tool[] | null,
  maxTokens: number = 32768
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
    max_tokens: maxTokens,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
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
            // Name comes in a single chunk, so assign directly (not append)
            if (tc.function?.name) {
              if (toolCalls[idx].function.name === "") {
                toolCalls[idx].function.name = tc.function.name;
              }
              // Only append if it's a continuation (very rare)
            }
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

      // ── Rate limiting ──
      if (!checkRateLimit(user.id)) {
        res.status(429).json({
          error: "Limite de requisições excedido. Aguarde um momento antes de enviar outra mensagem.",
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
            error: `Você atingiu o limite de ${plan.limits.messagesPerDay} mensagens por dia do plano ${plan.name}. Faça upgrade para continuar.`,
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
              error: `Você atingiu o limite de ${plan.limits.conversationsPerMonth} conversas por mês do plano ${plan.name}. Faça upgrade para continuar.`,
              code: "MONTHLY_CONV_LIMIT_REACHED",
              limit: plan.limits.conversationsPerMonth,
              used: monthConversations,
              planId: plan.id,
            });
            return;
          }
        }

        // Check credits
        const creds = await getOrCreateCredits(user.id, plan.id);
        if (creds && creds.usedCredits >= creds.totalCredits && plan.id === "free") {
          res.status(402).json({
            error: "Seus créditos gratuitos acabaram. Assine um plano para continuar usando o debuga.ai.",
            code: "CREDITS_EXHAUSTED",
            planId: plan.id,
          });
          return;
        }
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

      // Build messages for LLM with multimodal support
      const llmMessages: any[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m: { role: string; content: string }) => {
          // Detect image URLs in user messages and convert to multimodal format
          if (m.role === "user") {
            const imageUrlRegex = /\[Imagem anexada: [^\]]+\] URL: (https?:\/\/[^\s]+)/g;
            const imageMatches = Array.from(m.content.matchAll(imageUrlRegex));
            
            if (imageMatches.length > 0) {
              // Build multimodal content array
              const contentParts: any[] = [];
              
              // Add text content (remove image URL lines for cleaner text)
              const textContent = m.content.replace(/\[Imagem anexada: [^\]]+\] URL: https?:\/\/[^\s]+/g, "").trim();
              if (textContent) {
                contentParts.push({ type: "text", text: textContent });
              } else {
                contentParts.push({ type: "text", text: "Analise esta imagem:" });
              }
              
              // Add each image as image_url
              for (const match of imageMatches) {
                contentParts.push({
                  type: "image_url",
                  image_url: { url: match[1], detail: "auto" },
                });
              }
              
              return { role: m.role, content: contentParts };
            }
          }
          return { role: m.role, content: m.content };
        }),
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
      let totalTokensEstimate = 0;
      console.log("[Stream] Starting agent loop for conversation:", conversationId);

      // Determine tools available for this plan
      const planTools = isAdmin ? AGENT_TOOLS : getToolsForPlan(plan);
      const maxTokens = plan.limits.maxTokensPerMessage;

      while (iteration < maxIterations) {
        iteration++;

        // Only allow tools in first 3 iterations to prevent infinite loops
        const iterationTools = iteration <= 3 ? planTools : null;
        const { content: responseContent, toolCalls, finishReason } =
          await streamLLMResponse(llmMessages, res, iterationTools, maxTokens);

        finalContent += responseContent;
        // Estimate tokens: ~4 chars per token (rough estimate for billing)
        totalTokensEstimate += Math.ceil((responseContent.length + content.length) / 4);
        console.log(`[Stream] Iteration ${iteration}: content=${responseContent.length}chars, toolCalls=${toolCalls.length}, finishReason=${finishReason}`);

        // If no tool calls, we're done (some models like Gemini return finish_reason=stop even with tool_calls)
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

          let result = await executeToolCall(toolCall);

          // Silent retry: if the error is internal (parse/validation), retry once
          if (result.result?._retryable && result.result?._internalError) {
            console.log(`[Stream] Tool ${toolCall.function.name} failed with internal error, retrying silently...`);
            // Wait a brief moment before retry
            await new Promise(r => setTimeout(r, 500));
            result = await executeToolCall(toolCall);
            // If still failing after retry, replace with friendly message
            if (result.result?._internalError) {
              console.warn(`[Stream] Tool ${toolCall.function.name} failed after retry. Sending friendly error to LLM.`);
              result.result = {
                error: "Não consegui concluir essa verificação agora. O alvo pode estar indisponível, lento ou bloqueando a consulta. Tente novamente em instantes ou informe outro site.",
                _internalError: true,
              };
            }
          }

          // Only send tool_result to frontend if it's NOT an internal-only error
          // Internal errors are handled silently — the LLM will get the error context and respond naturally
          if (!result.result?._internalError) {
            sendSSE(res, {
              type: "tool_result",
              toolCallId: toolCall.id,
              name: toolCall.function.name,
              result: result.result,
            });
          } else {
            // Send a minimal step indicator instead of the error card
            sendSSE(res, {
              type: "step",
              step: "retry",
              content: "Refazendo verificação...",
            });
          }

          // Add tool result to LLM context (always, so the LLM knows what happened)
          // Strip internal flags before sending to LLM
          const llmResult = { ...result.result };
          delete llmResult._retryable;
          delete llmResult._internalError;
          delete llmResult._internal;
          llmMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(llmResult),
          });

          // Add extra tokens for tool usage
          totalTokensEstimate += 50;
        }

        // Send step update
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
        console.log("[Stream] WARNING: No final content to save!");
      }

      // ── Credit consumption ──
      if (!isAdmin && totalTokensEstimate > 0) {
        try {
          // Ensure credits row exists
          await getOrCreateCredits(user.id, plan.id);
          // Debit usage
          await updateCreditsUsage(user.id, totalTokensEstimate);
          // Log usage
          await addUsageLog({
            userId: user.id,
            conversationId,
            tokensUsed: totalTokensEstimate,
            description: `Chat message (${iteration} iteration${iteration > 1 ? "s" : ""})`,
          });
          console.log(`[Stream] Credits debited: ${totalTokensEstimate} tokens for user ${user.id}`);
        } catch (err) {
          console.error("[Stream] Failed to update credits:", err);
          // Non-blocking: don't fail the response if credits update fails
        }
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
