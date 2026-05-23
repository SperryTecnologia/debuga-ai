# Segurança — debuga.ai

**Políticas de segurança, conformidade e governança da plataforma debuga.ai.**

---

## Princípios

- Dados sob controle total do operador
- Inferência local quando possível (dados não saem do ambiente)
- Secrets nunca em código-fonte
- Logs de auditoria imutáveis
- Isolamento entre tenants
- Mínimo privilégio em todos os componentes

---

## Arquitetura de Segurança

```mermaid
flowchart TB
    subgraph Perímetro["Perímetro Externo"]
        CF[Cloudflare WAF<br/>DDoS Protection]
        DNS[DNS com DNSSEC]
        TLS[TLS 1.3 + HSTS Preload]
    end

    subgraph Aplicação["Camada de Aplicação"]
        RL[Rate Limiting<br/>Por IP + Por Usuário]
        CAPTCHA[Turnstile CAPTCHA<br/>Proteção contra bots]
        CSP[Content Security Policy<br/>Restritiva]
        AUTH[Autenticação<br/>JWT httpOnly + sameSite:lax]
    end

    subgraph Dados["Camada de Dados"]
        DB[(Banco de Dados<br/>Conexão SSL)]
        S3[Storage S3<br/>Criptografia em repouso]
        AUDIT[Auditoria Imutável<br/>Todas as interações]
    end

    subgraph Inferência["Camada de Inferência"]
        LOCAL[GPU Local<br/>Dados não saem]
        ZDR[Cloud Providers<br/>Zero Data Retention]
    end

    CF --> RL
    DNS --> TLS
    TLS --> RL
    RL --> CAPTCHA
    CAPTCHA --> CSP
    CSP --> AUTH
    AUTH --> DB
    AUTH --> S3
    AUTH --> AUDIT
    AUTH --> LOCAL
    AUTH --> ZDR
```

---

## Autenticação

```mermaid
sequenceDiagram
    participant U as Usuário
    participant CF as Cloudflare
    participant APP as Aplicação
    participant DB as Banco de Dados

    U->>CF: Request + Turnstile Token
    CF->>CF: WAF + Rate Check
    CF->>APP: Request validada
    APP->>APP: Verifica JWT (httpOnly cookie)
    APP->>DB: Valida sessão
    DB-->>APP: Sessão válida + Role
    APP-->>U: Resposta autorizada
```

| Mecanismo | Descrição |
|-----------|-----------|
| OAuth 2.0 | Autenticação segura com sessão persistente |
| JWT | Tokens httpOnly com sameSite:lax e expiração |
| Rate limiting | Por IP e por usuário (proteção contra brute force) |
| CAPTCHA | Cloudflare Turnstile em ações sensíveis |
| Bloqueio | Após tentativas falhas consecutivas |

---

## Autorização

| Papel | Permissões |
|-------|-----------|
| Admin | Gestão completa (usuários, planos, Knowledge Base, configurações) |
| User | Acesso ao chat e funcionalidades do plano contratado |

---

## Proteção de Dados

| Aspecto | Implementação |
|---------|--------------|
| Transporte | TLS 1.3 com HSTS preload |
| Armazenamento | Banco de dados com conexão SSL obrigatória |
| Secrets | Variáveis de ambiente, nunca em código-fonte |
| Backups | Criptografados, sob controle do operador |
| Logs | Secrets mascarados automaticamente |
| Inferência cloud | Zero-data-retention em todos os providers |

---

## Isolamento

```mermaid
flowchart LR
    subgraph Operador_A["Operador A"]
        A_APP[Aplicação]
        A_DB[(Banco)]
        A_GPU[GPU]
    end

    subgraph Operador_B["Operador B"]
        B_APP[Aplicação]
        B_DB[(Banco)]
        B_GPU[GPU]
    end

    A_APP -.->|Isolamento Total| B_APP
```

- Cada implantação opera em infraestrutura dedicada
- Sem compartilhamento de dados entre operadores
- Containers com rede isolada
- Acesso ao banco apenas via aplicação

---

## Auditoria

Todas as ações são registradas com:

| Campo | Descrição |
|-------|-----------|
| Timestamp | UTC com precisão de milissegundos |
| Usuário | ID e papel do usuário |
| Ação | Tipo de operação realizada |
| IP de origem | Endereço do cliente |
| Provider | Modelo e provider utilizado |
| Tokens | Consumo de tokens (input/output) |
| Custo | Custo estimado da operação |
| Resultado | Sucesso ou falha com detalhes |

Logs são imutáveis e exportáveis para SIEM.

---

## Reporte de Vulnerabilidades

Para reportar vulnerabilidades de segurança, utilize os canais indicados no arquivo [SECURITY.md](../SECURITY.md) na raiz do repositório. Não divulgar publicamente antes da correção. Resposta em até 48 horas úteis.

---

## Código de Produção

O código de produção é mantido em repositório privado. Repositórios públicos contêm apenas documentação e componentes de pesquisa.

---

*Sperry Tecnologia*
