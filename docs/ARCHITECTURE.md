# debuga.ai — Documentação de Arquitetura

**Versão:** 1.0  
**Data:** Maio 2026  
**Autor:** Sperry Tecnologia

---

## 1. Visão Geral

O debuga.ai é uma plataforma SaaS construída sobre uma arquitetura de três camadas (frontend, backend, serviços externos) com foco em **type-safety end-to-end** via tRPC e **streaming em tempo real** via Server-Sent Events (SSE). O diferencial arquitetural é o **Agent Loop** — um sistema de iteração autônoma que permite ao agente de IA decidir e executar ferramentas de forma encadeada.

### Diagrama de Arquitetura

![Arquitetura do Sistema](/manus-storage/architecture-diagram_692ac45c.png)

---

## 2. Camada de Frontend

### 2.1 Stack

O frontend é construído com **React 19** e **Tailwind CSS 4**, utilizando componentes do **shadcn/ui** para consistência visual. A comunicação com o backend ocorre por dois canais distintos:

| Canal | Protocolo | Uso |
|---|---|---|
| tRPC Client | HTTP/JSON (via fetch) | CRUD de conversas, account, subscription |
| SSE Consumer | Server-Sent Events | Streaming de respostas do agente em tempo real |

### 2.2 Páginas Principais

| Página | Rota | Descrição |
|---|---|---|
| Home | `/` | Landing page com hero, recursos, integrações |
| Chat | `/chat` | Interface de chat com sidebar de conversas |
| Pricing | `/pricing` | Planos de assinatura com toggle mensal/anual |
| Account | `/account` | Dashboard com créditos, uso, perfil |
| Login | `/login` | Redirecionamento para OAuth |

### 2.3 Gerenciamento de Estado

O estado da aplicação é gerenciado por três mecanismos complementares. O **tRPC React Query** cuida do cache de dados do servidor com invalidação automática, enquanto o **React Context** gerencia o estado de autenticação global via `useAuth()`. Para o streaming do chat, o estado local dos componentes é utilizado com `useState` e `useRef` para controlar o buffer de SSE.

---

## 3. Camada de Backend

### 3.1 Stack

O backend roda em **Node.js** com **Express 4** como servidor HTTP e **tRPC 11** como camada de RPC tipada. O **Drizzle ORM** gerencia o acesso ao banco de dados MySQL/TiDB com migrações versionadas.

### 3.2 Módulos do Servidor

| Módulo | Arquivo | Responsabilidade |
|---|---|---|
| Auth | `server/_core/oauth.ts` | OAuth 2.0, sessões JWT |
| tRPC Router | `server/routers.ts` | Procedures tipadas (auth, chat, account, subscription) |
| Stream | `server/streamRoute.ts` | SSE streaming + agent loop + rate limiting |
| Stripe | `server/stripeRoutes.ts` | Checkout, webhooks, portal do cliente |
| DB | `server/db.ts` | Query helpers (Drizzle) |
| Tools | `server/tools.ts` | Ferramentas do agente (8 tools) |
| Products | `server/products.ts` | Definição de planos e limites |
| LLM | `server/_core/llm.ts` | Wrapper para API de LLM |

---

## 4. Agent Loop — Núcleo do Sistema

O Agent Loop é o componente central que diferencia o debuga.ai de chatbots convencionais. Ele implementa um ciclo de **raciocínio-ação-observação** com até 5 iterações por mensagem.

### Diagrama de Fluxo do Agente

![Fluxo do Agente](/manus-storage/agent-flow_6eac4770.png)

### 4.1 Funcionamento

Quando o usuário envia uma mensagem, o sistema primeiro verifica rate limiting (20 msgs/min), créditos disponíveis e limites do plano (mensagens/dia, conversas/mês). Se todas as verificações passam, a mensagem é salva no banco e o contexto da conversa é enviado ao LLM.

O LLM pode responder de duas formas: com texto direto (resposta final) ou com uma **tool call** (solicitação de execução de ferramenta). No segundo caso, o sistema executa a ferramenta solicitada, retorna o resultado ao LLM, e o ciclo recomeça. Este processo se repete por até 5 iterações, permitindo que o agente resolva problemas complexos que exigem múltiplas consultas encadeadas.

### 4.2 Ferramentas Disponíveis

| Ferramenta | Função | Timeout | Exemplo de Uso |
|---|---|---|---|
| `execute_code` | Executa Python/Bash em sandbox | 30s | Gerar scripts de automação |
| `port_scan` | Escaneia portas TCP | 30s | Auditoria de segurança |
| `dns_lookup` | Consulta registros DNS | 10s | Diagnóstico de resolução |
| `ssl_check` | Verifica certificados SSL/TLS | 10s | Detectar expiração |
| `http_check` | Analisa headers HTTP | 10s | Verificar segurança web |
| `whois_lookup` | Consulta WHOIS de domínio | 10s | Investigar propriedade |
| `web_fetch` | Acessa e extrai conteúdo web | 15s | Consultar documentação |
| `generate_image` | Gera imagens via IA | 20s | Criar diagramas |

### 4.3 Streaming SSE

As respostas são transmitidas em tempo real via Server-Sent Events. O formato dos eventos é:

```
event: token
data: {"content": "texto parcial"}

event: tool_start
data: {"name": "dns_lookup", "args": {"domain": "example.com"}}

event: tool_result
data: {"name": "dns_lookup", "result": "..."}

event: done
data: {"tokensUsed": 1234, "creditsUsed": 5}
```

---

## 5. Modelo de Dados

### Diagrama ER

![Modelo de Dados](/manus-storage/data-model_6469cf06.png)

### 5.1 Tabelas

