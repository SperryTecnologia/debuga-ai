# debuga.ai White Label / Enterprise

**Version:** 1.0  
**Date:** May 2026  
**Author:** Sperry Tecnologia  
**Status:** Active commercial proposal

---

## 1. What is debuga.ai White Label

debuga.ai White Label is a tailored deployment of the debuga.ai platform for organizations that need an AI agent operating under their own brand, with a custom knowledge base and a dedicated environment.

The debuga.ai architecture was designed from the ground up to support customization and dedicated deployment scenarios. This means a company can run its own instance of the agent — with its own branding, domain context, support workflows, and integrations — without relying on the shared infrastructure of the public debuga.ai platform.

White Label is not a self-service, one-click product. It is a consultative engagement, scoped according to each organization's volume, integrations, and specific requirements.

---

## 2. What can be customized

The table below summarizes the main customization areas available under the White Label model.

| Customization area | Description |
|---|---|
| **Visual identity** | Name, logo, color scheme, favicon, application title, and agent response tone. |
| **Context and instructions** | System prompt, areas of expertise, technical vocabulary, response constraints, and diagnostic workflows. |
| **Knowledge base** | Internal documents, FAQs, processes, policies, manuals, and domain-specific references the agent uses as context. |
| **Support workflows** | Escalation rules, human triage, routing to internal teams, and integration with existing support channels. |
| **Authentication** | Custom authentication provider (Google OAuth, SAML, LDAP) replacing the platform's default authentication. |
| **Database** | Dedicated database instance (PostgreSQL or compatible) with full data isolation. |
| **Storage** | S3-compatible storage (MinIO, AWS S3, or equivalent) for agent files and documents. |
| **AI providers** | LLM provider configuration (OpenAI, Anthropic, Google, or local providers via Ollama) based on requirements and budget. |
| **Domain** | Company-owned domain (e.g., ai.yourcompany.com) with TLS certificate. |

---

## 3. What is not included by default

To maintain transparency and avoid misaligned expectations, it is important to list what is **not** part of the standard White Label scope.

debuga.ai White Label **does not include**, unless specifically agreed upon in the contract:

- Fine-tuning of proprietary language models. The agent uses commercial models (OpenAI, Anthropic, Google) or open-source models via Ollama. There is no model trained exclusively for debuga.ai.
- Proprietary LLM in production. Inference is handled by external providers or by open-source models in validated environments. There is no guarantee of performance equivalent to commercial models in local inference scenarios.
- One-click autonomous installation. Dedicated deployment requires technical configuration, infrastructure sizing, and support from the Sperry Tecnologia team.
- Unlimited support or 24/7 SLA without a contract. Senior human support is scoped according to the plan and the Enterprise agreement.
- Full source code delivery under all plans. Source code access is negotiated based on the scope of the Enterprise project.
- Official training certification. Usage training is provided as practical technical guidance, not as a formal certification program.

---

## 4. Reference architecture

The White Label architecture follows the same design as the debuga.ai platform, with adaptations for isolation and customization.

```
┌─────────────────────────────────────────────────┐
│                  Client (Browser)               │
│         React + Tailwind + tRPC Client          │
│         Custom visual identity                  │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────┐
│              Reverse Proxy (Nginx)              │
│         TLS, rate limiting, headers             │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│           Application Server (Node.js)          │
│     Express + tRPC + SSE Streaming + Auth       │
│     Custom system prompt + context              │
└──────┬──────────┬──────────┬────────────────────┘
       │          │          │
┌──────▼───┐ ┌────▼───┐ ┌────▼────────────┐
│ Database │ │Storage │ │ LLM Gateway     │
│          │ │  S3    │ │ Cloud + Local   │
│PostgreSQL| │ MinIO  │ │ (Ollama/OpenAI) │
└──────────┘ └────────┘ └─────────────────┘
```

Each component can be hosted on the company's own infrastructure, on a dedicated VPS, or in a hybrid architecture (cloud + on-premise), depending on the project scope.

---

## 5. Relationship with staging / on-premise environments

Sperry Tecnologia maintains a private staging and dedicated deployment architecture, used to validate Enterprise scenarios before production rollout.

This architecture enables:

- Testing integrations with custom authentication (Google OAuth, SAML) in an isolated environment.
- Validating database migration to a dedicated PostgreSQL instance.
- Evaluating the performance of open-source LLM models on GPU hardware (experimental local inference).
- Simulating the client's production environment before go-live.

The staging environment is not publicly accessible and is not available to clients without an active Enterprise contract.

---

## 6. Security and data isolation

The White Label model was designed with data isolation as a foundational principle.

