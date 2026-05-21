# Technical Architecture — debuga.ai

**Detailed Architecture Documentation for the Operational AI Platform**

Version 2.0 | May 2026 | Sperry Tecnologia

---

## Overview

debuga.ai is built on a layered architecture with clear separation of concerns, enabling horizontal scalability, component replacement, and flexible deployment (cloud, VPS, on-premise, or hybrid). Each layer communicates exclusively via well-defined internal APIs.

```mermaid
graph TB
    subgraph "Internet"
        USER["User / Operator"]
    end

    subgraph "Perimeter — Cloudflare"
        CF[WAF + DDoS - DNS Proxy]
    end

    subgraph "Reverse Proxy — NGINX"
        NGINX[TLS Termination - Rate Limiting - Static Files]
    end

    subgraph "Application — Node.js"
        direction TB
        subgraph "Frontend — React 19"
            CHAT[Chat UI - Streaming SSE]
            ADMIN["Admin Panel - shadcn/ui"]
            LAND[Landing Page - White Label]
        end
        subgraph "Backend — Express + tRPC"
            AUTH[Auth Module - JWT + OAuth 2.0]
            BILLING[Billing Module - Stripe Webhooks]
            STREAM[Stream Module - SSE + Tool Calling]
            APIADM[Admin API - Management + Metrics]
        end
    end

    subgraph "Orchestration"
        AGENT[Autonomous Agent - Reasoning Loop]
        ROUTER[LLM Router - Priority + Fallback]
        TOOLKIT["Toolkit - DNS/SSL/HTTP/WHOIS/Port"]
    end

    subgraph "Inference"
        OLLAMA[Ollama - Local GPU + CUDA]
        OPENAI["OpenAI - GPT-4o / o1"]
        ANTHROPIC[Anthropic - Claude 3.5]
        GEMINI["Google Gemini - 2.0 Flash / Pro"]
        OPENROUTER[OpenRouter - Multi-model]
    end

    subgraph "Persistence"
        PG[(PostgreSQL 16 - Data + Audit)]
        MINIO[("MinIO S3 - Objects + Uploads")]
        REDIS[(Redis - Cache + Sessions)]
    end

    USER --> CF --> NGINX
    NGINX --> CHAT
    NGINX --> ADMIN
    NGINX --> LAND
    NGINX --> AUTH
    NGINX --> BILLING
    NGINX --> STREAM
    NGINX --> APIADM
    STREAM --> AGENT
    AGENT --> ROUTER
    AGENT --> TOOLKIT
    ROUTER --> OLLAMA
    ROUTER --> OPENAI
    ROUTER --> ANTHROPIC
    ROUTER --> GEMINI
    ROUTER --> OPENROUTER
    AUTH --> PG
    AUTH --> REDIS
    BILLING --> PG
    AGENT --> PG
    AGENT --> MINIO
```

---

## Presentation Layer

The interface is built with React 19, Tailwind CSS 4, and shadcn/ui, served as a SPA with SSE for streaming agent responses.

```mermaid
graph LR
    subgraph "React 19 SPA"
        direction TB
        ROUTER2[Wouter Router]
        ROUTER2 --> HOME["Home / Landing"]
        ROUTER2 --> LOGIN["Login / Register"]
        ROUTER2 --> CHATPAGE[Chat Interface]
        ROUTER2 --> ADMINPAGE[Admin Dashboard]
        ROUTER2 --> ACCOUNT["Account / Billing"]
    end

    subgraph "Core Components"
        CHATBOX[AIChatBox - Streaming + Markdown]
        TURNSTILE[Turnstile Widget - Anti-bot]
        SIDEBAR[Dashboard Layout - Sidebar + Nav]
        THEME["Theme Provider - Dark / Light"]
    end

    subgraph "State and Communication"
        TRPC[tRPC Client - Type-safe RPC]
        AUTHCTX[Auth Context - useAuth Hook]
        QUERY[TanStack Query - Cache + Revalidation]
    end

    CHATPAGE --> CHATBOX
    LOGIN --> TURNSTILE
    ADMINPAGE --> SIDEBAR
    HOME --> THEME
    CHATBOX --> TRPC
    TRPC --> QUERY
    TRPC --> AUTHCTX
```

