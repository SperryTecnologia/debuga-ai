# Casos de Uso — debuga.ai

**Cenários Reais de Aplicação**
Versão: 1.0 | Junho 2026 | Sperry Tecnologia

---

## Visão Geral

A debuga.ai atende profissionais e equipes que lidam com infraestrutura de TI, segurança e operações. Os cenários abaixo demonstram como o agente pode ser aplicado em diferentes contextos, desde diagnósticos de rede até suporte especializado para o setor público.

---

## 1. Infraestrutura Linux

### Contexto

Equipes que administram servidores Linux enfrentam diariamente desafios de diagnóstico, configuração e automação. O agente auxilia na análise de logs, troubleshooting de serviços e geração de scripts.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Servidor com alta carga de CPU | Analisa output de `top`, `htop`, logs do sistema e sugere ações corretivas |
| Falha em serviço systemd | Interpreta logs do journalctl, identifica dependências e propõe correção |
| Configuração de firewall | Gera regras iptables/nftables baseadas nos requisitos do operador |
| Análise de logs auth.log | Identifica tentativas de brute force, IPs suspeitos e recomenda bloqueios |
| Automação de backup | Gera scripts de backup com rotação, compressão e notificação |
| Tuning de performance | Analisa parâmetros de kernel e sugere otimizações para o workload |

### Perguntas Típicas

> "Analise este auth.log e identifique tentativas de acesso não autorizado."

> "Gere um script de backup incremental para /var/www com retenção de 30 dias."

> "O serviço nginx não inicia. Aqui está o output do journalctl. O que pode ser?"

---

## 2. Apache e Web Servers

### Contexto

Administradores de servidores web lidam com configurações complexas de VirtualHosts, SSL, rewrite rules e performance. O agente interpreta logs de erro, analisa configurações e gera soluções.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Erro 500 intermitente | Analisa access.log e error.log, correlaciona timestamps e identifica causa |
| Configuração de VirtualHost | Gera configuração completa baseada nos requisitos (domínio, SSL, proxy) |
| Otimização de performance | Analisa configuração atual e sugere ajustes (worker MPM, keep-alive, cache) |
| Migração HTTP → HTTPS | Gera configuração SSL com Let's Encrypt, redirects e HSTS |
| Análise de tráfego | Interpreta logs de acesso, identifica padrões e possíveis ataques |
| Rewrite rules complexas | Gera e explica regras mod_rewrite para cenários específicos |

### Perguntas Típicas

> "Analise este error.log do Apache e identifique a causa dos erros 500."

> "Gere a configuração de VirtualHost para meusite.com.br com SSL e proxy reverso para porta 3000."

> "Como otimizar o Apache para suportar 10.000 conexões simultâneas?"

---

## 3. Windows Server e Active Directory

### Contexto

Ambientes Windows corporativos envolvem Active Directory, Group Policies, Exchange e serviços de rede. O agente auxilia na análise de Event Viewer, troubleshooting de GPOs e automação com PowerShell.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Falha de replicação AD | Analisa logs de replicação, identifica DC problemático e sugere correção |
| GPO não aplicada | Verifica precedência, herança, filtros WMI e links de GPO |
| Análise de Event Viewer | Interpreta eventos de segurança, identifica padrões de falha |
| Automação PowerShell | Gera scripts para gestão de usuários, grupos e permissões |
| Troubleshooting DNS interno | Analisa resolução de nomes, zonas e encaminhamento |
| Auditoria de permissões | Mapeia permissões NTFS/Share e identifica excessos |

### Perguntas Típicas

> "A GPO de bloqueio de USB não está sendo aplicada em algumas máquinas. Como diagnosticar?"

> "Gere um script PowerShell para listar todos os usuários com senha expirada no AD."

> "Analise estes eventos do Event Viewer e identifique por que o servidor reiniciou."

---

## 4. Segurança (SOC/NOC)

### Contexto

Equipes de segurança precisam analisar alertas, investigar incidentes e implementar hardening. O agente auxilia na triagem de alertas, análise de vulnerabilidades e geração de relatórios.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Triagem de alertas Wazuh | Analisa alertas, classifica por severidade e sugere ações |
| Análise de vulnerabilidade | Interpreta output de scanners (Nessus, OpenVAS) e prioriza correções |
| Investigação de incidente | Correlaciona logs de múltiplas fontes e reconstrói timeline |
| Hardening de servidor | Gera checklist baseado em CIS Benchmarks para o SO específico |
| Análise de tráfego suspeito | Interpreta capturas de rede e identifica padrões maliciosos |
| Relatório de segurança | Gera relatório estruturado com findings, riscos e recomendações |

### Perguntas Típicas

> "Analise este alerta do Wazuh e determine se é um falso positivo ou incidente real."

> "Gere um checklist de hardening para Ubuntu 22.04 baseado no CIS Benchmark."

> "Temos 50 alertas de brute force SSH. Qual a melhor estratégia de mitigação?"

---

## 5. Setor Público

### Contexto

Órgãos públicos possuem requisitos específicos de conformidade, segurança de dados e operação. O agente pode ser implantado em infraestrutura isolada, garantindo que dados sensíveis não saiam do ambiente controlado.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Conformidade LGPD | Auxilia na identificação de dados pessoais em sistemas e logs |
| Infraestrutura isolada | Opera com inferência local (GPU), sem envio de dados para cloud |
| Documentação técnica | Gera documentação de infraestrutura conforme padrões do órgão |
| Suporte a equipes reduzidas | Multiplica a capacidade de equipes de TI com poucos profissionais |
| Auditoria de acessos | Analisa logs de acesso e identifica anomalias |
| Migração de sistemas | Auxilia no planejamento e execução de migrações |

