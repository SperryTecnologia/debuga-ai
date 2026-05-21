# Whitepaper — debuga.ai

**Plataforma de IA Operacional para Infraestrutura, Segurança e Automação Técnica**

Versão 2.0 | Maio 2026 | Sperry Tecnologia

---

## Sumário Executivo

A **debuga.ai** é uma plataforma de inteligência artificial operacional desenvolvida pela Sperry Tecnologia, projetada para equipes que operam infraestrutura de TI, segurança da informação, DevOps, telecomunicações e automação técnica. A plataforma combina inferência local com GPU, fallback inteligente para providers cloud, roteamento por capacidade e geração multimodal em uma solução white label implantável com marca própria em infraestrutura dedicada.

Diferente de assistentes de IA genéricos, a debuga.ai foi construída desde o primeiro dia para o contexto operacional: compreende topologias de rede, executa diagnósticos em tempo real, gera documentação técnica automaticamente e opera com dados sob controle total do operador.

---

## Problema de Mercado

Equipes técnicas de infraestrutura enfrentam uma convergência de desafios que se intensificam com a complexidade crescente dos ambientes modernos:

```mermaid
mindmap
  root((Desafios - Operacionais))
    Complexidade
      Ambientes híbridos
      Multi-cloud
      Microsserviços
      IoT/Edge
    Volume
      Alertas excessivos
      Logs massivos
      Métricas dispersas
      Incidentes simultâneos
    Escassez
      Profissionais seniores
      Conhecimento tribal
      Turnover elevado
      Custo de contratação
    Pressão
      Redução de MTTR
      SLAs rigorosos
      Compliance contínuo
      Documentação obrigatória
```

Assistentes de IA genéricos não atendem ao contexto operacional porque carecem de ferramentas especializadas, não compreendem topologias de rede, não se integram ao workflow técnico existente e não oferecem controle sobre dados sensíveis.

---

## Proposta de Valor

A debuga.ai resolve esses desafios oferecendo um agente de IA que opera como um engenheiro sênior disponível 24/7:

```mermaid
graph LR
    subgraph "Entrada"
        A[Consulta do - Operador] --> B[Agente - Autônomo]
    end
    subgraph "Processamento"
        B --> C{Análise de - Contexto}
        C --> D[Ferramentas - de Diagnóstico]
        C --> E[Inferência - LLM]
        C --> F[Geração - Multimodal]
    end
    subgraph "Saída"
        D --> G[Diagnóstico - Técnico]
        E --> H[Recomendação - Acionável]
        F --> I[Documentação - Automática]
    end
```

| Capacidade | Descrição | Impacto |
|-----------|-----------|---------|
| **Diagnóstico em tempo real** | DNS, SSL, HTTP, WHOIS, port scan, traceroute | Redução de 70% no tempo de triagem |
| **Contexto técnico nativo** | Compreende topologias, protocolos, logs | Respostas precisas sem re-explicação |
| **Geração multimodal** | Diagramas, documentação, scripts, imagens | Documentação automática de incidentes |
| **Inferência local** | GPU dedicada com modelos otimizados | Dados não saem do ambiente |
| **White label completo** | Marca, domínio, billing, planos | Produto próprio sem desenvolvimento |
| **Controle de custos** | Limites configuráveis com alertas | Previsibilidade financeira total |

---

## Mercado-Alvo

```mermaid
pie title Distribuição do Mercado-Alvo (Brasil)
    "MSPs (5.000+)" : 5000
    "ISPs Regionais (12.000+)" : 12000
    "SOC/NOC Corporativo (3.000+)" : 3000
    "Consultorias de TI (8.000+)" : 8000
    "Telecomunicações (1.500+)" : 1500
```

| Segmento | TAM estimado (Brasil) | Dor principal | Solução debuga.ai |
|----------|----------------------|---------------|-------------------|
| **MSPs** | 5.000+ empresas | Escalar suporte sem contratar proporcionalmente | Agente de primeiro nível automatizado |
| **ISPs regionais** | 12.000+ provedores | Automatizar NOC de primeiro nível | Diagnóstico de rede em tempo real |
| **SOC/NOC corporativo** | 3.000+ operações | Reduzir MTTR e documentar incidentes | Triagem automatizada com auditoria |
| **Consultorias de TI** | 8.000+ empresas | Produtividade técnica e padronização | Assistente técnico com knowledge base |
| **Telecomunicações** | 1.500+ operadoras | Configuração e troubleshooting de equipamentos | Ferramentas de diagnóstico integradas |

