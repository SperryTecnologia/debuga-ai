# debuga.ai — Whitepaper Técnico

**Plataforma de Agente Autônomo de IA para Infraestrutura de TI, Segurança da Informação e Telecomunicações**

**Versão:** 1.0  
**Data:** Maio 2026  
**Autor:** Sperry Tecnologia  
**Contato:** www.sperrytecnologia.com.br

---

## Sumário Executivo

O **debuga.ai** é uma plataforma SaaS (Software as a Service) que disponibiliza um agente autônomo de inteligência artificial especializado em infraestrutura de TI, segurança da informação, DevOps e telecomunicações. Diferente de chatbots convencionais que apenas respondem perguntas, o debuga.ai é um agente que **age**: executa código, navega em sites, escaneia portas, verifica certificados SSL, consulta DNS e gera relatórios técnicos de forma autônoma.

A plataforma foi projetada e desenvolvida pela **Sperry Tecnologia** para atender o mercado brasileiro de tecnologia, que movimentou US$ 67,8 bilhões em 2025, com crescimento de 18,5% em relação ao ano anterior [1]. O mercado global de IA em cibersegurança, avaliado em US$ 22,37 bilhões em 2025, deve atingir US$ 50,83 bilhões até 2031, com CAGR de 14,8% [2]. O Brasil lidera o mercado de IA na América Latina, com previsão de crescimento de 3,8 vezes entre 2025 e 2029 [3].

---

## 1. Problema de Mercado

### 1.1 Escassez de Profissionais de TI

O Brasil enfrenta um déficit crescente de profissionais qualificados em infraestrutura de TI e segurança da informação. Empresas de todos os portes precisam de suporte técnico especializado, mas o custo de contratar e reter talentos nessas áreas é proibitivo para a maioria.

### 1.2 Complexidade Operacional

A gestão de infraestrutura moderna envolve dezenas de ferramentas (Zabbix, Wazuh, Prometheus, Grafana, NetBox, Ansible, Terraform, Docker, Kubernetes) que exigem conhecimento profundo e atualização constante. Um único profissional raramente domina todo o ecossistema.

### 1.3 Tempo de Resposta a Incidentes

Incidentes de segurança e falhas de infraestrutura exigem diagnóstico rápido. O tempo médio entre a detecção e a resolução (MTTR) é frequentemente medido em horas ou dias, quando deveria ser minutos.

### 1.4 Limitações dos Chatbots Existentes

Soluções como ChatGPT, que domina 99% do mercado brasileiro de IA generativa [4], são generalistas. Não executam código em sandbox, não escaneiam portas, não verificam certificados SSL em tempo real, e não possuem contexto especializado em infraestrutura de TI brasileira.

---

## 2. Solução: debuga.ai

### 2.1 Visão do Produto

O debuga.ai é um **agente autônomo** — não um chatbot. A diferença fundamental é que o agente possui capacidade de **ação**: ele decide quais ferramentas usar, executa-as automaticamente, analisa os resultados e itera até resolver o problema do usuário.

### 2.2 Capacidades do Agente

| Capacidade | Descrição | Diferencial |
|---|---|---|
| Execução de Código | Sandbox isolada para Python e Bash | Scripts de automação em tempo real |
| Navegação Web | Acessa e extrai conteúdo de páginas | Análise de documentação e CVEs |
| Port Scan | Escaneia portas abertas em hosts | Auditoria de segurança automatizada |
| DNS Lookup | Consultas DNS completas | Diagnóstico de resolução de nomes |
| SSL/TLS Check | Verifica certificados e cadeias | Detecção de expiração e vulnerabilidades |
| HTTP Check | Analisa headers e status de sites | Verificação de segurança web |
| WHOIS Lookup | Consulta informações de domínio | Investigação de propriedade |
| Geração de Imagens | Cria diagramas e fluxogramas | Documentação visual automatizada |

### 2.3 Fluxo de Agente Autônomo

