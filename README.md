<p align="center">
  <strong>debuga.ai</strong><br>
  <em>Agente Autônomo de IA para Infraestrutura de TI, Cibersegurança e Telecomunicações</em>
</p>

<p align="center">
  <a href="https://debuga.ai">Demo ao Vivo</a> · 
  <a href="docs/WHITEPAPER_PT-BR.md">Whitepaper PT-BR</a> · 
  <a href="docs/WHITEPAPER_EN.md">Whitepaper EN</a> · 
  <a href="docs/ARCHITECTURE.md">Arquitetura</a> · 
  <a href="docs/SECURITY_AUDIT.md">Auditoria de Segurança</a>
</p>

---

## Visão Geral

**debuga.ai** é uma plataforma SaaS em produção que entrega um agente autônomo de IA especializado em infraestrutura de TI, cibersegurança, DevOps e telecomunicações. Diferente de chatbots convencionais que apenas geram texto, o debuga.ai **executa ações reais**: roda código, escaneia portas, verifica certificados SSL, consulta registros DNS e gera relatórios técnicos — tudo de forma autônoma, sem intervenção humana entre etapas.

O diferencial central é o **Agent Loop** — um ciclo de raciocínio-ação-observação que itera até 5 vezes por mensagem do usuário. O agente decide quais ferramentas invocar, interpreta resultados e encadeia operações para resolver problemas complexos de diagnóstico que exigem múltiplas consultas correlacionadas. Essa arquitetura é inspirada no paradigma ReAct [1] e traz capacidades agênticas para o domínio de operações de TI.

