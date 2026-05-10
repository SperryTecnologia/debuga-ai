# debuga.ai

**Agente Autônomo de IA para Infraestrutura de TI, Segurança da Informação e Telecomunicações**

Desenvolvido por [Sperry Tecnologia](https://www.sperrytecnologia.com.br)

---

## Sobre o Projeto

O debuga.ai é uma plataforma SaaS que oferece um agente autônomo de inteligência artificial especializado em infraestrutura de TI, cibersegurança, DevOps e telecomunicações. Diferente de chatbots convencionais, o debuga.ai **executa ações reais**: roda código em sandbox, escaneia portas, verifica certificados SSL, consulta DNS e gera relatórios técnicos de forma autônoma.

O agente opera em um loop de até 5 iterações, decidindo autonomamente quais ferramentas usar para resolver cada problema. Isso permite diagnósticos complexos que exigem múltiplas consultas encadeadas — algo que nenhum chatbot generalista oferece.

---

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Tailwind CSS 4, tRPC Client, shadcn/ui |
| Backend | Node.js, Express 4, tRPC 11, Drizzle ORM |
| Banco de Dados | MySQL / TiDB |
| LLM | Google Gemini 2.5 Flash (via API) |
| Streaming | Server-Sent Events (SSE) |
| Pagamentos | Stripe (BRL, com suporte a PIX) |
| Armazenamento | S3 (compatível) |
| Autenticação | OAuth 2.0 |
| Testes | Vitest (60 testes automatizados) |

---

## Funcionalidades

### Agente Autônomo com 8 Ferramentas

O agente possui acesso a ferramentas especializadas que executa de forma autônoma durante a conversa:

- **Execução de Código** — Sandbox isolada para Python e Bash
- **Port Scan** — Varredura de portas abertas em hosts remotos
- **DNS Lookup** — Consultas DNS completas (A, AAAA, MX, NS, TXT, CNAME)
- **SSL/TLS Check** — Verificação de certificados, cadeia e expiração
- **HTTP Check** — Análise de headers, status codes e segurança web
- **WHOIS Lookup** — Consulta de informações de domínio
- **Navegação Web** — Acesso e extração de conteúdo de páginas
- **Geração de Imagens** — Criação de diagramas e fluxogramas

### Sistema de Créditos e Billing

- 4 planos de assinatura (Gratuito, Starter, Pro, Enterprise)
- Consumo proporcional de créditos por tokens utilizados
- Limites por plano: mensagens/dia, conversas/mês, créditos totais
- Rate limiting: 20 mensagens/minuto por usuário
- Integração completa com Stripe (checkout, webhooks, portal do cliente)
- Downgrade automático ao cancelar assinatura

### Interface Profissional

- Chat com streaming em tempo real (SSE)
- Sidebar com histórico de conversas (pin, archive, delete)
- Renderização Markdown com syntax highlighting
- Indicadores visuais de tool calls do agente
- Dashboard de conta com métricas de uso
- Landing page com seções de recursos, integrações e pricing
- Tema escuro com paleta verde (identidade visual de terminal)

---

## Estrutura do Projeto

```
debuga-ai/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/             # Páginas (Home, Chat, Pricing, Account)
│   │   ├── components/        # Componentes reutilizáveis + shadcn/ui
│   │   ├── contexts/          # React contexts (Auth)
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # tRPC client, utils
│   │   ├── App.tsx            # Rotas e layout
│   │   └── index.css          # Tema global (Tailwind)
│   └── index.html
├── server/                    # Backend Node.js
│   ├── _core/                 # Framework (OAuth, context, LLM, env)
│   ├── routers.ts             # Procedures tRPC
│   ├── db.ts                  # Query helpers (Drizzle)
│   ├── streamRoute.ts         # SSE streaming + agent loop
│   ├── stripeRoutes.ts        # Stripe checkout + webhooks
│   ├── products.ts            # Definição de planos
│   ├── tools.ts               # Ferramentas do agente
│   ├── credits.test.ts        # Testes de créditos
│   ├── chat.test.ts           # Testes de chat
│   ├── tools.test.ts          # Testes de ferramentas
│   └── subscription.test.ts   # Testes de assinatura
├── drizzle/                   # Schema e migrações SQL
│   └── schema.ts              # Tabelas: users, conversations, messages,
│                              #   subscriptions, credits, usage_log
├── shared/                    # Tipos e constantes compartilhadas
├── docs/                      # Documentação
│   ├── WHITEPAPER_PT-BR.md    # Whitepaper em português
│   ├── WHITEPAPER_EN.md       # Whitepaper em inglês
│   ├── ARCHITECTURE.md        # Documentação de arquitetura
│   └── MIGRATION_GUIDE.md     # Guia de migração para hosting próprio
└── todo.md                    # Tracking de features e bugs
```

---

## Modelo de Dados

O banco de dados utiliza 6 tabelas principais gerenciadas pelo Drizzle ORM:

| Tabela | Descrição |
|---|---|
| `users` | Cadastro com OAuth, roles (admin/user), Stripe customer ID |
| `conversations` | Conversas com suporte a pin, archive, timestamps |
| `messages` | Mensagens com role, tool_calls JSON, token count |
| `subscriptions` | Assinaturas Stripe (status, período, cancelamento) |
| `credits` | Créditos por usuário (total, usado, planId) |
| `usage_log` | Histórico detalhado de consumo por conversa |

---

## Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string MySQL/TiDB |
| `JWT_SECRET` | Secret para assinatura de sessões |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret para verificação de webhooks |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública do Stripe |
| `BUILT_IN_FORGE_API_KEY` | Token para API de LLM (server-side) |
| `BUILT_IN_FORGE_API_URL` | URL da API de LLM |

---

## Testes

O projeto possui 60 testes automatizados cobrindo:

- **auth.logout.test.ts** — Fluxo de logout
- **chat.test.ts** — Criação de conversas, mensagens, CRUD
- **tools.test.ts** — Execução de ferramentas do agente (DNS, SSL, HTTP, port scan)
- **subscription.test.ts** — Status de assinatura, planos, pricing
- **credits.test.ts** — Sistema de créditos, limites, contadores

```bash
pnpm test
```

---

## Desenvolvimento Local

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env

# Gerar migrações do banco
pnpm drizzle-kit generate

# Iniciar servidor de desenvolvimento
pnpm dev

# Rodar testes
pnpm test
```

---

## Documentação

- [Whitepaper (PT-BR)](docs/WHITEPAPER_PT-BR.md) — Documento técnico completo do projeto
- [Whitepaper (EN)](docs/WHITEPAPER_EN.md) — Technical whitepaper in English
- [Arquitetura](docs/ARCHITECTURE.md) — Documentação detalhada da arquitetura
- [Guia de Migração](docs/MIGRATION_GUIDE.md) — Como migrar para hosting próprio com Google OAuth

---

## Roadmap

- **v4.0 (Atual)** — Agente autônomo, billing, créditos, 8 ferramentas
- **v5.0 (Q3 2026)** — Google OAuth, Zabbix/Wazuh API, cupons educacionais
- **v6.0 (Q4 2026)** — API pública, memória de longo prazo, marketplace
- **v7.0 (2027)** — Multi-tenancy, white-label, agente remoto

---

## Licença

Proprietário — Sperry Tecnologia © 2026. Todos os direitos reservados.

---

*Desenvolvido por [Sperry Tecnologia](https://www.sperrytecnologia.com.br)*
