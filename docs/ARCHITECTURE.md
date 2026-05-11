# debuga.ai — System Architecture

**Version:** 2.0  
**Date:** May 2026  
**Author:** Sperry Tecnologia  
**Audience:** Senior developers, technical leads, and infrastructure architects

---

## 1. High-Level Overview

debuga.ai is a production SaaS platform built on a **three-tier architecture** (client, application server, external services) with two distinctive design choices: **end-to-end type safety** via tRPC (eliminating API contract drift) and **real-time streaming** via Server-Sent Events (keeping the transport layer simple and HTTP/2-native). The architectural centerpiece is the **Agent Loop** — an autonomous reasoning-action-observation cycle that allows the AI to chain tool executions without human intervention.

### System Architecture Diagram

![System Architecture](/architecture-diagram.png)

The system follows a clear separation of concerns. The React SPA communicates with the Express backend through two channels: tRPC for structured CRUD operations and SSE for real-time agent streaming. The backend orchestrates LLM inference (hybrid cloud + on-premise), tool execution, billing enforcement, and data persistence.

---

## 2. Hybrid LLM Inference Layer

The most significant architectural decision is the **dual-inference topology** that combines cloud API calls with on-premise GPU inference:

### 2.1 Cloud Path (Primary)

General-purpose queries, tool calling orchestration, and conversational responses are routed to **Google Gemini 2.5 Flash** via the Forge API proxy. This path optimizes for latency and cost on standard IT support queries. The LLM wrapper (`server/_core/llm.ts`) abstracts the provider, making it trivial to swap to OpenAI, Anthropic, or any OpenAI-compatible endpoint.

### 2.2 On-Premise Path (Specialized)

Deep infrastructure analysis workloads are routed to a proprietary fine-tuned model running on dedicated hardware:

| Component | Specification |
|---|---|
| **GPU Cluster** | 16x NVIDIA RTX 3090 (24GB VRAM each, 384GB total) |
| **Servers** | 3x 4U rack-mount dedicated AI servers |
| **Model** | Custom fork fine-tuned on IT infrastructure, network security, and telecom datasets |
| **Inference** | vLLM / TGI serving with tensor parallelism across GPUs |
| **Interconnect** | NVLink where available, PCIe Gen4 x16 fallback |

The on-premise model excels at tasks that require domain-specific knowledge not well-represented in general-purpose LLM training data:

**Deep TCP/IP Analysis (L3–L7):** The model performs packet-level reasoning across the full OSI stack. At Layer 3, it analyzes IP header anomalies, TTL manipulation patterns, and fragmentation attacks. At Layer 4, it identifies TCP session hijacking indicators, SYN flood signatures, and connection state machine violations. At Layer 7, it performs Deep Packet Inspection (DPI) for protocol-specific threats including HTTP request smuggling, DNS tunneling, and TLS fingerprint analysis (JA3/JA3S hashing).

**Network Security Correlation:** The model cross-references heterogeneous data sources — firewall logs (iptables, pfSense), IDS/IPS alerts (Snort, Suricata), NetFlow/sFlow records, and SNMP traps — to construct attack timelines and identify root causes. It understands the temporal relationships between events that indicate lateral movement, privilege escalation, or data exfiltration.

**Infrastructure-Aware Reasoning:** Unlike general-purpose models, the fine-tuned model understands BGP routing tables, OSPF adjacency databases, VLAN topologies, and can reason about complex failure modes such as asymmetric routing, MTU black holes, spanning tree loops, and DHCP scope exhaustion.

### 2.3 Routing Logic

The inference router evaluates each incoming request against three criteria:

1. **Query complexity** — Simple lookups go to cloud; multi-step analysis goes to on-premise
2. **Domain specificity** — Network packet analysis, firewall rule evaluation → on-premise
3. **Latency requirements** — Real-time tool calling → cloud; batch analysis → on-premise

---

## 3. Frontend Architecture

### 3.1 Technology Choices

The frontend is a React 19 SPA styled with Tailwind CSS 4 and shadcn/ui components. The design language follows a **dark terminal aesthetic** (black background, green accent palette) that resonates with the target audience of IT professionals and security engineers.

Communication with the backend occurs through two distinct channels:

| Channel | Protocol | Purpose | Library |
|---|---|---|---|
| tRPC Client | HTTP/JSON (fetch) | CRUD operations (conversations, account, subscriptions) | `@trpc/react-query` |
| SSE Consumer | Server-Sent Events | Real-time agent response streaming | Native `EventSource` |

### 3.2 Route Structure

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `Home.tsx` | No | Landing page with hero, features, integrations, pricing |
| `/chat` | `ChatPage.tsx` | Yes | Chat interface with conversation sidebar |
| `/pricing` | `PricingPage.tsx` | No | Subscription plans with Stripe checkout |
| `/account` | `AccountPage.tsx` | Yes | User dashboard with credits, usage metrics, profile |

### 3.3 State Management