| Component | Technology | Responsibility |
|-----------|-----------|----------------|
| **Chat UI** | React 19 + Tailwind 4 + Streamdown | Conversational interface with SSE streaming, Markdown rendering, code blocks with syntax highlighting |
| **Admin Panel** | React + shadcn/ui + Recharts | User management, usage metrics, system settings, audit logs |
| **Landing Page** | React + Tailwind (white label) | Customizable public page: branding, colors, text, plans, custom domain |
| **Login / Register** | React + Turnstile + OAuth | Local authentication with email verification, Google OAuth, anti-bot protection |
| **Account / Billing** | React + Stripe Elements | Account management, plans, payment history, usage limits |

---

## API Layer

The API uses tRPC for end-to-end type-safe communication between frontend and backend, eliminating the need for shared schemas or code generation.

```mermaid
graph TB
    subgraph "Express Server"
        direction TB
        CORS["CORS + Trust Proxy"]
        COOKIE["Cookie Parser - Signed Cookies"]
        TRPCMW["tRPC Middleware - Context Builder"]
    end

    subgraph "tRPC Router"
        direction TB
        AUTHROUTER["auth.* — me / logout"]
        CHATROUTER["chat.* — list / create / stream"]
        ADMINROUTER["admin.* — users / settings / metrics"]
        ACCOUNTROUTER["account.* — profile / billing / usage"]
        SYSTEMROUTER["system.* — health / notify"]
    end

    subgraph "REST Endpoints"
        OAUTH["OAuth callback — Google"]
        LOCALAUTH["Auth — register / login / verify"]
        STRIPE["Stripe webhook — Events"]
        HEALTH["Health — status check"]
        STREAMEP["Stream — SSE Streaming"]
    end

    CORS --> COOKIE --> TRPCMW
    TRPCMW --> AUTHROUTER
    TRPCMW --> CHATROUTER
    TRPCMW --> ADMINROUTER
    TRPCMW --> ACCOUNTROUTER
    TRPCMW --> SYSTEMROUTER
    CORS --> OAUTH
    CORS --> LOCALAUTH
    CORS --> STRIPE
    CORS --> HEALTH
    CORS --> STREAMEP
```

| Module | Type | Function | Authentication |
|--------|------|----------|----------------|
| **auth** | tRPC | Session state, logout | Public (me) / Protected (logout) |
| **chat** | tRPC + REST | Conversation CRUD, SSE streaming | Protected |
| **admin** | tRPC | User management, settings, metrics | Admin only |
| **account** | tRPC | Profile, billing, usage, limits | Protected |
| **system** | tRPC | Health check, notifications | Public / Protected |
| **OAuth** | REST | Google OAuth 2.0 callback | Public |
| **Local Auth** | REST | Register, login, verify email, forgot password | Public (rate limited) |
| **Stripe** | REST | Payment webhooks | Signature verification |
| **Stream** | REST (SSE) | Agent response streaming | Protected + email verification |

---

## Orchestration Layer

The autonomous agent operates in a reasoning loop that analyzes the query, decides which tools to invoke, executes them sequentially, and synthesizes the final response.

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Server
    participant A as Autonomous Agent
    participant R as LLM Router
    participant LLM as LLM Provider
    participant T as Toolkit
    participant DB as PostgreSQL

    U->>API: Send message (POST /api/stream)
    API->>API: Validate session + email verification
    API->>API: Check usage limits (plan)
    API->>DB: Load conversation history
    API->>A: Start reasoning loop

    loop Reasoning Loop
        A->>R: Request inference (messages + tools)
        R->>R: Select provider (priority + availability)
        R->>LLM: Send request
        LLM-->>R: Response (text or tool_call)
        R-->>A: Return response

        alt Tool Call
            A->>T: Execute tool (DNS/SSL/HTTP/...)
            T-->>A: Tool result
            A->>U: SSE: step (tool executed)
        else Text Response
            A->>U: SSE: content (text streaming)
        end
    end

    A->>DB: Save message + metadata
    A->>DB: Record audit log
    A->>U: SSE: done
