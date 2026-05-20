# debuga.ai — Plataforma White Label de IA Operacional

**IA operacional para infraestrutura de TI, segurança da informação, DevOps, telecomunicações, automação técnica e suporte especializado.**

Desenvolvida por [Sperry Tecnologia](https://www.sperrytecnologia.com.br).

---

## O que é a debuga.ai

A **debuga.ai** é uma plataforma de inteligência artificial projetada para equipes técnicas que operam infraestrutura, redes, servidores, segurança e telecomunicações. Diferente de assistentes genéricos, a debuga.ai foi construída para o contexto operacional: diagnóstico de falhas, análise de logs, auditoria de segurança, geração de diagramas técnicos e automação de rotinas repetitivas.

A plataforma é oferecida como **white label**, permitindo que MSPs, provedores de internet, consultorias de TI e equipes internas operem a solução com marca própria, em infraestrutura dedicada, com controle total sobre dados e custos.

---

## Para quem é

| Perfil | Caso de uso |
|--------|-------------|
| MSPs e provedores de serviços gerenciados | Suporte técnico assistido por IA com marca própria |
| Provedores de internet (ISPs) | Diagnóstico de rede, automação de NOC |
| Equipes de segurança (SOC/NOC) | Análise de vulnerabilidades, hardening, auditoria |
| DevOps e SRE | Automação de infraestrutura, troubleshooting |
| Consultorias de TI | Ferramenta interna de produtividade técnica |
| Telecomunicações | Configuração de equipamentos, análise de topologia |

---

## Principais Capacidades

A plataforma oferece um agente de IA especializado com as seguintes capacidades operacionais:

**Diagnóstico e Troubleshooting** — Análise de logs de sistemas, firewalls, switches e servidores. Diagnóstico de falhas de rede, conectividade e serviços. Correlação de eventos entre múltiplas fontes. Sugestões de resolução baseadas em contexto técnico.

**Segurança da Informação** — Auditoria de configurações e hardening. Análise de vulnerabilidades (CVE). Revisão de políticas de firewall e ACLs. Geração de relatórios de conformidade.

**Automação Técnica** — Geração de scripts (Bash, Python, PowerShell). Configuração de equipamentos de rede. Templates de IaC (Terraform, Ansible, Docker). Automação de rotinas operacionais.

**Geração Multimodal** — Diagramas de rede e topologia. Documentação técnica estruturada. Imagens e assets para relatórios. Exportação em múltiplos formatos (PDF, PNG, SVG, Markdown).

**Ferramentas de Rede Integradas** — DNS lookup, SSL check, HTTP check, WHOIS lookup, port scan, web fetch. Invocadas autonomamente pelo agente durante o loop de raciocínio.

**Análise de Documentos e Imagens** — Suporte a 12+ formatos (PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML, XML, SQL). Screenshots, prints de erro, dashboards e topologias analisados visualmente.

**Billing e Planos** — Integração Stripe com assinaturas, controle de consumo por plano, webhooks de ciclo de vida e upgrade/downgrade automático.

**Painel Administrativo** — Gestão de usuários, logs de auditoria, métricas de uso e configuração de planos.

---

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (TLS + Rate Limiting)             │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Tailwind 4 + shadcn/ui)               │
│  ├── Chat UI com streaming SSE                              │
│  ├── Painel administrativo                                  │
│  ├── Landing page white label                               │
│  └── Renderização de diagramas Mermaid                      │
├─────────────────────────────────────────────────────────────┤
│  Backend (Express 4 + tRPC 11)                              │
│  ├── Agente autônomo (loop de raciocínio + tool calling)    │
│  ├── Roteamento LLM (local → cloud fallback)                │
│  ├── Billing (Stripe webhooks)                              │
│  └── Auth (local + OAuth + verificação)                     │
├─────────────────────────────────────────────────────────────┤
│  Serviços                                                   │
│  ├── PostgreSQL 16 (dados, sessões, auditoria)              │
│  ├── MinIO (S3-compatible storage)                          │
│  ├── Ollama (inferência local GPU)                          │
│  └── SMTP/Brevo (email transacional)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## White Label e Implantação Dedicada

A plataforma foi projetada para personalização completa:

| Aspecto | Personalização |
|---------|---------------|
| Marca | Nome, logo, cores, domínio próprio |
| Infraestrutura | Servidor dedicado do operador |
| Dados | Isolamento total, sem compartilhamento |
| Planos | Definidos pelo operador (free, pro, enterprise) |
| Billing | Stripe integrado, configurável |
| Suporte | Canal próprio do operador |
| Idioma | Português, inglês (extensível) |

O operador controla quais funcionalidades estão habilitadas, limites por plano, providers de IA disponíveis, políticas de retenção de dados e integrações com sistemas internos.

---

## GPU Local + Fallback Cloud

O debuga.ai suporta inferência local com GPU dedicada (NVIDIA) via Ollama, com fallback automático para providers cloud quando necessário.

