# debuga.ai — Whitepaper Técnico

**Plataforma de Agente Autônomo de IA para Infraestrutura de TI, Segurança da Informação e Telecomunicações**

**Versão:** 4.0  
**Data:** Maio 2026  
**Autor:** Sperry Tecnologia  
**Contato:** www.sperrytecnologia.com.br

---

## Sumário Executivo

O **debuga.ai** é uma plataforma SaaS (Software as a Service) que disponibiliza um agente autônomo de inteligência artificial especializado em infraestrutura de TI, segurança da informação, DevOps e telecomunicações. Diferente de chatbots convencionais que apenas respondem perguntas, o debuga.ai é um agente que **age**: executa código, navega em sites, escaneia portas, verifica certificados SSL, consulta DNS e gera relatórios técnicos de forma autônoma.

A plataforma foi projetada e desenvolvida pela **Sperry Tecnologia** e opera sobre uma arquitetura de inferência cloud com o **API cloud de inferência** como gateway de LLM, acessando modelos de última geração para raciocínio, tool calling e streaming de respostas. A estratégia de longo prazo inclui a implantação de infraestrutura GPU dedicada para servir modelos open-source fine-tuned para o domínio de TI e segurança, reduzindo a dependência de APIs externas e habilitando análises com dados sensíveis.

O mercado brasileiro de tecnologia movimentou US$ 67,8 bilhões em 2025, com crescimento de 18,5% em relação ao ano anterior [1]. O mercado global de IA em cibersegurança, avaliado em US$ 22,37 bilhões em 2025, deve atingir US$ 50,83 bilhões até 2031, com CAGR de 14,8% [2]. O Brasil lidera o mercado de IA na América Latina, com previsão de crescimento de 3,8 vezes entre 2025 e 2029 [3].

---

## 1. Problema de Mercado

### 1.1 Escassez de Profissionais de TI

O Brasil enfrenta um déficit crescente de profissionais qualificados em infraestrutura de TI e segurança da informação. Empresas de todos os portes precisam de suporte técnico especializado, mas o custo de contratar e reter talentos nessas áreas é proibitivo para a maioria.

### 1.2 Complexidade Operacional

A gestão de infraestrutura moderna envolve dezenas de ferramentas (Zabbix, Wazuh, Prometheus, Grafana, NetBox, Ansible, Terraform, Docker, Kubernetes) que exigem conhecimento profundo e atualização constante. Um único profissional raramente domina todo o ecossistema.

### 1.3 Tempo de Resposta a Incidentes

Incidentes de segurança e falhas de infraestrutura exigem diagnóstico rápido. O tempo médio entre a detecção e a resolução (MTTR) é frequentemente medido em horas ou dias, quando deveria ser minutos.

### 1.4 Limitações dos Chatbots Existentes

Soluções como ChatGPT, que domina 99% do mercado brasileiro de IA generativa [4], são generalistas. Não executam código em ambiente isolado, não escaneiam portas, não verificam certificados SSL em tempo real e não possuem contexto especializado em infraestrutura de TI brasileira.

---

## 2. Solução: debuga.ai

### 2.1 Visão do Produto

O debuga.ai é um **agente autônomo** — não um chatbot. A diferença fundamental é que o agente possui capacidade de **ação**: ele decide quais ferramentas usar, executa-as automaticamente, analisa os resultados e itera até resolver o problema do usuário.

O agente utiliza o **API cloud de inferência** como gateway de inferência, acessando modelos de linguagem de última geração (atualmente Gemini 2.5 Flash) para raciocínio, orquestração de ferramentas e geração de respostas. A arquitetura foi projetada para ser provider-agnostic, permitindo a adição futura de modelos especializados sem alteração na lógica do agente.

### 2.2 Capacidades do Agente (em produção)

| Capacidade | Descrição | Diferencial |
|---|---|---|
| Execução de Código | Python e Bash com timeout e limite de output | Scripts de automação em tempo real |
| Navegação Web | Acessa e extrai conteúdo de páginas | Análise de documentação e CVEs |
| Port Scan | Escaneia portas abertas em hosts | Auditoria de segurança automatizada |
| DNS Lookup | Consultas DNS completas (A, AAAA, MX, TXT, NS, SOA) | Diagnóstico de resolução de nomes |
| SSL/TLS Check | Verifica certificados, cadeias e protocolos | Detecção de expiração e vulnerabilidades |
| HTTP Check | Analisa headers, status e segurança de sites | Verificação de security headers |
| WHOIS Lookup | Consulta informações de domínio e registrante | Investigação de propriedade |
| Geração de Imagens | Cria diagramas de rede e fluxogramas | Documentação visual automatizada |
| Upload e Análise de Imagens | Aceita screenshots, prints de erro e topologias para análise visual técnica | Diagnóstico visual de infraestrutura |
| Upload e Análise de Documentos | Extração de texto de 12+ formatos (PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML, XML, SQL) | Análise de configs, logs e documentação |
| Renderização Mermaid | Diagramas técnicos renderizados visualmente com exportação PNG/SVG/PDF | Visualização profissional de arquiteturas |