```
Usuário envia mensagem
    ↓
Agente analisa contexto e decide ação
    ↓
[Iteração 1] Executa ferramenta(s) automaticamente
    ↓
Analisa resultados
    ↓
[Iteração 2-5] Decide se precisa de mais ações
    ↓
Sintetiza resposta final com resultados
    ↓
Debita créditos e registra uso
```

O agente opera em um loop de até 5 iterações, decidindo autonomamente quais ferramentas usar em cada etapa. Isso permite resolver problemas complexos que exigem múltiplas consultas encadeadas.

---

## 3. Arquitetura Técnica

### 3.1 Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React 19 + Tailwind CSS 4 | Performance, DX, ecossistema |
| Backend | Express 4 + tRPC 11 | Type-safety end-to-end |
| Banco de Dados | MySQL/TiDB (Drizzle ORM) | Escalabilidade horizontal |
| LLM | Google Gemini 2.5 Flash (via API) | Custo-benefício, velocidade |
| Streaming | Server-Sent Events (SSE) | Resposta em tempo real |
| Pagamentos | Stripe (BRL) | Padrão global, suporte a PIX |
| Armazenamento | S3 (compatível) | Escalável, baixo custo |
| Autenticação | OAuth 2.0 | Segurança padrão da indústria |

### 3.2 Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                      │
│  React 19 + Tailwind 4 + tRPC Client + SSE Consumer     │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                    SERVIDOR (Node.js)                     │
│  Express 4 + tRPC 11 + SSE Stream + Stripe Webhooks     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Auth     │  │ Chat     │  │ Credits  │  │ Stripe │ │
│  │ Module   │  │ Stream   │  │ System   │  │ Routes │ │
│  └──────────┘  └────┬─────┘  └──────────┘  └────────┘ │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │           AGENT LOOP (max 5 iterações)            │   │
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

### 3.3 Modelo de Dados

O banco de dados é estruturado em 6 tabelas principais:

- **users**: Cadastro de usuários com OAuth, roles (admin/user), Stripe customer ID
- **conversations**: Conversas com suporte a pin, archive, timestamps
- **messages**: Mensagens com role (user/assistant/system), tool_calls, token count
- **subscriptions**: Assinaturas Stripe com status, período, cancelamento
- **credits**: Créditos por usuário com total, usado, planId, reset mensal
- **usage_log**: Histórico detalhado de consumo por conversa/ferramenta

### 3.4 Sistema de Créditos e Limites

| Plano | Mensagens/Dia | Conversas/Mês | Créditos Totais |
|---|---|---|---|
| Gratuito | 5 | 3 | 50 |
| Starter | 100 | 30 | 1.000 |
| Pro | Ilimitado | Ilimitado | 10.000 |
| Enterprise | Ilimitado | Ilimitado | 100.000 |

O sistema de créditos opera em três camadas de proteção:
1. **Rate Limiting**: Máximo 20 mensagens por minuto (proteção contra abuso)
2. **Limites de Plano**: Verificação de mensagens/dia e conversas/mês antes de processar
3. **Créditos**: Débito proporcional ao consumo de tokens após cada resposta

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
- Suporte humano via WhatsApp (555137374357) como diferencial de confiança
- Conteúdo técnico em redes sociais e comunidades de TI brasileiras

---

## 5. Segurança e Compliance

### 5.1 Medidas de Segurança Implementadas

- **Autenticação OAuth 2.0** com sessões JWT assinadas
- **Isolamento de dados**: Cada usuário acessa apenas suas conversas
- **Rate limiting**: Proteção contra flood e abuso de API
- **Sandbox de código**: Execução isolada sem acesso ao sistema host
- **HTTPS obrigatório**: Toda comunicação é criptografada em trânsito
- **Stripe PCI-DSS**: Dados de pagamento nunca tocam nossos servidores

### 5.2 Privacidade de Dados

- Conversas são armazenadas apenas para o histórico do próprio usuário
- Nenhum dado é compartilhado com terceiros além do processamento LLM
- Usuários podem excluir conversas e dados a qualquer momento
- Conformidade com LGPD (Lei Geral de Proteção de Dados)

