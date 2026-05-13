# debuga.ai White Label / Enterprise

**Versão:** 1.0  
**Data:** Maio 2026  
**Autor:** Sperry Tecnologia  
**Status:** Proposta comercial ativa

---

## 1. O que é o debuga.ai White Label

O debuga.ai White Label é uma proposta de adaptação da plataforma debuga.ai para empresas que desejam operar um agente de inteligência artificial com identidade própria, base de conhecimento personalizada e ambiente dedicado.

A arquitetura do debuga.ai foi projetada desde o início para suportar cenários de personalização e implantação dedicada. Isso significa que uma empresa pode ter sua própria instância do agente, com marca, contexto, fluxos de atendimento e integrações específicas para seu negócio, sem depender da infraestrutura compartilhada do debuga.ai público.

O modelo White Label não é um produto pronto para instalação em um clique. Trata-se de um projeto consultivo, dimensionado conforme o escopo, volume, integrações e necessidades específicas de cada empresa.

---

## 2. O que pode ser personalizado

A tabela abaixo resume os principais eixos de personalização disponíveis no modelo White Label.

| Eixo de personalização | Descrição |
|---|---|
| **Identidade visual** | Nome, logotipo, cores, favicon, título da aplicação e tom de resposta do agente. |
| **Contexto e instruções** | System prompt, áreas de atuação, vocabulário técnico, restrições de resposta e fluxos de diagnóstico. |
| **Base de conhecimento** | Documentos, FAQs, processos internos, políticas, manuais e instruções específicas que o agente utiliza como referência. |
| **Fluxos de atendimento** | Regras de escalonamento, triagem humana, encaminhamento para equipes internas e integração com canais de suporte. |
| **Autenticação** | Possibilidade de autenticação própria (Google OAuth, SAML, LDAP) em substituição à autenticação padrão da plataforma. |
| **Banco de dados** | Banco dedicado (PostgreSQL ou compatível) com isolamento completo de dados. |
| **Storage** | Storage compatível com S3 (MinIO, AWS S3 ou equivalente) para arquivos e documentos do agente. |
| **Provedores de IA** | Configuração de provedores LLM (OpenAI, Anthropic, Google, ou provedores locais via Ollama) conforme necessidade e orçamento. |
| **Domínio** | Domínio próprio da empresa (ex: ia.suaempresa.com.br) com certificado TLS. |

---

## 3. O que não está incluído por padrão

Para manter a transparência e evitar expectativas desalinhadas, é importante listar o que **não** faz parte do escopo padrão do White Label.

O debuga.ai White Label **não inclui**, salvo acordo específico em contrato:

- Fine-tuning de modelos de linguagem proprietários. O agente utiliza modelos comerciais (OpenAI, Anthropic, Google) ou modelos open-source via Ollama. Não há um modelo treinado exclusivamente para o debuga.ai.
- LLM própria em produção. A inferência é feita por provedores externos ou por modelos open-source em ambientes homologados. Não há garantia de desempenho equivalente a modelos comerciais em cenários de inferência local.
- Instalação autônoma em um clique. O deploy dedicado requer configuração técnica, dimensionamento de infraestrutura e acompanhamento da equipe Sperry Tecnologia.
- Suporte ilimitado ou SLA 24/7 sem contrato. O suporte humano sênior é dimensionado conforme o plano e o contrato Enterprise.
- Entrega do código-fonte completo em todos os planos. O acesso ao código-fonte é negociado conforme o escopo do projeto Enterprise.
- Certificação oficial de treinamento. O treinamento de uso é oferecido como orientação técnica, não como certificação formal.

---

## 4. Arquitetura de referência

A arquitetura White Label segue o mesmo padrão da plataforma debuga.ai, com adaptações para isolamento e personalização.

```
┌─────────────────────────────────────────────────┐
│                  Cliente (Browser)                │
│         React + Tailwind + tRPC Client           │
│         Identidade visual personalizada          │
└───────────────────┬─────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────┐
│              Reverse Proxy (Nginx)                │
│         TLS, rate limiting, headers              │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│           Servidor de Aplicação (Node.js)         │
│     Express + tRPC + SSE Streaming + Auth        │
│     System prompt + contexto personalizado       │
└──────┬──────────┬──────────┬────────────────────┘
       │          │          │
┌──────▼───┐ ┌───▼────┐ ┌──▼──────────────┐
│ Banco de │ │Storage │ │ Gateway LLM      │
│ Dados    │ │(S3/    │ │ Cloud + Local    │
│(PostgreSQL)│MinIO) │ │ (Ollama/OpenAI)  │
└──────────┘ └────────┘ └─────────────────┘
```

Cada componente pode ser hospedado em infraestrutura da empresa, em VPS dedicada ou em arquitetura híbrida (cloud + on-premise), conforme o projeto.

---

## 5. Relação com ambiente homolog/on-premise

A Sperry Tecnologia mantém uma arquitetura privada de homologação e deploy dedicado, utilizada para validar cenários Enterprise antes da implantação em produção.

Essa arquitetura permite:

- Testar integrações com autenticação própria (Google OAuth, SAML) em ambiente isolado.
- Validar a migração de banco de dados para PostgreSQL dedicado.
- Avaliar o desempenho de modelos LLM open-source em hardware com GPU (inferência local experimental).
- Simular o ambiente de produção do cliente antes do go-live.

O ambiente de homologação não é exposto publicamente e não é acessível por clientes sem contrato Enterprise ativo.

---

## 6. Segurança e isolamento de dados