> **Nota:** As capacidades de upload de imagens e documentos estão controladas por feature flags (`FEATURE_IMAGE_UPLOAD`, `FEATURE_DOCUMENT_UPLOAD`) e limites por plano. A renderização Mermaid está em validação contínua para estabilidade em diagramas complexos.

### 2.3 Capacidades Planejadas (roadmap)

As seguintes capacidades fazem parte da estratégia de evolução do produto e estão em fase de planejamento ou desenvolvimento:

| Capacidade | Descrição | Versão Alvo |
|---|---|---|
| Análise TCP/IP profunda | Inspeção de tráfego de rede nas camadas L3-L7 | v6.0 |
| Correlação de logs | Cruzamento de dados de múltiplas fontes (firewall, IDS, NetFlow) | v6.0 |
| Integração Zabbix/Wazuh | Consulta de dados reais de monitoramento durante o raciocínio | v5.0 |
| Roteamento multi-modelo | Direcionamento de queries para modelos especializados | v5.0 |
| Inferência on-premise | Modelos fine-tuned em GPU dedicada | v6.0 |

### 2.4 Fluxo de Agente Autônomo

```
Usuário envia mensagem
    ↓
Agente analisa contexto e decide ação
    ↓
[Iteração 1] Executa ferramenta(s) automaticamente
    ↓
Analisa resultados e decide próximo passo
    ↓
[Iteração 2-5] Encadeia ferramentas se necessário
    ↓
Sintetiza resposta final com resultados
    ↓
Debita créditos e registra uso
```

O agente opera em um loop de até 5 iterações, decidindo autonomamente quais ferramentas usar em cada etapa. Essa arquitetura é inspirada no paradigma ReAct [5] e permite diagnósticos complexos que exigem múltiplas consultas correlacionadas.

---

## 3. Arquitetura Técnica

### 3.1 Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 19 + Tailwind CSS 4 | Performance, DX, ecossistema |
| Backend | Express 4 + tRPC 11 | Type-safety end-to-end |
| Banco de Dados | MySQL/TiDB (Drizzle ORM) | Escalabilidade horizontal |
| LLM | API cloud de inferência (Gemini 2.5 Flash) | Gateway gerenciado, modelos de última geração |
| Streaming | Server-Sent Events (SSE) | Resposta em tempo real |
| Pagamentos | Stripe (BRL) | Padrão global, PCI-compliant |
| Armazenamento | S3 (compatível) | Escalável, baixo custo |
| Autenticação | OAuth 2.0 + JWT | Segurança padrão da indústria |

### 3.2 Estratégia de Inferência LLM

O debuga.ai opera atualmente com inferência via API cloud e está preparado para evoluir para uma arquitetura híbrida:

**Em produção:**
- **API cloud de inferência** como gateway de inferência gerenciado
- Modelo atual: **Gemini 2.5 Flash** para raciocínio, tool calling e streaming
- Wrapper provider-agnostic (`server/_core/llm.ts`) que permite trocar modelos sem alterar a lógica do agente

**Planejado (roadmap v5.0–v6.0):**
- **Roteamento multi-modelo** — Camada de decisão que direciona queries entre diferentes provedores e modelos com base em complexidade, domínio e latência
- **Inferência on-premise** — Infraestrutura GPU dedicada para servir modelos open-source fine-tuned (Qwen, Mistral, Llama) otimizados para TI e segurança
- **Redução de dependência externa** — Permitir análises com dados sensíveis sem envio para APIs de terceiros

A estratégia de modelos especializados prevê fine-tuning com datasets de:
- Documentação técnica de equipamentos de rede (Cisco, Juniper, MikroTik, Fortinet)
- RFCs do IETF (TCP, UDP, IP, BGP, OSPF, DNS, TLS)
- CVEs e advisories de segurança (NVD, MITRE ATT&CK)
- Normas e frameworks de segurança (ISO 27001, NIST CSF, CIS Controls)

