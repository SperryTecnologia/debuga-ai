<p align="center">
  <strong>debuga.ai</strong><br>
  <em>Autonomous AI Agent for IT Infrastructure, Cybersecurity & Telecommunications</em>
</p>

<p align="center">
  <a href="https://debuga.ai">Live Demo</a> · 
  <a href="docs/WHITEPAPER_PT-BR.md">Whitepaper PT-BR</a> · 
  <a href="docs/WHITEPAPER_EN.md">Whitepaper EN</a> · 
  <a href="docs/ARCHITECTURE.md">Architecture</a> · 
  <a href="docs/MIGRATION_GUIDE.md">Self-Hosting Guide</a>
</p>

---

## Overview

**debuga.ai** is a production SaaS platform that delivers an autonomous AI agent specialized in IT infrastructure, cybersecurity, DevOps, and telecommunications. Unlike conventional chatbots that only generate text, debuga.ai **executes real actions**: it runs code in sandboxed environments, scans open ports, verifies SSL certificates, queries DNS records, and generates technical reports — all autonomously, without human intervention between steps.

The core differentiator is the **Agent Loop** — a reasoning-action-observation cycle that iterates up to 5 times per user message. The agent decides which tools to invoke, interprets results, and chains operations to solve complex diagnostic problems that require multiple correlated queries. This architecture is inspired by the ReAct paradigm [1] and brings agentic capabilities to the IT operations domain.

