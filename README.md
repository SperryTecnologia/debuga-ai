# debuga.ai

**Plataforma white label de IA operacional para infraestrutura de TI, segurança da informação, DevOps, telecomunicações e automação técnica.**

Desenvolvida por [Sperry Tecnologia](https://www.sperrytecnologia.com.br).

---

## O que é

O **debuga.ai** é uma plataforma de inteligência artificial projetada para equipes técnicas que operam infraestrutura, redes, servidores, segurança e telecomunicações. Diferente de assistentes genéricos, o debuga.ai foi construído para o contexto operacional: diagnóstico de falhas, análise de logs, auditoria de segurança, geração de diagramas técnicos e automação de tarefas repetitivas.

A plataforma opera em modo **white label**, permitindo que empresas de tecnologia, MSPs, provedores de internet e consultorias ofereçam o produto com sua própria marca, domínio e identidade visual.

---

## Proposta de Valor

| Para quem | O que resolve |
|-----------|--------------|
| **NOC/SOC** | Diagnóstico assistido por IA com ferramentas de rede integradas |
| **DevOps** | Automação de análise, geração de scripts e troubleshooting |
| **MSPs** | Plataforma white label para oferecer IA como serviço aos clientes |
| **Provedores de Internet** | Suporte técnico de primeiro nível automatizado |
| **Consultorias de TI** | Ferramenta de produtividade para equipes técnicas |
| **Treinamento** | Laboratório prático de implantação SaaS com IA |

---

## Recursos Principais

**Agente autônomo com ferramentas de diagnóstico** — DNS lookup, SSL check, HTTP check, WHOIS lookup, port scan, web fetch, execução de código e geração de imagens. Todas as ferramentas são invocadas autonomamente pelo agente durante o loop de raciocínio.

**Inferência híbrida local/cloud** — GPU local via Ollama com fallback automático para providers cloud (OpenAI, Anthropic, Google Gemini, OpenRouter). O operador controla a prioridade e os limites de custo.

**Geração multimodal** — Imagens técnicas (diagramas de rede, topologias, dashboards), vídeos explicativos e diagramas Mermaid renderizados inline com exportação em PNG, SVG e PDF.

**Upload e análise de documentos** — Suporte a 12+ formatos (PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML, XML, SQL) com extração automática e análise contextual.

**Upload e análise de imagens** — Screenshots, prints de erro, dashboards e topologias analisados visualmente com profundidade técnica.

**Billing e planos** — Integração Stripe com assinaturas, controle de consumo por plano, webhooks de ciclo de vida e upgrade/downgrade automático.

**Autenticação e segurança** — Login local (email/senha) + OAuth (Google), verificação de email, Cloudflare Turnstile, rate limiting, JWT com rotação, bloqueio por tentativas falhas.

**Painel administrativo** — Gestão de usuários, logs de auditoria, métricas de uso e configuração de planos.

---

## Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (TLS + Rate Limiting)              │
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

## Modo White Label

A plataforma foi projetada para personalização completa:

| Aspecto | Customização |
|---------|-------------|
| Domínio | Domínio próprio do operador |
| Logo e cores | Configuráveis via variáveis de ambiente |
| Nome do produto | Definido pelo operador |
| Landing page | Conteúdo e CTAs customizáveis |
| Email transacional | Remetente e templates do operador |
| Planos e preços | Definidos pelo operador no Stripe |
| Suporte | Canais do operador (WhatsApp, email) |

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

## Segurança e Auditoria

- Autenticação local com bcrypt + rate limiting
- OAuth 2.0 (Google)
- Cloudflare Turnstile (CAPTCHA)
- JWT com rotação de secrets
- Verificação de email obrigatória
- Bloqueio de contas após tentativas falhas
- Logs de auditoria por ação
- Isolamento de dados por usuário
- Secrets mascarados em logs
- Deploy containerizado com rede isolada

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

| Repositório | Tipo | Função |
|-------------|------|--------|
| **debuga-ai** | Vitrine pública | Visão geral, documentação institucional e arquitetura |
| **debuga-ai-prod** | Produto principal (privado) | Código production-ready white label |
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Documentação técnica | Estratégia LLM híbrida local/cloud |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Pesquisa aplicada | Avaliação de modelos para tarefas técnicas |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Laboratório de serving | Estudos com vLLM e modelos locais |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Componente experimental | Gateway OpenAI-compatible para roteamento |

> Os repositórios públicos contêm documentação, pesquisa aplicada e componentes experimentais. A versão production-ready comercial é mantida em repositório privado.

---

## Documentação Pública

| Documento | Descrição |
|-----------|-----------|
| Whitepaper PT-BR | Visão estratégica, mercado, proposta de valor, arquitetura e modelo de negócio |
| Whitepaper EN | English version of the strategic and technical whitepaper |
| Arquitetura PT-BR | Arquitetura de referência: aplicação, providers, GPU local, storage, billing, logs e segurança |
| Arquitetura EN | English version of the reference architecture documentation |

> Documentos públicos podem conter roadmap e visão estratégica. A versão production-ready comercial é mantida em repositório privado.

---

## Status

| Componente | Status |
|-----------|--------|
| Chat com agente autônomo | Produção |
| Ferramentas de diagnóstico (8) | Produção |
| Upload de imagens e documentos | Produção |
| Diagramas Mermaid | Produção |
| Billing Stripe | Produção |
| Autenticação local + OAuth | Produção |
| GPU local (Ollama) | Produção |
| Fallback cloud multi-provider | Produção |
| Geração de imagens | Produção |
| Geração de vídeos | Experimental |
| vLLM serving | Pesquisa |
| Gateway dedicado | Pesquisa |

---

## Licença e Uso

Software proprietário. Todos os direitos reservados.

Os repositórios públicos contêm documentação e componentes de pesquisa sob licença MIT (quando indicado). O código de produção da plataforma é privado e disponível apenas mediante licença comercial.

Para informações sobre licenciamento, treinamento ou consultoria de implantação, entre em contato com a equipe comercial.

---

## Sperry Tecnologia

A [Sperry Tecnologia](https://www.sperrytecnologia.com.br) desenvolve soluções de infraestrutura, segurança da informação, DevOps, telecomunicações e automação com foco em ambientes corporativos, alta disponibilidade e operação assistida por IA.

Áreas de atuação:
- Infraestrutura de TI e redes
- Segurança da informação (NOC/SOC)
- DevOps e automação
- Telecomunicações
- Consultoria e treinamento
- Suporte humano sênior
- Integração local/cloud com dados sob controle do cliente