### 3.2.1 Estratégia Híbrida de LLM (Hybrid LLM Strategy)

O SaaS atual do debuga.ai utiliza provedores cloud/API compatível para toda a inferência LLM em produção. Paralelamente, a Sperry Tecnologia mantém uma stack pública de pesquisa e documentação técnica — a **debuga.ai LLM Stack** — que documenta o caminho para inferência local/on-premise.

Os pilares da estratégia híbrida são:

| Pilar | Status | Descrição |
|---|---|---|
| Provedores cloud/API | **Em produção** | API cloud de inferência como gateway gerenciado (Gemini 2.5 Flash) |
| Motor de inferência local | Em laboratório | vLLM como motor de inferência para modelos open-source |
| Família de modelos avaliada | Em laboratório | Qwen-Coder (7B, 14B, 32B) com benchmarks para DevOps/segurança |
| Gateway OpenAI-compatible | Em laboratório | Skeleton community de roteamento cloud/local com fallback |
| Deploy Enterprise/on-premise | Roadmap | Versão self-hosted sob projeto para clientes com requisitos de compliance |

A stack pública está organizada nos seguintes repositórios:

| Repositório | Função |
|---|---|
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Documentação central, arquitetura e visão de laboratório |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Avaliação de Qwen-Coder para DevOps, infraestrutura e segurança |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Configurações genéricas para servir modelos com vLLM |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Skeleton community de gateway OpenAI-compatible |

> **Nota:** A stack LLM pública é uma iniciativa de documentação, laboratório e pesquisa técnica. Não representa código de produção do SaaS, não contém prompts internos, dados de clientes ou regras comerciais. A produção do debuga.ai pode conter integrações e políticas adicionais não publicadas.

### 3.3 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                        │
│  React 19 + Tailwind 4 + tRPC Client + SSE Consumer         │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────┐
│                    SERVIDOR (Node.js)                       │
│  Express 4 + tRPC 11 + SSE Stream + Stripe Webhooks         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │ Auth     │  │ Chat     │  │ Credits  │  │ Stripe     │   │
│  │ Module   │  │ Stream   │  │ System   │  │ Routes     │   │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘   │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           AGENT LOOP (max 5 iterações)               │   │
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

### 3.4 Modelo de Dados

O banco de dados é estruturado em 7 tabelas principais:

- **users**: Cadastro de usuários com OAuth, roles (admin/user), Stripe customer ID
- **conversations**: Conversas com suporte a pin, archive, timestamps
- **messages**: Mensagens com role (user/assistant/system), tool_calls, token count
- **subscriptions**: Assinaturas Stripe com status, período, cancelamento
- **credits**: Créditos por usuário com total, usado, planId, reset mensal
- **usage_log**: Histórico detalhado de consumo por conversa/ferramenta
- **usage_events**: Contadores de uso independentes e à prova de manipulação (mensagens enviadas, conversas iniciadas, eventos de assinatura)

### 3.5 Sistema de Créditos e Limites

| Plano | Mensagens/Dia | Conversas/Mês | Imagens/Dia | Documentos/Dia | Créditos Totais |
|---|---|---|---|---|---|
| Gratuito | 5 | 3 | 2 | 3 | 50 |
| Starter | 100 | 30 | 10 | 15 | 1.000 |
| Pro | Ilimitado | Ilimitado | 50 | 50 | 10.000 |
| Enterprise | Ilimitado | Ilimitado | Ilimitado | Ilimitado | 100.000 |

O sistema de créditos opera em três camadas de proteção:
1. **Rate Limiting**: Máximo 20 mensagens por minuto (proteção contra abuso)
2. **Limites de Plano**: Verificação de mensagens/dia e conversas/mês antes de processar
3. **Créditos**: Débito proporcional ao consumo de tokens após cada resposta

Todos os planos utilizam o mesmo modelo de inferência. A diferenciação entre planos ocorre exclusivamente nos limites de uso (mensagens, conversas, créditos).

---

## 4. Modelo de Negócio

### 4.1 Estratégia de Monetização

O debuga.ai utiliza um modelo **freemium** com 4 tiers de assinatura recorrente em BRL (Real Brasileiro), processados via Stripe:

| Plano | Preço Mensal | Preço Anual | Target |
|---|---|---|---|
| Gratuito | R$ 0 | R$ 0 | Experimentação |
| Starter | R$ 49,90 | R$ 479,00 | Profissionais individuais |
| Pro | R$ 149,90 | R$ 1.439,00 | Equipes de TI |
| Enterprise | R$ 499,90 | R$ 4.799,00 | Empresas com compliance |