```

### Multi-Provider LLM Routing

The router selects the most suitable provider based on a configurable priority chain:

```mermaid
flowchart TD
    START[New Inference - Request] --> CHECK1{Local GPU - available?}

    CHECK1 -->|Yes| OLLAMA[Ollama - Cost: Zero - Latency: Low]
    CHECK1 -->|No| CHECK2{Gemini - configured?}

    CHECK2 -->|Yes| GEMINI[Google Gemini - Cost: Low - Context: 1M tokens]
    CHECK2 -->|No| CHECK3{OpenAI - configured?}

    CHECK3 -->|Yes| OPENAI[OpenAI - Cost: Medium - Reasoning: Excellent]
    CHECK3 -->|No| CHECK4{Anthropic - configured?}

    CHECK4 -->|Yes| ANTHROPIC[Anthropic - Cost: Medium - Analysis: Excellent]
    CHECK4 -->|No| CHECK5{OpenRouter - configured?}

    CHECK5 -->|Yes| OPENROUTER[OpenRouter - Cost: Variable - Multi-model]
    CHECK5 -->|No| ERROR[Error: No provider - available]

    OLLAMA --> LOG[Log provider - + tokens + latency]
    GEMINI --> LOG
    OPENAI --> LOG
    ANTHROPIC --> LOG
    OPENROUTER --> LOG
    LOG --> RETURN[Return response - to agent]
```

| Provider | Priority | Type | Default Model | Use Case |
|----------|----------|------|---------------|----------|
| **Ollama** | 1 (highest) | Local | Qwen 2.5 Coder 32B | General use, zero cost, local data |
| **Google Gemini** | 2 | Cloud | Gemini 2.0 Flash | Long context (1M tokens), cost-effective |
| **OpenAI** | 3 | Cloud | GPT-4o | Complex reasoning, advanced tool calling |
| **Anthropic** | 4 | Cloud | Claude 3.5 Sonnet | Long analysis, code, documentation |
| **OpenRouter** | 5 | Cloud | Variable | Access to additional models, final fallback |

---

## Inference Layer

### Local GPU with Ollama

Local inference uses Ollama with NVIDIA CUDA support, ensuring sensitive data never leaves the operator's environment:

```mermaid
graph LR
    subgraph "Operator Server"
        subgraph "Docker — Ollama Container"
            OLLAMA2[Ollama Server - :11434]
            MODEL[Active Model - Qwen 2.5 Coder 32B]
            CUDA[NVIDIA CUDA - GPU Runtime]
        end
        subgraph "Docker — App Container"
            APP[debuga-app - Node.js]
        end
        subgraph "Hardware"
            GPU2[NVIDIA GPU - 24+ GB VRAM]
            RAM2[System RAM - 32+ GB]
            NVME[NVMe Storage - Models + Data]
        end
    end

    APP -->|HTTP :11434| OLLAMA2
    OLLAMA2 --> MODEL
    MODEL --> CUDA
    CUDA --> GPU2
    OLLAMA2 --> RAM2
    MODEL --> NVME