Built and maintained by **[Sperry Tecnologia](https://www.sperrytecnologia.com.br)** — a company specialized in AI-powered solutions using the Manus.im platform, offering debuga.ai as a service and training product for IT professionals through the **Open Infra Pro** program.

---

## Hybrid LLM Architecture

debuga.ai operates on a **hybrid inference architecture** that combines cloud-based LLMs with proprietary on-premise GPU infrastructure:

| Layer | Infrastructure | Role |
|---|---|---|
| **Cloud LLM** | Google Gemini 2.5 Flash (via API) | Primary inference for general queries, tool calling, streaming |
| **On-Premise LLM** | Custom fork — 16x NVIDIA RTX 3090 GPUs | Deep analysis, TCP/IP packet inspection, specialized IT models |
| **Hardware** | 3x 4U rack-mount servers (dedicated AI) | Low-latency inference for network security workloads |

The on-premise cluster runs a proprietary fine-tuned model (fork) optimized for:

- **Deep TCP/IP analysis** — Layer 3 through Layer 7 packet inspection, protocol anomaly detection, traffic pattern classification, and DPI (Deep Packet Inspection) for identifying malicious payloads, lateral movement indicators, and C2 communication patterns.
- **Network security correlation** — Cross-referencing firewall logs, IDS/IPS alerts, NetFlow data, and SNMP traps to build attack timelines and identify root causes that cloud models miss due to lack of domain-specific training data.
- **Infrastructure-aware reasoning** — The model understands BGP routing tables, OSPF adjacencies, VLAN topologies, and can reason about network segmentation failures, MTU mismatches, and asymmetric routing issues.

The routing layer decides which model handles each request based on query complexity, required latency, and domain specificity. Simple queries go to the cloud LLM; deep infrastructure analysis is routed to the on-premise cluster.

---

## Technical Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui | Type-safe UI with modern component library |
| RPC | tRPC 11 + Superjson | End-to-end type safety, zero API contract files |
| Backend | Node.js, Express 4 | Lightweight HTTP server with SSE support |
| ORM | Drizzle ORM | SQL-like queries with TypeScript types, pure SQL migrations |
| Database | MySQL / TiDB | ACID-compliant with horizontal scaling capability |
| Streaming | Server-Sent Events (SSE) | Unidirectional real-time streaming (simpler than WebSocket for this use case) |
| Payments | Stripe (BRL, subscriptions + webhooks) | PCI-compliant billing with Brazilian Real support |
| Storage | S3-compatible | Object storage for generated artifacts |
| Auth | OAuth 2.0 + JWT sessions | Stateless authentication with signed cookies |
| Testing | Vitest (60 automated tests) | Fast unit testing with mock contexts |

---

## Agent Tools

The agent has access to 8 specialized tools that it invokes autonomously during the reasoning loop:

| Tool | Function | Timeout | Use Case |
|---|---|---|---|
| `execute_code` | Sandboxed Python/Bash execution | 30s | Automation scripts, data processing, config generation |
| `port_scan` | TCP port scanning on remote hosts | 30s | Security audits, service discovery, firewall validation |
| `dns_lookup` | Full DNS queries (A, AAAA, MX, NS, TXT, CNAME, SOA) | 10s | DNS resolution diagnostics, mail server verification |
| `ssl_check` | SSL/TLS certificate chain verification | 10s | Certificate expiration detection, chain validation, cipher analysis |
| `http_check` | HTTP header analysis and security scoring | 10s | Security header audit (HSTS, CSP, X-Frame-Options) |
| `whois_lookup` | Domain WHOIS information retrieval | 10s | Domain ownership investigation, registrar identification |
| `web_fetch` | Web content extraction and parsing | 15s | Documentation lookup, API reference retrieval |
| `generate_image` | AI-powered image generation | 20s | Network diagrams, architecture flowcharts, topology maps |

Each tool execution is logged with token count and credited against the user's plan. The agent can chain multiple tools in a single conversation turn (e.g., DNS lookup → SSL check → HTTP check for a complete domain audit).

---

## Billing & Credit System

The platform implements a three-layer consumption control system:

**Layer 1 — Rate Limiting:** 20 messages per minute per user (in-memory with automatic cleanup). Protects against flood and abuse.

**Layer 2 — Plan Limits:** Per-message enforcement of daily message quota and monthly conversation quota. Checked before LLM invocation to prevent unnecessary API costs.

**Layer 3 — Credit Consumption:** Post-response token counting (~4 chars/token + 50 tokens/tool call) with automatic debit from user balance. Credits reset monthly via Stripe subscription webhook.

| Plan | Price (BRL/mo) | Messages/day | Conversations/mo | Credits |
|---|---|---|---|---|
| Free | R$ 0 | 5 | 3 | 50 |
| Starter | R$ 49,90 | 100 | 30 | 1.000 |
| Pro | R$ 149,90 | Unlimited | Unlimited | 10.000 |
| Enterprise | R$ 499,90 | Unlimited | Unlimited | 100.000 |

Stripe integration handles checkout sessions, subscription lifecycle webhooks (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`), and automatic downgrade to free tier on cancellation.

---

## Project Structure

```
debuga-ai/
├── client/                        # React 19 SPA
│   ├── src/
│   │   ├── pages/                 # Route-level components
│   │   │   ├── Home.tsx           # Landing page (hero, features, pricing)
│   │   │   ├── ChatPage.tsx       # Chat interface with conversation sidebar
│   │   │   ├── PricingPage.tsx    # Subscription plans with Stripe checkout
│   │   │   └── AccountPage.tsx    # User dashboard (credits, usage, profile)
│   │   ├── components/            # Reusable UI + shadcn/ui primitives
│   │   ├── contexts/              # Auth context (useAuth hook)
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/trpc.ts            # tRPC client binding
│   │   ├── App.tsx                # Route definitions and layout
│   │   └── index.css              # Global theme (dark, green terminal palette)
│   └── index.html
├── server/                        # Node.js + Express backend
│   ├── _core/                     # Framework internals (OAuth, JWT, LLM, env)
│   ├── routers.ts                 # tRPC procedures (auth, chat, account, subscription)
│   ├── db.ts                      # Drizzle query helpers
│   ├── streamRoute.ts             # SSE streaming + agent loop + rate limiting + credit consumption
│   ├── stripeRoutes.ts            # Stripe checkout + webhook handlers
│   ├── agentTools.ts              # Tool implementations (port scan, DNS, SSL, etc.)
│   ├── tools.ts                   # Tool definitions and dispatcher
│   ├── products.ts                # Plan definitions and pricing
│   ├── *.test.ts                  # Vitest test suites (60 tests)
│   └── storage.ts                 # S3 helpers
├── drizzle/                       # Database schema and migrations
│   └── schema.ts                  # 6 tables: users, conversations, messages,
│                                  #   subscriptions, credits, usage_log
├── shared/                        # Shared types and constants
├── docs/                          # Technical documentation
│   ├── WHITEPAPER_PT-BR.md        # Whitepaper (Portuguese)
│   ├── WHITEPAPER_EN.md           # Whitepaper (English)
│   ├── ARCHITECTURE.md            # System architecture with diagrams
│   ├── MIGRATION_GUIDE.md         # Self-hosting guide (Docker + Google OAuth)
│   ├── SECURITY_AUDIT.md          # Production security audit report
│   └── STRIPE_PRODUCTION_GUIDE.md # Stripe go-live checklist
└── todo.md                        # Feature and bug tracking
```

---

## Data Model

6 tables managed by Drizzle ORM with typed schema:

| Table | Purpose | Key Relations |
|---|---|---|
| `users` | OAuth accounts, roles (admin/user), Stripe customer ID | 1:N conversations, 1:1 credits |
| `conversations` | Chat sessions with pin/archive support | N:1 user, 1:N messages |
| `messages` | Content, role, tool_calls (JSON), token count | N:1 conversation |
| `subscriptions` | Stripe subscription state, period, cancellation flag | N:1 user |
| `credits` | Balance per user (total, used, planId as source of truth) | 1:1 user |
| `usage_log` | Per-operation audit trail (tokens, credits, conversation) | N:1 user |

All user-scoped queries are filtered by `ctx.user.id` from the authenticated JWT session. No endpoint allows cross-user data access (IDOR-safe by design).

---

## Security

The codebase has passed a full production security audit (see [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)):

- **Zero hardcoded secrets** — All sensitive values (Stripe keys, JWT secret, database URL, LLM API keys) are injected via environment variables at runtime.
- **Frontend isolation** — Only `VITE_`-prefixed variables (public keys) are accessible in the browser bundle. Server-side secrets never reach the client.
- **Webhook signature verification** — Stripe webhooks are verified with `stripe.webhooks.constructEvent()` before processing.
- **Rate limiting** — 20 msgs/min per user with in-memory tracking and automatic cleanup.
- **Sandboxed code execution** — The `execute_code` tool runs in `/tmp` with 30s timeout and 50KB output limit.
- **HTTPS-only** — All communications are encrypted in transit.

---

## Testing

```bash
pnpm test    # 60 tests, ~4s execution time
```

| Suite | Tests | Coverage |
|---|---|---|
| `auth.logout.test.ts` | 1 | Logout flow and session cleanup |
| `chat.test.ts` | 19 | Conversation CRUD, message creation, pagination |
| `tools.test.ts` | 20 | All 8 agent tools (DNS, SSL, HTTP, port scan, code exec, etc.) |
| `subscription.test.ts` | 10 | Subscription status, plan mapping, pricing |
| `credits.test.ts` | 10 | Credit balance, plan limits, daily/monthly counters |

Tests use Vitest with mock contexts to simulate authenticated users without external database dependencies.

---

## Local Development

```bash
# Prerequisites: Node.js 22+, pnpm
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, STRIPE keys, etc.

# Generate database migrations
pnpm drizzle-kit generate

# Start development server (hot reload)
pnpm dev

# Run test suite
pnpm test
```

---

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API layer | tRPC over REST | End-to-end type safety, zero contract files, Superjson for native Date/BigInt |
| Streaming | SSE over WebSocket | Unidirectional (server→client) is sufficient; simpler, HTTP/2 native, no Socket.io dependency |
| ORM | Drizzle over Prisma | SQL-like API, lighter runtime, pure SQL migrations, better tRPC integration |
| Primary LLM | Gemini 2.5 Flash | Best cost/performance ratio for tool calling; architecture is provider-agnostic (swap via `llm.ts`) |
| Payments | Stripe | PCI-compliant, BRL support, subscription lifecycle webhooks, promotion codes |

---

## Roadmap

| Version | Timeline | Features |
|---|---|---|
| **v4.0** (Current) | Q2 2026 | Autonomous agent, 8 tools, billing, credits, hybrid LLM |
| **v5.0** | Q3 2026 | Google OAuth (self-hosted), Zabbix/Wazuh API integration, educational coupons |
| **v6.0** | Q4 2026 | Public REST API, long-term memory, tool marketplace |
| **v7.0** | 2027 | Multi-tenancy, white-label, remote agent execution |

---

## Documentation

| Document | Language | Description |
|---|---|---|
| [Whitepaper](docs/WHITEPAPER_PT-BR.md) | PT-BR | Technical whitepaper with market analysis, architecture, business model |
| [Whitepaper](docs/WHITEPAPER_EN.md) | EN | English version of the technical whitepaper |
| [Architecture](docs/ARCHITECTURE.md) | PT-BR | Detailed architecture with 4 rendered diagrams |
| [Migration Guide](docs/MIGRATION_GUIDE.md) | PT-BR | Self-hosting guide with Docker, Google OAuth, Cloudflare |
| [Security Audit](docs/SECURITY_AUDIT.md) | PT-BR | Production security audit report |
| [Stripe Guide](docs/STRIPE_PRODUCTION_GUIDE.md) | PT-BR | Stripe go-live checklist and configuration |

---

## License

Proprietary — Sperry Tecnologia © 2026. All rights reserved.

---

*Built by [Sperry Tecnologia](https://www.sperrytecnologia.com.br) — Specialists in AI-powered IT solutions*

[1]: https://arxiv.org/abs/2210.03629 "ReAct: Synergizing Reasoning and Acting in Language Models"
