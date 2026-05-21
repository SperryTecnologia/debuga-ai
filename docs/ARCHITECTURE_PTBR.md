# Arquitetura Técnica — debuga.ai

**Documentação Detalhada da Arquitetura da Plataforma de IA Operacional**

Versão 2.0 | Maio 2026 | Sperry Tecnologia

---

## Visão Geral

A debuga.ai é construída sobre uma arquitetura em camadas com separação clara de responsabilidades, permitindo escalabilidade horizontal, substituição de componentes e implantação flexível (cloud, VPS, on-premise ou híbrida). Cada camada se comunica exclusivamente via APIs internas bem definidas.

```mermaid
graph TB
    subgraph "Internet"
        USER["Usuário / Operador"]
    end

    subgraph "Perímetro — Cloudflare"
        CF[WAF + DDoS - DNS Proxy]
    end

    subgraph "Proxy Reverso — NGINX"
        NGINX[TLS Termination - Rate Limiting - Static Files]
    end

    subgraph "Aplicação — Node.js"
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
            APIADM[Admin API - Gestão + Métricas]
        end
    end

    subgraph "Orquestração"
        AGENT[Agente Autônomo - Reasoning Loop]
        ROUTER[LLM Router - Priority + Fallback]
        TOOLKIT["Toolkit - DNS/SSL/HTTP/WHOIS/Port"]
    end

    subgraph "Inferência"
        OLLAMA[Ollama - GPU Local + CUDA]
        OPENAI["OpenAI - GPT-4o / o1"]
        ANTHROPIC[Anthropic - Claude 3.5]
        GEMINI["Google Gemini - 2.0 Flash / Pro"]
        OPENROUTER[OpenRouter - Multi-model]
    end

    subgraph "Persistência"
        PG[(PostgreSQL 16 - Dados + Auditoria)]
        MINIO[("MinIO S3 - Objetos + Uploads")]
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

## Camada de Apresentação

A interface é construída com React 19, Tailwind CSS 4 e shadcn/ui, servida como SPA com SSE para streaming de respostas do agente.

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

    subgraph "Componentes Core"
        CHATBOX[AIChatBox - Streaming + Markdown]
        TURNSTILE[Turnstile Widget - Anti-bot]
        SIDEBAR[Dashboard Layout - Sidebar + Nav]
        THEME["Theme Provider - Dark / Light"]
    end

    subgraph "Estado e Comunicação"
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

| Componente | Tecnologia | Responsabilidade |
|-----------|-----------|-----------------|
| **Chat UI** | React 19 + Tailwind 4 + Streamdown | Interface conversacional com streaming SSE, renderização Markdown, code blocks com syntax highlighting |
| **Admin Panel** | React + shadcn/ui + Recharts | Gestão de usuários, métricas de uso, configurações do sistema, logs de auditoria |
| **Landing Page** | React + Tailwind (white label) | Página pública personalizável: marca, cores, textos, planos, domínio próprio |
| **Login / Register** | React + Turnstile + OAuth | Autenticação local com verificação de email, OAuth Google, proteção anti-bot |
| **Account / Billing** | React + Stripe Elements | Gestão de conta, planos, histórico de pagamentos, limites de uso |

---

## Camada de API

A API utiliza tRPC para comunicação type-safe end-to-end entre frontend e backend, eliminando a necessidade de schemas compartilhados ou geração de código.

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

    subgraph "Endpoints REST"
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

| Módulo | Tipo | Função | Autenticação |
|--------|------|--------|--------------|
| **auth** | tRPC | Estado de sessão, logout | Pública (me) / Protegida (logout) |
| **chat** | tRPC + REST | CRUD de conversas, streaming SSE | Protegida |
| **admin** | tRPC | Gestão de usuários, configurações, métricas | Admin only |
| **account** | tRPC | Perfil, billing, uso, limites | Protegida |
| **system** | tRPC | Health check, notificações | Pública / Protegida |
| **OAuth** | REST | Callback Google OAuth 2.0 | Pública |
| **Local Auth** | REST | Register, login, verify email, forgot password | Pública (rate limited) |
| **Stripe** | REST | Webhooks de pagamento | Signature verification |
| **Stream** | REST (SSE) | Streaming de respostas do agente | Protegida + verificação de email |

---

## Camada de Orquestração

O agente autônomo opera em um loop de raciocínio (reasoning loop) que analisa a consulta, decide quais ferramentas invocar, executa-as sequencialmente e sintetiza a resposta final.

```mermaid
sequenceDiagram
    participant U as Usuário
    participant API as API Server
    participant A as Agente Autônomo
    participant R as LLM Router
    participant LLM as Provider LLM
    participant T as Toolkit
    participant DB as PostgreSQL

    U->>API: Envia mensagem (POST /api/stream)
    API->>API: Valida sessão + verificação de email
    API->>API: Verifica limites de uso (plano)
    API->>DB: Carrega histórico da conversa
    API->>A: Inicia reasoning loop

    loop Reasoning Loop
        A->>R: Solicita inferência (messages + tools)
        R->>R: Seleciona provider (prioridade + disponibilidade)
        R->>LLM: Envia request
        LLM-->>R: Resposta (text ou tool_call)
        R-->>A: Retorna resposta

        alt Tool Call
            A->>T: Executa ferramenta (DNS/SSL/HTTP/...)
            T-->>A: Resultado da ferramenta
            A->>U: SSE: step (ferramenta executada)
        else Text Response
            A->>U: SSE: content (streaming de texto)
        end
    end

    A->>DB: Salva mensagem + metadados
    A->>DB: Registra log de auditoria
    A->>U: SSE: done
