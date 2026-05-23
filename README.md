<p align="center">
  <img src="https://debuga.ai/favicon.ico" width="80" alt="debuga.ai" />
</p>

<h1 align="center">debuga.ai</h1>

<p align="center">
  <strong>Agente Autônomo de IA para Infraestrutura, Segurança e DevOps</strong>
</p>

<p align="center">
  <a href="https://debuga.ai">Plataforma</a> · <a href="docs/WHITEPAPER_PTBR.md">Whitepaper</a> · <a href="docs/ARCHITECTURE_PTBR.md">Arquitetura</a> · <a href="docs/ROADMAP.md">Roadmap</a>
</p>

---

## Visão Geral

A **debuga.ai** é uma plataforma de IA operacional projetada para equipes de infraestrutura, segurança e DevOps. Diferente de assistentes genéricos, o agente executa diagnósticos reais, analisa topologias, gera documentação técnica e automatiza tarefas operacionais — tudo através de uma interface conversacional com streaming em tempo real.

A plataforma é oferecida como **white label**, permitindo que MSPs, provedores de internet, consultorias de TI e equipes internas operem com marca própria, infraestrutura dedicada e controle total sobre dados e custos.

```mermaid
graph LR
    A[Operador] -->|Consulta| B[Agente debuga.ai]
    B -->|Classifica Intenção| C{Router de Inferência}
    C -->|Diagnóstico| D[Ferramentas Técnicas]
    C -->|Análise| E[LLM Especializado]
    C -->|Geração Visual| F[Pipeline de Imagem]
    D --> G[Resultado Estruturado]
    E --> G
    F --> G
    G -->|Streaming SSE| A
```

---

## Para Quem É

| Perfil | Caso de Uso |
|--------|-------------|
| MSPs e provedores de serviços gerenciados | Suporte técnico assistido por IA com marca própria |
| Provedores de internet (ISPs) | Diagnóstico de rede, automação de NOC |
| Equipes de segurança (SOC/NOC) | Análise de vulnerabilidades, hardening, auditoria |
| DevOps e SRE | Automação de infraestrutura, troubleshooting |
| Consultorias de TI | Ferramenta interna de produtividade técnica |
| Telecomunicações | Configuração de equipamentos, análise de topologia |

---

## Arquitetura de Inferência Multi-Model

A debuga.ai não depende de um único modelo. O sistema utiliza **roteamento inteligente** que seleciona automaticamente o melhor modelo para cada tipo de tarefa, combinando inferência local (GPU) com providers cloud de alta qualidade.

```mermaid
flowchart TB
    subgraph Input["Entrada do Usuário"]
        MSG[Mensagem + Contexto + Anexos]
    end

    subgraph Classifier["Classificador de Intenção"]
        IC[Intent Classifier<br/>Heurístico + Patterns]
        IC -->|chat| CHAT[Conversação]
        IC -->|code| CODE[Geração de Código]
        IC -->|image_gen| IMGGEN[Geração de Imagem]
        IC -->|image_edit| IMGEDIT[Edição de Imagem]
        IC -->|diagram| DIAG[Diagrama Técnico]
        IC -->|voice| VOICE[Transcrição de Áudio]
        IC -->|analysis| ANALYSIS[Análise de Documento]
    end

    subgraph Router["Router Multi-Model"]
        direction TB
        R[Decisão de Roteamento]
        R -->|Complexidade Alta| PREMIUM["Premium<br/>GPT-4o · Claude 3.5 Sonnet"]
        R -->|Uso Geral| BALANCED["Balanced<br/>Gemini 2.5 Flash · Qwen 72B"]
        R -->|Custo Zero| LOCAL["Local GPU<br/>Ollama · vLLM"]
        R -->|Imagem| VISION["Vision Pipeline<br/>GPT-Image-1"]
    end

    MSG --> IC
    CHAT --> R
    CODE --> R
    ANALYSIS --> R
```

### Diferenciação por Tipo de Inferência

O sistema seleciona automaticamente o modelo ideal para cada tipo de tarefa, otimizando entre qualidade, latência e custo:

| Tipo de Tarefa | Modelo Primário | Fallback | Latência |
|---------------|----------------|----------|----------|
| Conversação técnica | Qwen 2.5 72B | GPT-4o | < 2s |
| Geração de código | Qwen 2.5 Coder | Claude 3.5 Sonnet | < 3s |
| Raciocínio complexo | GPT-4o | Claude 3.5 Sonnet | < 5s |
| Análise de imagem | GPT-4o Vision | Gemini 2.5 Flash | < 4s |
| Geração de imagem | GPT-Image-1 | DALL-E 3 | 5–15s |
| Edição de imagem | GPT-Image-1 | — | 8–20s |
| Transcrição de áudio | Whisper Large V3 | — | < 10s |
| Diagramas Mermaid | Qwen 72B | GPT-4o | < 3s |

### Critérios de Roteamento Automático