---

## 6. Roadmap

### 6.1 Fase Atual (v4.0) — Concluída

- Agente autônomo com 8 ferramentas integradas
- Sistema de créditos e billing funcional
- Interface de chat profissional com streaming
- Landing page, pricing, account dashboard
- 60 testes automatizados

### 6.2 Fase 2 (v5.0) — Q3 2026

- Sistema de cupons para programa educacional
- Google OAuth com tela de login personalizada (hosting próprio)
- Integração direta com Zabbix API (monitoramento real-time)
- Integração com Wazuh API (alertas de segurança)
- Dashboard de métricas para equipes

### 6.3 Fase 3 (v6.0) — Q4 2026

- API pública para integração com ferramentas de terceiros
- Agente com memória de longo prazo (contexto entre conversas)
- Templates de automação (playbooks pré-configurados)
- Marketplace de integrações
- App mobile (React Native)

### 6.4 Fase 4 (v7.0) — 2027

- Multi-tenancy para MSPs
- White-label para revendedores
- Agente com capacidade de execução em infraestrutura do cliente (via agent remoto)
- Certificações de segurança (SOC 2, ISO 27001)

---

## 7. Análise Competitiva

| Critério | debuga.ai | ChatGPT | GitHub Copilot | Ferramentas SIEM |
|---|---|---|---|---|
| Especialização em TI/Infra | Nativa | Genérica | Código apenas | Alertas apenas |
| Execução de código | Sandbox isolada | Limitada | Não | Não |
| Port scan / SSL check | Sim | Não | Não | Parcial |
| Navegação web autônoma | Sim | Limitada | Não | Não |
| Preço em BRL | Sim | USD | USD | Variável |
| Suporte em português | Nativo | Traduzido | Inglês | Variável |
| Agente autônomo (multi-step) | 5 iterações | 1 resposta | Sugestões | Regras fixas |

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
- Expertise em JSX e desenvolvimento de interfaces modernas
- Programa educacional "Open Infra Pro" com base de alunos ativa
- Suporte humano + IA como modelo híbrido de atendimento

---

## 10. Conclusão

O debuga.ai representa uma nova categoria de ferramenta para profissionais de TI: o **agente autônomo especializado**. Ao combinar a capacidade de raciocínio de LLMs de última geração com ferramentas de execução real (sandbox, network scanning, web scraping), a plataforma oferece um assistente que não apenas sugere, mas **executa**.

Com o mercado brasileiro de TI em forte expansão e a crescente adoção de IA em cibersegurança, o debuga.ai está posicionado para capturar uma fatia significativa do mercado de ferramentas de produtividade para profissionais de infraestrutura e segurança.

---

## Referências

[1] IT Forum. "Mercado de TI no Brasil cresce 18,5% em 2025." Abril 2026. https://itforum.com.br/noticias/mercado-ti-brasil-cresce-185-2025/

[2] MarketsandMarkets. "Artificial Intelligence in Cybersecurity Market Report 2026." https://www.marketsandmarkets.com/Market-Reports/artificial-intelligence-ai-cyber-security-market-220634996.html

[3] InvestSP/IDC. "Brasil lidera mercado de IA na América Latina." Abril 2026. https://investsp.org.br/brasil-lidera-mercado-de-ia-na-america-latina-aponta-idc/

[4] Meio & Mensagem. "ChatGPT domina mercado de inteligência artificial no Brasil." Novembro 2025. https://www.meioemensagem.com.br/marketing/chatgpt-domina-mercado-de-inteligencia-artificial-no-brasil

[5] Gartner. "Worldwide AI Spending Will Total $2.5 Trillion in 2026." Janeiro 2026. https://www.gartner.com/en/newsroom/press-releases/2026-1-15-gartner-says-worldwide-ai-spending-will-total-2-point-5-trillion-dollars-in-2026

---

*Documento confidencial — Sperry Tecnologia © 2026. Todos os direitos reservados.*