---

## Modelo de Negócio

A debuga.ai opera em modelo B2B white label, onde o **operador** (MSP, ISP, consultoria) adquire a plataforma e a oferece aos seus próprios clientes com marca e precificação próprias.

```mermaid
flowchart TB
    subgraph "Sperry Tecnologia"
        A[Plataforma - debuga.ai] --> B[Licenciamento - White Label]
        A --> C[Suporte - Técnico]
        A --> D[Atualizações - Contínuas]
    end
    subgraph "Operador — MSP / ISP / Consultoria"
        B --> E[Implantação - Marca Própria]
        E --> F[Definição de - Planos e Preços]
        F --> G[Billing via - Stripe]
    end
    subgraph "Usuários Finais"
        G --> H[Equipe - Técnica A]
        G --> I[Equipe - Técnica B]
        G --> J[Equipe - Técnica C]
    end
```

| Modalidade | Descrição | Ideal para |
|-----------|-----------|------------|
| **Licença white label** | Implantação dedicada com marca do operador | MSPs e ISPs com infraestrutura própria |
| **SaaS gerenciado** | Operação pela Sperry com domínio do cliente | Consultorias sem equipe de infra |
| **Consultoria de implantação** | Setup, treinamento e suporte à operação | Empresas em transição |
| **Suporte contínuo** | Manutenção, atualizações e suporte técnico | Todos os operadores |

O operador define seus próprios planos e preços para usuários finais, com billing integrado via Stripe. A Sperry não tem acesso aos dados dos usuários finais.

---

## Diferenciais Competitivos

```mermaid
quadrantChart
    title Posicionamento Competitivo
    x-axis "Genérico" --> "Especializado"
    y-axis "Cloud Only" --> "Controle Total"
    quadrant-1 "Líder"
    quadrant-2 "Nicho"
    quadrant-3 "Commodity"
    quadrant-4 "Emergente"
    "debuga.ai": [0.85, 0.9]
    "ChatGPT": [0.2, 0.15]
    "GitHub Copilot": [0.6, 0.2]
    "ServiceNow AI": [0.7, 0.4]
    "PagerDuty AI": [0.65, 0.35]
```

| Diferencial | debuga.ai | Assistentes Genéricos | Ferramentas Legadas |
|-------------|-----------|----------------------|---------------------|
| Contexto técnico nativo | Construído para infra | Adaptado de IA genérica | Regras estáticas |
| Ferramentas integradas | DNS, SSL, HTTP, WHOIS, port scan | Nenhuma | Limitadas ao vendor |
| Inferência local (GPU) | Dados não saem do ambiente | Tudo na nuvem | N/A |
| White label | Marca completa do operador | Impossível | Parcial |
| Fallback inteligente | Multi-provider com routing | Provider único | N/A |
| Geração multimodal | Texto, imagens, diagramas | Texto apenas | N/A |
| Controle de custos | Limites configuráveis | Pay-per-use imprevisível | Licença fixa |
| Auditoria | Logs imutáveis completos | Limitada | Parcial |
| Soberania de dados | 100% sob controle do operador | Dados no provider | Parcial |

---

## Arquitetura de Referência

A plataforma é composta por camadas independentes que se comunicam via APIs internas, permitindo escalabilidade horizontal e substituição de componentes:

```mermaid
graph TB
    subgraph "Camada de Apresentação"
        UI[Chat UI - React 19 + Tailwind 4]
        ADMIN["Painel Admin - shadcn/ui"]
        LP[Landing Page - White Label]
    end
    subgraph "Camada de API"
        API[tRPC + Express - Type-safe]
        AUTH[Auth - JWT + OAuth 2.0]
        BILL[Billing - Stripe Webhooks]
    end
    subgraph "Camada de Orquestração"
        AGENT[Agente Autônomo - Tool Calling Loop]
        ROUTER[Roteamento LLM - Multi-provider]
        TOOLS["Ferramentas - DNS/SSL/HTTP/WHOIS/Port"]
    end
    subgraph "Camada de Inferência"
        GPU[GPU Local - Ollama + CUDA]
        CLOUD["Providers Cloud - OpenAI / Anthropic / Gemini"]
        IMG[Geração de Imagens - Multimodal]
    end
    subgraph "Camada de Persistência"
        PG[(PostgreSQL 16)]
        S3["(MinIO / S3)"]
        REDIS[(Redis)]
    end
    UI --> API
    ADMIN --> API
    LP --> API
    API --> AUTH
    API --> BILL
    API --> AGENT
    AGENT --> ROUTER
    AGENT --> TOOLS
    ROUTER --> GPU
    ROUTER --> CLOUD
    ROUTER --> IMG
    AGENT --> PG
    AGENT --> S3
    AUTH --> REDIS
```