```mermaid
flowchart LR
    subgraph Critérios["Critérios de Decisão"]
        A[Disponibilidade GPU]
        B[Complexidade da Query]
        C[Tipo de Conteúdo]
        D[Custo Acumulado]
        E[Latência Alvo]
    end

    subgraph Decisão["Engine de Roteamento"]
        F{Score Ponderado}
    end

    subgraph Resultado["Saída"]
        G[Provider + Model ID]
        H[Parâmetros Otimizados]
        I[Fallback Configurado]
    end

    A --> F
    B --> F
    C --> F
    D --> F
    E --> F
    F --> G
    F --> H
    F --> I
```

| Cenário | Comportamento |
|---------|--------------|
| GPU disponível e saudável | Inferência local (latência baixa, custo zero) |
| GPU em cold start | Aguarda warmup ou aciona fallback |
| GPU indisponível | Fallback automático para provider cloud |
| Sem GPU instalada | Apenas providers cloud |

---

## RAG — Knowledge Base Contextual

O sistema implementa **Retrieval-Augmented Generation** para injetar conhecimento operacional específico do cliente nas respostas do agente. Runbooks, procedimentos, documentação interna e decisões anteriores são indexados e recuperados automaticamente quando relevantes para a consulta.

```mermaid
flowchart TB
    subgraph Ingestão["Ingestão de Conhecimento"]
        DOC[Documentos Técnicos] --> PROC[Processamento + Categorização]
        RUN[Runbooks Operacionais] --> PROC
        HIST[Histórico de Decisões] --> PROC
        PROC --> IDX[Indexação<br/>Tags · Keywords · Categorias]
        IDX --> KB[(Knowledge Base)]
    end

    subgraph Retrieval["Recuperação em Tempo Real"]
        Q[Query do Usuário] --> SEARCH[Busca Multi-Critério]
        KB --> SEARCH
        SEARCH --> RANK[Ranking por Relevância<br/>exact · tag · keyword · category]
        RANK --> TOP[Top-K Documentos<br/>max 2000 tokens]
    end

    subgraph Augmentation["Augmentação do Contexto"]
        TOP --> INJECT[Injeção no System Prompt]
        INJECT --> LLM[LLM com Contexto Enriquecido]
        LLM --> RESP[Resposta Fundamentada<br/>+ Fonte Citada]
    end
```

### Capacidades do RAG em Produção

| Funcionalidade | Descrição |
|---------------|-----------|
| Indexação por tags e keywords | Categorização automática de documentos operacionais |
| Busca por relevância ponderada | Score combinado (exact: 1.0, tag: 0.8, keyword: 0.5, category: 0.3) |
| Limite de tokens configurável | Controle preciso do contexto injetado |
| Observabilidade | Log de quais documentos foram utilizados em cada resposta |
| CRUD administrativo | Interface completa para gestão da base de conhecimento |
| Aprendizado contínuo | Sugestões automáticas de novos itens baseadas em interações |
| Instruções dinâmicas | Regras de comportamento configuráveis pelo operador |

---

## Ferramentas do Agente

O agente possui acesso a ferramentas especializadas que executam ações reais — não apenas sugestões textuais.

```mermaid
graph TB
    subgraph Diagnóstico["🔍 Diagnóstico de Rede"]
        DNS[DNS Lookup<br/>A, AAAA, MX, NS, TXT]
        SSL[Verificação SSL<br/>Validade, Chain, Cipher]
        HTTP[HTTP Check<br/>Status, Headers, Timing]
        WHOIS[WHOIS Query<br/>Registrar, Expiry, NS]
        PORT[Port Scan<br/>TCP, Serviços, Banner]
    end

    subgraph Análise["📊 Análise e Geração"]
        WEB[Web Fetch + Parse]
        IMG[Análise de Imagem<br/>Screenshots, Topologias]
        DOC[Análise de Documento<br/>12+ formatos]
        MERMAID[Diagramas Mermaid<br/>Renderização Inline]
        IMGGEN2[Geração de Imagem<br/>GPT-Image-1]
        VOICE2[Transcrição de Áudio<br/>Whisper V3]
    end

    subgraph Automação["⚡ Automação"]
        SCRIPT[Geração de Scripts<br/>Bash, Python, PowerShell]
        REPORT[Relatórios Estruturados<br/>PDF, Markdown]
        ALERT[Notificações<br/>Proativas]
    end
```

### Pipeline de Imagem

```mermaid
sequenceDiagram
    participant U as Usuário
    participant IC as Intent Classifier
    participant P as Pipeline de Imagem
    participant M as GPT-Image-1
    participant S as Storage (S3)

    U->>IC: "Edite essa logo, mude a cor para azul"
    IC->>IC: Classifica como image_editing
    IC->>P: Rota para pipeline de imagem
    P->>M: Prompt + Imagem Original
    M-->>P: Imagem Editada (base64)
    P->>S: Upload para storage persistente
    S-->>P: URL pública
    P-->>U: Imagem renderizada no chat
```

---

## White Label e Implantação Dedicada