### Diferencial para Setor Público

| Aspecto | Garantia |
|---------|---------|
| Dados | Isolamento total — inferência local disponível |
| Conformidade | Operação sem dependência de cloud externa |
| Auditoria | Log imutável de todas as interações |
| Marca | White label com identidade do órgão |

---

## 6. Cartórios

### Contexto

Cartórios operam com sistemas legados, certificação digital e requisitos rigorosos de disponibilidade. O agente auxilia equipes de TI que atendem múltiplos cartórios com suporte especializado.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Certificado digital expirado | Diagnostica problemas de cadeia de certificados e orienta renovação |
| Integração com sistemas judiciais | Auxilia na configuração de conectividade com tribunais |
| Backup de livros digitais | Gera procedimentos de backup com verificação de integridade |
| Troubleshooting de rede | Diagnostica problemas de conectividade com servidores centrais |
| Atualização de sistemas | Planeja janelas de manutenção com mínimo impacto |
| Documentação de procedimentos | Gera SOPs (Standard Operating Procedures) para a equipe |

---

## 7. Monitoramento (Zabbix, Grafana, Prometheus)

### Contexto

Equipes de monitoramento lidam com grandes volumes de alertas e métricas. O agente auxilia na interpretação de dados, correlação de eventos e geração de dashboards.

### Exemplos de Uso

| Cenário | Como o Agente Ajuda |
|---------|-------------------|
| Análise de alertas Zabbix | Interpreta triggers, identifica causa raiz e sugere thresholds |
| Interpretação de métricas | Analisa séries temporais e identifica anomalias |
| Geração de queries | Cria queries PromQL/InfluxQL para métricas específicas |
| Planejamento de capacidade | Analisa tendências e projeta necessidade de recursos |
| Correlação de eventos | Cruza alertas de múltiplas fontes para identificar causa raiz |
| Documentação de runbooks | Gera procedimentos de resposta para alertas recorrentes |

### Perguntas Típicas

> "O Zabbix está gerando alertas de disco em 5 servidores. Analise e priorize."

> "Gere uma query PromQL para monitorar latência P99 do serviço de API."

> "Crie um runbook para o alerta 'CPU acima de 90% por mais de 5 minutos'."

---

## Modelo de Implantação por Cenário

| Cenário | Modelo Recomendado | Inferência | Dados |
|---------|-------------------|-----------|-------|
| MSP atendendo múltiplos clientes | Cloud (multi-tenant) | Cloud providers | Isolado por tenant |
| SOC/NOC corporativo | Híbrido | Local + cloud fallback | On-premise |
| Setor público | On-premise | Local (GPU) | Totalmente isolado |
| Cartórios (consultoria) | Cloud dedicado | Cloud providers | Isolado por cartório |
| ISP/Telecom | Híbrido | Local + cloud | On-premise |

---

## Exemplos Reais Documentados

Os cenários abaixo foram extraídos de sessões reais da plataforma em produção, conforme evidenciado nas capturas de tela do sistema.

### Análise de Logs Apache

Na seção de Fontes Técnicas, a fonte "httpd" (tipo Apache, apachev2) foi criada com upload de `apache-error.log`. O sistema processou automaticamente o arquivo, identificando 8 erros detectados, 7 IPs distintos, 3 serviços envolvidos. Tags semânticas geradas: `technical_source`, `apache`, `httpd`, `mysql`, `has_errors`, `multi_host`. Conversas como "Erros Apache logados?" e "Problemas no log Apache" demonstram consultas reais sobre esse conteúdo.

### Análise de Logs Linux

A fonte "Linux Auth" (tipo Linux, auth.log) foi processada com 23 linhas, 6 erros detectados, 2 IPs e 9 serviços. Tags geradas: `technical_source`, `linux`, `sshd`, `httpd`, `systemd`, `apache`, `apache2`. A Base de Conhecimento exibe o resumo estruturado com detecção de tentativas de brute force ("Failed password for invalid user admin from 177.85.120.45").

### Investigação de Incidentes

O log de Auditoria registra 84 eventos administrativos com rastreabilidade completa: ações de `login_local`, `register_local`, `email_verified`, `admin_user_deleted`, `update_settings`. Cada evento inclui timestamp, entidade afetada, admin responsável e IP de origem — permitindo reconstrução de timeline de incidentes.

### Geração de Diagramas

Conversas como "Diagrama de Rede" e "Diagrama" demonstram o uso real da capacidade de geração de diagramas (network_diagram, architecture_diagram, flowchart_diagram). O orquestrador roteia automaticamente para o provider Gemini com gemini-2.5-flash, gerando diagramas Mermaid renderizados inline.

### Base de Conhecimento Corporativa

A Base de Conhecimento em produção contém 2 itens indexados com RAG ativo, demonstrando o ciclo completo: upload de fonte técnica → processamento → geração de resumo → indexação com tags → disponibilização para consulta contextual durante o chat.

### Observabilidade Operacional

Os Logs IA registram 239 chamadas com detalhamento completo: provider `local_gpu` com modelo `qwen2.5:7b-instruct` para chat_text (latência 1.1s–27.2s), provider `openai_image` com `gpt-image-1` para image_generation (latência 19.6s, custo $0.04), provider `gemini` com `gemini-2.5-flash` para network_diagram (latência 13.2s–15.4s). O painel de Configuração do Agente mostra métricas consolidadas: 8 chamadas nos últimos 7 dias, 0 erros, 0 fallbacks, tempo médio de 6835ms.

---

*Sperry Tecnologia — Junho 2026*
