# 24. Referência Completa de Variáveis de Ambiente

## Visão Geral

Este documento é a referência canônica de todas as variáveis de ambiente do debuga.ai. Use-o como guia ao configurar o `.env` do seu ambiente.

**Templates disponíveis:**
- `templates/.env.homolog.template` — Homologação
- `templates/.env.production.template` — Produção
- `templates/.env.whitelabel.template` — White Label

**Scripts de validação:**
- `./scripts/validate-env.sh` — Valida todas as variáveis
- `./scripts/check-llm-provider.sh` — Diagnóstico de LLM
- `./scripts/check-email-provider.sh` — Diagnóstico de SMTP
- `./scripts/check-turnstile-config.sh` — Diagnóstico de Turnstile

---

## Índice de Seções

1. [Ambiente e Domínio](#1-ambiente-e-domínio)
2. [App/Frontend](#2-appfrontend)
3. [Banco de Dados](#3-banco-de-dados)
4. [Sessões/JWT](#4-sessõesjwt)
5. [Login Local](#5-login-local)
6. [Google OAuth](#6-google-oauth)
7. [Auth Hardening](#7-auth-hardening)
8. [SMTP/Brevo](#8-smtpbrevo)
9. [Cloudflare Turnstile](#9-cloudflare-turnstile)
10. [Telefone/WhatsApp](#10-telefonewhatsapp)
11. [LLM Providers](#11-llm-providers)
12. [Ollama](#12-ollama)
13. [Storage](#13-storage)
14. [Stripe](#14-stripe)
15. [Analytics](#15-analytics)
16. [White Label](#16-white-label)
17. [Logs/Auditoria](#17-logsauditoria)
18. [Segurança/Rate Limit](#18-segurançarate-limit)
19. [Owner](#19-owner)

---

## 1. Ambiente e Domínio

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `NODE_ENV` | string | production | Sim | Ambiente: production, development, homolog |
| `DOMAIN` | string | — | Sim | Domínio público sem protocolo |
| `APP_URL` | string | — | Sim | URL pública completa com https:// |
| `AUTH_BASE_URL` | string | — | Sim | URL base para callbacks de auth |
| `PORT` | number | 3000 | Não | Porta do servidor |

---

## 2. App/Frontend

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `VITE_APP_TITLE` | string | debuga.ai | Sim | Título no navegador e interface |
| `VITE_APP_ID` | string | — | Sim | ID único (cookies, prefixos) |
| `VITE_APP_LOGO` | string | — | Não | URL do logo |

---

## 3. Banco de Dados

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `DATABASE_URL` | string | — | Recomendado | Connection string completa |
| `POSTGRES_USER` | string | — | Sim* | Usuário PostgreSQL |
| `POSTGRES_PASSWORD` | string | — | Sim* | Senha PostgreSQL |
| `POSTGRES_DB` | string | — | Sim* | Nome do banco |

> \* Se `DATABASE_URL` estiver definido, ele tem prioridade. As variáveis individuais são usadas pelo docker-compose para criar o banco.

**Lógica de resolução:**
1. Se `DATABASE_URL` existe → usa diretamente
2. Senão → constrói a partir de `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`

---

## 4. Sessões/JWT

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `JWT_SECRET` | string | — | Sim | Chave para assinar JWT (mín. 32 chars) |
| `SESSION_SECRET` | string | — | Sim | Chave para sessões Express (mín. 32 chars) |
| `JWT_EXPIRES_IN` | string | 7d | Não | Tempo de expiração do token |

**Gerar secrets:**
```bash
openssl rand -base64 48
```

---

## 5. Login Local

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `ENABLE_LOCAL_LOGIN` | boolean | true | Não | Habilitar login e-mail/senha |
| `ADMIN_EMAIL` | string | — | Sim | E-mail promovido a admin no primeiro login |

---

## 6. Google OAuth

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `ENABLE_GOOGLE_OAUTH` | boolean | false | Não | Habilitar login com Google |
| `GOOGLE_CLIENT_ID` | string | — | Se OAuth=true | Client ID do Google Cloud |
| `GOOGLE_CLIENT_SECRET` | string | — | Se OAuth=true | Client Secret |
| `VITE_OAUTH_PORTAL_URL` | string | /api/auth/google | Não | URL do portal OAuth |

---

## 7. Auth Hardening

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `EMAIL_VERIFICATION_ENABLED` | boolean | false | Não | Enviar e-mail de verificação |
| `EMAIL_VERIFICATION_REQUIRED` | boolean | false | Não | Exigir verificação para acessar |
| `REQUIRE_EMAIL_FOR_CHAT` | boolean | false | Não | Bloquear chat sem e-mail verificado |
| `REQUIRE_TERMS_ACCEPTANCE` | boolean | false | Não | Exigir aceite de termos |
| `BLOCK_DISPOSABLE_EMAILS` | boolean | true | Não | Bloquear e-mails descartáveis |

---

## 8. SMTP/Brevo

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `SMTP_PROVIDER` | string | smtp | Não | Provider (brevo, smtp, sendgrid, ses) |
| `SMTP_HOST` | string | — | Se email=true | Servidor SMTP |
| `SMTP_PORT` | number | 587 | Não | Porta SMTP |
| `SMTP_SECURE` | boolean | false | Não | SSL direto (true=465, false=587+STARTTLS) |
| `SMTP_USER` | string | — | Se email=true | Login SMTP |
| `SMTP_PASSWORD` | string | — | Se email=true | Senha/Key SMTP |
| `SMTP_FROM` | string | — | Se email=true | E-mail remetente |
| `SMTP_FROM_NAME` | string | VITE_APP_TITLE | Não | Nome do remetente |
| `SMTP_REPLY_TO` | string | — | Não | E-mail reply-to |

> Docs completos: [22-SMTP-BREVO.md](./22-SMTP-BREVO.md)

---

## 9. Cloudflare Turnstile

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `ENABLE_TURNSTILE` | boolean | false | Não | Habilitar CAPTCHA |
| `TURNSTILE_SITE_KEY` | string | — | Se turnstile=true | Chave pública |
| `TURNSTILE_SECRET_KEY` | string | — | Se turnstile=true | Chave secreta |
| `TURNSTILE_ON_LOGIN` | boolean | false | Não | Aplicar no login |
| `VITE_TURNSTILE_SITE_KEY` | string | — | Se turnstile=true | Chave pública (frontend) |

> Docs completos: [23-CLOUDFLARE-TURNSTILE.md](./23-CLOUDFLARE-TURNSTILE.md)

---

## 10. Telefone/WhatsApp

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `PHONE_VERIFICATION_ENABLED` | boolean | false | Não | Habilitar verificação por telefone |
| `PHONE_VERIFICATION_REQUIRED` | boolean | false | Não | Exigir telefone verificado |
| `REQUIRE_PHONE_FOR_CHAT` | boolean | false | Não | Bloquear chat sem telefone |
| `PHONE_PROVIDER` | string | none | Não | Provider (none, twilio, whatsapp, console) |
| `PHONE_OTP_TTL_MINUTES` | number | 10 | Não | Validade do OTP em minutos |
| `TWILIO_ACCOUNT_SID` | string | — | Se twilio | Account SID |
| `TWILIO_AUTH_TOKEN` | string | — | Se twilio | Auth Token |
| `TWILIO_FROM_NUMBER` | string | — | Se twilio | Número remetente |

---

## 11. LLM Providers

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `LLM_PROVIDER` | string | — | Sim | Provider principal |
| `LLM_FALLBACK_PROVIDER` | string | — | Não | Provider de fallback |

**Providers disponíveis:** `gemini`, `openai`, `cloud`, `anthropic`, `openrouter`, `forge`, `ollama`

### Cloud (compatível OpenAI API)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `LLM_CLOUD_API_URL` | — | URL da API |
| `LLM_CLOUD_API_KEY` | — | API Key |
| `LLM_CLOUD_MODEL` | — | Modelo |

### Gemini

| Variável | Default | Descrição |
|----------|---------|-----------|
| `GEMINI_API_URL` | https://generativelanguage.googleapis.com/v1beta/openai | URL |
| `GEMINI_API_KEY` | — | API Key |
| `GEMINI_MODEL` | gemini-2.5-flash | Modelo |

### OpenAI

| Variável | Default | Descrição |
|----------|---------|-----------|
| `OPENAI_API_URL` | https://api.openai.com/v1 | URL |
| `OPENAI_API_KEY` | — | API Key |
| `OPENAI_MODEL` | gpt-4o-mini | Modelo |

### Anthropic / Claude

| Variável | Default | Descrição |
|----------|---------|-----------|
| `ANTHROPIC_API_URL` | https://api.anthropic.com | URL base (sem /v1) |
| `ANTHROPIC_API_KEY` | — | API Key (começa com `sk-ant-`) |
| `ANTHROPIC_MODEL` | claude-sonnet-4-20250514 | Modelo |

> **Nota:** A API nativa Anthropic usa formato próprio (header `x-api-key`, `anthropic-version`). Se `ANTHROPIC_API_URL` apontar para `api.anthropic.com`, o sistema usa o formato nativo. Se apontar para um proxy OpenAI-compatible (ex: LiteLLM), usa formato OpenAI.

### OpenRouter

| Variável | Default | Descrição |
|----------|---------|-----------|
| `OPENROUTER_API_URL` | https://openrouter.ai/api/v1 | URL |
| `OPENROUTER_API_KEY` | — | API Key (começa com `sk-or-`) |
| `OPENROUTER_MODEL` | openai/gpt-4o-mini | Modelo (formato: `provider/model`) |

> **Nota:** O script `check-llm-provider.sh` envia os headers recomendados pelo OpenRouter: `HTTP-Referer` e `X-Title`.

### Forge (legado)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `BUILT_IN_FORGE_API_URL` | — | URL do Forge |
| `BUILT_IN_FORGE_API_KEY` | — | API Key |

> Docs completos: Use `./scripts/check-llm-provider.sh` para diagnóstico.

---

## 12. Ollama / GPU Local

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `ENABLE_LOCAL_INFERENCE` | boolean | false | Não | Habilitar Ollama |
| `LOCAL_LLM_BASE_URL` | string | http://ollama:11434 | Se ollama=true | URL do Ollama |
| `LOCAL_LLM_MODEL` | string | qwen2.5:7b-instruct | Não | Modelo padrão |
| `LOCAL_LLM_PRIORITY` | string | last | Não | Prioridade: `first`, `last`, `only` |
| `LOCAL_LLM_TIMEOUT_SECONDS` | number | 120 | Não | Timeout em segundos para inferência local |
| `LOCAL_LLM_FALLBACK_ENABLED` | boolean | true | Não | Se true, fallback para cloud quando GPU falha |
| `LOCAL_LLM_REQUIRE_GPU` | boolean | false | Não | Se true, recusa iniciar sem GPU detectada |

---

## 13. Storage

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `MINIO_ROOT_USER` | string | — | Sim | Usuário MinIO (docker-compose) |
| `MINIO_ROOT_PASSWORD` | string | — | Sim | Senha MinIO (docker-compose) |
| `S3_ACCESS_KEY` | string | — | Sim | Access Key S3 |
| `S3_SECRET_KEY` | string | — | Sim | Secret Key S3 |
| `S3_BUCKET` | string | — | Sim | Nome do bucket |
| `S3_ENDPOINT` | string | http://minio:9000 | Sim | Endpoint S3/MinIO |
| `S3_REGION` | string | us-east-1 | Não | Região |
| `S3_FORCE_PATH_STYLE` | boolean | true | Não | Path style (true para MinIO) |

---

## 14. Stripe

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `STRIPE_SECRET_KEY` | string | — | Não | Chave secreta (sk_test_ ou sk_live_) |
| `STRIPE_WEBHOOK_SECRET` | string | — | Não | Webhook signing secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | string | — | Não | Chave pública (pk_test_ ou pk_live_) |
| `STRIPE_PRICE_STARTER_MONTHLY` | string | — | Não | Price ID do plano Starter |
| `STRIPE_PRICE_PRO_MONTHLY` | string | — | Não | Price ID do plano Pro |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | string | — | Não | Price ID do plano Enterprise |

---

## 15. Analytics

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `VITE_ANALYTICS_ENDPOINT` | string | — | Não | URL do analytics (Umami, Plausible) |
| `VITE_ANALYTICS_WEBSITE_ID` | string | — | Não | ID do website |

---

## 16. White Label

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `WHITE_LABEL_ENABLED` | boolean | false | Não | Habilitar personalização |
| `VITE_SUPPORT_EMAIL` | string | — | Não | E-mail de suporte |
| `VITE_SUPPORT_WHATSAPP` | string | — | Não | WhatsApp (com código país) |
| `PRIVACY_POLICY_URL` | string | — | Não | URL da política de privacidade |
| `TERMS_OF_USE_URL` | string | — | Não | URL dos termos de uso |
| `LEGAL_COMPANY_NAME` | string | — | Não | Razão social |

---

## 17. Logs/Auditoria

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `LOG_LEVEL` | string | info | Não | Nível: debug, info, warn, error |
| `AUDIT_LOG_ENABLED` | boolean | true | Não | Registrar eventos de auditoria |

---

## 18. Segurança/Rate Limit

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `RATE_LIMIT_ENABLED` | boolean | true | Não | Habilitar rate limiting |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | number | 15 | Não | Janela de auth (minutos) |
| `AUTH_RATE_LIMIT_MAX` | number | 10 | Não | Máx. tentativas por janela |
| `CHAT_RATE_LIMIT_WINDOW_MINUTES` | number | 1 | Não | Janela de chat (minutos) |
| `CHAT_RATE_LIMIT_MAX` | number | 20 | Não | Máx. mensagens por janela |

---

## 19. Owner

| Variável | Tipo | Default | Obrigatório | Descrição |
|----------|------|---------|-------------|-----------|
| `OWNER_OPEN_ID` | string | — | Não | OpenID do proprietário |
| `OWNER_NAME` | string | — | Não | Nome do proprietário |

---

## Hierarquia de Prioridade (DATABASE_URL)

```
DATABASE_URL (se definido)
  └── postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB
```

## Hierarquia de Prioridade (LLM)

```
LLM_PROVIDER (explícito)
  ├── gemini  → GEMINI_API_KEY + GEMINI_API_URL
  ├── openai  → OPENAI_API_KEY + OPENAI_API_URL
  ├── cloud   → LLM_CLOUD_API_KEY + LLM_CLOUD_API_URL
  ├── anthropic → ANTHROPIC_API_KEY + ANTHROPIC_API_URL
  ├── openrouter → OPENROUTER_API_KEY + OPENROUTER_API_URL
  ├── forge   → BUILT_IN_FORGE_API_KEY + BUILT_IN_FORGE_API_URL
  └── ollama  → LOCAL_LLM_BASE_URL + LOCAL_LLM_MODEL

Se LLM_PROVIDER não definido, auto-detecta:
  1. GEMINI_API_KEY → usa Gemini
  2. OPENAI_API_KEY → usa OpenAI
  3. LLM_CLOUD_API_KEY → usa Cloud
  4. BUILT_IN_FORGE_API_KEY → usa Forge
  5. ENABLE_LOCAL_INFERENCE=true → usa Ollama
  6. Nenhum → ERRO (chat não funciona)
```