```

| Aspect | Specification |
|--------|---------------|
| **Runtime** | Ollama with NVIDIA Container Toolkit |
| **GPU** | NVIDIA with 24+ GB VRAM (RTX 3090/4090, A100, H100) |
| **Default Model** | Qwen 2.5 Coder 32B (optimized for technical context) |
| **Quantization** | GGUF Q4_K_M (balance between quality and performance) |
| **Context Window** | 32,768 tokens (expandable to 128K with RoPE) |
| **API** | OpenAI-compatible (drop-in replacement) |
| **Isolation** | Dedicated container with GPU passthrough |
| **Fallback** | Automatic to cloud providers on failure or overload |

---

## Persistence Layer

### Data Model

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK
        text name
        text password_hash
        text role "admin | user"
        boolean email_verified
        text google_id
        text stripe_customer_id
        timestamp created_at
        timestamp last_login
    }
    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        text title
        text model
        integer message_count
        timestamp created_at
        timestamp updated_at
    }
    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        text role "user | assistant | system | tool"
        text content
        jsonb metadata
        timestamp created_at
    }
    PLANS {
        uuid id PK
        text name
        text stripe_price_id
        integer daily_limit
        integer monthly_limit
        jsonb features
        boolean active
    }
    SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        text stripe_subscription_id
        text status
        timestamp current_period_end
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        text action
        text ip_address
        jsonb details
        timestamp created_at
    }
    PROVIDER_LOGS {
        uuid id PK
        uuid user_id FK
        uuid conversation_id FK
        text provider
        text model
        integer input_tokens
        integer output_tokens
        integer response_time_ms
        timestamp created_at
    }
    USERS ||--o{ CONVERSATIONS : "has"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    USERS ||--o| SUBSCRIPTIONS : "subscribes"
    PLANS ||--o{ SUBSCRIPTIONS : "defines"
    USERS ||--o{ AUDIT_LOGS : "generates"
    USERS ||--o{ PROVIDER_LOGS : "uses"
    CONVERSATIONS ||--o{ PROVIDER_LOGS : "tracks"
```

| Service | Technology | Function | Volume |
|---------|-----------|----------|--------|
| **PostgreSQL 16** | Relational + JSONB | Users, conversations, messages, plans, audit, provider logs | Structured data |
| **MinIO / S3** | Object Storage | User uploads, generated images, exports, backups | Binary files |
| **Redis** | In-memory | Session cache, rate limiting, temporary queues | Ephemeral data |

---

## Security

```mermaid
graph TB
    subgraph "Layer 1 — Perimeter"
        CF2[Cloudflare WAF - DDoS + Bot Management]
        DNS2[DNS Proxy - Hidden IP]
    end
    subgraph "Layer 2 — Transport"
        TLS2[TLS 1.3 - Let's Encrypt + HSTS]
        NGINX2[NGINX - Security Headers]
    end
    subgraph "Layer 3 — Application"
        RATE2[Rate Limiting - express-rate-limit]
        TURNSTILE2[Cloudflare Turnstile - Invisible anti-bot]
        CORS2[Restrictive CORS - Origin whitelist]
        CSP[Content Security Policy - script-src + frame-src]
    end
    subgraph "Layer 4 — Authentication"
        BCRYPT[bcrypt - Cost 12]
        JWT3[Signed JWT - HS256 + Expiration]
        OAUTH2[OAuth 2.0 - Google]
        VERIFY[Email Verification - Temporary token]
        LOCKOUT[Account Lockout - Failed attempts]
    end
    subgraph "Layer 5 — Authorization"
        RBAC2["RBAC - admin / user"]
        PLANS2[Plans - Feature-based limits]
        USAGE[Usage Control - Daily + Monthly]
    end
    subgraph "Layer 6 — Data"
        ENCRYPT2[Encryption - At rest + in transit]
        ISOLATE2[Isolation - Per tenant]
        AUDIT2[Audit - Immutable + UTC]
        BACKUP2[Backups - Encrypted]
        MASK[Masking - Secrets in logs]
    end
    CF2 --> TLS2 --> RATE2 --> TURNSTILE2
    TURNSTILE2 --> BCRYPT
    BCRYPT --> RBAC2
    RBAC2 --> ENCRYPT2
```

| Layer | Component | Implementation | Compliance |
|-------|-----------|----------------|------------|
| Perimeter | Cloudflare WAF | Managed rules + custom rules | OWASP Top 10 |
| Transport | TLS 1.3 | Let's Encrypt + Full (Strict) | PCI DSS |
| Application | Rate Limiting | 5 req/min (auth), 60 req/min (API) | Anti-abuse |
| Application | Turnstile | Invisible challenge on login/register | Anti-bot |
| Application | CSP | script-src, frame-src, connect-src | XSS prevention |
| Authentication | bcrypt | Cost 12, timing-safe comparison | OWASP |
| Authentication | JWT | HS256, 7d expiry, httpOnly cookie | Session security |
| Authentication | Email verification | Temporary token, mandatory gate | Account validation |
| Authorization | RBAC | admin/user with dedicated middleware | Least privilege |
| Data | Isolation | Queries filtered by user_id/tenant | LGPD Art. 46 |
| Data | Audit | Immutable logs with IP + UTC timestamp | SOC 2, LGPD Art. 37 |
| Data | Backups | Encrypted, under operator control | Business continuity |

