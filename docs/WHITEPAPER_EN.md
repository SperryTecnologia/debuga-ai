# debuga.ai — Technical Whitepaper

**Autonomous AI Agent Platform for IT Infrastructure, Cybersecurity, and Telecommunications**

**Version:** 1.0  
**Date:** May 2026  
**Author:** Sperry Tecnologia  
**Website:** www.sperrytecnologia.com.br

---

## Executive Summary

**debuga.ai** is a SaaS platform that provides an autonomous AI agent specialized in IT infrastructure, cybersecurity, DevOps, and telecommunications. Unlike conventional chatbots that only answer questions, debuga.ai is an agent that **acts**: it executes code, navigates websites, scans ports, verifies SSL certificates, queries DNS records, and generates technical reports autonomously.

The platform was designed and developed by **Sperry Tecnologia** for the Brazilian technology market, which reached US$ 67.8 billion in revenue in 2025, growing 18.5% year-over-year [1]. The global AI in cybersecurity market, valued at US$ 22.37 billion in 2025, is projected to reach US$ 50.83 billion by 2031 at a 14.8% CAGR [2]. Brazil leads the Latin American AI market, with spending expected to grow 3.8x between 2025 and 2029 [3].

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

### 2.2 Agent Capabilities

| Capability | Description | Differentiator |
|---|---|---|
| Code Execution | Isolated sandbox for Python and Bash | Real-time automation scripts |
| Web Navigation | Accesses and extracts page content | Documentation and CVE analysis |
| Port Scanning | Scans open ports on hosts | Automated security auditing |
| DNS Lookup | Complete DNS queries | Name resolution diagnostics |
| SSL/TLS Check | Verifies certificates and chains | Expiration and vulnerability detection |
| HTTP Check | Analyzes headers and site status | Web security verification |
| WHOIS Lookup | Queries domain information | Ownership investigation |
| Image Generation | Creates diagrams and flowcharts | Automated visual documentation |

### 2.3 Autonomous Agent Flow

```
User sends message
    ↓
Agent analyzes context and decides action
    ↓
[Iteration 1] Executes tool(s) automatically
    ↓
Analyzes results
    ↓
[Iteration 2-5] Decides if more actions needed
    ↓
Synthesizes final response with results
    ↓
Debits credits and logs usage
```

The agent operates in a loop of up to 5 iterations, autonomously deciding which tools to use at each step. This enables solving complex problems that require multiple chained queries.

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 19 + Tailwind CSS 4 | Performance, DX, ecosystem |
| Backend | Express 4 + tRPC 11 | End-to-end type safety |
| Database | MySQL/TiDB (Drizzle ORM) | Horizontal scalability |
| LLM | Google Gemini 2.5 Flash (via API) | Cost-effectiveness, speed |
| Streaming | Server-Sent Events (SSE) | Real-time response |
| Payments | Stripe (BRL) | Global standard, PIX support |
| Storage | S3 (compatible) | Scalable, low cost |
| Authentication | OAuth 2.0 | Industry-standard security |

