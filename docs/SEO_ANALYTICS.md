# SEO e Analytics — debuga.ai

**Guia de configuração e validação de Google Analytics 4, Search Console e otimização para mecanismos de busca.**

Versão 1.0 | Maio 2026 | Sperry Tecnologia

---

## Visão Geral

A plataforma debuga.ai implementa analytics e SEO seguindo as melhores práticas de privacidade e performance. Este documento descreve como configurar, validar e manter a instrumentação de analytics e a otimização para mecanismos de busca.

---

## Google Analytics 4 (GA4)

### Configuração

A integração com GA4 é controlada pela variável de ambiente `VITE_GA_MEASUREMENT_ID`. Quando definida, o script `gtag.js` é carregado automaticamente na inicialização da aplicação.

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_GA_MEASUREMENT_ID` | Measurement ID do GA4 | `G-XXXXXXXXXX` |
| `VITE_GOOGLE_SITE_VERIFICATION` | Código de verificação do Search Console | `abc123...` |

### Eventos Rastreados

A plataforma envia eventos customizados para medir o funil de conversão sem coletar PII (Personally Identifiable Information):

| Evento | Descrição | Área |
|--------|-----------|------|
| `landing_view` | Visualização da landing page | Público |
| `pricing_viewed` | Visualização da página de planos | Público |
| `docs_viewed` | Visualização de documentação | Público |
| `start_clicked` | Clique em "Começar" | Público |
| `sign_up_started` | Início do cadastro | Auth |
| `sign_up_success` | Cadastro concluído | Auth |
| `login_success` | Login realizado | Auth |
| `email_verified` | E-mail verificado | Auth |
| `chat_opened` | Chat aberto | App |
| `chat_message_sent` | Mensagem enviada no chat | App |
| `first_message_sent` | Primeira mensagem do usuário | App |
| `diagram_generated` | Diagrama gerado | App |
| `image_generated` | Imagem gerada | App |
| `upgrade_clicked` | Clique em upgrade de plano | Conversão |
| `checkout_started` | Checkout Stripe iniciado | Conversão |
| `account_viewed` | Visualização da conta | App |
| `phone_added` | Telefone adicionado | App |
| `support_human_clicked` | Solicitação de suporte humano | App |

### Parâmetros Permitidos

Apenas parâmetros não-PII são enviados:

- `area` (public, app, admin)
- `route` (caminho da página)
- `route_type` (landing, pricing, docs, auth, chat, account)
- `plan` (free, starter, pro, enterprise)
- `feature` (nome da funcionalidade)
- `capability` (capacidade utilizada)
- `auth_provider` (email, google)
- `event_source` (frontend, backend)
- `is_authenticated` (true/false)
- `is_verified` (true/false)
- `conversation_count_bucket` (faixa de conversas)
- `message_count_bucket` (faixa de mensagens)

### O que nunca é enviado

- E-mail, nome, telefone ou qualquer dado pessoal
- Conteúdo de prompts ou respostas da IA
- Tokens de autenticação ou IDs sensíveis
- Endereço IP (enviado automaticamente pelo GA4, mas não manualmente)

---

## Validação do GA4 em Tempo Real

Após o deploy, valide que o GA4 está recebendo dados:

1. Acesse [Google Analytics > Realtime](https://analytics.google.com/)
2. Abra `https://debuga.ai` em uma aba anônima
3. Confirme que a visita aparece no relatório Realtime
4. Navegue para `/pricing` e confirme o evento `pricing_viewed`
5. Acesse `/chat` (logado) e confirme `chat_opened`

---

## Google Search Console

### Configuração

A verificação pode ser feita de duas formas:

**Opção 1 — Meta tag (recomendada):**

Defina `VITE_GOOGLE_SITE_VERIFICATION` com o código fornecido pelo Search Console. A meta tag será inserida automaticamente no HTML.

**Opção 2 — DNS TXT record:**