O modelo White Label foi projetado com isolamento de dados como princípio fundamental.

| Aspecto | Garantia |
|---|---|
| **Banco de dados** | Instância dedicada, sem compartilhamento com outros clientes. |
| **Storage** | Bucket S3 isolado, com chaves de acesso exclusivas. |
| **Autenticação** | Provedor de autenticação próprio da empresa, sem dependência de terceiros. |
| **Rede** | Comunicação interna via rede Docker isolada; apenas portas 80/443 expostas. |
| **Logs** | Logs de aplicação, acesso e auditoria mantidos no ambiente do cliente. |
| **Backups** | Rotina de backup automatizada com retenção configurável. |
| **Criptografia** | TLS em trânsito; criptografia em repouso conforme configuração do storage. |

Dados de um cliente Enterprise nunca transitam pela infraestrutura compartilhada do debuga.ai público.

---

## 7. Treinamento e transferência de conhecimento

Projetos Enterprise podem incluir, conforme contrato:

- Sessões de treinamento de uso para a equipe do cliente, cobrindo funcionalidades do agente, personalização de contexto e boas práticas de interação.
- Documentação técnica específica para o ambiente do cliente, incluindo guias de operação, troubleshooting e procedimentos de backup/restore.
- Orientação técnica para a equipe de TI do cliente sobre a arquitetura, integrações e manutenção do ambiente dedicado.
- Acompanhamento pós-implantação durante o período de estabilização, com suporte humano sênior conforme o escopo contratado.

O treinamento é oferecido como orientação técnica prática, não como certificação formal. O objetivo é capacitar a equipe do cliente para operar e evoluir o ambiente de forma autônoma.

---

## 8. Modelo de implantação

O processo de implantação Enterprise segue um fluxo consultivo.

**Fase 1 — Diagnóstico e escopo.** Reunião inicial para entender as necessidades da empresa: áreas de atuação do agente, integrações desejadas, volume esperado, requisitos de segurança e infraestrutura disponível.

**Fase 2 — Proposta técnica.** Documento com arquitetura proposta, cronograma estimado, requisitos de infraestrutura e investimento. Sem compromisso até a aprovação formal.

**Fase 3 — Configuração do ambiente.** Provisionamento de infraestrutura (VPS, cloud ou on-premise), configuração de banco, storage, autenticação e deploy da aplicação.

**Fase 4 — Personalização.** Aplicação da identidade visual, configuração do system prompt, base de conhecimento, fluxos de atendimento e integrações específicas.

**Fase 5 — Homologação.** Testes em ambiente dedicado, validação de integrações, ajustes de performance e aprovação pelo cliente.

**Fase 6 — Go-live e acompanhamento.** Publicação em produção, treinamento da equipe e acompanhamento pós-implantação conforme contrato.

---

## 9. Limitações honestas

Para manter a transparência que caracteriza a comunicação do debuga.ai, é importante documentar as limitações atuais do modelo White Label.

- **Inferência local é experimental.** Modelos open-source rodando em GPU local (via Ollama) apresentam desempenho inferior aos modelos comerciais (OpenAI GPT-4o, Anthropic Claude) em tarefas complexas. A inferência local é recomendada para cenários de homologação, testes e cargas de trabalho simples, não como substituto completo de provedores cloud em produção.

- **Integrações são sob projeto.** Conectores para Zabbix, Wazuh, Prometheus, Grafana, NetBox e outras ferramentas estão no roadmap, mas não são plug-and-play. Cada integração requer configuração, testes e validação no ambiente do cliente.

- **O agente não substitui uma equipe de TI.** O debuga.ai é uma ferramenta de apoio que acelera diagnósticos, gera documentação e orienta decisões. Ele não toma decisões autônomas em ambientes de produção sem supervisão humana.

- **SLA depende do contrato.** Não há SLA padrão para o modelo White Label. O nível de serviço é negociado conforme o escopo, volume e investimento do projeto Enterprise.

- **Evolução depende do roadmap.** Funcionalidades futuras (notificações push, offline completo, integrações nativas) seguem o roadmap da plataforma e podem não estar disponíveis no momento da implantação.

---

## 10. Roadmap

O roadmap do debuga.ai White Label prevê as seguintes evoluções, sujeitas a priorização e validação técnica.

| Horizonte | Evolução planejada |
|---|---|
| **Curto prazo** | Conectores para Zabbix e Wazuh; melhorias no gateway LLM híbrido (cloud + local); PWA instalável. |
| **Médio prazo** | Integração nativa com NetBox e CMDB; notificações push; dashboard de métricas do agente; suporte a múltiplos idiomas no system prompt. |
| **Longo prazo** | Inferência local otimizada com modelos especializados; marketplace de bases de conhecimento; API pública para integração com sistemas externos; suporte a múltiplos agentes por instância. |

O roadmap é indicativo e não constitui compromisso de entrega. A priorização é influenciada pelo feedback de clientes Enterprise e pela evolução do ecossistema de modelos de linguagem.

---

## Contato

Para saber mais sobre o debuga.ai White Label / Enterprise, fale com a equipe comercial da Sperry Tecnologia pelo canal oficial disponível na landing page.

O atendimento é consultivo e indicado para empresas que desejam avaliar personalização, implantação dedicada, treinamento, suporte humano sênior ou arquitetura white label conforme escopo.

- **Site:** [sperrytecnologia.com.br](https://www.sperrytecnologia.com.br)
- **Plataforma:** [debuga.ai](https://debuga.ai)
