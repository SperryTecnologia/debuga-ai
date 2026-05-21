# White Label Enterprise — debuga.ai

**Modelo de Implantação, Personalização e Operação da Plataforma de IA como Produto Próprio**

Versão 2.0 | Maio 2026 | Sperry Tecnologia

---

## Visão Geral

A debuga.ai foi projetada desde a concepção para operar como **produto white label**. O operador — seja um MSP, ISP, consultoria de TI, SOC/NOC ou departamento de tecnologia — implanta a plataforma em sua própria infraestrutura, com marca, domínio, identidade visual e precificação próprios. Os usuários finais interagem exclusivamente com o produto do operador, sem qualquer referência à tecnologia subjacente.

Este documento detalha os modelos de implantação disponíveis, a matriz de personalização, o processo de onboarding, conformidade regulatória e o retorno sobre investimento esperado.

---

## Por que White Label?

```mermaid
mindmap
  root((White Label<br/>debuga.ai))
    Receita
      Produto próprio
      Precificação livre
      Billing integrado
      Upsell de planos
    Controle
      Dados no operador
      GPU local opcional
      Providers configuráveis
      Políticas de retenção
    Marca
      Domínio próprio
      Logo e cores
      Landing page
      Email transacional
    Velocidade
      Sem desenvolvimento
      Deploy em dias
      Atualizações contínuas
      Suporte técnico
```

O modelo white label resolve um dilema comum: equipes técnicas precisam de IA operacional, mas não podem depender de plataformas externas (dados sensíveis, compliance, custos imprevisíveis) nem têm tempo ou orçamento para desenvolver uma solução própria. A debuga.ai elimina esse dilema oferecendo uma plataforma pronta para operar com marca própria.

---

## Modelos de Implantação

A plataforma suporta três modelos de implantação, cada um adequado a um perfil diferente de operador:

```mermaid
graph TB
    subgraph "Modelo 1 — Infraestrutura Própria"
        OP1[Operador]
        SRV1[Servidor Dedicado<br/>Cloud / VPS / On-premise]
        APP1[debuga.ai<br/>Docker Compose]
        GPU1[GPU Local<br/>Ollama + CUDA]
        OP1 -->|Gerencia| SRV1
        SRV1 --> APP1
        SRV1 --> GPU1
    end

    subgraph "Modelo 2 — SaaS Gerenciado"
        OP2[Operador]
        SPERRY[Sperry Tecnologia<br/>Infraestrutura gerenciada]
        APP2[debuga.ai<br/>Instância dedicada]
        OP2 -->|Contrata| SPERRY
        SPERRY -->|Opera| APP2
    end

    subgraph "Modelo 3 — Híbrido"
        OP3[Operador]
        SRV3[Servidor do Operador]
        APP3[debuga.ai<br/>Docker Compose]
        SUPORTE[Sperry<br/>Suporte + Updates]
        OP3 -->|Infraestrutura| SRV3
        SRV3 --> APP3
        SUPORTE -->|Mantém| APP3
    end
```

| Modelo | Infraestrutura | Operação | GPU | Ideal para |
|--------|---------------|----------|-----|------------|
| **Infraestrutura Própria** | Operador (cloud, VPS ou on-premise) | Operador | Sim (opcional) | MSPs e ISPs com equipe de infra, requisitos de soberania de dados |
| **SaaS Gerenciado** | Sperry Tecnologia | Sperry | Cloud only | Consultorias sem equipe de infra, time-to-market rápido |
| **Híbrido** | Operador | Sperry + Operador | Sim (opcional) | Empresas em transição, compliance com suporte externo |

### Detalhamento: Infraestrutura Própria

O operador provisiona um servidor (cloud, VPS ou bare-metal) e executa o deploy via Docker Compose. A Sperry fornece o repositório privado, documentação de setup, scripts de automação e suporte técnico durante a implantação.

**Opções de hospedagem compatíveis:**