State is managed through three complementary mechanisms. **tRPC React Query** handles server data caching with automatic invalidation on mutations. **React Context** (`useAuth()`) provides global authentication state. **Local component state** (`useState` + `useRef`) manages the SSE streaming buffer for real-time chat rendering.

---

## 4. Agent Loop — Core Engine

The Agent Loop is the architectural centerpiece that transforms debuga.ai from a chatbot into an autonomous agent. It implements a **ReAct-style** [1] reasoning-action-observation cycle with up to 5 iterations per user message.

### Agent Flow Diagram

![Agent Flow](/agent-flow.png)

### 4.1 Execution Flow

When a user sends a message, the system executes a pre-flight check pipeline before invoking the LLM:

1. **Rate limit check** — 20 msgs/min per user (in-memory Map with 5-min cleanup interval)
2. **Plan limit check** — Daily message count and monthly conversation count against plan quotas
3. **Credit balance check** — Sufficient credits remaining for at least one response
4. **Context assembly** — Conversation history + system prompt + tool definitions

If all checks pass, the message is persisted to the database and the assembled context is sent to the LLM. The LLM responds with either a **text completion** (final answer) or a **tool call** (action request). In the tool call case, the system executes the requested tool, appends the result to the context, and re-invokes the LLM. This cycle repeats for up to 5 iterations, enabling complex multi-step diagnostics.

### 4.2 Tool Registry

| Tool | Implementation | Timeout | Output Limit |
|---|---|---|---|
| `execute_code` | `child_process.exec` in `/tmp` sandbox | 30s | 50KB |
| `port_scan` | TCP socket connection attempts | 30s | — |
| `dns_lookup` | `dns.promises.resolve` (Node.js native) | 10s | — |
| `ssl_check` | `tls.connect` with certificate extraction | 10s | — |
| `http_check` | `fetch` with header analysis | 10s | — |
| `whois_lookup` | WHOIS protocol query | 10s | — |
| `web_fetch` | `fetch` + HTML parsing | 15s | 50KB |
| `generate_image` | Internal ImageService API | 20s | — |

### 4.3 SSE Event Protocol

Responses are streamed to the client via Server-Sent Events with typed event names:

```
event: token
data: {"content": "partial text chunk"}

event: tool_start
data: {"name": "dns_lookup", "args": {"domain": "example.com", "type": "A"}}

event: tool_result
data: {"name": "dns_lookup", "result": "...resolved records..."}

event: done
data: {"tokensUsed": 1234, "creditsUsed": 5}

event: error
data: {"message": "Rate limit exceeded", "code": "RATE_LIMITED"}
```

---

## 5. Data Model

### Entity-Relationship Diagram

![Data Model](/data-model.png)

### 5.1 Schema Design

The database schema follows a **normalized design** with 6 tables managed by Drizzle ORM. All tables use auto-incrementing integer primary keys and UTC timestamps.

The **users** table stores OAuth accounts with role-based access control (`admin` | `user`). The `stripeCustomerId` field links to the Stripe customer object for billing operations. The **conversations** table supports pin and archive functionality with soft-delete semantics. Each conversation contains multiple **messages** that store the role (user/assistant/system/tool), content, serialized tool calls as JSON, and token count for billing.

On the financial side, **subscriptions** tracks Stripe subscription lifecycle (active, past_due, canceled) with period boundaries and cancellation flags. The **credits** table maintains per-user credit balance with `planId` as the source of truth — updated exclusively by Stripe webhooks to prevent desynchronization. The **usage_log** table provides a granular audit trail of every operation with token counts and credit consumption for analytics and dispute resolution.

### 5.2 Index Strategy

| Table | Index | Columns | Purpose |
|---|---|---|---|
| users | UNIQUE | openId | OAuth identity lookup |
| conversations | COMPOSITE | userId, createdAt | User conversation listing (sorted) |
| messages | COMPOSITE | conversationId, createdAt | Message pagination within conversation |
| subscriptions | COMPOSITE | userId, status | Active subscription lookup |
| credits | UNIQUE | userId | Single credit record per user |
| usage_log | COMPOSITE | userId, createdAt | Usage history with date filtering |

---

## 6. Billing Architecture

### Payment Flow Diagram

![Billing Flow](/billing-flow.png)

### 6.1 Checkout Flow

The billing system follows the **Stripe Checkout Session** pattern. The frontend requests a checkout session from the backend, which creates it with metadata linking the session to the authenticated user (`client_reference_id`, `metadata.user_id`). The user is redirected to Stripe's hosted checkout page, and upon completion, Stripe sends a webhook to the backend.

### 6.2 Webhook Event Handling

| Event | Backend Action |
|---|---|
| `checkout.session.completed` | Create/update subscription, reset credits to plan allocation, link Stripe customer ID |
| `customer.subscription.updated` | Sync subscription status (active, past_due, canceled) |
| `customer.subscription.deleted` | Downgrade to free tier, reset credits to 50 |
| `invoice.payment_failed` | Mark subscription as `past_due`, notify owner |

### 6.3 Three-Layer Consumption Control

The credit system implements defense-in-depth with three independent enforcement layers:

