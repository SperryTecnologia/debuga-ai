# debuga.ai — Technical Whitepaper

**Autonomous AI Agent Platform for IT Infrastructure, Cybersecurity, and Telecommunications**

**Version:** 4.0  
**Date:** May 2026  
**Author:** Sperry Tecnologia  
**Website:** www.sperrytecnologia.com.br

---

## Executive Summary

**debuga.ai** is a SaaS platform that provides an autonomous AI agent specialized in IT infrastructure, cybersecurity, DevOps, and telecommunications. Unlike conventional chatbots that only answer questions, debuga.ai is an agent that **acts**: it executes code, navigates websites, scans ports, verifies SSL certificates, queries DNS records, and generates technical reports autonomously.

The platform was designed and developed by **Sperry Tecnologia** and operates on a cloud inference architecture using the **Manus Forge API** as an LLM gateway, accessing state-of-the-art models for reasoning, tool calling, and response streaming. The long-term strategy includes deploying dedicated GPU infrastructure to serve open-source models fine-tuned for the IT and security domain, reducing external API dependency and enabling analysis of sensitive data on-premise.

The Brazilian technology market reached US$ 67.8 billion in revenue in 2025, growing 18.5% year-over-year [1]. The global AI in cybersecurity market, valued at US$ 22.37 billion in 2025, is projected to reach US$ 50.83 billion by 2031 at a 14.8% CAGR [2]. Brazil leads the Latin American AI market, with spending expected to grow 3.8x between 2025 and 2029 [3].

---

## 1. Market Problem

### 1.1 IT Professional Shortage

Brazil faces a growing deficit of qualified professionals in IT infrastructure and cybersecurity. Companies of all sizes need specialized technical support, but the cost of hiring and retaining talent in these areas is prohibitive for most organizations.

### 1.2 Operational Complexity

Modern infrastructure management involves dozens of tools (Zabbix, Wazuh, Prometheus, Grafana, NetBox, Ansible, Terraform, Docker, Kubernetes) that require deep knowledge and constant updating. A single professional rarely masters the entire ecosystem.

### 1.3 Incident Response Time

Security incidents and infrastructure failures require rapid diagnosis. The mean time between detection and resolution (MTTR) is often measured in hours or days, when it should be minutes.

### 1.4 Limitations of Existing Chatbots

Solutions like ChatGPT, which dominates 99% of the Brazilian generative AI market [4], are generalist. They cannot execute code in sandboxes, scan ports, verify SSL certificates in real-time, or possess specialized context for Brazilian IT infrastructure.

---

## 2. Solution: debuga.ai

### 2.1 Product Vision

debuga.ai is an **autonomous agent** — not a chatbot. The fundamental difference is that the agent has the capacity for **action**: it decides which tools to use, executes them automatically, analyzes results, and iterates until the user's problem is resolved.

The agent uses the **Manus Forge API** as an inference gateway, accessing state-of-the-art language models (currently Gemini 2.5 Flash) for reasoning, tool orchestration, and response generation. The architecture is designed to be provider-agnostic, allowing future addition of specialized models without changes to the agent logic.

### 2.2 Agent Capabilities (in production)

| Capability | Description | Differentiator |
|---|---|---|
| Code Execution | Python and Bash with timeout and output limits | Real-time automation scripts |
| Web Navigation | Accesses and extracts page content | Documentation and CVE analysis |
| Port Scanning | Scans open ports on hosts | Automated security auditing |
| DNS Lookup | Complete DNS queries (A, AAAA, MX, TXT, NS, SOA) | Name resolution diagnostics |
| SSL/TLS Check | Verifies certificates, chains, and protocols | Expiration and vulnerability detection |
| HTTP Check | Analyzes headers, status, and site security | Security header verification |
| WHOIS Lookup | Queries domain and registrant information | Ownership investigation |
| Image Generation | Creates network diagrams and flowcharts | Automated visual documentation |
| Image Upload & Analysis | Accepts screenshots, error prints, and topologies for technical visual analysis | Visual infrastructure diagnostics |
| Document Upload & Analysis | Text extraction from 12+ formats (PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML, XML, SQL) | Config, log, and documentation analysis |
| Mermaid Rendering | Technical diagrams rendered visually with PNG/SVG/PDF export | Professional architecture visualization |

> **Note:** Image and document upload capabilities are controlled by feature flags (`FEATURE_IMAGE_UPLOAD`, `FEATURE_DOCUMENT_UPLOAD`) and per-plan limits. Mermaid rendering is under continuous validation for complex diagram stability.

### 2.3 Planned Capabilities (roadmap)

The following capabilities are part of the product evolution strategy and are in planning or development:

| Capability | Description | Target Version |
|---|---|---|
| Deep TCP/IP analysis | Network traffic inspection at L3-L7 layers | v6.0 |
| Log correlation | Cross-referencing data from multiple sources (firewall, IDS, NetFlow) | v6.0 |
| Zabbix/Wazuh integration | Querying real monitoring data during agent reasoning | v5.0 |
| Multi-model routing | Directing queries to specialized models based on complexity | v5.0 |
| On-premise inference | Fine-tuned models on dedicated GPU infrastructure | v6.0 |

### 2.4 Autonomous Agent Flow

```
User sends message
    ↓
Agent analyzes context and decides action
    ↓
[Iteration 1] Executes tool(s) automatically
    ↓
Analyzes results and decides next step
    ↓
[Iteration 2-5] Chains tools if necessary
    ↓
Synthesizes final response with results
    ↓
Debits credits and logs usage
```

The agent operates in a loop of up to 5 iterations, autonomously deciding which tools to use at each step. This architecture is inspired by the ReAct paradigm [5] and enables complex diagnostics that require multiple correlated queries.

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 19 + Tailwind CSS 4 | Performance, DX, ecosystem |
| Backend | Express 4 + tRPC 11 | End-to-end type safety |
| Database | MySQL/TiDB (Drizzle ORM) | Horizontal scalability |
| LLM | Manus Forge API (Gemini 2.5 Flash) | Managed gateway, state-of-the-art models |
| Streaming | Server-Sent Events (SSE) | Real-time response |
| Payments | Stripe (BRL) | Global standard, PCI-compliant |
| Storage | S3 (compatible) | Scalable, low cost |
| Authentication | OAuth 2.0 + JWT | Industry-standard security |

### 3.2 LLM Inference Strategy

debuga.ai currently operates with cloud API inference and is designed to evolve into a hybrid architecture:

**In production:**
- **Manus Forge API** as a managed inference gateway
- Current model: **Gemini 2.5 Flash** for reasoning, tool calling, and streaming
- Provider-agnostic wrapper (`server/_core/llm.ts`) that allows swapping models without changing agent logic

**Planned (roadmap v5.0–v6.0):**
- **Multi-model routing** — Decision layer that directs queries between different providers and models based on complexity, domain, and latency
- **On-premise inference** — Dedicated GPU infrastructure to serve fine-tuned open-source models (Qwen, Mistral, Llama) optimized for IT and security
- **Reduced external dependency** — Enabling analysis of sensitive data without sending it to third-party APIs

The specialized model strategy envisions fine-tuning with datasets from:
- Technical documentation from network equipment vendors (Cisco, Juniper, MikroTik, Fortinet)
- IETF RFCs (TCP, UDP, IP, BGP, OSPF, DNS, TLS)
- CVEs and security advisories (NVD, MITRE ATT&CK)
- Security standards and frameworks (ISO 27001, NIST CSF, CIS Controls)

### 3.2.1 Hybrid LLM Strategy

The debuga.ai SaaS currently uses cloud/API-compatible providers for all LLM inference in production. In parallel, Sperry Tecnologia maintains a public research and documentation stack — the **debuga.ai LLM Stack** — that documents the path toward local/on-premise inference.

The pillars of the hybrid strategy are:

| Pillar | Status | Description |
|---|---|---|
| Cloud/API providers | **In production** | Manus Forge API as managed gateway (Gemini 2.5 Flash) |
| Local inference engine | In lab | vLLM as inference engine for open-source models |
| Evaluated model family | In lab | Qwen-Coder (7B, 14B, 32B) with benchmarks for DevOps/security |
| OpenAI-compatible gateway | In lab | Community skeleton for cloud/local routing with fallback |
| Enterprise/on-premise deploy | Roadmap | Self-hosted version under project for compliance-sensitive customers |

The public stack is organized in the following repositories:

| Repository | Function |
|---|---|
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Central documentation, architecture, and lab vision |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Qwen-Coder evaluation for DevOps, infrastructure, and security |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Generic configurations for serving models with vLLM |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Community skeleton for OpenAI-compatible gateway |

> **Note:** The public LLM stack is a documentation, lab, and technical research initiative. It does not represent production SaaS code, does not contain internal prompts, customer data, or business rules. The debuga.ai production may include additional integrations and policies not published.