### 3.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│  React 19 + Tailwind 4 + tRPC Client + SSE Consumer     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                    SERVER (Node.js)                       │
│  Express 4 + tRPC 11 + SSE Stream + Stripe Webhooks     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Auth     │  │ Chat     │  │ Credits  │  │ Stripe │ │
│  │ Module   │  │ Stream   │  │ System   │  │ Routes │ │
│  └──────────┘  └────┬─────┘  └──────────┘  └────────┘ │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │           AGENT LOOP (max 5 iterations)           │   │
│  │  ┌─────────────────────────────────────────────┐ │   │
│  │  │ Tools: code_exec, dns, ssl, http, whois,    │ │   │
│  │  │        port_scan, web_fetch, image_gen       │ │   │
│  │  └─────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌─────────┐ ┌──────────┐
│ MySQL/TiDB   │ │ LLM API │ │ S3       │
│ (Drizzle)    │ │ (Gemini)│ │ Storage  │
└──────────────┘ └─────────┘ └──────────┘
```

### 3.3 Data Model

The database is structured in 6 main tables:

- **users**: User registration with OAuth, roles (admin/user), Stripe customer ID
- **conversations**: Conversations with pin, archive, and timestamp support
- **messages**: Messages with role (user/assistant/system), tool_calls, token count
- **subscriptions**: Stripe subscriptions with status, period, cancellation
- **credits**: Per-user credits with total, used, planId, monthly reset
- **usage_log**: Detailed consumption history per conversation/tool

### 3.4 Credits and Limits System

| Plan | Messages/Day | Conversations/Month | Total Credits |
|---|---|---|---|
| Free | 5 | 3 | 50 |
| Starter | 100 | 30 | 1,000 |
| Pro | Unlimited | Unlimited | 10,000 |
| Enterprise | Unlimited | Unlimited | 100,000 |

The credits system operates in three protection layers:
1. **Rate Limiting**: Maximum 20 messages per minute (abuse protection)
2. **Plan Limits**: Message/day and conversation/month verification before processing
3. **Credits**: Proportional debit based on token consumption after each response

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
- **Data isolation**: Each user accesses only their own conversations
- **Rate limiting**: Protection against flood and API abuse
- **Code sandbox**: Isolated execution without host system access
- **Mandatory HTTPS**: All communication encrypted in transit
- **Stripe PCI-DSS**: Payment data never touches our servers

### 5.2 Data Privacy

- Conversations are stored only for the user's own history
- No data is shared with third parties beyond LLM processing
- Users can delete conversations and data at any time
- Compliance with LGPD (Brazil's General Data Protection Law)

---

## 6. Roadmap

### 6.1 Current Phase (v4.0) — Completed

- Autonomous agent with 8 integrated tools
- Functional credits and billing system
- Professional chat interface with streaming
- Landing page, pricing, account dashboard
- 60 automated tests

### 6.2 Phase 2 (v5.0) — Q3 2026

- Coupon system for educational program
- Google OAuth with custom login screen (self-hosted)
- Direct Zabbix API integration (real-time monitoring)
- Wazuh API integration (security alerts)
- Team metrics dashboard

### 6.3 Phase 3 (v6.0) — Q4 2026

- Public API for third-party tool integration
- Agent with long-term memory (cross-conversation context)
- Automation templates (pre-configured playbooks)
- Integration marketplace
- Mobile app (React Native)

### 6.4 Phase 4 (v7.0) — 2027

- Multi-tenancy for MSPs
- White-label for resellers
- Agent with execution capability on client infrastructure (via remote agent)
- Security certifications (SOC 2, ISO 27001)

---

## 7. Competitive Analysis

| Criteria | debuga.ai | ChatGPT | GitHub Copilot | SIEM Tools |
|---|---|---|---|---|
| IT/Infra specialization | Native | Generic | Code only | Alerts only |
| Code execution | Isolated sandbox | Limited | No | No |
| Port scan / SSL check | Yes | No | No | Partial |
| Autonomous web navigation | Yes | Limited | No | No |
| BRL pricing | Yes | USD | USD | Variable |
| Portuguese support | Native | Translated | English | Variable |
| Autonomous agent (multi-step) | 5 iterations | 1 response | Suggestions | Fixed rules |

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
- Expertise in JSX and modern interface development
- "Open Infra Pro" educational program with active student base
- Human + AI hybrid support model

---

## 10. Conclusion

debuga.ai represents a new category of tool for IT professionals: the **specialized autonomous agent**. By combining the reasoning capability of state-of-the-art LLMs with real execution tools (sandbox, network scanning, web scraping), the platform offers an assistant that doesn't just suggest — it **executes**.

With the Brazilian IT market in strong expansion and the growing adoption of AI in cybersecurity, debuga.ai is positioned to capture a significant share of the productivity tools market for infrastructure and security professionals.

---

## References

[1] IT Forum. "Mercado de TI no Brasil cresce 18,5% em 2025." April 2026. https://itforum.com.br/noticias/mercado-ti-brasil-cresce-185-2025/

[2] MarketsandMarkets. "Artificial Intelligence in Cybersecurity Market Report 2026." https://www.marketsandmarkets.com/Market-Reports/artificial-intelligence-ai-cyber-security-market-220634996.html

[3] InvestSP/IDC. "Brasil lidera mercado de IA na América Latina." April 2026. https://investsp.org.br/brasil-lidera-mercado-de-ia-na-america-latina-aponta-idc/

[4] Meio & Mensagem. "ChatGPT domina mercado de inteligência artificial no Brasil." November 2025. https://www.meioemensagem.com.br/marketing/chatgpt-domina-mercado-de-inteligencia-artificial-no-brasil

[5] Gartner. "Worldwide AI Spending Will Total $2.5 Trillion in 2026." January 2026. https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026

---

*Confidential Document — Sperry Tecnologia © 2026. All rights reserved.*