### 4.2 Público-Alvo

1. **Profissionais de TI autônomos** que precisam de um "segundo par de olhos" para diagnósticos
2. **Equipes de infraestrutura** de empresas médias que não têm budget para consultoria especializada
3. **MSPs (Managed Service Providers)** que atendem múltiplos clientes e precisam de agilidade
4. **Estudantes e profissionais em formação** (via programa educacional Open Infra Pro)
5. **Empresas com requisitos de compliance** que precisam de documentação automatizada

### 4.3 Canais de Aquisição

- Landing page otimizada com SEO para termos de TI em português
- Programa educacional "Open Infra Pro" (funil de entrada via cursos)
- Suporte humano via WhatsApp como diferencial de confiança
- Conteúdo técnico em redes sociais e comunidades de TI brasileiras

---

## 5. Segurança e Compliance

### 5.1 Medidas de Segurança Implementadas

- **Autenticação OAuth 2.0** com sessões JWT assinadas
- **Isolamento de dados**: Cada usuário acessa apenas suas conversas (filtro por userId em todas as queries)
- **Rate limiting**: Proteção contra flood e abuso de API (20 msgs/min por usuário)
- **Execução de código controlada**: Execução em /tmp com timeout de 30s e output limitado a 50KB, com isolamento adicional fornecido pela plataforma de deploy
- **HTTPS obrigatório**: Toda comunicação é criptografada em trânsito
- **Stripe PCI-DSS**: Dados de pagamento nunca tocam nossos servidores
- **Webhook signature verification**: Toda comunicação Stripe é verificada criptograficamente
- **Separação frontend/backend**: Nenhuma credencial sensível é exposta ao navegador
- **Auditoria de código**: Zero secrets hardcoded, todas as variáveis sensíveis via environment variables
- **Contadores anti-manipulação**: Tabela `usage_events` independente garante que exclusão de conversas não reseta limites de uso

### 5.2 Privacidade de Dados

- Conversas são armazenadas apenas para o histórico do próprio usuário
- Nenhum dado é compartilhado com terceiros além do processamento LLM
- Usuários podem excluir conversas e dados a qualquer momento
- Conformidade com LGPD (Lei Geral de Proteção de Dados)

---

## 6. Roadmap

### 6.1 Fase Atual (v4.0) — Em Produção

- Agente autônomo com 8 ferramentas integradas
- Sistema de créditos e billing funcional com Stripe
- Interface de chat profissional com streaming SSE
- Landing page, pricing, account dashboard
- Rate limiting e enforcement de limites de plano
- Contadores de uso independentes (anti-manipulação)
- Busca global de conversas e arquivamento
- Upload e análise de imagens (screenshots, prints de erro, topologias)
- Upload e análise de documentos (12+ formatos: PDF, DOCX, TXT, MD, LOG, etc.)
- Renderização visual de diagramas Mermaid com exportação PNG/SVG/PDF
- Suporte humano por plano (Pro: triagem técnica; Enterprise: canal consultivo)
- Cards de exemplo guiados (5 visíveis + 3 ocultos da vitrine)
- 321 testes automatizados em 17 suítes
- Documentação técnica (whitepaper, arquitetura)

### 6.2 Fase 2 (v5.0) — Q3 2026

- Ativação dos conectores Zabbix e Wazuh para consulta de dados reais de monitoramento
- Roteamento multi-modelo para direcionar queries entre diferentes provedores
- Sistema de cupons para programa educacional Open Infra Pro
- Métodos de pagamento locais (quando disponíveis no Stripe Brasil)
- Dashboard de métricas para equipes

### 6.3 Fase 3 (v6.0) — Q4 2026

- Inferência on-premise via vLLM/TGI com modelos fine-tuned (Qwen, Mistral, Llama)
- API pública para integração com ferramentas de terceiros
- Agente com memória de longo prazo (contexto entre conversas)
- Ambiente isolado dedicado (Docker) para execução de código com isolamento reforçado
- Templates de automação (playbooks pré-configurados)
- Marketplace de integrações

### 6.4 Fase 4 (v7.0) — 2027

- Multi-tenancy para MSPs
- White-label para revendedores
- Versão self-hosted para clientes enterprise (on-premise)
- Agente com capacidade de execução em infraestrutura do cliente (via agent remoto)
- Certificações de segurança (SOC 2, ISO 27001)

