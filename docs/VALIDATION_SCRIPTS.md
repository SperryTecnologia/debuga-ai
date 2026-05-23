# Scripts de Validação — debuga.ai

**Guia de uso dos scripts de validação para verificação de SEO, analytics, segurança e integridade de links após cada deploy.**

Versão 1.0 | Maio 2026 | Sperry Tecnologia

---

## Visão Geral

Os scripts de validação permitem verificar rapidamente se SEO, sitemap, robots.txt, headers de segurança e links públicos estão corretos após cada deploy. São projetados para execução em ambientes CI/CD ou manualmente pelo operador.

---

## Pré-requisitos

- `curl` (instalado por padrão em Linux/macOS)
- `grep`, `sed`, `awk` (utilitários POSIX padrão)
- Acesso HTTP ao domínio de produção
- Variável `BASE_URL` definida (padrão: `https://debuga.ai`)

---

## Scripts Disponíveis

### check-seo-analytics.sh

Valida a instrumentação completa de SEO e Analytics.

```bash
./scripts/check-seo-analytics.sh [BASE_URL]
```

**O que verifica:**

| Verificação | Critério de Sucesso |
|-------------|-------------------|
| GA4 Measurement ID | Presente no HTML da home |
| sitemap.xml | Acessível (HTTP 200) |
| robots.txt | Acessível (HTTP 200) |
| Meta title | Presente na home |
| Meta description | Presente na home |
| OG image | URL retorna HTTP 200 |
| CSP GA4 | `googletagmanager.com` presente no header CSP |
| Páginas públicas | Todas retornam HTTP 200 |
| Exclusões sitemap | `/chat` e `/api` ausentes do sitemap |

**Saída esperada:**

```
[OK] GA4 Measurement ID encontrado
[OK] sitemap.xml acessível
[OK] robots.txt acessível
[OK] Meta title presente
[OK] Meta description presente
[OK] OG image acessível
[OK] CSP inclui domínios GA4
[OK] Todas as páginas públicas retornam 200
[OK] /chat não aparece no sitemap
[OK] /api não aparece no sitemap
---
Resultado: 10/10 verificações OK
```

---

### check-public-links.sh

Verifica se todos os links públicos da plataforma retornam HTTP 200.

```bash
./scripts/check-public-links.sh [BASE_URL]
```

**O que verifica:**

- `/` (landing page)
- `/pricing`
- `/docs/whitepaper`
- `/docs/architecture`
- `/docs/white-label-enterprise`
- `/sitemap.xml`
- `/robots.txt`
- `/og-image.png`

**Significado dos resultados:**

- `[OK]` — Página acessível e retornando conteúdo
- `[ERRO]` — Página retornando erro (4xx/5xx) ou timeout

---

### check-sitemap.sh

Valida a estrutura e conteúdo do sitemap.xml.

```bash
./scripts/check-sitemap.sh [BASE_URL]
```

**O que verifica:**

| Verificação | Critério |
|-------------|----------|
| Formato XML válido | Estrutura `<urlset>` correta |
| URLs públicas presentes | Todas as rotas indexáveis listadas |
| URLs privadas ausentes | `/chat`, `/account`, `/admin`, `/api` não listadas |
| Campos obrigatórios | `<loc>`, `<lastmod>` presentes |
| URLs acessíveis | Cada URL do sitemap retorna HTTP 200 |

---

### check-robots.sh

Verifica conformidade do robots.txt.

```bash
./scripts/check-robots.sh [BASE_URL]
```

**O que verifica:**

- Arquivo acessível
- `User-agent: *` presente
- `Allow: /` presente
- Rotas privadas bloqueadas (`/api/`, `/admin`, `/chat`, `/account`)
- Referência ao sitemap presente
- Páginas públicas não bloqueadas acidentalmente

---

### check-security-headers.sh

Audita headers de segurança HTTP.

```bash
./scripts/check-security-headers.sh [BASE_URL]
```

**O que verifica:**

| Header | Valor Esperado |
|--------|---------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` ou `SAMEORIGIN` |
| `Content-Security-Policy` | Presente e não vazio |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Presente |

---

### check-docs-links.sh

Verifica links internos da documentação Markdown.

```bash
./scripts/check-docs-links.sh
```

**O que verifica:**

- Links relativos entre documentos (`docs/*.md`)
- Links para o site de produção
- Referências a imagens e assets
- Links quebrados ou apontando para arquivos inexistentes

---

### check-public-repo-clean.sh

Garante que o repositório público não contém referências sensíveis, secrets, paths internos ou artefatos de desenvolvimento.

```bash
./scripts/check-public-repo-clean.sh
```

**O que verifica:**

| Verificação | Critério |
|-------------|----------|
| Senhas e tokens | Ausência de API keys, secrets, PATs |
| Paths internos | Ausência de `/opt/debuga-ai` e similares |
| Artefatos dev | Ausência de `node_modules`, artefatos de build, checkpoints |
| Arquivos .env | Nenhum .env real (apenas .env.example permitido) |
| Dados pessoais | Ausência de e-mails e dados sensíveis |

**Saída esperada:**

```
═══════════════════════════════════════════════════
  ✓ Repositório público está limpo
═══════════════════════════════════════════════════
```

---

## Integração com CI/CD

Os scripts podem ser integrados em pipelines de CI/CD:

```yaml
# Exemplo GitHub Actions
- name: Validar SEO e Analytics
  run: |
    chmod +x scripts/check-seo-analytics.sh
    ./scripts/check-seo-analytics.sh https://debuga.ai

- name: Validar Links Públicos
  run: |
    chmod +x scripts/check-public-links.sh
    ./scripts/check-public-links.sh https://debuga.ai
```

---

## Uso em White Label

Para instâncias white label, passe a URL da instância como parâmetro:

```bash
./scripts/check-seo-analytics.sh https://suporte.clienteX.com.br
./scripts/check-security-headers.sh https://suporte.clienteX.com.br
```

Os scripts são agnósticos ao domínio e validam qualquer instância da plataforma.

---