### 3.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                         │
│  React 19 + Tailwind 4 + tRPC Client + SSE Consumer         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────┐
│                    SERVER (Node.js)                         │
│  Express 4 + tRPC 11 + SSE Stream + Stripe Webhooks         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │ Auth     │  │ Chat     │  │ Credits  │  │ Stripe     │   │
│  │ Module   │  │ Stream   │  │ System   │  │ Routes     │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘   │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           AGENT LOOP (max 5 iterations)              │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ Tools: code_exec, dns, ssl, http, whois,        │ │   │
│  │  │        port_scan, web_fetch, image_gen          │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌─────────┐ ┌──────────┐
│ MySQL/TiDB   │ │ Forge   │ │ S3       │
│ (Drizzle)    │ │ API     │ │ Storage  │
└──────────────┘ └─────────┘ └──────────┘
```

### 3.4 Data Model

The database is structured in 7 main tables:

- **users**: User registration with OAuth, roles (admin/user), Stripe customer ID
- **conversations**: Conversations with pin, archive, and timestamp support
- **messages**: Messages with role (user/assistant/system), tool_calls, token count
- **subscriptions**: Stripe subscriptions with status, period, cancellation
- **credits**: Per-user credits with total, used, planId, monthly reset
- **usage_log**: Detailed consumption history per conversation/tool
- **usage_events**: Tamper-resistant independent usage counters (messages sent, conversations started, subscription events)

### 3.5 Credits and Limits System

| Plan | Messages/Day | Conversations/Month | Images/Day | Documents/Day | Total Credits |
|---|---|---|---|---|---|
| Free | 5 | 3 | 2 | 3 | 50 |
| Starter | 100 | 30 | 10 | 15 | 1,000 |
| Pro | Unlimited | Unlimited | 50 | 50 | 10,000 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | 100,000 |

The credits system operates in three protection layers:
1. **Rate Limiting**: Maximum 20 messages per minute (abuse protection)
2. **Plan Limits**: Message/day and conversation/month verification before processing
3. **Credits**: Proportional debit based on token consumption after each response

All plans use the same inference model. Plan differentiation occurs exclusively through usage limits (messages, conversations, credits).

---

## 4. Business Model

### 4.1 Monetization Strategy

debuga.ai uses a **freemium** model with 4 recurring subscription tiers in BRL (Brazilian Real), processed via Stripe:

| Plan | Monthly Price | Annual Price | Target |
|---|---|---|---|
| Free | R$ 0 | R$ 0 | Trial/experimentation |
| Starter | R$ 49.90 (~US$ 9) | R$ 479.00 | Individual professionals |
| Pro | R$ 149.90 (~US$ 27) | R$ 1,439.00 | IT teams |
| Enterprise | R$ 499.90 (~US$ 90) | R$ 4,799.00 | Companies with compliance needs |

### 4.2 Target Audience

1. **Freelance IT professionals** who need a "second pair of eyes" for diagnostics
2. **Infrastructure teams** at mid-size companies without budget for specialized consulting
3. **MSPs (Managed Service Providers)** serving multiple clients who need agility
4. **Students and professionals in training** (via Open Infra Pro educational program)
5. **Companies with compliance requirements** needing automated documentation

### 4.3 Acquisition Channels

- SEO-optimized landing page for IT terms in Portuguese
- "Open Infra Pro" educational program (entry funnel via courses)
- Human support via WhatsApp as a trust differentiator
- Technical content on social media and Brazilian IT communities

---

## 5. Security and Compliance

### 5.1 Implemented Security Measures

- **OAuth 2.0 Authentication** with signed JWT sessions
- **Data isolation**: Each user accesses only their own conversations (userId filter on all queries)
- **Rate limiting**: Protection against flood and API abuse (20 msgs/min per user)
- **Controlled code execution**: Execution in /tmp with 30s timeout and 50KB output limit, with additional process-level isolation provided by the deployment platform
- **Mandatory HTTPS**: All communication encrypted in transit
- **Stripe PCI-DSS**: Payment data never touches our servers
- **Webhook signature verification**: All Stripe communication is cryptographically verified
- **Frontend/backend separation**: No sensitive credentials exposed to the browser
- **Code audit**: Zero hardcoded secrets, all sensitive variables via environment variables
- **Anti-manipulation counters**: Independent `usage_events` table ensures deleting conversations does not reset usage limits

### 5.2 Data Privacy

- Conversations are stored only for the user's own history
- No data is shared with third parties beyond LLM processing
- Users can delete conversations and data at any time
- Compliance with LGPD (Brazil's General Data Protection Law)

---

## 6. Roadmap

### 6.1 Current Phase (v4.0) — In Production

- Autonomous agent with 8 integrated tools
- Functional credits and billing system with Stripe
- Professional chat interface with SSE streaming
- Landing page, pricing, account dashboard
- Rate limiting and plan limits enforcement
- Independent usage counters (anti-manipulation)
- Global conversation search and archiving
- Image upload and analysis (screenshots, error prints, topologies)
- Document upload and analysis (12+ formats: PDF, DOCX, TXT, MD, LOG, etc.)
- Visual Mermaid diagram rendering with PNG/SVG/PDF export
- Human support by plan (Pro: technical triage; Enterprise: dedicated consultative channel)
- Guided example cards (5 visible + 3 hidden from showcase)
- 321 automated tests across 17 test suites
- Technical documentation (whitepaper, architecture)

### 6.2 Phase 2 (v5.0) — Q3 2026

- Activation of Zabbix and Wazuh connectors for querying real monitoring data
- Multi-model routing to direct queries between different providers
- Coupon system for Open Infra Pro educational program
- Local payment methods (when available on Stripe Brazil)
- Team metrics dashboard

### 6.3 Phase 3 (v6.0) — Q4 2026

- On-premise inference via vLLM/TGI with fine-tuned models (Qwen, Mistral, Llama)
- Public API for third-party tool integration
- Agent with long-term memory (cross-conversation context)
- Dedicated sandbox (Docker) for code execution with reinforced isolation
- Automation templates (pre-configured playbooks)
- Integration marketplace

### 6.4 Phase 4 (v7.0) — 2027

- Multi-tenancy for MSPs
- White-label for resellers
- Self-hosted version for enterprise customers (on-premise)
- Agent with execution capability on client infrastructure (via remote agent)
- Security certifications (SOC 2, ISO 27001)

---

## 7. Competitive Analysis

| Criteria | debuga.ai | ChatGPT | GitHub Copilot | SIEM Tools |
|---|---|---|---|---|
| IT/Infra specialization | Native | Generic | Code only | Alerts only |
| Code execution | Yes (Python/Bash) | Limited | No | No |
| Port scan / SSL check | Yes (8 tools) | No | No | Partial |
| Autonomous web navigation | Yes | Limited | No | No |
| Autonomous agent (multi-step) | 5 iterations | 1 response | Suggestions | Fixed rules |
| BRL pricing | Yes | USD | USD | Variable |
| Portuguese support | Native | Translated | English | Variable |
| Specialized IT model | Planned (v6.0) | No | No | No |
| SIEM/monitoring integration | Planned (v5.0) | No | No | Native |

---

## 8. Success Metrics

| KPI | Q3 2026 Target | Q4 2026 Target | 2027 Target |
|---|---|---|---|
| Registered users | 500 | 2,000 | 10,000 |
| Paying subscribers | 50 | 200 | 1,000 |
| MRR (Monthly Recurring Revenue) | R$ 5,000 | R$ 25,000 | R$ 150,000 |
| Monthly churn | < 10% | < 8% | < 5% |
| NPS (Net Promoter Score) | > 40 | > 50 | > 60 |

---

## 9. Team and Company

**Sperry Tecnologia** is a Brazilian company specialized in artificial intelligence and IT infrastructure. A pioneer in AI platform specialization as a service, Sperry fully masters generative AI tools and offers both the product (debuga.ai) and consulting/training for enterprises.

**Sperry Tecnologia Differentiators:**
- First Brazilian company specialized in AI as a service for IT
- Expertise in modern interface development with React and JSX
- "Open Infra Pro" educational program with active student base
- Human + AI hybrid support model
- Evolution strategy toward hybrid inference infrastructure (cloud + local), documented in the debuga.ai LLM Stack

---

## 10. Conclusion

debuga.ai represents a new category of tool for IT professionals: the **specialized autonomous agent**. By combining the reasoning capability of state-of-the-art LLMs with real execution tools (code execution, network scanning, web scraping, image generation), the platform offers an assistant that doesn't just suggest — it **executes and diagnoses**.

The current version operates with 8 diagnostic tools, image and document upload and analysis, visual Mermaid diagram rendering, a complete billing system, and 321 automated tests across 17 suites. The evolution strategy includes deploying specialized models on GPU infrastructure — currently in lab and research phase within the debuga.ai LLM Stack —, integrating with monitoring platforms (Zabbix, Wazuh, Prometheus), and expanding to the enterprise market with a self-hosted version.

With the Brazilian IT market in strong expansion and the growing adoption of AI in cybersecurity, debuga.ai is positioned to capture a significant share of the productivity tools market for infrastructure and security professionals.

---

## References

[1] IT Forum. "Mercado de TI no Brasil cresce 18,5% em 2025." April 2026. https://itforum.com.br/noticias/mercado-ti-brasil-cresce-185-2025/

[2] MarketsandMarkets. "Artificial Intelligence in Cybersecurity Market Report 2026." https://www.marketsandmarkets.com/Market-Reports/artificial-intelligence-ai-cyber-security-market-220634996.html

[3] InvestSP/IDC. "Brasil lidera mercado de IA na América Latina." April 2026. https://investsp.org.br/brasil-lidera-mercado-de-ia-na-america-latina-aponta-idc/

[4] Meio & Mensagem. "ChatGPT domina mercado de inteligência artificial no Brasil." November 2025. https://www.meioemensagem.com.br/marketing/chatgpt-domina-mercado-de-inteligencia-artificial-no-brasil

[5] Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models." arXiv:2210.03629, 2022. https://arxiv.org/abs/2210.03629

---

*Confidential Document — Sperry Tecnologia © 2026. All rights reserved.*