Desenvolvido e mantido pela **[Sperry Tecnologia](https://www.sperrytecnologia.com.br)** — empresa brasileira especializada em inteligência artificial aplicada à infraestrutura de TI, oferecendo o debuga.ai como serviço e produto de treinamento para profissionais de TI através do programa **Open Infra Pro**.

---

## Estado Atual (v4.0 — Maio 2026)

A versão atual do debuga.ai está em produção com as seguintes capacidades implementadas e funcionais:

**Agente autônomo com 8 ferramentas de diagnóstico** — DNS lookup, SSL check, HTTP check, WHOIS lookup, port scan, web fetch, execução de código e geração de imagens. Todas as ferramentas são invocadas autonomamente pelo agente durante o loop de raciocínio.

**Inferência via API cloud** — O agente utiliza o Manus Forge API como gateway de inferência, acessando modelos de linguagem de última geração (atualmente Gemini 2.5 Flash) para raciocínio, tool calling e geração de respostas em streaming.

**Sistema de billing completo** — Integração com Stripe para assinaturas em BRL, com 4 planos (Free, Starter, Pro, Enterprise), webhooks de ciclo de vida, upgrade/downgrade automático e controle de consumo por mensagens diárias, conversas mensais e créditos.

**Interface de chat estilo terminal** — UI em React 19 com tema escuro, streaming de respostas via SSE, sidebar de conversas com busca global, arquivamento, e steps do agente com ícones laterais.

**Autenticação e segurança** — OAuth 2.0 com sessões JWT, rate limiting, isolamento de dados por usuário e verificação de assinatura em webhooks.

---

## Estratégia de IA

A arquitetura do debuga.ai foi projetada para evoluir em camadas de inferência. O estado atual e a visão futura são:

| Camada | Status | Descrição |
|---|---|---|
| **LLM via API Cloud** | **Em produção** | Manus Forge API como gateway de inferência. Atualmente utiliza Gemini 2.5 Flash para raciocínio, tool calling e streaming. |
| **Roteamento multi-modelo** | Planejado | Camada de roteamento inteligente para direcionar consultas entre diferentes provedores e modelos com base em complexidade, domínio e latência. |
| **Inferência on-premise** | Planejado | Infraestrutura GPU dedicada para modelos especializados em TI/segurança (Qwen, Mistral, Llama), reduzindo dependência de APIs externas e permitindo análises profundas com dados sensíveis. |

A estratégia de longo prazo prevê a adoção de modelos open-source fine-tuned para o domínio de infraestrutura de TI, servidos via vLLM ou TGI em hardware dedicado. Essa camada permitirá análises que exigem contexto especializado (correlação de logs, análise de tráfego, raciocínio sobre topologias de rede) sem enviar dados sensíveis para APIs externas.

---

## Stack Técnico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui | UI com type-safety e biblioteca de componentes moderna |
| RPC | tRPC 11 + Superjson | Type-safety ponta a ponta, zero arquivos de contrato de API |
| Backend | Node.js, Express 4 | Servidor HTTP leve com suporte a SSE |
| ORM | Drizzle ORM | Queries SQL-like com tipos TypeScript, migrações SQL puras |
| Banco de Dados | MySQL / TiDB | Conformidade ACID com capacidade de escalabilidade horizontal |
| Streaming | Server-Sent Events (SSE) | Streaming unidirecional em tempo real (mais simples que WebSocket para este caso de uso) |
| Pagamentos | Stripe (BRL, assinaturas + webhooks) | Cobrança PCI-compliant com suporte a Real Brasileiro |
| Armazenamento | S3-compatível | Object storage para artefatos gerados |
| Autenticação | OAuth 2.0 + sessões JWT | Autenticação stateless com cookies assinados |
| Testes | Vitest (236+ testes automatizados) | Testes unitários rápidos com contextos mockados |

---

## Ferramentas do Agente

O agente tem acesso a 8 ferramentas especializadas que invoca de forma autônoma durante o loop de raciocínio:

| Ferramenta | Função | Timeout | Caso de Uso |
|---|---|---|---|
| `execute_code` | Execução de Python/Bash | 30s | Scripts de automação, processamento de dados, geração de configs |
| `port_scan` | Escaneamento de portas TCP em hosts remotos | 30s | Auditorias de segurança, descoberta de serviços, validação de firewall |
| `dns_lookup` | Consultas DNS completas (A, AAAA, MX, NS, TXT, CNAME, SOA) | 10s | Diagnóstico de resolução DNS, verificação de servidores de e-mail |
| `ssl_check` | Verificação de cadeia de certificados SSL/TLS | 10s | Detecção de expiração de certificados, validação de cadeia, análise de cifras |
| `http_check` | Análise de headers HTTP e pontuação de segurança | 10s | Auditoria de headers de segurança (HSTS, CSP, X-Frame-Options) |
| `whois_lookup` | Consulta de informações WHOIS de domínios | 10s | Investigação de propriedade de domínios, identificação de registrars |
| `web_fetch` | Extração e parsing de conteúdo web | 15s | Consulta de documentação, recuperação de referências de API |
| `generate_image` | Geração de imagens com IA | 20s | Diagramas de rede, fluxogramas de arquitetura, mapas de topologia |

Cada execução de ferramenta é registrada com contagem de tokens e debitada do plano do usuário. O agente pode encadear múltiplas ferramentas em um único turno de conversa (ex.: DNS lookup → SSL check → HTTP check para uma auditoria completa de domínio).

---

## Sistema de Cobrança e Créditos

A plataforma implementa um sistema de controle de consumo em três camadas:

**Camada 1 — Rate Limiting:** 20 mensagens por minuto por usuário (in-memory com limpeza automática). Protege contra flood e abuso.

**Camada 2 — Limites do Plano:** Enforcement por mensagem de cota diária de mensagens e cota mensal de conversas. Verificado antes da invocação do LLM para evitar custos desnecessários de API.

**Camada 3 — Consumo de Créditos:** Contagem de tokens pós-resposta (~4 chars/token + 50 tokens/tool call) com débito automático do saldo do usuário. Créditos são resetados mensalmente via webhook de assinatura do Stripe.

| Plano | Mensagens/dia | Conversas/mês | Créditos |
|---|---|---|---|
| Free | 5 | 3 | 50 |
| Starter | 100 | 30 | 1.000 |
| Pro | Ilimitado | Ilimitado | 10.000 |
| Enterprise | Ilimitado | Ilimitado | 100.000 |

A integração com Stripe gerencia sessões de checkout, webhooks de ciclo de vida da assinatura (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) e downgrade automático para o plano free em caso de cancelamento.

---

## Estrutura do Projeto

O repositório contém aproximadamente 178 arquivos (excluindo `node_modules` e `dist`), organizados da seguinte forma:

```
debuga-ai/
├── client/                        # Frontend React 19 SPA
│   ├── src/
│   │   ├── pages/                 # Componentes de nível de rota (7 páginas)
│   │   ├── components/            # UI reutilizável + primitivos shadcn/ui
│   │   ├── contexts/              # Contexto de autenticação (hook useAuth)
│   │   ├── hooks/                 # Hooks React customizados
│   │   ├── lib/                   # Binding do cliente tRPC
│   │   ├── App.tsx                # Definições de rotas e layout
│   │   └── index.css              # Tema global (dark, paleta terminal verde)
│   └── index.html
├── server/                        # Backend Node.js + Express
│   ├── _core/                     # Internals do framework (OAuth, JWT, LLM, env, storage)
│   ├── integrations/              # Conectores para plataformas externas (em desenvolvimento)
│   ├── routers.ts                 # Procedures tRPC (auth, chat, account, search)
│   ├── db.ts                      # Helpers de query Drizzle
│   ├── streamRoute.ts             # Streaming SSE + agent loop + rate limiting + consumo
│   ├── stripeRoutes.ts            # Checkout Stripe + handlers de webhook
│   ├── agentTools.ts              # Implementações das 8 ferramentas do agente
│   ├── products.ts                # Definições de planos e preços
│   ├── storage.ts                 # Helpers S3
│   └── *.test.ts                  # 14 suítes de teste Vitest
├── drizzle/                       # Schema do banco e migrações SQL
│   └── schema.ts                  # 7 tabelas (users, conversations, messages,
│                                  #   subscriptions, credits, usage_log, usage_events)
├── shared/                        # Tipos e constantes compartilhados (client + server)
├── docs/                          # Documentação técnica e materiais estratégicos
│   ├── WHITEPAPER_PT-BR.md        # Whitepaper técnico (Português)
│   ├── WHITEPAPER_EN.md           # Whitepaper técnico (Inglês)
│   ├── ARCHITECTURE.md            # Arquitetura do sistema com diagramas
│   └── SECURITY_AUDIT.md          # Relatório de auditoria de segurança
├── patches/                       # Patches de dependências (wouter)
└── todo.md                        # Rastreamento de features e bugs
```

---

## Modelo de Dados

7 tabelas gerenciadas pelo Drizzle ORM com schema tipado:

| Tabela | Propósito | Relações Principais |
|---|---|---|
| `users` | Contas OAuth, roles (admin/user), Stripe customer ID | 1:N conversations, 1:1 credits |
| `conversations` | Sessões de chat com suporte a pin/archive | N:1 user, 1:N messages |
| `messages` | Conteúdo, role, tool_calls (JSON), contagem de tokens | N:1 conversation |
| `subscriptions` | Estado da assinatura Stripe, período, flag de cancelamento | N:1 user |
| `credits` | Saldo por usuário (total, usado, planId como source of truth) | 1:1 user |
| `usage_log` | Trilha de auditoria por operação (tokens, créditos, conversa) | N:1 user |
| `usage_events` | Contadores de uso independentes (mensagens, conversas, assinatura) | N:1 user |

Todas as queries com escopo de usuário são filtradas por `ctx.user.id` da sessão JWT autenticada. Nenhum endpoint permite acesso cruzado de dados entre usuários (IDOR-safe por design).

---

## Integrações Externas

### Implementadas e em produção

- **Stripe** — Checkout, assinaturas, webhooks de ciclo de vida, portal do cliente
- **Manus Forge API** — Gateway de inferência LLM (Gemini 2.5 Flash)
- **Manus OAuth** — Autenticação de usuários
- **S3** — Armazenamento de artefatos gerados

### Conectores planejados (roadmap)

Os seguintes conectores estão em fase de planejamento ou desenvolvimento inicial. O código de integração existe como scaffold preparatório, mas **não está ativo nos fluxos de produção**:

- **Zabbix** — Monitoramento de infraestrutura e alertas
- **Wazuh** — SIEM e detecção de ameaças
- **Prometheus/Grafana** — Métricas e dashboards de observabilidade

Esses conectores fazem parte da estratégia de evolução do produto para se tornar um hub de operações de TI, integrando dados de múltiplas fontes no raciocínio do agente.

---

## Segurança

O código passou por uma auditoria de segurança para produção (veja [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)):

- **Zero secrets hardcoded** — Todos os valores sensíveis (chaves Stripe, JWT secret, URL do banco, chaves de API do LLM) são injetados via variáveis de ambiente em runtime.
- **Isolamento do frontend** — Apenas variáveis com prefixo `VITE_` (chaves públicas) são acessíveis no bundle do navegador. Secrets do servidor nunca chegam ao cliente.
- **Verificação de assinatura de webhook** — Webhooks do Stripe são verificados com `stripe.webhooks.constructEvent()` antes do processamento.
- **Rate limiting** — 20 msgs/min por usuário com rastreamento in-memory e limpeza automática.
- **Execução de código controlada** — A ferramenta `execute_code` roda em `/tmp` com timeout de 30s e limite de 50KB de output. O ambiente de deploy fornece isolamento adicional a nível de plataforma.
- **Apenas HTTPS** — Todas as comunicações são criptografadas em trânsito.

---

## Testes

```bash
pnpm test    # 236+ testes, ~5s de execução
```

| Suíte | Testes | Cobertura |
|---|---|---|
| `agentTools.test.ts` | 49 | Validação de argumentos, JSON repair, erros amigáveis, todas as 8 ferramentas |
| `chat.test.ts` | 19 | CRUD de conversas, criação de mensagens, paginação |
| `tools.test.ts` | 20 | Execução das ferramentas do agente (DNS, SSL, HTTP, port scan, etc.) |
| `subscription.test.ts` | 10 | Status de assinatura, mapeamento de planos, precificação |
| `credits.test.ts` | 10 | Saldo de créditos, limites de plano, contadores diários/mensais |
| `stripe.test.ts` | 21 | Fluxos Stripe (checkout, webhook, upgrade, downgrade, cancelamento) |
| `usage-counters.test.ts` | 12 | Contadores independentes anti-burla (usage_events) |
| `archive.test.ts` | 10 | Arquivamento, desarquivamento, listagem de conversas |
| `search.test.ts` | 17 | Busca global por título e conteúdo de mensagens |
| `logout-flow.test.ts` | 23 | Fluxo de logout, invalidação de sessão, redirecionamento |
| `freemium-cards.test.ts` | 29 | Cards de exemplo, prompts, feature-gating por plano |
| `modal-cta.test.ts` | 15 | Empilhamento de modais, CTA pós-resultado, prioridade de upgrade |
| `limits.test.ts` | Var. | Rate limiting, limites de plano, enforcement de cotas |
| `auth.logout.test.ts` | 1 | Fluxo base de logout e limpeza de sessão |

Os testes utilizam Vitest com contextos mockados para simular usuários autenticados sem dependências de banco de dados externo.

---

## Desenvolvimento Local

```bash
# Pré-requisitos: Node.js 22+, pnpm
pnpm install

# Gerar migrações do banco de dados
pnpm drizzle-kit generate

# Iniciar servidor de desenvolvimento (hot reload)
pnpm dev

# Executar suíte de testes
pnpm test
```

### Variáveis de Ambiente

As seguintes variáveis devem ser configuradas no ambiente de execução. Em produção, são injetadas automaticamente pela plataforma. Para desenvolvimento local, configure-as no painel de secrets ou via arquivo `.env`:

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | Connection string MySQL/TiDB | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Secret para assinatura de cookies JWT | String aleatória longa |
| `VITE_APP_ID` | ID da aplicação Manus OAuth | — |
| `OAUTH_SERVER_URL` | URL base do servidor OAuth | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | URL do portal de login | `https://manus.im/login` |
| `OWNER_OPEN_ID` | OpenID do administrador do projeto | — |
| `OWNER_NAME` | Nome do administrador | — |
| `BUILT_IN_FORGE_API_URL` | URL do Manus Forge API (server) | `https://forge.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | Chave do Forge API (server-side) | — |
| `VITE_FRONTEND_FORGE_API_URL` | URL do Forge API (frontend) | `https://forge.manus.im` |
| `VITE_FRONTEND_FORGE_API_KEY` | Chave do Forge API (frontend) | — |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret do webhook Stripe | `whsec_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe | `pk_test_...` |
| `VITE_APP_TITLE` | Título da aplicação | `debuga.ai` |
| `VITE_APP_LOGO` | URL do logo (opcional) | — |
| `VITE_ANALYTICS_ENDPOINT` | Endpoint de analytics (opcional) | — |
| `VITE_ANALYTICS_WEBSITE_ID` | ID do site no analytics (opcional) | — |

---

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Camada de API | tRPC sobre REST | Type-safety ponta a ponta, zero arquivos de contrato, Superjson para Date/BigInt nativos |
| Streaming | SSE sobre WebSocket | Unidirecional (server→client) é suficiente; mais simples, nativo HTTP/2, sem dependência Socket.io |
| ORM | Drizzle sobre Prisma | API SQL-like, runtime mais leve, migrações SQL puras, melhor integração com tRPC |
| Inferência LLM | Manus Forge API | Gateway de inferência gerenciado; permite trocar modelos sem alterar código do agente |
| Pagamentos | Stripe | PCI-compliant, suporte a BRL, webhooks de ciclo de vida, códigos promocionais |

---

## Limitações Conhecidas

A versão atual do debuga.ai possui as seguintes limitações que estão sendo endereçadas progressivamente:

- **Inferência exclusivamente via API cloud** — Toda a inferência LLM depende do Manus Forge API. Não há, no momento, inferência on-premise ou modelos proprietários em produção. A camada de roteamento multi-modelo está planejada para versões futuras.
- **Conectores de observabilidade em desenvolvimento** — Os conectores para Zabbix, Wazuh, Prometheus e Grafana existem como scaffold preparatório no código, mas não estão ativos nos fluxos de produção. A integração real com essas plataformas faz parte do roadmap.
- **Rate limiter in-memory** — O rate limiting é armazenado em memória do processo. Em caso de restart do servidor, os contadores são resetados. Uma solução persistente (Redis ou banco) está planejada.
- **Execução de código sem sandbox dedicado** — A ferramenta `execute_code` roda no mesmo ambiente do servidor, com isolamento fornecido pela plataforma de deploy. Um sandbox dedicado (Docker/seccomp) está no roadmap de segurança.
- **Método de pagamento** — Atualmente apenas cartão de crédito via Stripe. Suporte a PIX e Boleto está planejado.
- **Documentação em alinhamento** — Alguns documentos técnicos (whitepaper, arquitetura) contêm referências a funcionalidades planejadas que ainda não estão implementadas. Estamos alinhando progressivamente a documentação ao estado real do código.

---

## Roadmap

| Versão | Timeline | Funcionalidades |
|---|---|---|
| **v4.x** (Atual) | Q2 2026 | Agente autônomo com 8 ferramentas, billing Stripe, busca global, arquivamento, 236+ testes |
| **v5.0** | Q3 2026 | Conectores Zabbix/Wazuh ativos, roteamento multi-modelo, PIX/Boleto via Stripe, cupons educacionais |
| **v6.0** | Q4 2026 | Inferência on-premise via vLLM/TGI (Qwen, Mistral, Llama), API REST pública, memória de longo prazo |
| **v7.0** | 2027 | Multi-tenancy, white-label, execução remota de agentes, marketplace de ferramentas |

### Detalhamento do roadmap técnico

**Inferência local (v6.0)** — Implantação de cluster GPU dedicado para servir modelos open-source fine-tuned para o domínio de TI/segurança via vLLM ou TGI. Objetivo: reduzir dependência de APIs externas, permitir análises com dados sensíveis sem envio para cloud, e habilitar modelos especializados (Qwen2.5, Mistral, Llama) otimizados para correlação de logs, análise de tráfego e raciocínio sobre topologias de rede.

**Roteamento inteligente (v5.0)** — Camada de decisão que direciona consultas entre diferentes provedores e modelos com base em complexidade da query, especificidade do domínio e latência requerida.

**Conectores de observabilidade (v5.0)** — Ativação dos conectores Zabbix, Wazuh e Prometheus/Grafana para que o agente possa consultar dados reais de monitoramento durante o loop de raciocínio.

**Sandbox dedicado (v5.0–v6.0)** — Migração da ferramenta `execute_code` para execução em containers isolados (Docker) com limites de CPU, memória e rede, eliminando riscos de escape de ambiente.

**Expansão enterprise/on-premise (v7.0)** — Versão self-hosted do debuga.ai para clientes que necessitam de controle total sobre dados e infraestrutura.

---

## Documentação

| Documento | Idioma | Descrição |
|---|---|---|
| [Whitepaper](docs/WHITEPAPER_PT-BR.md) | PT-BR | Whitepaper técnico com análise de mercado, arquitetura e modelo de negócio |
| [Whitepaper](docs/WHITEPAPER_EN.md) | EN | Versão em inglês do whitepaper técnico |
| [Arquitetura](docs/ARCHITECTURE.md) | PT-BR | Arquitetura detalhada com diagramas |
| [Auditoria de Segurança](docs/SECURITY_AUDIT.md) | PT-BR | Relatório de auditoria de segurança para produção |

> **Nota:** Alguns documentos técnicos podem conter referências a funcionalidades planejadas (roadmap) que ainda não estão implementadas na versão atual. Consulte a seção "Estado Atual" deste README para a lista precisa de capacidades em produção.

---

## Licença

Proprietária — Sperry Tecnologia © 2026. Todos os direitos reservados.

---

*Desenvolvido por [Sperry Tecnologia](https://www.sperrytecnologia.com.br) — Especialistas em soluções de IA para TI*

[1]: https://arxiv.org/abs/2210.03629 "ReAct: Synergizing Reasoning and Acting in Language Models"