---

## 7. Análise Competitiva

| Critério | debuga.ai | ChatGPT | GitHub Copilot | Ferramentas SIEM |
|---|---|---|---|---|
| Especialização em TI/Infra | Nativa | Genérica | Código apenas | Alertas apenas |
| Execução de código | Sim (Python/Bash) | Limitada | Não | Não |
| Port scan / SSL check | Sim (8 ferramentas) | Não | Não | Parcial |
| Navegação web autônoma | Sim | Limitada | Não | Não |
| Agente autônomo (multi-step) | 5 iterações | 1 resposta | Sugestões | Regras fixas |
| Preço em BRL | Sim | USD | USD | Variável |
| Suporte em português | Nativo | Traduzido | Inglês | Variável |
| Modelo especializado em TI | Planejado (v6.0) | Não | Não | Não |
| Integração com SIEM/monitoring | Planejada (v5.0) | Não | Não | Nativa |

---

## 8. Métricas de Sucesso

| KPI | Meta Q3 2026 | Meta Q4 2026 | Meta 2027 |
|---|---|---|---|
| Usuários registrados | 500 | 2.000 | 10.000 |
| Assinantes pagos | 50 | 200 | 1.000 |
| MRR (Monthly Recurring Revenue) | R$ 5.000 | R$ 25.000 | R$ 150.000 |
| Churn mensal | < 10% | < 8% | < 5% |
| NPS (Net Promoter Score) | > 40 | > 50 | > 60 |

---

## 9. Equipe e Empresa

**Sperry Tecnologia** é uma empresa brasileira especializada em inteligência artificial e infraestrutura de TI. Pioneira na especialização em plataformas de IA como serviço, a Sperry domina completamente as ferramentas de IA generativa e oferece tanto o produto (debuga.ai) quanto consultoria e treinamento para empresas.

**Diferenciais da Sperry Tecnologia:**
- Primeira empresa brasileira especializada em IA como serviço para TI
- Expertise em desenvolvimento de interfaces modernas com React e JSX
- Programa educacional "Open Infra Pro" com base de alunos ativa
- Suporte humano + IA como modelo híbrido de atendimento
- Estratégia de evolução para infraestrutura de inferência híbrida (cloud + local), documentada na debuga.ai LLM Stack

---

## 10. Conclusão

O debuga.ai representa uma nova categoria de ferramenta para profissionais de TI: o **agente autônomo especializado**. Ao combinar a capacidade de raciocínio de LLMs de última geração com ferramentas de execução real (execução de código, network scanning, web scraping, geração de imagens), a plataforma oferece um assistente que não apenas sugere, mas **executa e diagnostica**.

A versão atual opera com 8 ferramentas de diagnóstico, upload e análise de imagens e documentos, renderização visual de diagramas Mermaid, sistema de billing completo e 321 testes automatizados em 17 suítes. A estratégia de evolução inclui a implantação de modelos especializados em infraestrutura GPU — atualmente em fase de laboratório e pesquisa na debuga.ai LLM Stack —, integração com plataformas de monitoramento (Zabbix, Wazuh, Prometheus) e expansão para o mercado enterprise com versão self-hosted.

Com o mercado brasileiro de TI em forte expansão e a crescente adoção de IA em cibersegurança, o debuga.ai está posicionado para capturar uma fatia significativa do mercado de ferramentas de produtividade para profissionais de infraestrutura e segurança.

---

## Referências

[1] IT Forum. "Mercado de TI no Brasil cresce 18,5% em 2025." Abril 2026. https://itforum.com.br/noticias/mercado-ti-brasil-cresce-185-2025/

[2] MarketsandMarkets. "Artificial Intelligence in Cybersecurity Market Report 2026." https://www.marketsandmarkets.com/Market-Reports/artificial-intelligence-ai-cyber-security-market-220634996.html

[3] InvestSP/IDC. "Brasil lidera mercado de IA na América Latina." Abril 2026. https://investsp.org.br/brasil-lidera-mercado-de-ia-na-america-latina-aponta-idc/

[4] Meio & Mensagem. "ChatGPT domina mercado de inteligência artificial no Brasil." Novembro 2025. https://www.meioemensagem.com.br/marketing/chatgpt-domina-mercado-de-inteligencia-artificial-no-brasil

[5] Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models." arXiv:2210.03629, 2022. https://arxiv.org/abs/2210.03629

---

*Documento confidencial — Sperry Tecnologia © 2026. Todos os direitos reservados.*
