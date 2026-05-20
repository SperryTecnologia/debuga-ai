# 21 — Autenticação Local (E-mail/Senha)

## Visão Geral

O debuga.ai suporta autenticação local por e-mail e senha como alternativa ao OAuth (Google). Isso permite que a plataforma funcione de forma completamente independente, sem depender de provedores externos de identidade.

---

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/local/register` | Criar nova conta |
| POST | `/api/auth/local/login` | Autenticar com e-mail/senha |
| POST | `/api/auth/local/logout` | Encerrar sessão (limpar cookie) |
| GET | `/api/auth/local/me` | Retornar usuário logado |
| GET | `/api/auth/config` | Retornar configuração de auth (métodos habilitados) |

---

## Registro (`POST /api/auth/local/register`)

**Body:**
```json
{
  "name": "Nome do Usuário",
  "email": "usuario@exemplo.com",
  "password": "Senha@Segura123",
  "phone": "+5511999999999",
  "acceptedTerms": true,
  "turnstileToken": "0x..."
}
```

**Validações:**
- Nome: obrigatório, mínimo 2 caracteres
- E-mail: obrigatório, formato válido, único no sistema, domínio não-descartável
- Senha: obrigatória, mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 especial
- Phone: opcional, formato internacional
- acceptedTerms: obrigatório se `REQUIRE_TERMS_ACCEPTANCE=true`
- turnstileToken: obrigatório se `ENABLE_TURNSTILE=true`

**Resposta (200):**
```json
{
  "success": true,
  "user": { "id": 1, "name": "Nome", "email": "usuario@exemplo.com", "role": "user" }
}
```

A resposta inclui um cookie `session` (httpOnly, secure) com o JWT.

---

## Login (`POST /api/auth/local/login`)

**Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senhaSegura123"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "user": { "id": 1, "name": "Nome", "email": "usuario@exemplo.com", "role": "admin" }
}
```

**Erros:**
- `401` — Credenciais inválidas
- `403` — Conta desativada
- `423` — Conta bloqueada (lockout após 5 falhas)
- `429` — Rate limit excedido

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| **Hash de senha** | bcrypt com salt rounds = 12 |
| **Armazenamento** | Apenas o hash é armazenado (coluna `password_hash`) |
| **Token de sessão** | JWT assinado com `JWT_SECRET`, expira conforme `JWT_EXPIRES_IN` |
| **Cookie** | httpOnly, secure (em produção), sameSite=lax, path=/ |
| **Conta desativada** | Verificação de `is_active` antes de permitir login |
| **Account lockout** | Bloqueio após 5 falhas consecutivas (30 min) |
| **Rate limiting** | 10 tentativas/15min por IP |
| **E-mails descartáveis** | Bloqueio de 100+ domínios temporários |
| **Turnstile CAPTCHA** | Verificação anti-bot (opt-in) |
| **Verificação de e-mail** | Token por SMTP (opt-in) |
| **Auditoria** | Todos os eventos registrados em `audit_logs` |

---

## Auto-Promoção a Admin

Quando a variável `ADMIN_EMAIL` está definida no `.env`, o primeiro login (seja por registro ou OAuth) com esse e-mail automaticamente promove o usuário para `role = admin`.

```env
ADMIN_EMAIL=admin@suaempresa.com
```

Isso elimina a necessidade de acessar o banco de dados para configurar o primeiro administrador.

---

## Coexistência com OAuth

A autenticação local coexiste com o OAuth (Google). Um mesmo e-mail pode ter ambos os métodos vinculados:

- Se o usuário se registrou localmente e depois faz login via Google com o mesmo e-mail, o sistema reconhece como o mesmo usuário
- O campo `auth_provider` indica o método usado no último login (`local` ou `google`)
- O campo `open_id` é preenchido apenas para logins OAuth

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `ENABLE_LOCAL_LOGIN` | Habilitar/desabilitar login local | `true` |
| `JWT_SECRET` | Chave para assinar tokens JWT | (obrigatório) |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `7d` |
| `ADMIN_EMAIL` | E-mail auto-promovido a admin | (vazio) |
| `EMAIL_VERIFICATION_ENABLED` | Enviar verificação por e-mail | `false` |
| `REQUIRE_EMAIL_FOR_CHAT` | Bloquear chat sem verificação | `false` |
| `ENABLE_TURNSTILE` | Habilitar CAPTCHA Turnstile | `false` |
| `TURNSTILE_SITE_KEY` | Chave pública Turnstile | (vazio) |
| `TURNSTILE_SECRET_KEY` | Chave secreta Turnstile | (vazio) |
| `BLOCK_DISPOSABLE_EMAILS` | Bloquear e-mails temporários | `true` |
| `REQUIRE_TERMS_ACCEPTANCE` | Exigir aceite de termos | `false` |

Para referência completa: `docs/24-ENV-REFERENCE.md`

---

## Desabilitar Login Local

Para usar apenas OAuth (Google), defina no `.env`:

```env
ENABLE_LOCAL_LOGIN=false
```

Isso desabilita os endpoints `/api/auth/local/register` e `/api/auth/local/login`, e a página `/login` exibirá apenas o botão de login social.

---

## Frontend

A página de login está disponível em `/login` e oferece:

1. **Formulário de login** — E-mail e senha
2. **Formulário de registro** — Nome, e-mail e senha
3. **Alternância** — Link para alternar entre login e registro

Após autenticação bem-sucedida, o usuário é redirecionado para `/chat`.

---

## Novos Endpoints (Auth Hardening)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/local/change-password` | Alterar senha (autenticado) |
| POST | `/api/auth/verify-email` | Verificar token de e-mail |
| POST | `/api/auth/resend-verification` | Reenviar e-mail de verificação |
| POST | `/api/auth/verify-phone` | Verificar OTP de telefone |
| POST | `/api/auth/send-phone-otp` | Enviar OTP por SMS/WhatsApp |

---

## Documentos Relacionados

- [14 — Self-Hosted](./14-SELF-HOSTED.md) — Deploy completo
- [19 — Segurança](./19-SEGURANCA.md) — Hardening
- [20 — Painel Admin](./20-PAINEL-ADMIN.md) — Gestão de usuários
- [22 — SMTP/Brevo](./22-SMTP-BREVO.md) — Configuração de e-mail
- [23 — Cloudflare Turnstile](./23-CLOUDFLARE-TURNSTILE.md) — CAPTCHA
- [24 — Referência ENV](./24-ENV-REFERENCE.md) — Todas as variáveis
