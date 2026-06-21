# Roadmap Público — debuga.ai

**Visão de evolução da plataforma debuga.ai.**

Última atualização: Maio 2026

---

## Em Produção

| Funcionalidade | Descrição |
|---------------|-----------|
| Agente conversacional | Chat com contexto técnico, streaming SSE e histórico persistente |
| Classificador de intenção | Roteamento automático por tipo de tarefa (chat, código, imagem, áudio, diagrama) |
| Ferramentas de diagnóstico | DNS, SSL, HTTP, WHOIS, port scan, web fetch — invocadas autonomamente |
| Inferência local (GPU) | Ollama / vLLM com NVIDIA CUDA |
| Fallback multi-provider | OpenAI, Anthropic, Gemini, DeepSeek, Qwen |
| Roteamento inteligente | Por disponibilidade, complexidade, tipo e custo |
| RAG — Knowledge Base | Retrieval-Augmented Generation com documentação operacional do cliente |
| Instruções dinâmicas | Regras de comportamento configuráveis pelo operador |
| Geração de imagens | GPT-Image-1 com prompt otimizado |
| Edição de imagens | Image-to-image com preservação de contexto |
| Diagramas Mermaid | Renderização inline com exportação PNG |
| Document Studio | Análise de 12+ formatos (PDF, DOCX, LOG, CONF, JSON, CSV, YAML, XML, SQL) |
| Transcrição de áudio | Whisper Large V3 com detecção de idioma |
| Análise visual | Screenshots, prints de erro e dashboards analisados por GPT-4o Vision |
| Billing | Stripe com planos, webhooks, promo codes e controle de custos |
| Autenticação | OAuth 2.0 com sessão segura (JWT httpOnly) |
| Painel administrativo | Gestão de usuários, métricas, Knowledge Base, configurações |
| White label | Marca, domínio, cores, planos e landing page customizáveis |
| Controle de custos | Limites configuráveis por usuário e plano com alertas |
| Auditoria | Logs imutáveis de todas as interações com metadados |

---

## Em Desenvolvimento (Q3 2026)

| Funcionalidade | Descrição |
|---------------|-----------|
| Embeddings vetoriais | pgvector para busca semântica na Knowledge Base |
| Integração Zabbix | Consulta de alertas e métricas via agente |
| Integração Grafana | Visualização de dashboards via agente |
| Integração Graylog | Análise centralizada de logs e correlação de eventos |
| Workflows automatizados | Sequências de ações programáveis com triggers |

---

## Planejado (Q4 2026)

| Funcionalidade | Descrição |
|---------------|-----------|
| WhatsApp Business | Canal de atendimento via WhatsApp |
| SSO/SAML | Autenticação corporativa (Azure AD, Okta) |
| Notificações proativas | Alertas baseados em condições e thresholds |
| Execução de código isolada | Sandbox seguro para scripts complexos |

---

## Pesquisa (2027)

| Funcionalidade | Descrição |
|---------------|-----------|
| Fine-tuning | Modelos especializados para domínio técnico do operador |
| Multi-tenant enterprise | Isolamento completo entre organizações |
| Marketplace de integrações | Plugins e conectores de terceiros |
| Gateway LLM dedicado | Serviço de roteamento independente e escalável |
| Agente multi-step | Execução autônoma de tarefas complexas em múltiplas etapas |

---

## Notas

- Itens em "Pesquisa" não têm prazo definido e podem mudar conforme evolução do mercado.
- Funcionalidades em produção estão disponíveis na versão comercial.
- Feedback de operadores e parceiros influencia a priorização do roadmap.
- A Knowledge Base (RAG) está em produção com busca por tags/keywords. A evolução para embeddings vetoriais (pgvector) está em desenvolvimento ativo.

---

*Sperry Tecnologia*