| Cenário | Comportamento |
|---------|--------------|
| GPU disponível e saudável | Inferência local (latência baixa, custo zero) |
| GPU em cold start | Aguarda warmup ou aciona fallback |
| GPU indisponível | Fallback automático para provider cloud |
| Sem GPU instalada | Apenas providers cloud |

Providers cloud suportados: OpenAI, Anthropic, Google Gemini, OpenRouter.

---

## Segurança, Auditoria e Controle de Custos

**Segurança** — Dados permanecem no ambiente do operador (GPU local). Comunicação criptografada (TLS 1.3). Autenticação e autorização por papel (RBAC). Logs de auditoria imutáveis. Sem compartilhamento de dados entre tenants.

**Auditoria** — Registro completo de todas as interações. Rastreabilidade de decisões do agente. Exportação de logs para SIEM. Conformidade com políticas internas.

**Controle de Custos** — Limites diários e mensais configuráveis (USD). Alertas ao atingir thresholds. Bloqueio automático ao atingir limite. Relatório de consumo por usuário e por plano. Priorização de GPU local (custo zero).

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Tailwind CSS 4 + shadcn/ui |
| Backend | Express 4 + tRPC 11 |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL 16 |
| Inferência local | Ollama (NVIDIA GPU) |
| Storage | MinIO (S3-compatible) |
| Containerização | Docker + Docker Compose |
| Reverse proxy | NGINX + Let's Encrypt |
| Billing | Stripe |
| Email | SMTP / Brevo |

---

## Ecossistema de Repositórios

| Repositório | Visibilidade | Tipo | Status | Função |
|-------------|--------------|------|--------|--------|
| [debuga-ai](https://github.com/SperryTecnologia/debuga-ai) | Público | Vitrine/documentação | Ativo | Visão geral pública da plataforma |
| debuga-ai-prod | **Privado** | Produto comercial | Production-ready | Código white label para deploy |
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Público | Arquitetura | Ativo | Estratégia LLM híbrida |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Público | Pesquisa aplicada | Lab | Avaliação de modelos técnicos |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Público | Experimental | Lab | Serving local com vLLM |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Público | Experimental | Lab | Gateway OpenAI-compatible |

Os repositórios públicos documentam visão, pesquisa e componentes auxiliares. A versão comercial production-ready é mantida em repositório privado por segurança e governança.

---

## Código de Produção

A versão production-ready da plataforma é mantida em repositório privado por segurança, governança, proteção da arquitetura e operação comercial:

> **SperryTecnologia/debuga-ai-prod** (privado)

Para acesso comercial, entre em contato com a Sperry Tecnologia.

---

## Documentação Pública

| Documento | Descrição |
|-----------|-----------|
| [Whitepaper PT-BR](docs/WHITEPAPER_PTBR.md) | Visão estratégica, mercado, proposta de valor e modelo de negócio |
| [Whitepaper EN](docs/WHITEPAPER_EN.md) | English version of the strategic whitepaper |
| [Arquitetura PT-BR](docs/ARCHITECTURE_PTBR.md) | Arquitetura de referência da plataforma |
| [Arquitetura EN](docs/ARCHITECTURE_EN.md) | English version of the reference architecture |
| [Estratégia LLM](docs/R_AND_D_LLM_STACK.md) | Pesquisa e decisões sobre stack de inferência |
| [Roadmap](docs/ROADMAP.md) | Roadmap público detalhado |
| [Providers](docs/PROVIDERS_OVERVIEW.md) | Visão geral dos providers de IA suportados |
| [White Label](docs/WHITE_LABEL_OVERVIEW.md) | Modelo de implantação white label |
| [Segurança](docs/SECURITY_OVERVIEW.md) | Políticas de segurança e conformidade |

> Documentos públicos contêm visão estratégica e roadmap. A versão production-ready comercial é mantida em repositório privado.

---

## Roadmap Público

| Item | Status | Horizonte |
|------|--------|----------|
| Agente conversacional com contexto técnico | Produção | — |
| Inferência local via GPU (Ollama) | Produção | — |
| Fallback multi-provider cloud | Produção | — |
| Geração de imagens e diagramas | Produção | — |
| Controle de custos e billing | Produção | — |
| White label com marca própria | Produção | — |
| Auditoria e logs estruturados | Produção | — |
| Integração com Zabbix/Grafana/Prometheus | Em desenvolvimento | Q3 2025 |
| RAG com documentação interna | Em desenvolvimento | Q3 2025 |
| Fine-tuning para domínio técnico | Pesquisa | 2026 |
| Multi-tenant enterprise | Planejado | 2026 |

---

## Licença

Documentação pública sob licença MIT. O código de produção da plataforma é privado e comercial.

Para informações sobre licenciamento, demonstrações ou acesso ao repositório de produção, entre em contato com a Sperry Tecnologia.

---

## Contato

**Sperry Tecnologia**
- Site: [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)
- Plataforma: [debuga.ai](https://debuga.ai)
- GitHub: [SperryTecnologia](https://github.com/SperryTecnologia)