A plataforma foi projetada para personalização completa e implantação em infraestrutura própria do cliente.

| Aspecto | Personalização |
|---------|---------------|
| Marca | Nome, logo, cores, domínio próprio |
| Infraestrutura | VM dedicada, on-premise ou cloud privada |
| Dados | Isolamento total por instância |
| Planos e Billing | Stripe integrado, preços configuráveis |
| Knowledge Base | Runbooks e documentação própria do operador |
| Modelos | Escolha de providers e prioridades de roteamento |

---

## Segurança, Auditoria e Governança

```mermaid
flowchart LR
    subgraph Perímetro["Perímetro"]
        CF[Cloudflare WAF]
        TLS[TLS 1.3 + HSTS]
        RL[Rate Limiting]
    end

    subgraph Aplicação["Aplicação"]
        AUTH[JWT httpOnly<br/>sameSite:lax]
        CAPTCHA[Turnstile CAPTCHA]
        CSP[Content Security Policy]
    end

    subgraph Dados["Dados"]
        AUDIT[Auditoria Imutável]
        COST[Controle de Custos]
        ZDR[Zero Data Retention<br/>em Providers Cloud]
    end

    CF --> AUTH
    TLS --> AUTH
    RL --> AUTH
    AUTH --> AUDIT
    CAPTCHA --> AUDIT
    CSP --> AUDIT
    AUDIT --> COST
    AUDIT --> ZDR
```

| Camada | Implementação |
|--------|--------------|
| Transporte | TLS 1.3, HSTS preload, CSP restritiva |
| Proteção | Cloudflare WAF, Turnstile CAPTCHA, rate limiting por endpoint |
| Autenticação | JWT httpOnly, sameSite:lax, OAuth 2.0 |
| Auditoria | Log imutável de todas as interações com metadados |
| Controle de custos | Limites configuráveis por usuário e plano |
| Dados | Sem retenção em providers cloud (zero-data-retention) |

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Tailwind CSS 4 + shadcn/ui |
| Backend | Express 4 + tRPC 11 + TypeScript |
| ORM | Drizzle ORM |
| Banco de dados | TiDB (MySQL-compatible, distributed) |
| Inferência local | Ollama / vLLM (NVIDIA GPU) |
| Storage | S3-compatible (MinIO / AWS) |
| Containerização | Docker + Docker Compose |
| CDN/WAF | Cloudflare |
| Billing | Stripe |
| CAPTCHA | Cloudflare Turnstile |

---

## Roadmap

| Item | Status |
|------|--------|
| Agente conversacional com contexto técnico | **Produção** |
| Roteamento multi-model inteligente | **Produção** |
| RAG com Knowledge Base operacional | **Produção** |
| Geração e edição de imagens (GPT-Image-1) | **Produção** |
| Diagramas Mermaid com renderização inline | **Produção** |
| Document Studio (análise de 12+ formatos) | **Produção** |
| Transcrição de áudio (Whisper) | **Produção** |
| Billing com Stripe | **Produção** |
| White label com marca própria | **Produção** |
| Auditoria e logs estruturados | **Produção** |
| Integração Zabbix/Grafana/Prometheus | Em desenvolvimento |
| Embeddings vetoriais para RAG semântico | Em desenvolvimento |
| WhatsApp Business | Planejado |
| SSO/SAML | Planejado |
| Multi-tenant enterprise | Planejado |

---

## Ecossistema de Repositórios

| Repositório | Descrição |
|-------------|-----------|
| [debuga-ai](https://github.com/SperryTecnologia/debuga-ai) | Documentação pública e visão geral |
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Estratégia LLM híbrida (GPU + cloud) |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Avaliação de modelos para code generation |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Serving local com vLLM |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Gateway OpenAI-compatible |

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [Whitepaper PT-BR](docs/WHITEPAPER_PTBR.md) | Visão estratégica e proposta de valor |
| [Whitepaper EN](docs/WHITEPAPER_EN.md) | English version |
| [Arquitetura PT-BR](docs/ARCHITECTURE_PTBR.md) | Arquitetura de referência |
| [Architecture EN](docs/ARCHITECTURE_EN.md) | English version |
| [Estratégia LLM](docs/R_AND_D_LLM_STACK.md) | Pesquisa e decisões sobre inferência |
| [Roadmap](docs/ROADMAP.md) | Roadmap público detalhado |
| [Providers](docs/PROVIDERS_OVERVIEW.md) | Providers de IA suportados |
| [White Label](docs/WHITE_LABEL_OVERVIEW.md) | Modelo de implantação |
| [Segurança](docs/SECURITY_OVERVIEW.md) | Políticas de segurança |

---

## Licença

Documentação pública sob licença MIT. O código de produção da plataforma é privado e comercial.

Para demonstrações ou implantação, visite [debuga.ai](https://debuga.ai).

---

<p align="center">
  Desenvolvido por <a href="https://www.sperrytecnologia.com.br" target="_blank">Sperry Tecnologia</a>
</p>