---

## Deploy Topology

| Container | Image | Port | Function | Resources |
|-----------|-------|------|----------|-----------|
| **debuga-nginx** | nginx:alpine | 80, 443 | Reverse proxy, TLS, static files, rate limiting | 256 MB RAM |
| **debuga-app** | node:22-slim | 3000 | Application (frontend + backend + streaming) | 2-4 GB RAM |
| **debuga-postgres** | postgres:16-alpine | 5432 | Primary database | 1-2 GB RAM |
| **debuga-minio** | minio/minio | 9000, 9001 | Object storage (uploads, images) | 512 MB RAM |
| **debuga-ollama** | ollama/ollama | 11434 | Local inference with GPU | 24+ GB VRAM |
| **debuga-redis** | redis:7-alpine | 6379 | Cache, sessions, rate limiting | 256 MB RAM |

```mermaid
graph TB
    subgraph "Internet"
        USERS2["Users"]
        CLOUDFLARE["Cloudflare - DNS + WAF + CDN"]
    end
    subgraph "Operator Server"
        subgraph "Docker Compose"
            NGINXC["debuga-nginx :80/:443 - TLS + Proxy"]
            APPC["debuga-app :3000 - Node.js"]
            PGC["debuga-postgres :5432 - PostgreSQL 16"]
            MINIOC["debuga-minio :9000/:9001 - Object Storage"]
            OLLAMAC["debuga-ollama :11434 - GPU Inference"]
            REDISC["debuga-redis :6379 - Cache"]
        end
        subgraph "Persistent Volumes"
            PGDATA["postgres data"]
            MINIODATA["minio data"]
            OLLAMADATA["ollama models"]
            CERTDATA["certbot certs"]
        end
    end
    USERS2 --> CLOUDFLARE
    CLOUDFLARE -->|HTTPS| NGINXC
    NGINXC -->|HTTP :3000| APPC
    APPC -->|TCP :5432| PGC
    APPC -->|HTTP :9000| MINIOC
    APPC -->|HTTP :11434| OLLAMAC
    APPC -->|TCP :6379| REDISC
    PGC --> PGDATA
    MINIOC --> MINIODATA
    OLLAMAC --> OLLAMADATA
    NGINXC --> CERTDATA
```

---

## Observability and Monitoring

```mermaid
graph LR
    subgraph "Data Sources"
        APPLOG[Application - Structured JSON Logs]
        NGINXLOG[NGINX - Access + Error Logs]
        PGLOG[PostgreSQL - Slow Query Log]
        DOCKERLOG[Docker - Container Stats]
    end
    subgraph "Processing"
        AUDIT3[Audit Trail - PostgreSQL]
        METRICS["Usage Metrics - Tokens / Latency / Cost"]
        HEALTH2["Health Checks - /api/health"]
    end
    subgraph "Visualization"
        ADMINPANEL[Admin Panel - Integrated Dashboard]
        ALERTS[Alerts - Usage Limits]
        EXPORT["Export - CSV / JSON / SIEM"]
    end
    APPLOG --> AUDIT3
    APPLOG --> METRICS
    NGINXLOG --> METRICS
    PGLOG --> METRICS
    DOCKERLOG --> HEALTH2
    AUDIT3 --> ADMINPANEL
    METRICS --> ADMINPANEL
    HEALTH2 --> ADMINPANEL
    ADMINPANEL --> ALERTS
    ADMINPANEL --> EXPORT
```

