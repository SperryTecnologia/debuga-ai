# debuga.ai — Plataforma de IA Operacional para TI, Segurança e Infraestrutura

**Agente de IA para diagnóstico técnico, documentação, automação, análise de ambientes e white label para empresas, MSPs e operações de suporte.**

Desenvolvida por [Sperry Tecnologia](https://www.sperrytecnologia.com.br).

---

## O que é a debuga.ai

A **debuga.ai** é uma plataforma de IA operacional que combina modelos de linguagem de última geração com base de conhecimento proprietária, automação de tarefas e suporte humano sênior. Diferente de chatbots genéricos, foi construída para o contexto operacional: diagnóstico de falhas, análise de logs, auditoria de segurança, geração de documentação técnica e automação de rotinas.

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
| Cartórios e Governo | Automação de processos, consulta a legislação, atendimento |

---

## Principais Capacidades

**Diagnóstico e Troubleshooting** — Análise de logs de sistemas, firewalls, switches e servidores. Diagnóstico de falhas de rede, conectividade e serviços. Correlação de eventos entre múltiplas fontes.

**Segurança da Informação** — Auditoria de configurações e hardening. Análise de vulnerabilidades (CVE). Revisão de políticas de firewall e ACLs. Relatórios de conformidade.

**Automação Técnica** — Geração de scripts (Bash, Python, PowerShell). Configuração de equipamentos de rede. Templates de IaC (Terraform, Ansible, Docker). Automação de rotinas operacionais.

**Geração Multimodal** — Diagramas de rede e topologia. Documentação técnica estruturada. Imagens e assets para relatórios. Exportação em múltiplos formatos.

**Ferramentas de Rede Integradas** — DNS lookup, SSL check, HTTP check, WHOIS, port scan, web fetch — invocadas autonomamente pelo agente durante o raciocínio.

**Análise de Documentos e Imagens** — Suporte a 12+ formatos (PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML, XML, SQL). Screenshots, prints de erro e dashboards analisados visualmente.

---

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE (DNS + WAF + Turnstile)         │
├─────────────────────────────────────────────────────────────┤
│                  NGINX (TLS 1.3 + Rate Limiting + CSP)      │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Tailwind 4 + shadcn/ui)               │
│  ├── Chat UI com streaming SSE                              │
│  ├── Painel administrativo completo                         │
│  ├── Documentação interativa                                │
│  └── Landing page white label                               │
├─────────────────────────────────────────────────────────────┤
│  Backend (Express 4 + tRPC 11 + TypeScript)                 │
│  ├── Agente autônomo (loop de raciocínio + tool calling)    │
│  ├── Orquestrador LLM (GPU local → cloud fallback)          │
│  ├── Billing (Stripe webhooks + quotas)                     │
│  └── Auth (email/senha + Google OAuth + Turnstile)          │
├─────────────────────────────────────────────────────────────┤
│  Serviços                                                   │
│  ├── PostgreSQL 16 (dados, sessões, auditoria)              │
│  ├── MinIO (S3-compatible object storage)                   │
│  ├── Ollama / vLLM (inferência local GPU)                   │
│  └── SMTP / Brevo (email transacional)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## GPU Local + Fallback Cloud

O debuga.ai opera com arquitetura híbrida: modelos locais (Ollama/vLLM em GPU dedicada) processam requisições sensíveis sem enviar dados para fora. Quando a carga excede a capacidade local ou o modelo requerido não está disponível, o sistema faz fallback transparente para providers cloud.

| Cenário | Comportamento |
|---------|--------------|
| GPU disponível e saudável | Inferência local (latência baixa, custo zero) |
| GPU em cold start | Aguarda warmup ou aciona fallback |
| GPU indisponível | Fallback automático para provider cloud |
| Sem GPU instalada | Apenas providers cloud |

Providers cloud suportados: OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), Google (Gemini 2.0), DeepSeek, Qwen e outros via gateway proprietário.

---

## White Label e Implantação Dedicada

A plataforma foi projetada para personalização completa:

| Aspecto | Personalização |
|---------|---------------|
| Marca | Nome, logo, cores, domínio próprio |
| Infraestrutura | VM dedicada ou on-premise |
| Dados | Isolamento total por instância |
| Planos | Definidos pelo operador |
| Billing | Stripe integrado, configurável |
| Knowledge Base | Runbooks, documentação e procedimentos próprios |
| Suporte | Canal próprio + escalação para sênior |

---

## Segurança, Auditoria e Governança

**Segurança** — TLS 1.3, HSTS preload, CSP restritiva, Cloudflare WAF, Turnstile CAPTCHA, rate limiting por endpoint, JWT httpOnly com sameSite:lax.