Detalhes completos na [documentação de arquitetura](ARCHITECTURE_PTBR.md).

---

## Ferramentas de Diagnóstico

O agente possui acesso a ferramentas especializadas que executa autonomamente durante o raciocínio:

```mermaid
graph LR
    subgraph "Ferramentas de Rede"
        DNS["DNS Lookup - A/AAAA/MX/TXT/NS"]
        SSL[SSL Check - Certificados + Chain]
        HTTP["HTTP Check - Status/Headers/Timing"]
        WHOIS[WHOIS - Domínios + IPs]
        PORT["Port Scan - TCP/UDP"]
    end
    subgraph "Ferramentas de Conteúdo"
        FETCH[Web Fetch - Scraping inteligente]
        CODE[Execução de Código - Python + Bash]
        IMGGEN[Geração de Imagens - Diagramas + Topologias]
        MERMAID[Diagramas Mermaid - Renderização inline]
    end
    subgraph "Ferramentas de Análise"
        UPLOAD[Análise de Documentos - 12+ formatos]
        VISION[Análise Visual - Screenshots + Topologias]
        SEARCH[Pesquisa Web - Contexto atualizado]
    end
```

| Ferramenta | Função | Exemplo de uso |
|-----------|--------|----------------|
| **DNS Lookup** | Resolução de registros DNS (A, AAAA, MX, TXT, NS, SOA, CNAME) | Diagnóstico de propagação, verificação de SPF/DKIM |
| **SSL Check** | Validação de certificados, cadeia, expiração, protocolos | Auditoria de segurança, troubleshooting de HTTPS |
| **HTTP Check** | Status, headers, timing, redirects, TLS handshake | Monitoramento de disponibilidade, debug de CDN |
| **WHOIS** | Informações de registro de domínios e IPs | Investigação de propriedade, verificação de ASN |
| **Port Scan** | Varredura de portas TCP/UDP | Auditoria de exposição, verificação de firewall |
| **Web Fetch** | Extração inteligente de conteúdo web | Análise de configurações públicas, documentação |
| **Execução de Código** | Python e Bash em ambiente isolado | Scripts de automação, cálculos, transformações |
| **Geração de Imagens** | Diagramas, topologias, assets visuais | Documentação visual automática |
| **Análise de Documentos** | PDF, DOCX, XLSX, CSV, JSON, YAML, logs | Extração de informações de manuais e relatórios |
| **Análise Visual** | Screenshots, diagramas, topologias | Interpretação de interfaces e dashboards |

---

## Segurança e Compliance

```mermaid
graph TB
    subgraph "Perímetro Externo"
        CF[Cloudflare - WAF + DDoS Protection]
        TLS[TLS 1.3 - Let's Encrypt + HSTS]
    end
    subgraph "Camada de Aplicação"
        RATE[Rate Limiting - IP + Usuário]
        CAPTCHA[Cloudflare Turnstile - Anti-bot]
        JWT2[JWT Assinado - Sessões com expiração]
        RBAC["RBAC - Admin / User"]
    end
    subgraph "Camada de Dados"
        ENCRYPT[Criptografia - em repouso + trânsito]
        AUDIT[Auditoria - Logs imutáveis]
        ISOLATE[Isolamento - Por tenant]
        BACKUP[Backups - Criptografados + offsite]
    end
    CF --> TLS --> RATE --> CAPTCHA --> JWT2 --> RBAC
    RBAC --> ENCRYPT
    RBAC --> AUDIT
    RBAC --> ISOLATE
    RBAC --> BACKUP
```