```

### Roteamento LLM Multi-Provider

O roteador seleciona o provider mais adequado com base em uma cadeia de prioridade configurável:

```mermaid
flowchart TD
    START[Nova Requisição - de Inferência] --> CHECK1{GPU Local - disponível?}

    CHECK1 -->|Sim| OLLAMA[Ollama - Custo: Zero - Latência: Baixa]
    CHECK1 -->|Não| CHECK2{Gemini - configurado?}

    CHECK2 -->|Sim| GEMINI[Google Gemini - Custo: Baixo - Contexto: 1M tokens]
    CHECK2 -->|Não| CHECK3{OpenAI - configurado?}

    CHECK3 -->|Sim| OPENAI[OpenAI - Custo: Médio - Raciocínio: Excelente]
    CHECK3 -->|Não| CHECK4{Anthropic - configurado?}

    CHECK4 -->|Sim| ANTHROPIC[Anthropic - Custo: Médio - Análise: Excelente]
    CHECK4 -->|Não| CHECK5{OpenRouter - configurado?}

    CHECK5 -->|Sim| OPENROUTER[OpenRouter - Custo: Variável - Multi-model]
    CHECK5 -->|Não| ERROR[Erro: Nenhum - provider disponível]

    OLLAMA --> LOG[Registra provider - + tokens + latência]
    GEMINI --> LOG
    OPENAI --> LOG
    ANTHROPIC --> LOG
    OPENROUTER --> LOG
    LOG --> RETURN[Retorna resposta - ao agente]
```

| Provider | Prioridade | Tipo | Modelo Padrão | Caso de Uso |
|----------|-----------|------|---------------|-------------|
| **Ollama** | 1 (máxima) | Local | Qwen 2.5 Coder 32B | Uso geral, custo zero, dados locais |
| **Google Gemini** | 2 | Cloud | Gemini 2.0 Flash | Contexto longo (1M tokens), custo-benefício |
| **OpenAI** | 3 | Cloud | GPT-4o | Raciocínio complexo, tool calling avançado |
| **Anthropic** | 4 | Cloud | Claude 3.5 Sonnet | Análise longa, código, documentação |
| **OpenRouter** | 5 | Cloud | Variável | Acesso a modelos adicionais, fallback final |

---

## Camada de Inferência

### GPU Local com Ollama

A inferência local utiliza Ollama com suporte a NVIDIA CUDA, permitindo que dados sensíveis nunca saiam do ambiente do operador:

```mermaid
graph LR
    subgraph "Servidor do Operador"
        subgraph "Docker — Ollama Container"
            OLLAMA2[Ollama Server - :11434]
            MODEL[Modelo Ativo - Qwen 2.5 Coder 32B]
            CUDA[NVIDIA CUDA - GPU Runtime]
        end
        subgraph "Docker — App Container"
            APP[debuga-app - Node.js]
        end
        subgraph "Hardware"
            GPU2[NVIDIA GPU - 24+ GB VRAM]
            RAM2[RAM do Sistema - 32+ GB]
            NVME[NVMe Storage - Modelos + Dados]
        end
    end

    APP -->|HTTP :11434| OLLAMA2
    OLLAMA2 --> MODEL
    MODEL --> CUDA
    CUDA --> GPU2
    OLLAMA2 --> RAM2
    MODEL --> NVME