**Auditoria** — Registro completo de todas as interações com metadados (usuário, provider, tokens, custo, latência). Exportação de logs. Conformidade com políticas internas.

**Controle de Custos** — Limites configuráveis por usuário e plano. Alertas de consumo. Bloqueio automático. Relatório de custo por provider.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Tailwind CSS 4 + shadcn/ui |
| Backend | Express 4 + tRPC 11 + TypeScript |
| ORM | Drizzle ORM |
| Banco de dados | PostgreSQL 16 |
| Inferência local | Ollama / vLLM (NVIDIA GPU) |
| Storage | MinIO (S3-compatible) |
| Containerização | Docker + Docker Compose |
| Reverse proxy | NGINX + Let's Encrypt |
| CDN/WAF | Cloudflare |
| Billing | Stripe |
| Email | SMTP / Brevo |
| CAPTCHA | Cloudflare Turnstile |

---

## Ecossistema de Repositórios

| Repositório | Tipo | Descrição |
|-------------|------|-----------|
| [debuga-ai](https://github.com/SperryTecnologia/debuga-ai) | Vitrine | Documentação pública e visão geral |
| debuga-ai-prod | Privado | Código de produção white label |
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Arquitetura | Estratégia LLM híbrida (GPU + cloud) |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Pesquisa | Avaliação de modelos para code generation |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Experimental | Serving local com vLLM |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Experimental | Gateway OpenAI-compatible |

---

## Documentação

A documentação completa está disponível na plataforma:

| Documento | Link |
|-----------|------|
| Whitepaper | [debuga.ai/docs/whitepaper](https://debuga.ai/docs/whitepaper) |
| Arquitetura Técnica | [debuga.ai/docs/architecture](https://debuga.ai/docs/architecture) |
| White Label Enterprise | [debuga.ai/docs/white-label-enterprise](https://debuga.ai/docs/white-label-enterprise) |

Documentação complementar neste repositório:

| Documento | Descrição |
|-----------|-----------|
| [Whitepaper PT-BR](docs/WHITEPAPER_PTBR.md) | Visão estratégica e proposta de valor |
| [Whitepaper EN](docs/WHITEPAPER_EN.md) | English version |
| [Arquitetura PT-BR](docs/ARCHITECTURE_PTBR.md) | Arquitetura de referência |
| [Architecture EN](docs/ARCHITECTURE_EN.md) | English version |
| [Estratégia LLM](docs/R_AND_D_LLM_STACK.md) | Pesquisa e decisões sobre inferência |
| [Roadmap](docs/ROADMAP.md) | Roadmap público |
| [Providers](docs/PROVIDERS_OVERVIEW.md) | Providers de IA suportados |
| [White Label](docs/WHITE_LABEL_OVERVIEW.md) | Modelo de implantação |
| [Segurança](docs/SECURITY_OVERVIEW.md) | Políticas de segurança |

---

## Roadmap

| Item | Status |
|------|--------|
| Agente conversacional com contexto técnico | Produção |
| Inferência local via GPU (Ollama/vLLM) | Produção |
| Fallback multi-provider cloud | Produção |
| Geração de imagens e diagramas | Produção |
| Controle de custos e billing (Stripe) | Produção |
| White label com marca própria | Produção |
| Auditoria e logs estruturados | Produção |
| Auth completa (email + Google OAuth + Turnstile) | Produção |
| Integração com Zabbix/Grafana/Prometheus | Em desenvolvimento |
| RAG com documentação interna | Em desenvolvimento |
| WhatsApp Business | Planejado |
| SSO/SAML | Planejado |
| Multi-tenant enterprise | Planejado |

---

## Scripts de Validação

Este repositório inclui scripts de validação para verificar a integridade de deploys e configurações públicas:

| Script | Descrição |
|--------|----------|
| `scripts/check-seo-analytics.sh` | Valida GA4, meta tags, sitemap e robots.txt |
| `scripts/check-public-links.sh` | Verifica links públicos retornam HTTP 200 |
| `scripts/check-sitemap.sh` | Valida estrutura e URLs do sitemap.xml |
| `scripts/check-robots.sh` | Verifica conformidade do robots.txt |
| `scripts/check-security-headers.sh` | Audita headers de segurança (HSTS, CSP, X-Frame) |
| `scripts/check-docs-links.sh` | Verifica links internos da documentação |

Para detalhes de uso, consulte [docs/VALIDATION_SCRIPTS.md](docs/VALIDATION_SCRIPTS.md).

---

## Licença

Documentação pública sob licença MIT. O código de produção da plataforma é privado e comercial.

Para informações sobre licenciamento, demonstrações ou implantação, entre em contato com a Sperry Tecnologia.

---