| Metric | Source | Granularity | Retention |
|--------|--------|-------------|-----------|
| **Tokens consumed** | Provider logs | Per request | Unlimited |
| **Response latency** | App logs | Per request | 90 days |
| **Estimated cost** | Provider logs + pricing | Per day/month | Unlimited |
| **Uptime** | Health checks | 1 minute | 365 days |
| **Errors** | App + NGINX logs | Per occurrence | 90 days |
| **Per-user usage** | Provider logs | Per day | Unlimited |

---

## Architectural Decisions

| Decision | Alternative Considered | Justification |
|----------|----------------------|---------------|
| **tRPC** (not REST/GraphQL) | REST with OpenAPI, GraphQL | End-to-end type-safety without code generation, lower overhead |
| **Express** (not Fastify) | Fastify, Hono | Mature ecosystem, compatibility with existing middlewares |
| **PostgreSQL** (not MySQL/MongoDB) | MySQL, MongoDB, SQLite | Native JSONB, extensions, reliability, complex query performance |
| **Drizzle ORM** (not Prisma) | Prisma, TypeORM, Knex | Type-safe without code generation, SQL-like, zero runtime overhead |
| **Ollama** (not vLLM) | vLLM, TGI, llama.cpp | Deployment simplicity, OpenAI-compatible API, model management |
| **Docker Compose** (not K8s) | Kubernetes, Nomad | Single-node simplicity, operators without DevOps teams |
| **JWT** (not DB sessions) | Sessions in Redis/DB | Stateless, scalable, no per-request lookup |
| **SSE** (not WebSocket) | WebSocket, Long polling | Unidirectional (server-to-client), proxy-compatible, simple |
| **Tailwind 4** (not CSS Modules) | CSS Modules, Styled Components | Utility-first, consistent design system, zero runtime |
| **shadcn/ui** (not Material UI) | Material UI, Chakra, Ant Design | Copyable components, customizable, no vendor lock-in |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant G as Google OAuth
    participant DB2 as PostgreSQL
    participant R2 as Redis
    alt Local Login
        U->>F: Email + Password + Turnstile
        F->>B: POST /api/auth/login
        B->>B: Verify Turnstile token
        B->>B: Check rate limit
        B->>DB2: Find user by email
        B->>B: Compare bcrypt hash
        alt Success
            B->>B: Generate JWT (7d)
            B->>R2: Register session
            B->>DB2: Audit log
            B-->>F: Set-Cookie (httpOnly, secure, sameSite)
            F-->>U: Redirect to /chat
        else Failure
            B->>DB2: Increment failed attempts
            B->>DB2: Audit log (failure)
            B-->>F: 401 + message
        end
    else Google OAuth
        U->>F: Click "Sign in with Google"
        F->>G: Redirect to consent screen
        G-->>B: Callback with authorization code
        B->>G: Exchange code for tokens
        B->>G: Fetch user profile
        B->>DB2: Upsert user (email as key)
        B->>B: Generate JWT (7d)
        B->>R2: Register session
        B->>DB2: Audit log
        B-->>F: Redirect with Set-Cookie
        F-->>U: Redirect to /chat
    end
```

---

## Scalability

The architecture supports growth across multiple dimensions:

| Dimension | Strategy | Implementation |
|-----------|----------|----------------|
| **Concurrent users** | Horizontal app scaling | Multiple instances behind NGINX |
| **Inference volume** | Multi-provider + local GPU | Automatic fallback distributes load |
| **Storage** | Distributed object storage | MinIO with erasure coding |
| **Database** | Read replicas + connection pooling | PgBouncer + streaming replication |
| **Network** | CDN + edge caching | Cloudflare for static assets |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [Whitepaper](WHITEPAPER_EN.md) | Executive overview of the platform |
| [White Label](WHITE_LABEL_OVERVIEW.md) | Deployment model and customization |
| [Security](SECURITY_OVERVIEW.md) | Security policies and compliance |
| [AI Providers](PROVIDERS_OVERVIEW.md) | Supported providers and routing |
| [Roadmap](ROADMAP.md) | Planned platform evolution |

---

*Sperry Tecnologia — [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)*
