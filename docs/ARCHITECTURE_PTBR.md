# Arquitetura de Referência — debuga.ai

**Documento público de arquitetura da plataforma debuga.ai.**

Versão 1.0 | Maio 2025 | Sperry Tecnologia

---

## Visão Geral

A debuga.ai é uma aplicação full-stack composta por camadas independentes que se comunicam via APIs internas. A arquitetura foi projetada para operar em infraestrutura dedicada do operador, com controle total sobre dados, custos e personalização.

---

## Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                    Camada de Apresentação                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Chat UI      │  │  Admin Panel  │  │  Landing Page         │  │
│  │  (React)      │  │  (React)      │  │  (White Label)        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
├─────────┴──────────────────┴──────────────────────┴─────────────┤
│                    Camada de API                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  tRPC (type-safe RPC) + Express                           │   │
│  │  Auth | Billing | Chat | Admin | Tools | Storage          │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                    Camada de Orquestração                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Agente       │  │  Roteamento   │  │  Ferramentas          │  │
│  │  Autônomo     │  │  LLM          │  │  de Diagnóstico       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
├─────────┴──────────────────┴──────────────────────┴─────────────┤
│                    Camada de Inferência                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  GPU Local    │  │  Providers    │  │  Geração              │  │
│  │  (Ollama)     │  │  Cloud        │  │  Multimodal           │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Camada de Persistência                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL   │  │  MinIO/S3    │  │  Redis                │  │
│  │  (dados)      │  │  (arquivos)  │  │  (cache/sessões)      │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Camada de Infraestrutura                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Docker       │  │  NGINX       │  │  Let's Encrypt        │  │
│  │  Compose      │  │  (proxy)     │  │  (TLS)                │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Camada de Apresentação

| Componente | Tecnologia | Função |
|-----------|-----------|--------|
| Chat UI | React 19 + Tailwind CSS 4 | Interface conversacional com streaming |
| Admin Panel | React + shadcn/ui | Gestão de usuários, planos e configurações |
| Landing Page | React (white label) | Página pública personalizável pelo operador |

---

## Camada de API

A API utiliza tRPC para comunicação type-safe entre frontend e backend, com Express como servidor HTTP.

| Módulo | Função |
|--------|--------|
| Auth | Autenticação local + OAuth, sessões JWT |
| Billing | Integração Stripe, webhooks, controle de planos |
| Chat | Streaming SSE, histórico, contexto |
| Admin | Gestão de usuários, métricas, configurações |
| Tools | Invocação de ferramentas de diagnóstico |
| Storage | Upload e gerenciamento de arquivos |

---

## Camada de Orquestração

O agente autônomo opera em loop de raciocínio, decidindo quais ferramentas invocar e quando solicitar inferência.

**Agente Autônomo** — Loop de raciocínio com tool calling. O agente analisa a consulta do usuário, decide quais ferramentas são necessárias, executa-as em sequência e sintetiza a resposta.

**Roteamento LLM** — Direciona consultas para o provider mais adequado com base em disponibilidade, complexidade, tipo de tarefa e limites de custo.

**Ferramentas de Diagnóstico** — DNS lookup, SSL check, HTTP check, WHOIS lookup, port scan, web fetch, execução de código, geração de imagens.

---

## Camada de Inferência

| Provider | Tipo | Prioridade | Caso de uso |
|----------|------|-----------|-------------|
| Ollama (GPU local) | Local | Primário | Uso geral, custo zero |
| OpenAI | Cloud | Fallback 1 | Raciocínio complexo |
| Anthropic | Cloud | Fallback 2 | Análise longa |
| Google Gemini | Cloud | Fallback 3 | Custo-benefício |
| OpenRouter | Cloud | Fallback 4 | Acesso a modelos adicionais |

---

## Camada de Persistência

| Serviço | Função | Dados |
|---------|--------|-------|
| PostgreSQL 16 | Banco principal | Usuários, conversas, planos, auditoria |
| MinIO/S3 | Storage de objetos | Uploads, imagens geradas, exports |
| Redis | Cache e sessões | Rate limiting, sessões ativas |

---

## Segurança

| Aspecto | Implementação |
|---------|--------------|
| Transporte | TLS 1.3 via NGINX + Let's Encrypt |
| Autenticação | JWT com rotação, bcrypt, OAuth 2.0 |
| Autorização | RBAC (admin, user) |
| Rate limiting | Por IP e por usuário |
| Auditoria | Logs imutáveis de todas as ações |
| Isolamento | Dados separados por tenant |
| Secrets | Variáveis de ambiente, nunca em código |

---

## Deploy

A plataforma é containerizada via Docker Compose, com os seguintes serviços:

| Serviço | Container | Porta |
|---------|----------|-------|
| Aplicação | Node.js (frontend + backend) | 3000 |
| Banco de dados | PostgreSQL 16 | 5432 |
| Storage | MinIO | 9000/9001 |
| Inferência | Ollama (GPU) | 11434 |
| Proxy | NGINX | 80/443 |

---

## Requisitos de Hardware

| Componente | Mínimo | Recomendado |
|-----------|--------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 16 GB | 32+ GB |
| Storage | 100 GB SSD | 500+ GB NVMe |
| GPU | NVIDIA 8 GB VRAM | NVIDIA 24+ GB VRAM |
| Rede | 100 Mbps | 1 Gbps |

A GPU é opcional. Sem GPU, a plataforma opera exclusivamente com providers cloud.

---

*Sperry Tecnologia — [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)*
