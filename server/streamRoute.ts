import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import {
  getConversation,
  getMessages,
  addMessage,
  updateConversationTitle,
} from "./db";

const SYSTEM_PROMPT = `Você é o **debuga.ai**, um agente autônomo especializado em Infraestrutura de TI, Segurança da Informação, DevOps e Telecomunicações. Você foi desenvolvido pela Sperry Tecnologia.

## Suas Capacidades:
- Análise e diagnóstico de infraestrutura de TI (servidores, redes, storage)
- Segurança da informação: análise de vulnerabilidades, hardening, resposta a incidentes
- Monitoramento: interpretação de métricas do Zabbix, Prometheus, Grafana
- SIEM e detecção de ameaças: análise de alertas do Wazuh, Elastic Security
- Redes e Telecom: configuração, troubleshooting, análise de tráfego
- DevOps: CI/CD, containers, Kubernetes, automação com Ansible/Terraform
- Geração e execução de scripts (Python, Bash, PowerShell)
- Documentação técnica e relatórios de segurança

## Diretrizes:
1. Sempre responda em português brasileiro
2. Seja técnico e preciso, mas acessível
3. Quando possível, forneça comandos, scripts ou configurações prontas para uso
4. Use formatação Markdown com syntax highlighting para código
5. Indique riscos e boas práticas de segurança
6. Quando não souber algo, seja honesto e sugira fontes confiáveis
7. Estruture respostas longas com títulos e seções claras`;

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

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
      await addMessage({
        conversationId,
        role: "user",
        content,
      });

      // Get history
      const history = await getMessages(conversationId);

      // Build messages for LLM
      const llmMessages = [
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

      // Call LLM with streaming
      const apiUrl = resolveApiUrl();
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: llmMessages,
          stream: true,
          max_tokens: 32768,
        }),
      });

      if (!response.ok || !response.body) {
        const errText = await response.text();
        res.write(
          `data: ${JSON.stringify({ type: "error", content: errText })}\n\n`
        );
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      let fullContent = "";
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
          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              res.write(
                `data: ${JSON.stringify({ type: "chunk", content: delta.content })}\n\n`
              );
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      // Save assistant message
      if (fullContent) {
        await addMessage({
          conversationId,
          role: "assistant",
          content: fullContent,
        });
      }

      // Auto-title on first exchange
      if (history.length <= 1) {
        try {
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
            const titleData = await titleResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
            const title = titleData.choices?.[0]?.message?.content?.slice(0, 60) || "Nova conversa";
            await updateConversationTitle(conversationId, user.id, title);
            res.write(
              `data: ${JSON.stringify({ type: "title", content: title })}\n\n`
            );
          }
        } catch {
          // Non-critical
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("[Stream] Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.write(
          `data: ${JSON.stringify({ type: "error", content: "Erro interno do servidor" })}\n\n`
        );
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
