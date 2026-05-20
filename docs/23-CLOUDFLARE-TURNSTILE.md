# 23. Cloudflare Turnstile (CAPTCHA)

## Visão Geral

O Cloudflare Turnstile é uma alternativa ao reCAPTCHA que não requer interação do usuário na maioria dos casos. Ele protege contra:

- Bots de registro em massa
- Ataques de brute-force no login
- Spam em formulários

O debuga.ai integra Turnstile nos formulários de **registro** e opcionalmente no **login**.

---

## Por que Turnstile?

| Critério | reCAPTCHA v3 | hCaptcha | Turnstile |
|----------|-------------|----------|-----------|
| Gratuito | Sim (com limites) | Sim | Sim (ilimitado) |
| Privacidade | Baixa | Média | Alta |
| UX (invisível) | Sim | Não | Sim |
| Sem cookies tracking | Não | Não | Sim |
| Suporte GDPR/LGPD | Parcial | Sim | Sim |

---

## Configuração

### Passo 1: Criar Widget no Cloudflare

1. Acesse [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/turnstile)
2. Clique em **Add Widget**
3. Configure:
   - **Widget name**: debuga.ai
   - **Domains**: `seudominio.com.br`, `homolog.seudominio.com.br`, `localhost`
   - **Widget Mode**: **Managed** (recomendado) ou Invisible
4. Copie as chaves geradas:
   - **Site Key** (pública, começa com `0x`)
   - **Secret Key** (privada, começa com `0x`)

### Passo 2: Configurar .env

```bash
ENABLE_TURNSTILE=true
TURNSTILE_SITE_KEY=0xAAAAAAAAABBBBBBBBBBBBBB
TURNSTILE_SECRET_KEY=0xCCCCCCCCCDDDDDDDDDDDDDD
TURNSTILE_ON_LOGIN=true
```

### Passo 3: Testar

```bash
./scripts/check-turnstile-config.sh
```

### Passo 4: Rebuild

```bash
docker compose build --no-cache app
docker compose up -d app
```

---

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|-------
---|-------------|-----------|
| `ENABLE_TURNSTILE` | Não | Habilitar Turnstile (default: false) |
| `TURNSTILE_SITE_KEY` | Sim* | Chave pública (frontend) |
| `TURNSTILE_SECRET_KEY` | Sim* | Chave secreta (backend) |
| `TURNSTILE_ON_LOGIN` | Não | Aplicar no login também (default: false) |

\* Obrigatório apenas se `ENABLE_TURNSTILE=true`

---

## Como Funciona

### Frontend (Registro/Login)

1. O widget Turnstile é renderizado no formulário
2. O usuário resolve o challenge (geralmente invisível)
3. Um token é gerado e enviado junto com o formulário

### Backend (Verificação)

1. O servidor recebe o token no campo `turnstileToken`
2. Faz uma requisição POST para `https://challenges.cloudflare.com/turnstile/v0/siteverify`
3. Se `success: true`, permite a operação
4. Se `success: false`, retorna erro 403

```typescript
// Exemplo de verificação (já implementado em localAuth.ts)
const response = await fetch(
  "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${TURNSTILE_SECRET_KEY}&response=${token}&remoteip=${ip}`,
  }
);
const data = await response.json();
if (!data.success) {
  return res.status(403).json({ error: "Verificação CAPTCHA falhou" });
}
```

---

## Modos do Widget

| Modo | Descrição | Quando usar |
|------|-----------|-------------|
| **Managed** | Cloudflare decide se mostra challenge | Recomendado para produção |
| **Non-interactive** | Sempre invisível | Quando UX é prioridade |
| **Invisible** | Totalmente invisível | Máxima UX, menor proteção |

---

## Chaves de Teste (Desenvolvimento)

O Cloudflare fornece chaves de teste que não requerem domínio verificado:

| Tipo | Site Key | Secret Key |
|------|----------|------------|
| Sempre passa | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Sempre falha | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |
| Challenge forçado | `3x00000000000000000000FF` | `3x0000000000000000000000000000000AA` |

Para desenvolvimento local, use as chaves "Sempre passa":

```bash
ENABLE_TURNSTILE=true
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

---

## Troubleshooting

### Widget não aparece no formulário

- Verifique se `ENABLE_TURNSTILE=true` no `.env`
- Verifique se o domínio está na lista do widget no Cloudflare
- Verifique o console do navegador para erros de carregamento

### Erro "invalid-input-secret"

- A `TURNSTILE_SECRET_KEY` está incorreta
- Verifique se copiou a chave completa (começa com `0x`)
- Gere uma nova chave no painel Cloudflare

### Erro "invalid-input-response"

- O token expirou (validade: 300 segundos)
- O usuário não completou o challenge
- O formulário foi enviado sem o widget carregar

### Erro "timeout-or-duplicate"

- O token já foi usado (cada token é single-use)
- O token expirou antes da verificação

### Funciona em dev mas falha em produção

- Adicione o domínio de produção na lista do widget
- Verifique se não há proxy/CDN interferindo nos headers
- Confirme que o IP do servidor consegue acessar `challenges.cloudflare.com`

---

## Integração com Rate Limiting

O Turnstile funciona em conjunto com o rate limiting:

1. **Primeira camada**: Rate limit por IP (15 tentativas/15min)
2. **Segunda camada**: Turnstile valida que é humano
3. **Terceira camada**: Account lockout após 5 falhas

Mesmo com Turnstile desabilitado, o rate limiting continua protegendo os endpoints.

---

## Considerações LGPD

O Turnstile é compatível com LGPD porque:
- Não usa cookies de tracking
- Não coleta dados pessoais além do IP (necessário para segurança)
- Não compartilha dados com terceiros para publicidade
- O processamento é feito na edge do Cloudflare (pode ser EU)

Recomenda-se mencionar o uso do Turnstile na Política de Privacidade.