| Aspecto | Implementação | Conformidade |
|---------|--------------|--------------|
| **Transporte** | TLS 1.3 via NGINX + Cloudflare | PCI DSS, LGPD |
| **Autenticação** | JWT + bcrypt (custo 12) + OAuth 2.0 | OWASP Top 10 |
| **Autorização** | RBAC com papéis granulares | Princípio do menor privilégio |
| **Anti-bot** | Cloudflare Turnstile | Proteção contra automação |
| **Rate limiting** | Por IP e por usuário | Proteção contra abuso |
| **Auditoria** | Logs imutáveis com timestamp UTC | SOC 2, LGPD Art. 37 |
| **Isolamento** | Dados separados por tenant | LGPD Art. 46 |
| **Soberania** | Dados no servidor do operador | LGPD Art. 33 |
| **Backups** | Criptografados, sob controle do operador | Business continuity |

---

## Roadmap

```mermaid
gantt
    title Roadmap de Evolução — debuga.ai
    dateFormat YYYY-MM-DD
    axisFormat %Y Q%q

    section Produção
    Agente + Ferramentas de Rede    :done, 2024-07-01, 2025-03-31
    Billing Stripe + White Label    :done, 2025-01-01, 2025-06-30
    Geração Multimodal              :done, 2025-04-01, 2025-09-30
    Upload e Análise de Documentos  :done, 2025-07-01, 2025-12-31

    section Em Desenvolvimento
    RAG com Documentação Interna    :active, 2025-10-01, 2026-06-30
    Integração Zabbix/Grafana       :active, 2026-01-01, 2026-06-30
    Workflows Automatizados         :2026-04-01, 2026-09-30

    section Pesquisa
    Fine-tuning Domínio Técnico     :2026-07-01, 2026-12-31
    Multi-tenant Enterprise         :2026-07-01, 2027-03-31
    Marketplace de Integrações      :2026-10-01, 2027-06-30
```

| Horizonte | Funcionalidades | Status |
|-----------|----------------|--------|
| **Produção** | Agente conversacional, ferramentas de rede, billing, white label, geração multimodal, upload de documentos | Disponível |
| **Q1-Q2 2026** | RAG com documentação interna, integração Zabbix/Grafana/Prometheus | Em desenvolvimento |
| **Q3-Q4 2026** | Execução de código avançada, workflows automatizados, notificações proativas | Planejado |
| **2027** | Fine-tuning para domínio técnico, multi-tenant enterprise, marketplace de integrações | Pesquisa |

---

## Métricas de Impacto

Baseado em operadores em produção:

| Métrica | Antes | Com debuga.ai | Melhoria |
|---------|-------|---------------|----------|
| Tempo médio de triagem | 15-30 min | 2-5 min | **80-85%** |
| Documentação de incidentes | Manual (30+ min) | Automática (instantânea) | **95%** |
| Resolução de primeiro nível | 40% | 75% | **+35pp** |
| Custo por ticket | R$ 45-80 | R$ 12-25 | **60-70%** |
| Onboarding de novos técnicos | 2-4 semanas | 3-5 dias | **75%** |

---

## Conclusão

A debuga.ai representa uma nova categoria de ferramenta para equipes técnicas: **IA operacional especializada**, com controle total sobre dados e custos, implantável com marca própria. A combinação de inferência local, ferramentas de diagnóstico integradas, geração multimodal e modelo white label posiciona a plataforma como solução única para o mercado de infraestrutura e segurança.

A plataforma está em produção, com operadores ativos e roadmap de evolução contínua. Para mais informações sobre implantação, consulte a [documentação de arquitetura](ARCHITECTURE_PTBR.md) e o [modelo white label](WHITE_LABEL_OVERVIEW.md).

---

## Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [Arquitetura Técnica](ARCHITECTURE_PTBR.md) | Visão detalhada da arquitetura com diagramas |
| [White Label](WHITE_LABEL_OVERVIEW.md) | Modelo de implantação e personalização |
| [Segurança](SECURITY_OVERVIEW.md) | Políticas de segurança e compliance |
| [Providers de IA](PROVIDERS_OVERVIEW.md) | Providers suportados e roteamento |
| [Roadmap](ROADMAP.md) | Evolução planejada da plataforma |

---

*Sperry Tecnologia — [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)*
