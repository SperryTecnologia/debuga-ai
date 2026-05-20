# 22. Configuração SMTP / Brevo

## Visão Geral

O debuga.ai usa e-mail transacional para:
- Verificação de e-mail no registro
- Reset de senha (futuro)
- Notificações administrativas

O provider recomendado é o **Brevo** (antigo Sendinblue) por oferecer plano gratuito com 300 e-mails/dia e excelente deliverability para domínios `.com.br`.

---

## Providers Suportados

| Provider | SMTP_HOST | Porta | Plano Gratuito |
|----------|-----------|-------|----------------|
| **Brevo** | smtp-relay.brevo.com | 587 | 300/dia |
| Gmail | smtp.gmail.com | 587 | Limitado |
| SendGrid | smtp.sendgrid.net | 587 | 100/dia |
| Amazon SES | email-smtp.us-east-1.amazonaws.com | 587 | Pago |
| Mailgun | smtp.mailgun.org | 587 | 100/dia (trial) |

---

## Configuração Brevo (Recomendado)

### Passo 1: Criar Conta

1. Acesse [app.brevo.com](https://app.brevo.com)
2. Crie uma conta gratuita
3. Confirme seu e-mail

### Passo 2: Verificar Domínio

1. Vá em **Settings → Senders, Domains & Dedicated IPs**
2. Clique em **Domains → Add a domain**
3. Insira seu domínio (ex: `debuga.ai`)
4. Adicione os registros DNS indicados:
   - **DKIM**: registro TXT
   - **SPF**: registro TXT (ou inclua `include:sendinblue.com`)
   - **DMARC**: registro TXT (recomendado)
5. Clique em **Verify** após adicionar os registros

### Passo 3: Obter SMTP Key

1. Vá em **Settings → SMTP & API**
2. Clique em **Generate a new SMTP key**
3. Copie a chave gerada (formato: `xsmtpsib-XXXX...`)

> **IMPORTANTE**: A SMTP Key é diferente da API Key. Use a SMTP Key no campo `SMTP_PASSWORD`.

### Passo 4: Configurar .env

```bash
SMTP_PROVIDER=brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@brevo.com
SMTP_PASSWORD=xsmtpsib-XXXXXXXXXXXXXXXXXXXXXXXX
SMTP_FROM=noreply@seudominio.com.br
SMTP_FROM_NAME=debuga.ai
SMTP_REPLY_TO=suporte@seudominio.com.br
```

### Passo 5: Testar

```bash
./scripts/check-email-provider.sh admin@seudominio.com.br
```

---

## Configuração Gmail (Desenvolvimento)

Para desenvolvimento local, você pode usar Gmail com App Password:

1. Ative 2FA na conta Google
2. Vá em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Gere uma App Password para "Mail"

```bash
SMTP_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SMTP_FROM=seu-email@gmail.com
SMTP_FROM_NAME=debuga.ai Dev
```

> **ATENÇÃO**: Gmail tem limite de 500 e-mails/dia e pode bloquear envios em massa. Use apenas para desenvolvimento.

---

## Modo Desenvolvimento (Console)

Se nenhum SMTP estiver configurado e `EMAIL_VERIFICATION_ENABLED=true`, o sistema entra em modo console:

- O código de verificação é logado no console do servidor
- Nenhum e-mail real é enviado
- Útil para desenvolvimento local sem SMTP

```
[EmailVerification] DEV MODE — Token para user@test.com: abc123def456
[EmailVerification] DEV MODE — Link: https://localhost:3000/verify-email?token=abc123def456
```

---

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `SMTP_PROVIDER` | Não | Provider (brevo, smtp, sendgrid, ses). Default: smtp |
| `SMTP_HOST` | Sim* | Servidor SMTP |
| `SMTP_PORT` | Não | Porta (default: 587) |
| `SMTP_SECURE` | Não | SSL direto (default: false = STARTTLS) |
| `SMTP_USER` | Sim* | Login SMTP |
| `SMTP_PASSWORD` | Sim* | Senha/Key SMTP |
| `SMTP_FROM` | Sim* | E-mail remetente (deve ser verificado) |
| `SMTP_FROM_NAME` | Não | Nome exibido (default: VITE_APP_TITLE) |
| `SMTP_REPLY_TO` | Não | E-mail reply-to |

\* Obrigatório apenas se `EMAIL_VERIFICATION_ENABLED=true`

---

## Troubleshooting

### Erro: "Authentication failed"

- **Brevo**: Verifique se está usando a SMTP Key (não a API Key)
- **Gmail**: Verifique se está usando App Password (não a senha normal)
- **Geral**: Confirme que `SMTP_USER` é o e-mail da conta

### Erro: "Connection refused" ou timeout

- Verifique se a porta 587 está aberta no firewall
- Alguns provedores de hosting bloqueiam porta 25/587
- Teste: `nc -zv smtp-relay.brevo.com 587`

### E-mail vai para spam

1. Verifique os registros DNS (DKIM, SPF, DMARC)
2. Use um domínio verificado no Brevo
3. Evite usar domínios gratuitos (gmail.com, hotmail.com) como remetente
4. Verifique o score em [mail-tester.com](https://www.mail-tester.com)

### E-mail não chega

1. Verifique o log do container: `docker compose logs app | grep -i email`
2. Verifique o painel Brevo: **Transactional → Logs**
3. Execute o diagnóstico: `./scripts/check-email-provider.sh`

---

## Registros DNS Recomendados

Para máxima deliverability, configure:

```dns
# SPF (TXT record no domínio raiz)
v=spf1 include:sendinblue.com ~all

# DKIM (TXT record - fornecido pelo Brevo)
mail._domainkey.seudominio.com.br  TXT  "v=DKIM1; k=rsa; p=..."

# DMARC (TXT record)
_dmarc.seudominio.com.br  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@seudominio.com.br"
```

---

## Limites do Plano Gratuito Brevo

| Recurso | Limite |
|---------|--------|
| E-mails/dia | 300 |
| Contatos | Ilimitados |
| API calls | Ilimitadas |
| Templates | Ilimitados |
| Domínios | Até 3 |

Para mais de 300 e-mails/dia, considere o plano Starter (€9/mês = 5.000 e-mails/mês).