A tabela **users** armazena o cadastro com suporte a múltiplos métodos de login (OAuth), roles para controle de acesso (admin/user), e referência ao Stripe customer ID para billing. A tabela **conversations** mantém o histórico de conversas com funcionalidades de pin e archive. Cada conversa contém múltiplas **messages** que registram o role (user/assistant/system), o conteúdo, tool calls em JSON, e contagem de tokens.

No lado financeiro, **subscriptions** rastreia as assinaturas Stripe com status, período e flag de cancelamento. A tabela **credits** mantém o saldo de créditos por usuário com planId como source of truth (atualizado pelo webhook do Stripe). Por fim, **usage_log** registra cada operação com detalhes de tokens e créditos consumidos para auditoria e analytics.

### 5.2 Índices e Performance

| Tabela | Índice | Colunas |
|---|---|---|
| users | PRIMARY | id |
| users | UNIQUE | openId |
| conversations | INDEX | userId, createdAt |
| messages | INDEX | conversationId, createdAt |
| subscriptions | INDEX | userId, status |
| credits | UNIQUE | userId |
| usage_log | INDEX | userId, createdAt |

---

## 6. Sistema de Billing

### Diagrama de Fluxo de Pagamento

![Fluxo de Billing](/manus-storage/billing-flow_bb4de0de.png)

### 6.1 Fluxo de Checkout

O fluxo de pagamento segue o padrão Stripe Checkout Session. O frontend solicita ao backend a criação de uma sessão de checkout, que inclui metadata com user_id e plan_id. O Stripe redireciona o usuário para a página de pagamento, e após a conclusão, envia um webhook `checkout.session.completed` ao backend.

### 6.2 Webhooks Processados

| Evento | Ação |
|---|---|
| `checkout.session.completed` | Cria subscription, atualiza créditos para o plano |
| `customer.subscription.updated` | Atualiza status da subscription |
| `customer.subscription.deleted` | Cancela subscription, downgrade para free |
| `invoice.payment_failed` | Marca subscription como past_due |

### 6.3 Sistema de Créditos

O sistema de créditos opera em três camadas de proteção:

1. **Rate Limiting** (camada 1): Máximo 20 mensagens por minuto por usuário, implementado em memória com cleanup automático a cada 5 minutos. Protege contra abuso e flood.

2. **Limites de Plano** (camada 2): Antes de processar cada mensagem, o sistema verifica se o usuário não excedeu o limite de mensagens/dia e conversas/mês do seu plano. Administradores bypass todos os limites.

3. **Créditos** (camada 3): Após cada resposta, o sistema calcula o consumo de tokens (estimativa: ~4 caracteres por token + 50 tokens por tool call) e debita do saldo de créditos do usuário.

---

## 7. Segurança

### 7.1 Autenticação e Autorização

A autenticação utiliza OAuth 2.0 com sessões JWT assinadas pelo `JWT_SECRET`. O tRPC oferece dois tipos de procedures: `publicProcedure` (sem autenticação) e `protectedProcedure` (requer sessão válida). O contexto `ctx.user` é injetado automaticamente em procedures protegidas.

### 7.2 Isolamento de Dados

Todas as queries de dados são filtradas pelo `userId` do contexto autenticado. Não existe endpoint que permita acessar dados de outro usuário. A execução de código no sandbox é isolada e não tem acesso ao sistema host.

### 7.3 Proteção de API

O rate limiting em memória (20 msgs/min) protege contra flood. O Stripe webhook verifica assinatura criptográfica antes de processar eventos. Todas as comunicações são via HTTPS.

---

## 8. Testes

O projeto possui 60 testes automatizados distribuídos em 5 arquivos:

| Arquivo | Testes | Cobertura |
|---|---|---|
| `auth.logout.test.ts` | 1 | Fluxo de logout |
| `chat.test.ts` | 19 | CRUD de conversas, mensagens |
| `tools.test.ts` | 20 | Execução de ferramentas (DNS, SSL, HTTP, port scan) |
| `subscription.test.ts` | 10 | Status de assinatura, planos, pricing |
| `credits.test.ts` | 10 | Créditos, limites, contadores |

Os testes utilizam **Vitest** e criam contextos mock para simular usuários autenticados sem depender de banco de dados externo para testes unitários.

---

## 9. Decisões Arquiteturais

### 9.1 Por que tRPC em vez de REST?

O tRPC elimina a necessidade de definir contratos de API manualmente. Os tipos fluem do backend para o frontend automaticamente, reduzindo bugs de integração e acelerando o desenvolvimento. A combinação com Superjson permite retornar objetos Drizzle diretamente (incluindo `Date`).

### 9.2 Por que SSE em vez de WebSocket?

SSE é unidirecional (servidor → cliente), o que é suficiente para streaming de respostas do agente. É mais simples de implementar, funciona nativamente com HTTP/2, e não requer bibliotecas adicionais como Socket.io. Para o caso de uso do debuga.ai (streaming de texto), SSE é a escolha ideal.

### 9.3 Por que Drizzle em vez de Prisma?

Drizzle oferece queries SQL-like com type-safety, é mais leve que Prisma, e gera migrações SQL puras que podem ser aplicadas diretamente. A integração com tRPC via Superjson é nativa.

### 9.4 Por que Gemini 2.5 Flash?

O Gemini 2.5 Flash oferece o melhor custo-benefício para o caso de uso do debuga.ai: respostas rápidas, suporte nativo a tool calling, e preço acessível. A arquitetura permite trocar o provedor de LLM facilmente alterando apenas o módulo `server/_core/llm.ts`.

---

*Documento técnico — Sperry Tecnologia © 2026*