```

| Aspecto | Especificação |
|---------|--------------|
| **Runtime** | NVIDIA Container Toolkit + CUDA 12.x |
| **Modelo padrão** | Qwen 2.5 Coder 32B (Q4_K_M) |
| **VRAM necessária** | 20-24 GB para 32B quantizado |
| **Throughput** | 30-50 tokens/s (RTX 4090) |
| **Contexto** | 32.768 tokens |
| **Protocolo** | HTTP REST (:11434) compatível com OpenAI API |

### Providers Cloud (Fallback)

Quando a GPU local não está disponível ou o operador opta por não utilizá-la, o sistema faz fallback automático para providers cloud na ordem de prioridade configurada. Cada provider é testado na inicialização e monitorado continuamente.

---

## Camada de Persistência

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK
        text name
        text password_hash
        text role "admin | user"
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        text title
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

| Serviço | Tecnologia | Função | Volume |
|---------|-----------|--------|--------|
| **PostgreSQL 16** | Relacional + JSONB | Usuários, conversas, mensagens, planos, auditoria, logs de provider | Dados estruturados |
| **MinIO / S3** | Object Storage | Uploads de usuários, imagens geradas, exports, backups | Arquivos binários |
| **Redis** | In-memory | Cache de sessões, rate limiting, filas temporárias | Dados efêmeros |

---

## Segurança

```mermaid
graph TB
    subgraph "Camada 1 — Perímetro"
        CF2[Cloudflare WAF - DDoS + Bot Management]
        DNS2[DNS Proxy - IP oculto]
    end

    subgraph "Camada 2 — Transporte"
        TLS2[TLS 1.3 - Let's Encrypt + HSTS]
        NGINX2[NGINX - Headers de Segurança]
    end

    subgraph "Camada 3 — Aplicação"
        RATE2[Rate Limiting - express-rate-limit]
        TURNSTILE2[Cloudflare Turnstile - Anti-bot invisível]
        CORS2[CORS Restritivo - Origin whitelist]
        CSP[Content Security Policy - script-src + frame-src]
    end

    subgraph "Camada 4 — Autenticação"
        BCRYPT[bcrypt - Custo 12]
        JWT3[JWT Assinado - HS256 + Expiração]
        OAUTH2[OAuth 2.0 - Google]
        VERIFY[Verificação de Email - Token temporário]
        LOCKOUT[Account Lockout - Tentativas falhas]
    end

    subgraph "Camada 5 — Autorização"
        RBAC2["RBAC - admin / user"]
        PLANS2[Planos - Limites por funcionalidade]
        USAGE[Controle de Uso - Diário + Mensal]
    end

    subgraph "Camada 6 — Dados"
        ENCRYPT2[Criptografia - Em repouso + trânsito]
        ISOLATE2[Isolamento - Por tenant]
        AUDIT2[Auditoria - Imutável + UTC]
        BACKUP2[Backups - Criptografados]
        MASK[Mascaramento - Secrets em logs]
    end

    CF2 --> TLS2 --> RATE2 --> TURNSTILE2
    TURNSTILE2 --> BCRYPT
    BCRYPT --> RBAC2
    RBAC2 --> ENCRYPT2
```

| Camada | Componente | Implementação | Conformidade |
|--------|-----------|--------------|--------------|
| Perímetro | Cloudflare WAF | Regras gerenciadas + custom rules | OWASP Top 10 |
| Transporte | TLS 1.3 | Let's Encrypt + Full (Strict) | PCI DSS |
| Aplicação | Rate Limiting | 5 req/min (auth), 60 req/min (API) | Anti-abuse |
| Aplicação | Turnstile | Challenge invisível no login/register | Anti-bot |
| Aplicação | CSP | script-src, frame-src, connect-src | XSS prevention |
| Autenticação | bcrypt | Custo 12, timing-safe comparison | OWASP |
| Autenticação | JWT | HS256, 7d expiry, httpOnly cookie | Session security |
| Autenticação | Email verification | Token temporário, gate obrigatório | Account validation |
| Autorização | RBAC | admin/user com middleware dedicado | Least privilege |
| Dados | Isolamento | Queries filtradas por user_id/tenant | LGPD Art. 46 |
| Dados | Auditoria | Logs imutáveis com IP + timestamp UTC | SOC 2, LGPD Art. 37 |
| Dados | Backups | Criptografados, sob controle do operador | Business continuity |

---

## Topologia de Deploy

```mermaid
graph TB
    subgraph "Internet"
        USERS2["Usuários"]
        CLOUDFLARE["Cloudflare - DNS + WAF + CDN"]
    end

    subgraph "Servidor do Operador"
        subgraph "Docker Compose"
            NGINXC["debuga-nginx :80/:443 - TLS + Proxy"]
            APPC["debuga-app :3000 - Node.js"]
            PGC["debuga-postgres :5432 - PostgreSQL 16"]
            MINIOC["debuga-minio :9000/:9001 - Object Storage"]
            OLLAMAC["debuga-ollama :11434 - GPU Inference"]
            REDISC["debuga-redis :6379 - Cache"]
        end

        subgraph "Volumes Persistentes"
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

| Container | Imagem | Porta | Função | Recursos |
|-----------|--------|-------|--------|----------|
| **debuga-nginx** | nginx:alpine | 80, 443 | Proxy reverso, TLS, static files, rate limiting | 256 MB RAM |
| **debuga-app** | node:22-slim | 3000 | Aplicação (frontend + backend + streaming) | 2-4 GB RAM |
| **debuga-postgres** | postgres:16-alpine | 5432 | Banco de dados principal | 1-2 GB RAM |
| **debuga-minio** | minio/minio | 9000, 9001 | Object storage (uploads, imagens) | 512 MB RAM |
| **debuga-ollama** | ollama/ollama | 11434 | Inferência local com GPU | 24+ GB VRAM |
| **debuga-redis** | redis:7-alpine | 6379 | Cache, sessões, rate limiting | 256 MB RAM |

---

## Requisitos de Hardware

| Componente | Mínimo (sem GPU) | Recomendado (com GPU) | Enterprise |
|-----------|-----------------|----------------------|------------|
| **CPU** | 4 cores | 8 cores | 16+ cores |
| **RAM** | 8 GB | 32 GB | 64+ GB |
| **Storage** | 50 GB SSD | 500 GB NVMe | 1+ TB NVMe RAID |
| **GPU** | — | NVIDIA RTX 4090 (24 GB) | NVIDIA A100 (80 GB) |
| **Rede** | 100 Mbps | 1 Gbps | 10 Gbps |
| **OS** | Ubuntu 22.04+ | Ubuntu 22.04+ | Ubuntu 22.04+ |

A GPU é **opcional**. Sem GPU, a plataforma opera exclusivamente com providers cloud. Com GPU, a inferência local tem prioridade máxima (custo zero por token, dados não saem do ambiente).

---

## Monitoramento e Observabilidade

```mermaid
graph LR
    subgraph "Coleta"
        APPLOG[App Logs - Structured JSON]
        NGINXLOG[NGINX Access Log - + Error Log]
        PGLOG[PostgreSQL - Slow Queries]
        DOCKERLOG[Docker - Container Stats]
    end

    subgraph "Processamento"
        AUDIT3[Audit Trail - PostgreSQL]
        METRICS["Métricas de Uso - Tokens / Latência / Custo"]
        HEALTH2["Health Checks - /api/health"]
    end

    subgraph "Visualização"
        ADMINPANEL[Admin Panel - Dashboard integrado]
        ALERTS[Alertas - Limites de uso]
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

| Métrica | Fonte | Granularidade | Retenção |
|---------|-------|--------------|----------|
| **Tokens consumidos** | Provider logs | Por request | Ilimitada |
| **Latência de resposta** | App logs | Por request | 90 dias |
| **Custo estimado** | Provider logs + pricing | Por dia/mês | Ilimitada |
| **Uptime** | Health checks | 1 minuto | 365 dias |
| **Erros** | App + NGINX logs | Por ocorrência | 90 dias |
| **Uso por usuário** | Provider logs | Por dia | Ilimitada |

---

## Decisões Arquiteturais

| Decisão | Alternativa Considerada | Justificativa |
|---------|------------------------|---------------|
| **tRPC** (não REST/GraphQL) | REST com OpenAPI, GraphQL | Type-safety end-to-end sem code generation, menor overhead |
| **Express** (não Fastify) | Fastify, Hono | Ecossistema maduro, compatibilidade com middlewares existentes |
| **PostgreSQL** (não MySQL/MongoDB) | MySQL, MongoDB, SQLite | JSONB nativo, extensões, confiabilidade, performance em queries complexas |
| **Drizzle ORM** (não Prisma) | Prisma, TypeORM, Knex | Type-safe sem code generation, SQL-like, zero runtime overhead |
| **Ollama** (não vLLM) | vLLM, TGI, llama.cpp | Simplicidade de deploy, API compatível com OpenAI, gestão de modelos |
| **Docker Compose** (não K8s) | Kubernetes, Nomad | Simplicidade para single-node, operadores sem equipe de DevOps |
| **JWT** (não sessions DB) | Sessions em Redis/DB | Stateless, escalável, sem lookup por request |
| **SSE** (não WebSocket) | WebSocket, Long polling | Unidirecional (server→client), compatível com proxies, simples |
| **Tailwind 4** (não CSS Modules) | CSS Modules, Styled Components | Utility-first, design system consistente, zero runtime |
| **shadcn/ui** (não Material UI) | Material UI, Chakra, Ant Design | Componentes copiáveis, customizáveis, sem vendor lock-in |

---

## Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant B as Backend
    participant G as Google OAuth
    participant DB2 as PostgreSQL
    participant R2 as Redis

    alt Login Local
        U->>F: Email + Senha + Turnstile
        F->>B: POST /api/auth/login
        B->>B: Verifica Turnstile token
        B->>B: Verifica rate limit
        B->>DB2: Busca usuário por email
        B->>B: Compara bcrypt hash
        alt Sucesso
            B->>B: Gera JWT (7d)
            B->>R2: Registra sessão
            B->>DB2: Log de auditoria
            B-->>F: Set-Cookie (httpOnly, secure, sameSite)
            F-->>U: Redirect para /chat
        else Falha
            B->>DB2: Incrementa tentativas falhas
            B->>DB2: Log de auditoria (falha)
            B-->>F: 401 + mensagem
        end
    else OAuth Google
        U->>F: Clica "Entrar com Google"
        F->>G: Redirect para consent screen
        G-->>B: Callback com authorization code
        B->>G: Troca code por tokens
        B->>G: Busca perfil do usuário
        B->>DB2: Upsert usuário (email como chave)
        B->>B: Gera JWT (7d)
        B->>R2: Registra sessão
        B->>DB2: Log de auditoria
        B-->>F: Redirect com Set-Cookie
        F-->>U: Redirect para /chat
    end
```

---

## Escalabilidade

A arquitetura suporta crescimento em múltiplas dimensões:

| Dimensão | Estratégia | Implementação |
|----------|-----------|---------------|
| **Usuários simultâneos** | Horizontal scaling da app | Múltiplas instâncias atrás do NGINX |
| **Volume de inferência** | Multi-provider + GPU local | Fallback automático distribui carga |
| **Armazenamento** | Object storage distribuído | MinIO com erasure coding |
| **Banco de dados** | Read replicas + connection pooling | PgBouncer + streaming replication |
| **Rede** | CDN + edge caching | Cloudflare para assets estáticos |

---

## Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [Whitepaper](WHITEPAPER_PTBR.md) | Visão executiva da plataforma |
| [White Label](WHITE_LABEL_OVERVIEW.md) | Modelo de implantação e personalização |
| [Segurança](SECURITY_OVERVIEW.md) | Políticas de segurança e compliance |
| [Providers de IA](PROVIDERS_OVERVIEW.md) | Providers suportados e roteamento |
| [Roadmap](ROADMAP.md) | Evolução planejada da plataforma |

---

*Sperry Tecnologia — [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)*
