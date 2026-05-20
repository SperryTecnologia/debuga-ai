# 11 - Stripe em Modo Teste

Este documento explica como configurar o Stripe em modo teste para o ambiente de homologação. O modo teste permite simular pagamentos completos sem cobranças reais, usando cartões e dados fictícios fornecidos pelo próprio Stripe.

## Visão Geral

O debuga.ai homolog usa Stripe para processar assinaturas e pagamentos. No ambiente de homologação, **sempre** usamos o modo teste do Stripe, que é completamente isolado do modo live (produção). Dados de teste nunca afetam dados reais e vice-versa.

| Aspecto | Modo Teste | Modo Live |
|---------|-----------|-----------|
| Prefixo das chaves | `sk_test_` / `pk_test_` | `sk_live_` / `pk_live_` |
| Cobranças reais | Não | Sim |
| Cartões aceitos | Apenas cartões de teste | Cartões reais |
| Webhooks | Endpoint separado | Endpoint separado |
| Dashboard | Barra roxa "TEST MODE" | Sem barra |

> **Regra absoluta:** nunca use chaves `sk_live_` ou `pk_live_` no ambiente de homologação. Se misturar, você pode cobrar clientes reais acidentalmente.

## Passo 1 — Criar Conta Stripe

Se você ainda não tem conta no Stripe:

1. Acesse [stripe.com](https://stripe.com) e clique em **Start now**.
2. Preencha email, nome e senha.
3. Confirme o email.
4. Você será direcionado ao Dashboard. O modo teste já vem ativado por padrão.

Se já tem conta, certifique-se de que está no **modo teste** (barra roxa no topo do Dashboard com a indicação "Test mode").

## Passo 2 — Obter Chaves de API (Test Mode)

1. No Dashboard do Stripe, clique em **Developers** (menu lateral) ou acesse diretamente: [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys).
2. Você verá duas chaves:

| Chave | Prefixo | Variável no `.env` | Visibilidade |
|-------|---------|-------------------|-------------|
| **Publishable key** | `pk_test_` | `VITE_STRIPE_PUBLISHABLE_KEY` | Pública (pode ir no frontend) |
| **Secret key** | `sk_test_` | `STRIPE_SECRET_KEY` | **Secreta** (apenas backend) |

3. Clique em **Reveal test key** para ver a Secret key.
4. Copie ambas para o `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_51ABC...xyz
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...xyz
```

## Passo 3 — Criar Produtos e Preços

O debuga.ai espera produtos com preços recorrentes (assinaturas). Para criar:

1. No Dashboard, vá em **Products** → **Add product**.
2. Crie os planos conforme a tabela:

| Plano | Nome sugerido | Preço | Recorrência |
|-------|--------------|-------|-------------|
| Starter | debuga.ai Starter | R$ 49,90/mês | Mensal |
| Pro | debuga.ai Pro | R$ 149,90/mês | Mensal |

3. Após criar cada produto, copie o **Price ID** (formato `price_1ABC...`).
4. Configure os Price IDs no código ou banco conforme a lógica de billing da aplicação.

> **Nota:** No modo teste, os produtos e preços existem apenas no ambiente de teste do Stripe. Eles não aparecem no modo live.

## Passo 4 — Configurar Webhook

O webhook permite que o Stripe notifique a aplicação sobre eventos de pagamento (assinatura criada, pagamento confirmado, cancelamento, etc.).

### Criar o Webhook no Dashboard

1. Vá em **Developers** → **Webhooks** → **Add endpoint**.
2. Configure:

| Campo | Valor |
|-------|-------|
| **Endpoint URL** | `https://seu-dominio.com.br/api/stripe/webhook` |
| **Versão da API** | Deixar padrão (latest) |

3. Em **Select events to listen to**, adicione os eventos recomendados:

| Evento | Quando dispara |
|--------|---------------|
| `checkout.session.completed` | Checkout finalizado com sucesso |
| `customer.subscription.created` | Nova assinatura criada |
| `customer.subscription.updated` | Assinatura alterada (upgrade/downgrade) |
| `customer.subscription.deleted` | Assinatura cancelada |
| `invoice.paid` | Fatura paga com sucesso |
| `invoice.payment_failed` | Falha no pagamento da fatura |

4. Clique em **Add endpoint**.

### Obter o Webhook Secret

1. Após criar o endpoint, clique nele para ver os detalhes.
2. Em **Signing secret**, clique em **Reveal** para ver o `whsec_...`.
3. Copie para o `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

> **Sem o `STRIPE_WEBHOOK_SECRET`, a aplicação não consegue validar que os webhooks realmente vieram do Stripe.** Isso é uma medida de segurança crítica.

### Alternativa: Stripe CLI (Desenvolvimento Local)

Para testar webhooks localmente (sem domínio público):

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Fazer login
stripe login

# Encaminhar webhooks para localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# O CLI mostrará um whsec_ temporário — use-o no .env durante o teste
```

## Passo 5 — Testar Pagamentos

### Cartão de Teste Padrão

O Stripe fornece cartões fictícios para simular diferentes cenários:

| Cenário | Número do cartão | CVV | Validade |
|---------|-----------------|-----|----------|
| **Pagamento bem-sucedido** | `4242 4242 4242 4242` | Qualquer 3 dígitos | Qualquer data futura |
| Pagamento recusado | `4000 0000 0000 0002` | Qualquer | Qualquer futura |
| Requer autenticação (3D Secure) | `4000 0025 0000 3155` | Qualquer | Qualquer futura |
| Fundos insuficientes | `4000 0000 0000 9995` | Qualquer | Qualquer futura |

### Fluxo de Teste Completo

1. Acesse `https://seu-dominio.com.br` e faça login com Google OAuth.
2. Vá para a página de planos/pricing.
3. Selecione um plano (Starter ou Pro).
4. No checkout do Stripe, use o cartão `4242 4242 4242 4242`.
5. Preencha qualquer email, nome e endereço fictícios.
6. Confirme o pagamento.
7. Verifique no Dashboard do Stripe (Payments) que o pagamento apareceu.
8. Verifique no Dashboard do Stripe (Webhooks) que os eventos foram entregues com status `200`.

### Validar Webhook

Após um pagamento de teste, verifique:

```bash
# Logs da aplicação — deve mostrar o webhook sendo processado
docker logs debuga-app --tail=30 | grep -i stripe

# No Dashboard do Stripe → Developers → Webhooks → seu endpoint
# Cada evento deve mostrar "Succeeded" (status 200)
```

## Checklist de Segurança do Stripe

| Item | Status |
|------|--------|
| Chaves usam prefixo `sk_test_` / `pk_test_` (nunca `sk_live_` / `pk_live_`) | [ ] |
| `STRIPE_SECRET_KEY` está apenas no `.env` (nunca no frontend ou Git) | [ ] |
| `STRIPE_WEBHOOK_SECRET` está configurado e validando assinaturas | [ ] |
| Webhook URL usa HTTPS (não HTTP) | [ ] |
| Nenhuma chave live aparece em logs, prints ou screenshots | [ ] |
| Modo teste ativo no Dashboard (barra roxa visível) | [ ] |

## Erros Comuns

### "No such price" ao criar checkout

O Price ID configurado na aplicação não existe no modo teste. Crie os produtos/preços no Dashboard do Stripe em modo teste e atualize os IDs.

### Webhook retorna 400 ou 401

O `STRIPE_WEBHOOK_SECRET` está incorreto ou ausente. Verifique que o `whsec_` no `.env` corresponde ao endpoint correto no Dashboard.

### Webhook retorna 404

A URL do webhook está errada. Deve ser exatamente: `https://seu-dominio.com.br/api/stripe/webhook` (com `/api/stripe/webhook`, não `/api/webhooks/stripe` ou outra variação).

### Pagamento "succeeded" mas app não atualiza

O webhook pode não estar chegando. Verifique:
1. O endpoint está criado no Dashboard do Stripe?
2. Os eventos corretos estão selecionados?
3. O Nginx está rodando e fazendo proxy corretamente?
4. Os logs da app mostram o webhook sendo recebido?

### "Webhook signature verification failed"

O `STRIPE_WEBHOOK_SECRET` no `.env` não corresponde ao signing secret do endpoint no Dashboard. Cada endpoint tem seu próprio `whsec_`. Se você recriou o endpoint, precisa atualizar o secret.

## Referências

- [Stripe Testing Documentation](https://docs.stripe.com/testing)
- [Stripe Test Cards](https://docs.stripe.com/testing#cards)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe CLI](https://docs.stripe.com/stripe-cli)