**Layer 1 — Rate Limiting (anti-flood):** An in-memory `Map<userId, timestamp[]>` tracks message timestamps per user. Requests exceeding 20/minute receive a `429 Too Many Requests` response. The map is garbage-collected every 5 minutes to prevent memory leaks. Admin users bypass this layer.

**Layer 2 — Plan Quotas (business logic):** Before each LLM invocation, the system queries `getTodayMessageCount()` and `getMonthConversationCount()` against the user's plan limits. This prevents unnecessary API costs by rejecting messages before they reach the LLM. Admin users bypass this layer.

**Layer 3 — Credit Debit (metering):** After each successful response, token consumption is estimated (~4 characters per token + 50 tokens per tool call) and debited from the user's credit balance. The debit is logged to `usage_log` for audit purposes.

---

## 7. Security Architecture

The codebase has passed a full production security audit (see [SECURITY_AUDIT.md](SECURITY_AUDIT.md)):

**Secret Management:** All sensitive values are injected via environment variables at runtime. The `.gitignore` excludes `.env*` files. Frontend code only accesses `VITE_`-prefixed variables (public keys by design). Server-side secrets (`STRIPE_SECRET_KEY`, `JWT_SECRET`, `DATABASE_URL`, `BUILT_IN_FORGE_API_KEY`) never reach the client bundle.

**Authentication:** OAuth 2.0 with JWT session cookies signed by `JWT_SECRET`. The tRPC layer provides `publicProcedure` and `protectedProcedure` abstractions. All data queries are scoped to `ctx.user.id` from the authenticated session (IDOR-safe by construction).

**Webhook Integrity:** Stripe webhooks are verified using `stripe.webhooks.constructEvent()` with the webhook signing secret before any event processing.

**Code Execution Sandbox:** The `execute_code` tool runs user-provided code in `/tmp` with a 30-second timeout and 50KB output limit. For self-hosted deployments, Docker-based sandboxing is recommended (see [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)).

---

## 8. Architectural Decisions Record (ADR)

### ADR-001: tRPC over REST

**Context:** The application requires tight frontend-backend type coupling for rapid iteration. **Decision:** Use tRPC 11 with Superjson serialization. **Consequence:** Zero API contract files, compile-time type checking across the stack, native `Date`/`BigInt` serialization. Trade-off: tRPC is less suitable for public API consumption (addressed in v6.0 roadmap with REST API layer).

### ADR-002: SSE over WebSocket

**Context:** The streaming requirement is unidirectional (server → client). **Decision:** Use Server-Sent Events instead of WebSocket. **Consequence:** Simpler implementation, native HTTP/2 multiplexing, no Socket.io dependency, automatic reconnection built into the `EventSource` API. Trade-off: No bidirectional communication (not needed for this use case).

### ADR-003: Drizzle over Prisma

**Context:** The ORM must generate predictable SQL and support pure SQL migrations for production database management. **Decision:** Use Drizzle ORM. **Consequence:** SQL-like query API, lighter runtime (~50KB vs Prisma's ~2MB), pure `.sql` migration files that can be reviewed and applied manually. Trade-off: Smaller ecosystem and community compared to Prisma.

### ADR-004: Hybrid LLM Architecture

**Context:** General-purpose cloud LLMs lack domain-specific knowledge for deep network analysis. **Decision:** Implement a routing layer that dispatches to cloud LLM (Gemini) for general queries and on-premise GPU cluster for specialized infrastructure analysis. **Consequence:** Best-of-both-worlds: low latency and cost for simple queries, deep domain expertise for complex analysis. Trade-off: Operational complexity of maintaining on-premise GPU infrastructure.

### ADR-005: Credit-Based Billing over Per-Request Pricing

**Context:** Users need predictable monthly costs while the platform needs to prevent abuse. **Decision:** Implement a credit system with monthly allocation per plan tier. **Consequence:** Users get a clear budget, the platform has three layers of consumption control, and the billing model is simple to communicate. Trade-off: Credit estimation is approximate (~4 chars/token), which may slightly over- or under-charge individual requests.

---

## 9. Deployment Topology

### Current (Manus Hosting)

```
[Cloudflare CDN] → [debuga.ai] → [Manus Platform]
                                    ├── Express Server (Node.js)
                                    ├── TiDB Database
                                    ├── S3 Storage
                                    └── Forge API (LLM Proxy)
```

### Self-Hosted (Future)

```
[Cloudflare CDN] → [debuga.ai] → [Docker Compose]
                                    ├── app (Node.js container)
                                    ├── db (MySQL 8.0)
                                    ├── redis (session cache)
                                    └── sandbox (code execution)
                                  [On-Premise GPU Cluster]
                                    ├── vLLM / TGI inference server
                                    └── 16x RTX 3090 (3 servers)
```

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for detailed self-hosting instructions.

---

*Technical Architecture Document — Sperry Tecnologia © 2026*

[1]: https://arxiv.org/abs/2210.03629 "ReAct: Synergizing Reasoning and Acting in Language Models"
