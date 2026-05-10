# Guia de Produção: Stripe + Domínio Cloudflare

**debuga.ai — Passo a Passo para Colocar em Produção**

**Autor:** Sperry Tecnologia  
**Data:** Maio 2026

---

## Parte 1: Configurar Stripe para Produção

### 1.1 Pré-requisitos

Antes de ativar pagamentos reais, você precisa completar o processo de verificação (KYC) do Stripe. Isso inclui:

| Requisito | Descrição |
|---|---|
| Conta Stripe | Criar conta em https://dashboard.stripe.com |
| Verificação de identidade | CPF/CNPJ, documento com foto |
| Dados bancários | Conta bancária para receber os pagamentos |
| Endereço comercial | Endereço da empresa ou profissional |
| Descrição do negócio | O que a debuga.ai faz (SaaS de IA para TI) |

### 1.2 Passo a Passo — Ativar Modo Live

**Passo 1: Acessar o Stripe Dashboard**

Acesse https://dashboard.stripe.com e faça login na sua conta. Se você ainda está no sandbox de teste, clique em "Activate your account" no banner superior.

**Passo 2: Completar a Verificação (KYC)**

No dashboard, vá em **Settings > Account details** e preencha:

1. **Business information:**
   - Business type: "Company" ou "Individual"
   - Legal business name: "Sperry Tecnologia" (ou razão social)
   - Business address: Endereço completo
   - Industry: "Software" > "SaaS"
   - Website: https://debuga.ai (ou o domínio que usar)

2. **Personal information:**
   - Nome completo do responsável
   - CPF
   - Data de nascimento
   - Documento com foto (RG ou CNH)

3. **Bank account:**
   - Banco, agência e conta corrente
   - O Stripe deposita os pagamentos automaticamente (D+2 no Brasil)

**Passo 3: Obter as Chaves Live**

Após a verificação ser aprovada (geralmente 1-3 dias úteis):

1. No dashboard, vá em **Developers > API Keys**
2. Copie a **Publishable key** (começa com `pk_live_`)
3. Copie a **Secret key** (começa com `sk_live_`)

**Passo 4: Configurar Webhook de Produção**

1. No dashboard, vá em **Developers > Webhooks**
2. Clique em **Add endpoint**
3. URL do endpoint: `https://SEU-DOMINIO/api/stripe/webhook`
4. Selecione os eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Clique em **Add endpoint**
6. Copie o **Signing secret** (começa com `whsec_`)

**Passo 5: Inserir as Chaves no Manus**

No Management UI do Manus:

1. Vá em **Settings > Payment**
2. Insira a **Publishable key** (`pk_live_...`)
3. Insira a **Secret key** (`sk_live_...`)
4. O webhook secret é configurado automaticamente pelo Manus

Alternativamente, se estiver em hosting próprio, configure as variáveis de ambiente:

```bash
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 1.3 Testar Pagamentos em Produção

Antes de divulgar para clientes reais, teste com um pagamento real de valor baixo:

1. Crie um cupom de 99% de desconto no Stripe Dashboard:
   - Vá em **Products > Coupons > Create coupon**
   - Tipo: Percentual, 99%
   - Duração: Once
   - Nome: "TESTE99"

2. Faça uma assinatura do plano Starter (R$ 49,90) usando o cupom
   - Valor cobrado: R$ 0,50 (mínimo do Stripe)

3. Verifique se:
   - O checkout completou sem erros
   - O webhook foi recebido (verifique em Developers > Webhooks > Recent events)
   - Os créditos foram atualizados no dashboard do usuário
   - A assinatura aparece como "active" no banco de dados

4. Cancele a assinatura de teste pelo portal do Stripe

### 1.4 Configurar Métodos de Pagamento

No Stripe Dashboard, vá em **Settings > Payment methods** e ative:

| Método | Recomendação |
|---|---|
| Cartão de crédito | Obrigatório (já ativo por padrão) |
| Boleto bancário | Recomendado para Brasil |
| PIX | Altamente recomendado para Brasil |

Para ativar PIX e Boleto, o Stripe pode solicitar verificações adicionais.

---

## Parte 2: Publicar no Domínio com Cloudflare

### 2.1 Opção A: Publicar via Manus (Recomendado)

O Manus oferece hospedagem integrada com suporte a domínio customizado. Este é o caminho mais simples.

**Passo 1: Criar Checkpoint e Publicar**

1. No Management UI, certifique-se de que há um checkpoint recente
2. Clique no botão **Publish** no canto superior direito
3. O site será publicado em `debuga-ai.manus.space` (ou similar)

**Passo 2: Configurar Domínio Customizado no Manus**

1. No Management UI, vá em **Settings > Domains**
2. Você tem três opções:
   - **Modificar o prefixo** do domínio `.manus.space` (gratuito)
   - **Comprar um domínio** diretamente pelo Manus
   - **Vincular um domínio existente** (ex: debuga.ai)

**Passo 3: Vincular Domínio Existente via Cloudflare**

Se você já possui o domínio `debuga.ai` na Cloudflare:

1. No Manus, vá em **Settings > Domains > Custom Domain**
2. Digite o domínio: `debuga.ai`
3. O Manus vai fornecer um registro CNAME para configurar

4. No Cloudflare Dashboard (https://dash.cloudflare.com):
   - Selecione o domínio `debuga.ai`
   - Vá em **DNS > Records**
   - Adicione um registro CNAME:

| Tipo | Nome | Conteúdo | Proxy |
|---|---|---|---|
| CNAME | @ | (valor fornecido pelo Manus) | Proxied (nuvem laranja) |
| CNAME | www | (valor fornecido pelo Manus) | Proxied (nuvem laranja) |

5. Configure SSL no Cloudflare:
   - Vá em **SSL/TLS > Overview**
   - Selecione modo **Full (strict)**

6. Configure redirecionamento www:
   - Vá em **Rules > Page Rules**
   - Adicione regra: `www.debuga.ai/*` → 301 Redirect → `https://debuga.ai/$1`

7. Aguarde a propagação DNS (geralmente 5-30 minutos com Cloudflare)

8. Volte ao Manus e verifique se o domínio está verificado

**Passo 4: Atualizar URL do Webhook no Stripe**

Após configurar o domínio, atualize o webhook no Stripe:

1. Vá em **Developers > Webhooks**
2. Edite o endpoint existente
3. Atualize a URL para: `https://debuga.ai/api/stripe/webhook`
4. Salve

### 2.2 Opção B: Hosting Próprio (Avançado)

Se preferir hospedar em servidor próprio, consulte o `MIGRATION_GUIDE.md` para instruções detalhadas.

---

## Parte 3: Checklist de Produção

### 3.1 Antes de Publicar

| Item | Status | Ação |
|---|---|---|
| Verificação Stripe (KYC) | Pendente | Completar em dashboard.stripe.com |
| Chaves live configuradas | Pendente | Settings > Payment no Manus |
| Webhook de produção | Pendente | Criar endpoint no Stripe Dashboard |
| Teste de pagamento real | Pendente | Usar cupom 99% para teste |
| Domínio configurado | Pendente | Settings > Domains no Manus |
| DNS propagado | Pendente | Verificar com `dig debuga.ai` |
| SSL funcionando | Pendente | Acessar https://debuga.ai |
| Webhook URL atualizada | Pendente | Apontar para domínio final |

### 3.2 Após Publicar

| Item | Ação |
|---|---|
| Monitorar webhooks | Verificar em Stripe > Developers > Webhooks |
| Monitorar erros | Verificar logs no Manus Dashboard |
| Testar fluxo completo | Registro → Login → Chat → Upgrade → Pagamento |
| Configurar alertas | Ativar notificações de pagamento no Stripe |
| Backup do banco | Verificar backups automáticos no Manus |

### 3.3 Sequência Recomendada

A ordem ideal para colocar tudo em produção:

```
1. Completar KYC no Stripe (1-3 dias úteis)
    ↓
2. Obter chaves live (pk_live_, sk_live_)
    ↓
3. Inserir chaves no Manus (Settings > Payment)
    ↓
4. Criar checkpoint no Manus
    ↓
5. Publicar no Manus (botão Publish)
    ↓
6. Configurar domínio customizado (Settings > Domains)
    ↓
7. Configurar DNS no Cloudflare (CNAME)
    ↓
8. Criar webhook de produção no Stripe (URL do domínio final)
    ↓
9. Testar pagamento real com cupom 99%
    ↓
10. Divulgar para clientes e alunos
```

---

## Parte 4: Troubleshooting

### Problema: Webhook retorna erro 400

**Causa provável:** O webhook secret não corresponde ao endpoint.

**Solução:** Verifique se o `STRIPE_WEBHOOK_SECRET` no Manus corresponde ao signing secret do endpoint no Stripe Dashboard. Se estiver usando o Manus, vá em Settings > Payment e reconfigure.

### Problema: Pagamento não atualiza créditos

**Causa provável:** O webhook não está chegando ao servidor.

**Solução:**
1. No Stripe Dashboard, vá em Developers > Webhooks
2. Verifique o status do último evento
3. Se mostrar "Failed", verifique se a URL está correta
4. Se mostrar "Pending", aguarde (pode haver delay)

### Problema: Domínio não resolve

**Causa provável:** DNS ainda não propagou.

**Solução:**
1. Verifique com `dig debuga.ai` se o CNAME está correto
2. No Cloudflare, verifique se o proxy está ativo (nuvem laranja)
3. Aguarde até 48h para propagação completa (geralmente 5-30 min com Cloudflare)

### Problema: SSL mostra erro de certificado

**Causa provável:** Modo SSL incorreto no Cloudflare.

**Solução:** No Cloudflare, vá em SSL/TLS > Overview e selecione "Full (strict)".

---

*Guia de produção — Sperry Tecnologia © 2026*