| Tipo | Exemplos | GPU | Custo mensal estimado |
|------|----------|-----|----------------------|
| VPS Cloud | Hetzner, OVH, Vultr, DigitalOcean | Não | A partir de R$ 150/mês |
| Cloud com GPU | Vast.ai, RunPod, Lambda | Sim | A partir de R$ 500/mês |
| Bare-metal | Servidor próprio, colocation | Sim | Investimento inicial |
| Nuvem pública | AWS, GCP, Azure | Sim (instâncias GPU) | Variável |

### Detalhamento: SaaS Gerenciado

A Sperry opera a instância dedicada do operador, incluindo monitoramento, backups, atualizações e suporte. O operador mantém controle total sobre marca, planos e dados (via painel administrativo).

### Detalhamento: Híbrido

O operador fornece a infraestrutura e a Sperry realiza a operação remota: monitoramento, atualizações, troubleshooting e suporte de segundo nível. Ideal para operadores que precisam de soberania de dados mas não têm equipe de DevOps dedicada.

---

## Matriz de Personalização

```mermaid
graph LR
    subgraph "Identidade Visual"
        LOGO[Logo<br/>Upload via Admin]
        CORES[Paleta de Cores<br/>CSS Variables]
        FONTE[Tipografia<br/>Google Fonts]
        FAVICON[Favicon<br/>Upload via Admin]
    end

    subgraph "Domínio e Comunicação"
        DOMAIN[Domínio Próprio<br/>DNS + SSL automático]
        EMAIL[Email Transacional<br/>SMTP / Brevo]
        LANDING[Landing Page<br/>Textos + CTAs]
        LEGAL[Páginas Legais<br/>Termos + Privacidade]
    end

    subgraph "Produto e Billing"
        PLANS[Planos<br/>Stripe Products]
        LIMITS[Limites de Uso<br/>Diário + Mensal]
        FEATURES[Features por Plano<br/>Granular]
        TRIAL[Trial Period<br/>Configurável]
    end

    subgraph "Técnico"
        PROVIDERS[Providers de IA<br/>Prioridade configurável]
        GPUCONF[GPU Local<br/>Modelo + Quantização]
        TOOLS[Ferramentas<br/>Habilitação por plano]
        RETENTION[Retenção de Dados<br/>Políticas do operador]
    end
```

