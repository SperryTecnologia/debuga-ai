<p align="center">
  <strong>debuga.ai</strong><br>
  <em>Agente Autônomo de IA para Infraestrutura de TI, Cibersegurança e Telecomunicações</em>
</p>

<p align="center">
  <a href="https://debuga.ai">Demo ao Vivo</a> · 
  <a href="docs/WHITEPAPER_PT-BR.md">Whitepaper PT-BR</a> · 
  <a href="docs/WHITEPAPER_EN.md">Whitepaper EN</a> · 
  <a href="docs/ARCHITECTURE.md">Arquitetura</a> · 
  <a href="docs/SECURITY_AUDIT.md">Auditoria de Segurança</a>
</p>

---

## Visão Geral

**debuga.ai** é uma plataforma SaaS em produção que entrega um agente autônomo de IA especializado em infraestrutura de TI, cibersegurança, DevOps e telecomunicações. Diferente de chatbots convencionais que apenas geram texto, o debuga.ai **executa ações reais**: roda código em ambientes sandboxed, escaneia portas abertas, verifica certificados SSL, consulta registros DNS e gera relatórios técnicos — tudo de forma autônoma, sem intervenção humana entre etapas.

O diferencial central é o **Agent Loop** — um ciclo de raciocínio-ação-observação que itera até 5 vezes por mensagem do usuário. O agente decide quais ferramentas invocar, interpreta resultados e encadeia operações para resolver problemas complexos de diagnóstico que exigem múltiplas consultas correlacionadas. Essa arquitetura é inspirada no paradigma ReAct [1] e traz capacidades agênticas para o domínio de operações de TI.