| Aspect | Guarantee |
|---|---|
| **Database** | Dedicated instance, with no data shared across clients. |
| **Storage** | Isolated S3 bucket with exclusive access credentials. |
| **Authentication** | Company-owned authentication provider, with no dependency on third parties. |
| **Network** | Internal communication over an isolated Docker network; only ports 80/443 exposed. |
| **Logs** | Application, access, and audit logs retained within the client's environment. |
| **Backups** | Automated backup routine with configurable retention policy. |
| **Encryption** | TLS in transit; encryption at rest as configured by the storage provider. |

Enterprise client data never passes through the shared infrastructure of the public debuga.ai platform.

---

## 7. Training and knowledge transfer

Enterprise projects may include, as defined in the contract:

- Usage training sessions for the client's team, covering agent capabilities, context customization, and interaction best practices.
- Environment-specific technical documentation, including operations guides, troubleshooting procedures, and backup/restore workflows.
- Technical guidance for the client's IT team on architecture, integrations, and dedicated environment maintenance.
- Post-deployment support during the stabilization period, with senior human assistance as scoped in the agreement.

Training is delivered as practical technical guidance, not as a formal certification program. The goal is to enable the client's team to operate and evolve the environment independently.

---

## 8. Deployment model

### Deployment models

debuga.ai White Label / Enterprise can be planned for different deployment models: dedicated cloud, VPS, GPU-enabled VPS, customer-owned server, local datacenter, or hybrid architecture. The choice depends on security, cost, performance, governance, integrations, and local inference requirements.

Dedicated GPU environments may be evaluated when local workloads, open model testing, experimental inference, or specific privacy and latency requirements are needed.

### Deployment process

The Enterprise deployment follows a consultative process.

**Phase 1 — Discovery and scoping.** Initial meeting to understand the organization's needs: agent areas of expertise, desired integrations, expected volume, security requirements, and available infrastructure.

**Phase 2 — Technical proposal.** Document outlining the proposed architecture, estimated timeline, infrastructure requirements, and investment. No commitment until formal approval.

**Phase 3 — Environment setup.** Infrastructure provisioning (VPS, cloud, or on-premise), database configuration, storage, authentication, and application deployment.

**Phase 4 — Customization.** Visual identity application, system prompt configuration, knowledge base setup, support workflows, and integration of client-specific services.

**Phase 5 — Staging validation.** Testing in the dedicated environment, integration validation, performance tuning, and client sign-off.

**Phase 6 — Go-live and support.** Production launch, team training, and post-deployment support as defined in the contract.

---

## 9. Honest limitations

To maintain the transparency that characterizes debuga.ai's communication, it is important to document the current limitations of the White Label model.

- **Local inference is experimental.** Open-source models running on local GPU hardware (via Ollama) deliver lower performance than commercial models (OpenAI GPT-4o, Anthropic Claude) on complex tasks. Local inference is recommended for staging, testing, and lightweight workloads — not as a full replacement for cloud providers in production.

- **Integrations are project-based.** Connectors for Zabbix, Wazuh, Prometheus, Grafana, NetBox, and other tools are on the roadmap but are not plug-and-play. Each integration requires configuration, testing, and validation in the client's environment.

- **The agent does not replace an IT team.** debuga.ai is a support tool that accelerates diagnostics, generates documentation, and guides decisions. It does not make autonomous decisions in production environments without human oversight.

- **SLA depends on the contract.** There is no standard SLA for the White Label model. Service levels are negotiated based on the project scope, volume, and investment.

- **Evolution follows the roadmap.** Future capabilities (push notifications, full offline support, native integrations) follow the platform roadmap and may not be available at the time of deployment.

---

## 10. Roadmap

The debuga.ai White Label roadmap includes the following planned evolutions, subject to prioritization and technical validation.

| Horizon | Planned evolution |
|---|---|
| **Short term** | Connectors for Zabbix and Wazuh; improvements to the hybrid LLM gateway (cloud + local); installable PWA. |
| **Medium term** | Native integration with NetBox and CMDB; push notifications; agent metrics dashboard; multi-language system prompt support. |
| **Long term** | Optimized local inference with specialized models; knowledge base marketplace; public API for external system integration; multi-agent support per instance. |

The roadmap is indicative and does not constitute a delivery commitment. Prioritization is influenced by Enterprise client feedback and the evolving landscape of language models.

---

## Contact

To learn more about debuga.ai White Label / Enterprise, contact Sperry Tecnologia's commercial team through the official channel available on the landing page.

The engagement is consultative and intended for companies evaluating customization, dedicated deployment, training, senior human support, or white-label architecture according to scope.

- **Website:** [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)
- **Platform:** [debuga.ai](https://debuga.ai)