| Categoria | Item | Método de Configuração | Nível |
|-----------|------|----------------------|-------|
| **Marca** | Nome do produto | Variável de ambiente | Básico |
| **Marca** | Logo (header + favicon) | Upload via painel admin | Básico |
| **Marca** | Paleta de cores | Variáveis CSS (admin) | Básico |
| **Marca** | Tipografia | Google Fonts (configuração) | Básico |
| **Domínio** | Domínio próprio | DNS A/CNAME + Let's Encrypt | Básico |
| **Domínio** | Certificado SSL | Automático (Let's Encrypt) | Básico |
| **Comunicação** | Email transacional (remetente) | SMTP / Brevo API | Básico |
| **Comunicação** | Templates de email | Configuração de texto | Intermediário |
| **Landing** | Textos e CTAs | Painel admin | Básico |
| **Landing** | Seções e layout | Configuração de componentes | Intermediário |
| **Legal** | Termos de uso | Página editável | Básico |
| **Legal** | Política de privacidade | Página editável | Básico |
| **Legal** | LGPD (DPO, base legal) | Configuração | Intermediário |
| **Billing** | Planos e preços | Stripe Dashboard | Básico |
| **Billing** | Limites por plano | Painel admin | Básico |
| **Billing** | Features por plano | Painel admin | Intermediário |
| **Billing** | Período de trial | Configuração | Básico |
| **IA** | Providers habilitados | Variáveis de ambiente | Intermediário |
| **IA** | Prioridade de providers | Configuração | Intermediário |
| **IA** | Modelo GPU local | Ollama pull | Avançado |
| **IA** | Ferramentas habilitadas | Configuração por plano | Intermediário |
| **Dados** | Política de retenção | Configuração | Intermediário |
| **Dados** | Backup automático | Cron + script | Avançado |
| **Dados** | Export de dados | API admin | Intermediário |

---

## Processo de Onboarding

```mermaid
sequenceDiagram
    participant OP as Operador
    participant SP as Sperry Tecnologia
    participant SRV as Servidor
    participant PROD as Produto Final

    OP->>SP: 1. Contato comercial
    SP->>OP: 2. Análise de requisitos
    SP->>OP: 3. Proposta + contrato

    rect rgb(240, 248, 255)
        Note over OP,PROD: Fase de Implantação (5-10 dias úteis)
        SP->>SRV: 4. Provisiona infraestrutura
        SP->>SRV: 5. Deploy via Docker Compose
        SP->>SRV: 6. Configura domínio + SSL
        SP->>SRV: 7. Configura providers de IA
        OP->>SP: 8. Envia marca (logo, cores, textos)
        SP->>SRV: 9. Aplica personalização
        SP->>SRV: 10. Configura Stripe (billing)
    end

    rect rgb(240, 255, 240)
        Note over OP,PROD: Fase de Validação (3-5 dias úteis)
        SP->>OP: 11. Ambiente de homologação
        OP->>SP: 12. Testes e ajustes
        SP->>SRV: 13. Correções finais
        SP->>PROD: 14. Go-live
    end

    rect rgb(255, 248, 240)
        Note over OP,PROD: Operação Contínua
        SP->>OP: 15. Treinamento da equipe
        SP->>PROD: 16. Monitoramento + updates
        OP->>PROD: 17. Gestão de usuários + planos
    end
```

| Fase | Duração | Responsável | Entregáveis |
|------|---------|-------------|-------------|
| **Análise** | 1-2 dias | Sperry + Operador | Requisitos, modelo de implantação, proposta |
| **Implantação** | 5-10 dias úteis | Sperry | Servidor configurado, domínio ativo, SSL, providers |
| **Personalização** | 2-3 dias | Sperry + Operador | Marca aplicada, landing page, planos no Stripe |
| **Validação** | 3-5 dias | Operador + Sperry | Testes de funcionalidade, ajustes, homologação |
| **Go-live** | 1 dia | Sperry | DNS apontado, produção ativa |
| **Treinamento** | 1-2 dias | Sperry | Equipe do operador treinada (admin + uso) |

**Tempo total estimado: 12-22 dias úteis** do contrato ao go-live.

---

## Conformidade e LGPD

```mermaid
graph TB
    subgraph "Papéis LGPD"
        CONTROLADOR[Operador = Controlador<br/>Define finalidade do tratamento]
        OPERADOR_LGPD[Sperry = Operador<br/>Trata dados sob instrução]
        TITULAR[Usuário Final = Titular<br/>Direitos garantidos]
    end

    subgraph "Bases Legais"
        CONSENTIMENTO[Consentimento<br/>Termos de uso aceitos]
        CONTRATO[Execução de Contrato<br/>Prestação do serviço]
        LEGITIMO[Interesse Legítimo<br/>Segurança e auditoria]
    end

    subgraph "Direitos do Titular"
        ACESSO[Acesso aos dados]
        CORRECAO[Correção]
        EXCLUSAO[Exclusão / Portabilidade]
        REVOGACAO[Revogação de consentimento]
    end

    subgraph "Medidas Técnicas"
        CRYPTO[Criptografia<br/>Trânsito + Repouso]
        ISOLAMENTO[Isolamento<br/>Por tenant]
        AUDITORIA[Auditoria<br/>Logs imutáveis]
        RETENCAO[Retenção<br/>Configurável]
        ANONIMIZACAO[Anonimização<br/>Dados de analytics]
    end

    CONTROLADOR --> CONSENTIMENTO
    CONTROLADOR --> CONTRATO
    OPERADOR_LGPD --> LEGITIMO
    TITULAR --> ACESSO
    TITULAR --> CORRECAO
    TITULAR --> EXCLUSAO
    TITULAR --> REVOGACAO
    CONSENTIMENTO --> CRYPTO
    CONTRATO --> ISOLAMENTO
    LEGITIMO --> AUDITORIA
```

| Requisito LGPD | Implementação na debuga.ai | Artigo |
|----------------|---------------------------|--------|
| **Base legal** | Consentimento (termos) + execução de contrato | Art. 7 |
| **Finalidade** | Definida pelo operador nos termos de uso | Art. 6, I |
| **Minimização** | Coleta apenas dados necessários para o serviço | Art. 6, III |
| **Transparência** | Política de privacidade editável pelo operador | Art. 6, VI |
| **Segurança** | Criptografia, isolamento, auditoria | Art. 46 |
| **Direitos do titular** | API de export/exclusão disponível ao operador | Art. 18 |
| **Transferência internacional** | Dados no servidor do operador (Brasil) | Art. 33 |
| **DPO** | Configurável pelo operador | Art. 41 |
| **Registro de tratamento** | Logs de auditoria imutáveis | Art. 37 |
| **Notificação de incidentes** | Alertas configuráveis para o operador | Art. 48 |

O operador é o **controlador** dos dados de seus usuários finais. A Sperry atua como **operador** (no sentido LGPD) apenas quando contratada para gerenciar a infraestrutura. Em implantações próprias, a Sperry não tem acesso aos dados dos usuários finais.

---

## SLA e Suporte

| Nível | Tempo de Resposta | Tempo de Resolução | Canal |
|-------|------------------|-------------------|-------|
| **Crítico** (plataforma indisponível) | 1 hora | 4 horas | WhatsApp + Telefone |
| **Alto** (funcionalidade degradada) | 4 horas | 24 horas | WhatsApp + Email |
| **Médio** (bug não-crítico) | 24 horas | 72 horas | Email |
| **Baixo** (dúvida, feature request) | 48 horas | Conforme roadmap | Email |

| Garantia | Compromisso |
|----------|-------------|
| **Uptime da plataforma** | 99.5% (infraestrutura gerenciada) |
| **Atualizações de segurança** | Em até 48h após disclosure |
| **Atualizações de funcionalidade** | Mensal (changelog documentado) |
| **Backup** | Diário (retenção configurável) |
| **Suporte técnico** | Horário comercial (extensível para 24/7) |

---

## Retorno sobre Investimento

A adoção da debuga.ai como produto white label gera retorno em múltiplas dimensões:

```mermaid
graph LR
    subgraph "Investimento"
        LICENCA[Licença<br/>White Label]
        INFRA[Infraestrutura<br/>Servidor + GPU]
        SETUP[Setup<br/>Implantação]
    end

    subgraph "Retorno Direto"
        RECEITA[Receita de<br/>Assinaturas]
        UPSELL[Upsell de<br/>Planos Premium]
        RETENCAO2[Retenção de<br/>Clientes]
    end

    subgraph "Retorno Indireto"
        EFICIENCIA[Eficiência<br/>Operacional]
        DIFERENCIAL[Diferencial<br/>Competitivo]
        ESCALA[Escala sem<br/>Contratação]
    end

    LICENCA --> RECEITA
    INFRA --> UPSELL
    SETUP --> RETENCAO2
    RECEITA --> EFICIENCIA
    UPSELL --> DIFERENCIAL
    RETENCAO2 --> ESCALA
```

| Métrica | Cenário Conservador | Cenário Otimista |
|---------|--------------------|--------------------|
| **Payback** | 4-6 meses | 2-3 meses |
| **Margem por usuário** | 60-70% | 75-85% |
| **Redução de tickets L1** | 40-50% | 60-70% |
| **Redução de MTTR** | 50-60% | 70-80% |
| **Retenção de clientes** | +15% | +25% |
| **NPS improvement** | +10 pontos | +20 pontos |

### Cenário de Exemplo: MSP com 50 Clientes

| Item | Valor |
|------|-------|
| Usuários ativos estimados | 150-300 |
| Receita mensal com assinaturas | Definida pelo operador |
| Custo de infraestrutura | VPS + GPU (variável) |
| Economia em suporte L1 | 40-60% do custo atual |
| Tempo de payback | 3-5 meses |

---

## Integrações Planejadas

```mermaid
graph TB
    subgraph "Monitoramento"
        ZABBIX[Zabbix<br/>Alertas + Métricas]
        GRAFANA[Grafana<br/>Dashboards]
        PROMETHEUS[Prometheus<br/>Time Series]
    end

    subgraph "ITSM"
        GLPI[GLPI<br/>Tickets]
        OTRS[OTRS<br/>Service Desk]
        JIRA[Jira<br/>Issues]
    end

    subgraph "Comunicação"
        WHATSAPP[WhatsApp<br/>Business API]
        TELEGRAM[Telegram<br/>Bot API]
        TEAMS[Microsoft Teams<br/>Webhook]
    end

    subgraph "Infraestrutura"
        ANSIBLE[Ansible<br/>Automação]
        MIKROTIK[MikroTik<br/>RouterOS API]
        UNIFI[UniFi<br/>Network API]
    end

    DEBUGA[debuga.ai<br/>Agente Autônomo]
    ZABBIX --> DEBUGA
    GRAFANA --> DEBUGA
    PROMETHEUS --> DEBUGA
    GLPI --> DEBUGA
    OTRS --> DEBUGA
    JIRA --> DEBUGA
    WHATSAPP --> DEBUGA
    TELEGRAM --> DEBUGA
    TEAMS --> DEBUGA
    ANSIBLE --> DEBUGA
    MIKROTIK --> DEBUGA
    UNIFI --> DEBUGA
```

| Integração | Status | Tipo | Caso de Uso |
|-----------|--------|------|-------------|
| **Zabbix** | Em desenvolvimento | Bidirecional | Consulta de alertas, ack automático, correlação |
| **Grafana** | Em desenvolvimento | Leitura | Visualização de métricas via agente |
| **Prometheus** | Em desenvolvimento | Leitura | Consulta de time series |
| **GLPI** | Planejado | Bidirecional | Abertura/atualização de tickets |
| **WhatsApp Business** | Planejado | Bidirecional | Atendimento via WhatsApp |
| **Telegram** | Planejado | Bidirecional | Notificações e consultas |
| **MikroTik** | Pesquisa | Leitura | Diagnóstico de roteadores |
| **UniFi** | Pesquisa | Leitura | Status de rede wireless |

---

## Requisitos para Implantação

| Requisito | Mínimo (sem GPU) | Recomendado (com GPU) |
|-----------|-----------------|----------------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 32 GB |
| **Storage** | 50 GB SSD | 500 GB NVMe |
| **GPU** | — | NVIDIA 24+ GB VRAM |
| **Rede** | 100 Mbps | 1 Gbps |
| **OS** | Ubuntu 22.04+ | Ubuntu 22.04+ |
| **Docker** | Docker Engine 24+ | Docker Engine 24+ |
| **Domínio** | DNS configurável | DNS com Cloudflare |
| **SSL** | Let's Encrypt (automático) | Cloudflare Full (Strict) |
| **Stripe** | Conta ativa | Conta ativa |
| **Email** | SMTP funcional | Brevo / SendGrid |

---

## Próximos Passos

Para iniciar o processo de implantação white label:

1. **Contato comercial** — Apresente seu cenário e requisitos
2. **Análise técnica** — Avaliamos infraestrutura e modelo ideal
3. **Proposta** — Detalhamento de escopo, cronograma e investimento
4. **Implantação** — Deploy, personalização e validação
5. **Go-live** — Produto ativo com sua marca

**Contato:** contato@sperrytecnologia.com.br

---

## Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [Whitepaper](WHITEPAPER_PTBR.md) | Visão executiva da plataforma |
| [Arquitetura Técnica](ARCHITECTURE_PTBR.md) | Detalhes da arquitetura com diagramas |
| [Segurança](SECURITY_OVERVIEW.md) | Políticas de segurança e compliance |
| [Providers de IA](PROVIDERS_OVERVIEW.md) | Providers suportados e roteamento |
| [Roadmap](ROADMAP.md) | Evolução planejada da plataforma |

---

*Sperry Tecnologia — [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br) — contato@sperrytecnologia.com.br*