Desenvolvido e mantido pela **[Sperry Tecnologia](https://www.sperrytecnologia.com.br)** — empresa brasileira especializada em inteligência artificial aplicada à infraestrutura de TI, oferecendo o debuga.ai como serviço e produto de treinamento para profissionais de TI através do programa **Open Infra Pro**.

---

## Arquitetura LLM Híbrida

O debuga.ai opera sobre uma **arquitetura de inferência híbrida** que combina LLMs em nuvem com infraestrutura GPU proprietária on-premise:

| Camada | Infraestrutura | Função |
|---|---|---|
| **LLM Cloud** | Manus Forge API (gateway multi-modelo) | Inferência primária para consultas gerais, tool calling, streaming |
| **LLM On-Premise** | Qwen2.5-72B-Infra (fine-tuned) — 16x NVIDIA RTX 3090 GPUs | Análise profunda, inspeção de pacotes TCP/IP, modelos especializados de TI |
| **Hardware** | 3x servidores rack-mount 4U (dedicados para IA) | Inferência de baixa latência para cargas de segurança de rede |

A camada cloud utiliza o **Manus Forge API** — um gateway inteligente que roteia requisições entre múltiplos provedores de LLM (Claude, GPT-4o, Gemini) com balanceamento automático de carga, failover e otimização de custo por tipo de consulta.

O cluster on-premise executa o **Qwen2.5-72B-Infra** — um fork fine-tuned do Qwen2.5-72B otimizado para:

- **Análise profunda de TCP/IP** — Inspeção de pacotes da Camada 3 até a Camada 7, detecção de anomalias de protocolo, classificação de padrões de tráfego e DPI (Deep Packet Inspection) para identificação de payloads maliciosos, indicadores de movimentação lateral e padrões de comunicação C2.
- **Correlação de segurança de rede** — Cruzamento de logs de firewall, alertas IDS/IPS, dados NetFlow e traps SNMP para construir timelines de ataque e identificar causas raiz que modelos em nuvem não detectam por falta de dados de treinamento específicos do domínio.
- **Raciocínio ciente de infraestrutura** — O modelo compreende tabelas de roteamento BGP, adjacências OSPF, topologias VLAN e consegue raciocinar sobre falhas de segmentação de rede, incompatibilidades de MTU e problemas de roteamento assimétrico.

A camada de roteamento decide qual modelo processa cada requisição com base na complexidade da consulta, latência necessária e especificidade do domínio. Consultas simples vão para o LLM em nuvem; análises profundas de infraestrutura são roteadas para o cluster on-premise.

---

## Stack Técnico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 19, Tailwind CSS 4, shadcn/ui | UI com type-safety e biblioteca de componentes moderna |
| RPC | tRPC 11 + Superjson | Type-safety ponta a ponta, zero arquivos de contrato de API |
| Backend | Node.js, Express 4 | Servidor HTTP leve com suporte a SSE |
| ORM | Drizzle ORM | Queries SQL-like com tipos TypeScript, migrações SQL puras |
| Banco de Dados | MySQL / TiDB | Conformidade ACID com capacidade de escalabilidade horizontal |
| Streaming | Server-Sent Events (SSE) | Streaming unidirecional em tempo real (mais simples que WebSocket para este caso de uso) |
| Pagamentos | Stripe (BRL, assinaturas + webhooks) | Cobrança PCI-compliant com suporte a Real Brasileiro |
| Armazenamento | S3-compatível | Object storage para artefatos gerados |
| Autenticação | OAuth 2.0 + sessões JWT | Autenticação stateless com cookies assinados |
| Testes | Vitest (60 testes automatizados) | Testes unitários rápidos com contextos mockados |

---

## Ferramentas do Agente

O agente tem acesso a 8 ferramentas especializadas que invoca de forma autônoma durante o loop de raciocínio:

| Ferramenta | Função | Timeout | Caso de Uso |
|---|---|---|---|
| `execute_code` | Execução sandboxed de Python/Bash | 30s | Scripts de automação, processamento de dados, geração de configs |
| `port_scan` | Escaneamento de portas TCP em hosts remotos | 30s | Auditorias de segurança, descoberta de serviços, validação de firewall |
| `dns_lookup` | Consultas DNS completas (A, AAAA, MX, NS, TXT, CNAME, SOA) | 10s | Diagnóstico de resolução DNS, verificação de servidores de e-mail |
| `ssl_check` | Verificação de cadeia de certificados SSL/TLS | 10s | Detecção de expiração de certificados, validação de cadeia, análise de cifras |
| `http_check` | Análise de headers HTTP e pontuação de segurança | 10s | Auditoria de headers de segurança (HSTS, CSP, X-Frame-Options) |
| `whois_lookup` | Consulta de informações WHOIS de domínios | 10s | Investigação de propriedade de domínios, identificação de registrars |
| `web_fetch` | Extração e parsing de conteúdo web | 15s | Consulta de documentação, recuperação de referências de API |
| `generate_image` | Geração de imagens com IA | 20s | Diagramas de rede, fluxogramas de arquitetura, mapas de topologia |

Cada execução de ferramenta é registrada com contagem de tokens e debitada do plano do usuário. O agente pode encadear múltiplas ferramentas em um único turno de conversa (ex.: DNS lookup → SSL check → HTTP check para uma auditoria completa de domínio).

---

## Sistema de Cobrança e Créditos

A plataforma implementa um sistema de controle de consumo em três camadas:

**Camada 1 — Rate Limiting:** 20 mensagens por minuto por usuário (in-memory com limpeza automática). Protege contra flood e abuso.

**Camada 2 — Limites do Plano:** Enforcement por mensagem de cota diária de mensagens e cota mensal de conversas. Verificado antes da invocação do LLM para evitar custos desnecessários de API.

**Camada 3 — Consumo de Créditos:** Contagem de tokens pós-resposta (~4 chars/token + 50 tokens/tool call) com débito automático do saldo do usuário. Créditos são resetados mensalmente via webhook de assinatura do Stripe.

| Plano | Mensagens/dia | Conversas/mês | Créditos |
|---|---|---|---|
| Free | 5 | 3 | 50 |
| Starter | 100 | 30 | 1.000 |
| Pro | Ilimitado | Ilimitado | 10.000 |
| Enterprise | Ilimitado | Ilimitado | 100.000 |

A integração com Stripe gerencia sessões de checkout, webhooks de ciclo de vida da assinatura (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) e downgrade automático para o plano free em caso de cancelamento.

---

## Estrutura do Projeto

```
debuga-ai/
├── client/                        # React 19 SPA
│   ├── src/
│   │   ├── pages/                 # Componentes de nível de rota
│   │   │   ├── Home.tsx           # Landing page (hero, features, pricing)
│   │   │   ├── ChatPage.tsx       # Interface de chat com sidebar de conversas
│   │   │   ├── PricingPage.tsx    # Planos de assinatura com checkout Stripe
│   │   │   └── AccountPage.tsx    # Dashboard do usuário (créditos, uso, perfil)
│   │   ├── components/            # UI reutilizável + primitivos shadcn/ui
│   │   ├── contexts/              # Contexto de auth (hook useAuth)
│   │   ├── hooks/                 # Hooks React customizados
│   │   ├── lib/trpc.ts            # Binding do cliente tRPC
│   │   ├── App.tsx                # Definições de rotas e layout
│   │   └── index.css              # Tema global (dark, paleta terminal verde)
│   └── index.html
├── server/                        # Backend Node.js + Express
│   ├── _core/                     # Internals do framework (OAuth, JWT, LLM, env)
│   ├── routers.ts                 # Procedures tRPC (auth, chat, account, subscription)
│   ├── db.ts                      # Helpers de query Drizzle
│   ├── streamRoute.ts             # Streaming SSE + agent loop + rate limiting + consumo de créditos
│   ├── stripeRoutes.ts            # Checkout Stripe + handlers de webhook
│   ├── agentTools.ts              # Implementações das ferramentas (port scan, DNS, SSL, etc.)
│   ├── tools.ts                   # Definições de ferramentas e dispatcher
│   ├── products.ts                # Definições de planos e preços
│   ├── *.test.ts                  # Suítes de teste Vitest (60 testes)
│   └── storage.ts                 # Helpers S3
├── drizzle/                       # Schema do banco e migrações
│   └── schema.ts                  # 6 tabelas: users, conversations, messages,
│                                  #   subscriptions, credits, usage_log
├── shared/                        # Tipos e constantes compartilhados
├── docs/                          # Documentação técnica
│   ├── WHITEPAPER_PT-BR.md        # Whitepaper (Português)
│   ├── WHITEPAPER_EN.md           # Whitepaper (Inglês)
│   ├── ARCHITECTURE.md            # Arquitetura do sistema com diagramas
│   └── SECURITY_AUDIT.md          # Relatório de auditoria de segurança
└── todo.md                        # Rastreamento de features e bugs
```

---

## Modelo de Dados

6 tabelas gerenciadas pelo Drizzle ORM com schema tipado:

| Tabela | Propósito | Relações Principais |
|---|---|---|
| `users` | Contas OAuth, roles (admin/user), Stripe customer ID | 1:N conversations, 1:1 credits |
| `conversations` | Sessões de chat com suporte a pin/archive | N:1 user, 1:N messages |
| `messages` | Conteúdo, role, tool_calls (JSON), contagem de tokens | N:1 conversation |
| `subscriptions` | Estado da assinatura Stripe, período, flag de cancelamento | N:1 user |
| `credits` | Saldo por usuário (total, usado, planId como source of truth) | 1:1 user |
| `usage_log` | Trilha de auditoria por operação (tokens, créditos, conversa) | N:1 user |

Todas as queries com escopo de usuário são filtradas por `ctx.user.id` da sessão JWT autenticada. Nenhum endpoint permite acesso cruzado de dados entre usuários (IDOR-safe por design).

---

## Segurança

O código passou por uma auditoria completa de segurança para produção (veja [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)):

- **Zero secrets hardcoded** — Todos os valores sensíveis (chaves Stripe, JWT secret, URL do banco, chaves de API do LLM) são injetados via variáveis de ambiente em runtime.
- **Isolamento do frontend** — Apenas variáveis com prefixo `VITE_` (chaves públicas) são acessíveis no bundle do navegador. Secrets do servidor nunca chegam ao cliente.
- **Verificação de assinatura de webhook** — Webhooks do Stripe são verificados com `stripe.webhooks.constructEvent()` antes do processamento.
- **Rate limiting** — 20 msgs/min por usuário com rastreamento in-memory e limpeza automática.
- **Execução de código sandboxed** — A ferramenta `execute_code` roda em `/tmp` com timeout de 30s e limite de 50KB de output.
- **Apenas HTTPS** — Todas as comunicações são criptografadas em trânsito.

---

## Testes

```bash
pnpm test    # 60 testes, ~4s de execução
```

| Suíte | Testes | Cobertura |
|---|---|---|
| `auth.logout.test.ts` | 1 | Fluxo de logout e limpeza de sessão |
| `chat.test.ts` | 19 | CRUD de conversas, criação de mensagens, paginação |
| `tools.test.ts` | 20 | Todas as 8 ferramentas do agente (DNS, SSL, HTTP, port scan, exec de código, etc.) |
| `subscription.test.ts` | 10 | Status de assinatura, mapeamento de planos, precificação |
| `credits.test.ts` | 10 | Saldo de créditos, limites de plano, contadores diários/mensais |

Os testes utilizam Vitest com contextos mockados para simular usuários autenticados sem dependências de banco de dados externo.

---

## Desenvolvimento Local

```bash
# Pré-requisitos: Node.js 22+, pnpm
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com seu DATABASE_URL, chaves Stripe, etc.

# Gerar migrações do banco de dados
pnpm drizzle-kit generate

# Iniciar servidor de desenvolvimento (hot reload)
pnpm dev

# Executar suíte de testes
pnpm test
```

---

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Camada de API | tRPC sobre REST | Type-safety ponta a ponta, zero arquivos de contrato, Superjson para Date/BigInt nativos |
| Streaming | SSE sobre WebSocket | Unidirecional (server→client) é suficiente; mais simples, nativo HTTP/2, sem dependência Socket.io |
| ORM | Drizzle sobre Prisma | API SQL-like, runtime mais leve, migrações SQL puras, melhor integração com tRPC |
| LLM Gateway | Manus Forge API | Gateway multi-modelo com roteamento inteligente; failover automático entre provedores (Claude, GPT-4o, Gemini) |
| LLM On-Premise | Qwen2.5-72B-Infra | Fork fine-tuned para domínio de TI/segurança; inferência local de baixa latência para análises profundas |
| Pagamentos | Stripe | PCI-compliant, suporte a BRL, webhooks de ciclo de vida, códigos promocionais |

---

## Roadmap

| Versão | Timeline | Funcionalidades |
|---|---|---|
| **v4.0** (Atual) | Q2 2026 | Agente autônomo, 8 ferramentas, cobrança, créditos, LLM híbrido |
| **v5.0** | Q3 2026 | OAuth multi-provedor (self-hosted), integração com APIs Zabbix/Wazuh, cupons educacionais |
| **v6.0** | Q4 2026 | API REST pública, memória de longo prazo, marketplace de ferramentas |
| **v7.0** | 2027 | Multi-tenancy, white-label, execução remota de agentes |

---

## Documentação

| Documento | Idioma | Descrição |
|---|---|---|
| [Whitepaper](docs/WHITEPAPER_PT-BR.md) | PT-BR | Whitepaper técnico com análise de mercado, arquitetura, modelo de negócio |
| [Whitepaper](docs/WHITEPAPER_EN.md) | EN | Versão em inglês do whitepaper técnico |
| [Arquitetura](docs/ARCHITECTURE.md) | PT-BR | Arquitetura detalhada com 4 diagramas renderizados |
| [Auditoria de Segurança](docs/SECURITY_AUDIT.md) | PT-BR | Relatório de auditoria de segurança para produção |

---

## Licença

Proprietária — Sperry Tecnologia © 2026. Todos os direitos reservados.

---

*Desenvolvido por [Sperry Tecnologia](https://www.sperrytecnologia.com.br) — Especialistas em soluções de IA para TI*

[1]: https://arxiv.org/abs/2210.03629 "ReAct: Synergizing Reasoning and Acting in Language Models"