Adicione o registro TXT fornecido pelo Search Console no DNS do domínio (via Cloudflare).

### Envio do Sitemap

Após verificação:

1. Acesse Search Console > Sitemaps
2. Envie: `https://debuga.ai/sitemap.xml`
3. Aguarde indexação (pode levar 24-72h)

---

## SEO Técnico

### Páginas Indexáveis

| Rota | Title | Indexável |
|------|-------|:---------:|
| `/` | debuga.ai — Agente Autônomo de IA para TI, Segurança e Infraestrutura | Sim |
| `/pricing` | Planos debuga.ai — IA para Diagnóstico Técnico, Segurança e Infraestrutura | Sim |
| `/docs/whitepaper` | Whitepaper debuga.ai — IA Operacional para Ambientes Corporativos | Sim |
| `/docs/architecture` | Arquitetura debuga.ai — Plataforma de IA para TI e Segurança | Sim |
| `/docs/white-label-enterprise` | White Label debuga.ai — IA com Marca Própria para Empresas e MSPs | Sim |

### Páginas Não-Indexáveis

| Rota | Motivo |
|------|--------|
| `/login`, `/register` | Páginas de autenticação |
| `/verify-email`, `/forgot-password`, `/reset-password` | Fluxos transacionais |
| `/chat` | Conteúdo privado do usuário |
| `/account` | Dados pessoais |
| `/admin` | Painel administrativo |
| `/api/*` | Endpoints de API |

### Metatags Implementadas

Cada página pública inclui:

- `<title>` único
- `<meta name="description">`
- `<link rel="canonical">`
- `<meta property="og:title">`
- `<meta property="og:description">`
- `<meta property="og:image">`
- `<meta property="og:url">`
- `<meta property="og:type">`
- `<meta name="twitter:card">`
- `<meta name="twitter:title">`
- `<meta name="twitter:description">`
- `<meta name="twitter:image">`
- `<meta name="robots">` (index/noindex conforme rota)

---

## Sitemap e Robots

### sitemap.xml

Localização: `https://debuga.ai/sitemap.xml`

Contém apenas páginas públicas indexáveis com `loc`, `lastmod`, `changefreq` e `priority`.

### robots.txt

Localização: `https://debuga.ai/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /chat
Disallow: /account
Disallow: /login
Disallow: /register
Disallow: /verify-email
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: https://debuga.ai/sitemap.xml
```

---

## Schema.org / JSON-LD

Dados estruturados são inseridos nas páginas públicas:

**Home** — `Organization` + `WebApplication`

**Pricing** — `Product` com `OfferCatalog`

**Docs** — `TechArticle`

Dados utilizados:

| Campo | Valor |
|-------|-------|
| name | debuga.ai |
| url | https://debuga.ai |
| applicationCategory | BusinessApplication |
| operatingSystem | Web |
| provider | debuga.ai / Sperry Tecnologia |

---

## Validação Pós-Deploy

Execute o script de validação após cada deploy:

```bash
./scripts/check-seo-analytics.sh
```

O script verifica automaticamente:

- Presença do `VITE_GA_MEASUREMENT_ID` no HTML
- Acessibilidade do `sitemap.xml`
- Acessibilidade do `robots.txt`
- Meta tags na home
- OG image funcional
- CSP com domínios GA4
- Páginas públicas retornando HTTP 200
- `/chat` e `/api` ausentes do sitemap

---

## Ferramentas de Teste

| Ferramenta | URL | Uso |
|------------|-----|-----|
| Google Rich Results Test | https://search.google.com/test/rich-results | Validar JSON-LD |
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ | Validar OG tags |
| Twitter Card Validator | https://cards-dev.twitter.com/validator | Validar Twitter cards |
| Google PageSpeed Insights | https://pagespeed.web.dev/ | Performance e Core Web Vitals |
| Ahrefs Site Audit | https://ahrefs.com/site-audit | SEO técnico completo |

---
