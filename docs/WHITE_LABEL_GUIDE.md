# Customização White Label

Este guia ensina como transformar o pacote debuga-ai em uma implantação White Label para outro cliente, marca ou empresa. O processo envolve substituição de identidade visual, domínio, nome da aplicação, textos, configurações de OAuth e Stripe, e-mails de suporte e documentação pública.

O objetivo é que, ao final da customização, o produto final tenha a identidade completa do novo cliente — sem referências à marca original — mantendo toda a funcionalidade intacta.

---

## 1. Visão Geral

Uma implantação White Label envolve personalizar os seguintes aspectos do sistema:

| Aspecto | O que muda | Onde muda |
|---------|-----------|-----------|
| **Identidade visual** | Logo, favicon, ícones PWA, cores | Frontend, manifest, CSS |
| **Nome da aplicação** | Título, nome curto, descrição | `.env`, manifest, landing |
| **Domínio** | URL de acesso | DNS, Nginx, `.env`, OAuth, Stripe |
| **Textos** | Landing page, planos, boas-vindas | Componentes React, constantes |
| **Autenticação** | OAuth consent screen, redirect URIs | Google Cloud Console, `.env` |
| **Pagamentos** | Conta Stripe, produtos, branding | Stripe Dashboard, `.env` |
| **Identidade do agente** | Nome, tom, áreas de atuação | `server/agentIdentity.ts` |
| **E-mail de suporte** | Contato visível ao usuário | `.env`, componentes, OAuth |
| **Documentação** | README, docs públicos | Arquivos Markdown |

> **Regra fundamental:** Toda customização deve ser feita de forma centralizada nos arquivos de configuração e identidade. Evite alterar strings espalhadas manualmente pelo código — use as constantes e variáveis de ambiente existentes.

---

## 2. O que Pode Ser Personalizado

A tabela abaixo lista todos os elementos personalizáveis e onde encontrá-los:

| Elemento | Arquivo/Local | Observação |
|----------|--------------|------------|
| Nome da aplicação | `.env` → `VITE_APP_TITLE` | Aparece no título da aba, header, etc. |
| Logo principal | `.env` → `VITE_APP_LOGO` (URL) | Usado no header e login |
| Favicon | `app/client/public/favicon.ico` | Ícone da aba do navegador |
| Ícones PWA (192x192) | Referenciados no `manifest.webmanifest` | Ícone do app instalado |
| Ícones PWA (512x512) | Referenciados no `manifest.webmanifest` | Splash screen |
| Ícones PWA maskable | Referenciados no `manifest.webmanifest` | Ícone adaptativo (Android) |
| Cores principais | `app/client/src/index.css` | Variáveis CSS (OKLCH) |
| Textos da landing page | `app/client/src/pages/Home.tsx` | Título, subtítulo, CTAs |
| Textos do plano Enterprise | Componentes de pricing | Descrição dos planos |
| Nome do agente | `app/server/agentIdentity.ts` → `AGENT_NAME` | Identidade nas respostas |
| Empresa do agente | `app/server/agentIdentity.ts` → `AGENT_COMPANY` | Empresa nas respostas |
| Domínio do agente | `app/server/agentIdentity.ts` → `AGENT_DOMAIN` | Área de atuação |
| Domínio da aplicação | `.env` → `DOMAIN` | URL de acesso |
| E-mail de suporte | `.env` → `ADMIN_EMAIL` | Contato visível |
| Links institucionais | Componentes de footer/landing | Termos, privacidade, sobre |
| Documentação pública | `docs/`, `README.md` | Referências à marca |
| Provedores externos | `.env` → Google OAuth, Stripe | Contas próprias do cliente |

---

## 3. Variáveis de Ambiente Relacionadas à Marca

As seguintes variáveis do `.env` controlam aspectos visíveis da marca. Ao fazer White Label, todas devem ser revisadas:

| Variável | Função na marca | Exemplo White Label |
|----------|----------------|---------------------|
| `DOMAIN` | Domínio de acesso à aplicação | `ia.clientexemplo.com.br` |
| `APP_URL` | URL completa da aplicação (com https://) | `https://ia.clientexemplo.com.br` |
| `AUTH_BASE_URL` | URL base para callbacks de autenticação | `https://ia.clientexemplo.com.br` |
| `ADMIN_EMAIL` | E-mail de suporte/administrador | `suporte@clientexemplo.com.br` |
| `VITE_APP_ID` | Identificador interno da aplicação | `clientexemplo-ai` |
| `VITE_APP_TITLE` | Nome exibido no título e header | `ClienteExemplo AI` |
| `VITE_APP_LOGO` | URL do logo (CDN ou storage) | `https://cdn.clientexemplo.com.br/logo.svg` |
| `GOOGLE_CLIENT_ID` | OAuth do cliente (não da marca original) | Credencial do projeto Google do cliente |
| `GOOGLE_CLIENT_SECRET` | Secret OAuth do cliente | Credencial do projeto Google do cliente |
| `STRIPE_SECRET_KEY` | Conta Stripe do cliente | `sk_test_...` da conta do cliente |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Chave pública Stripe do cliente | `pk_test_...` da conta do cliente |
| `STRIPE_WEBHOOK_SECRET` | Webhook da conta Stripe do cliente | `whsec_...` do endpoint do cliente |
| `OWNER_OPEN_ID` | ID do proprietário/admin | ID Google do admin do cliente |
| `OWNER_NAME` | Nome do proprietário | Nome do admin do cliente |

> **Cada implantação White Label deve ter suas próprias contas Google Cloud e Stripe.** Nunca compartilhar credenciais entre implantações diferentes.

---

## 4. Arquivos de Identidade Visual

Os seguintes arquivos e diretórios contêm assets visuais que devem ser substituídos:

### Favicon

| Arquivo | Formato | Tamanho |
|---------|---------|---------|
| `app/client/public/favicon.ico` | ICO (multi-resolução) | 16x16, 32x32, 48x48 |

Para gerar um favicon multi-resolução a partir de um PNG, use ferramentas como [favicon.io](https://favicon.io) ou [realfavicongenerator.net](https://realfavicongenerator.net).

### Ícones PWA

Os ícones PWA são referenciados no `app/client/public/manifest.webmanifest`. Atualmente apontam para URLs no storage:

| Ícone | Tamanho | Purpose | Uso |
|-------|---------|---------|-----|
| `icon-192x192.png` | 192x192 px | `any` | Ícone do app instalado |
| `icon-512x512.png` | 512x512 px | `any` | Splash screen |
| `icon-192x192-maskable.png` | 192x192 px | `maskable` | Ícone adaptativo (Android) |
| `icon-512x512-maskable.png` | 512x512 px | `maskable` | Splash screen adaptativa |

Para substituir, faça upload dos novos ícones para o MinIO (ou CDN do cliente) e atualize os caminhos no `manifest.webmanifest`.

### Manifest

O arquivo `app/client/public/manifest.webmanifest` deve ser atualizado com:

| Campo | Valor original | Trocar para |
|-------|---------------|-------------|
| `name` | `debuga.ai` | Nome completo do cliente |
| `short_name` | `debuga` | Nome curto do cliente |
| `description` | Descrição do debuga.ai | Descrição do produto do cliente |
| `theme_color` | `#0d0f14` | Cor principal da marca do cliente |
| `background_color` | `#0d0f14` | Cor de fundo da marca do cliente |
| `icons[*].src` | URLs dos ícones atuais | URLs dos novos ícones |

### Landing Page

O componente `app/client/src/pages/Home.tsx` contém os textos da landing page (título principal, subtítulo, descrição, CTAs). Substituir todas as referências textuais à marca original.

### Constantes do Frontend

O arquivo `app/client/src/const.ts` contém a lógica de login. Não precisa ser alterado para White Label (usa `window.location.origin` dinamicamente), mas verifique se há referências hardcoded à marca.

---

## 5. Cores e Tema

O tema visual é controlado por variáveis CSS no arquivo `app/client/src/index.css`. O sistema usa o formato **OKLCH** (Oklab Lightness Chroma Hue) para todas as cores.

### Variáveis Principais

As cores que definem a identidade visual estão em `:root` e `.dark`:

| Variável | Função | Valor original |
|----------|--------|---------------|
| `--primary` | Cor principal (botões, links, destaques) | `oklch(0.65 0.2 145)` (verde terminal) |
| `--primary-foreground` | Texto sobre a cor principal | `oklch(0.13 0.01 145)` |
| `--background` | Fundo geral da aplicação | `oklch(0.08 0.005 240)` (quase preto) |
| `--foreground` | Texto geral | `oklch(0.92 0.005 145)` |

### Cores Customizadas

Além das variáveis padrão do shadcn/ui, existem cores customizadas no bloco `@theme inline`:

| Variável | Função | Valor original |
|----------|--------|---------------|
| `--color-terminal` | Cor do efeito terminal | `oklch(0.65 0.2 145)` |
| `--color-terminal-dim` | Versão escura do terminal | `oklch(0.45 0.15 145)` |
| `--color-terminal-glow` | Brilho do terminal | `oklch(0.75 0.22 145)` |

### Como Alterar Cores

Para trocar a paleta de cores para a marca do cliente:

1. Escolha a cor principal da marca do cliente (ex: azul corporativo).
2. Converta para OKLCH usando ferramentas como [oklch.com](https://oklch.com).
3. Substitua os valores de `--primary`, `--color-terminal`, `--color-terminal-dim` e `--color-terminal-glow`.
4. Ajuste `--ring`, `--chart-*` e `--sidebar-primary` para manter consistência.
5. Verifique o contraste entre `--primary` e `--primary-foreground` (mínimo 4.5:1 para WCAG AA).

### Efeitos Visuais

O arquivo CSS também contém efeitos que usam a cor principal diretamente (hardcoded em OKLCH):

| Efeito | Localização | O que alterar |
|--------|-------------|---------------|
| `.terminal-glow` | `text-shadow` com `oklch(0.65 0.2 145)` | Trocar para nova cor principal |
| `.typing-cursor::after` | `color: oklch(0.65 0.2 145)` | Trocar para nova cor principal |
| Scrollbar thumb hover | `oklch(0.4 0.01 240)` | Ajustar se mudar o background |
| Mermaid border | `oklch(0.35 0.15 145 / 0.4)` | Trocar para nova cor principal |

> **Cuidado com acessibilidade:** Ao trocar cores, sempre verifique que o texto permanece legível contra o fundo. Use ferramentas como [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) para validar.

---

## 6. Nome e Identidade do Agente

A identidade do agente (nome, tom, regras de comportamento) é centralizada no arquivo `app/server/agentIdentity.ts`. Este é o **único arquivo** que precisa ser alterado para mudar a personalidade do agente.

### Constantes de Identidade

| Constante | Valor original | O que trocar |
|-----------|---------------|-------------|
| `AGENT_NAME` | `"debuga.ai"` | Nome do agente do cliente |
| `AGENT_COMPANY` | `"Sperry Tecnologia"` | Empresa do cliente |
| `AGENT_DOMAIN` | `"Infraestrutura de TI, Segurança..."` | Área de atuação do cliente |

### Blocos de Comportamento

O arquivo exporta blocos de texto que compõem o system prompt:

| Bloco | Função | O que revisar |
|-------|--------|---------------|
| `IDENTITY_BLOCK` | Quem é o agente, regras de identidade | Nome, empresa, domínio, exemplos de resposta |
| `TONE_BLOCK` | Tom e estilo das respostas | Ajustar se o cliente preferir tom diferente |
| `SAFETY_BLOCK` | Regras de segurança e erros | Geralmente manter como está |
| `HUMAN_SUPPORT_BLOCK` | Regras de suporte humano por plano | Ajustar conforme planos do cliente |

### O que Revisar na Identidade

| Aspecto | Pergunta a responder |
|---------|---------------------|
| Nome do agente | Qual nome o agente deve usar? |
| Tom | Formal? Técnico? Amigável? Consultivo? |
| Áreas de atuação | Em que o agente é especialista? |
| Mensagem de boas-vindas | Como deve cumprimentar na primeira interação? |
| Suporte humano | Quais planos incluem suporte humano? Como escalar? |
| Limites | O que o agente **não** deve prometer? |
| Provedores | Quais nomes de provedores/modelos não devem ser expostos? |

> **Regra crítica:** Nunca espalhar o nome do agente manualmente em vários arquivos. Altere apenas as constantes em `agentIdentity.ts` — elas são importadas automaticamente por todo o sistema de chat.

---

## 7. Domínio e OAuth

Ao trocar o domínio da aplicação, é necessário atualizar múltiplos pontos de configuração. A lista completa:

### Variáveis de Ambiente

| Variável | Valor original | Novo valor |
|----------|---------------|-----------|
| `DOMAIN` | `seu-dominio.com.br` | `ia.clientexemplo.com.br` |
| `APP_URL` | `https://seu-dominio.com.br` | `https://ia.clientexemplo.com.br` |
| `AUTH_BASE_URL` | `https://seu-dominio.com.br` | `https://ia.clientexemplo.com.br` |

### Google Cloud Console

Acessar **APIs & Services** → **Credentials** → clicar no Client ID e atualizar:

| Campo | Valor original | Novo valor |
|-------|---------------|-----------|
| **Authorized JavaScript origins** | `https://seu-dominio.com.br` | `https://ia.clientexemplo.com.br` |
| **Authorized redirect URIs** | `https://seu-dominio.com.br/api/auth/google/callback` | `https://ia.clientexemplo.com.br/api/auth/google/callback` |

### OAuth Consent Screen

Acessar **APIs & Services** → **OAuth consent screen** e atualizar:

| Campo | Valor original | Novo valor |
|-------|---------------|-----------|
| **App name** | `debuga.ai (Homolog)` | Nome do produto do cliente |
| **App domain** | `https://seu-dominio.com.br` | `https://ia.clientexemplo.com.br` |
| **Application home page** | `https://seu-dominio.com.br` | `https://ia.clientexemplo.com.br` |
| **Authorized domains** | `debuga.ai` | `clientexemplo.com.br` |
| **User support email** | Email original | Email do cliente |

### Exemplo Completo de Redirect URI

```
https://ia.clientexemplo.com.br/api/auth/google/callback
```

> **A URI de redirect deve ser exata.** Qualquer diferença (barra no final, http em vez de https, porta, www) causa erro `redirect_uri_mismatch`.

---

## 8. Stripe White Label

Cada implantação White Label deve ter sua **própria conta Stripe**. Nunca compartilhar a conta Stripe entre marcas diferentes.

### O que Criar/Configurar na Conta do Cliente

| Item | Onde | O que fazer |
|------|------|------------|
| **Conta Stripe** | [stripe.com](https://stripe.com) | Criar conta nova para o cliente |
| **Branding** | Settings → Branding | Logo, cores, nome da empresa do cliente |
| **Produtos** | Products → Add product | Criar planos com nomes/preços do cliente |
| **Preços** | Dentro de cada produto | Definir valores conforme modelo de negócio do cliente |
| **Webhook** | Developers → Webhooks | Criar endpoint: `https://ia.clientexemplo.com.br/api/stripe/webhook` |
| **Chaves** | Developers → API keys | Copiar `sk_test_` e `pk_test_` para o `.env` |

### Variáveis a Atualizar

| Variável | Valor |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` da conta do cliente |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` da conta do cliente |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` do endpoint do cliente |

### URLs de Sucesso/Cancelamento

As URLs de sucesso e cancelamento do checkout são construídas dinamicamente a partir do `origin` da requisição. Não é necessário hardcoded — ao trocar o domínio, elas se ajustam automaticamente.

### Branding no Checkout

No Stripe Dashboard do cliente, em **Settings** → **Branding**, configurar:

| Campo | O que colocar |
|-------|--------------|
| Logo | Logo do cliente |
| Icon | Ícone do cliente |
| Brand color | Cor principal da marca do cliente |
| Accent color | Cor de destaque |

---

## 9. Nginx e TLS

Ao usar um novo domínio, o Nginx precisa ser configurado para servir o novo domínio com TLS válido.

### Passos

| Passo | Comando/Ação |
|-------|-------------|
| 1. DNS | Criar registro A apontando `ia.clientexemplo.com.br` para o IP do servidor |
| 2. Verificar DNS | `dig ia.clientexemplo.com.br +short` (deve retornar o IP) |
| 3. Nginx config | Editar `docker/nginx/conf.d/default.conf` → trocar `server_name` |
| 4. Certificado TLS | `sudo certbot certonly --standalone -d ia.clientexemplo.com.br` |
| 5. Nginx TLS paths | Atualizar caminhos do certificado no config do Nginx |
| 6. Restart | `docker compose -f docker/docker-compose.yml restart nginx` |
| 7. Validar | `curl -I https://ia.clientexemplo.com.br` (deve retornar 200) |

### server_name no Nginx

No arquivo `docker/nginx/conf.d/default.conf`, localizar e alterar:

```nginx
# De:
server_name seu-dominio.com.br;

# Para:
server_name ia.clientexemplo.com.br;
```

### Certificado TLS

```bash
# Parar Nginx temporariamente (certbot precisa da porta 80)
docker compose -f docker/docker-compose.yml stop nginx

# Emitir certificado
sudo certbot certonly --standalone -d ia.clientexemplo.com.br

# Reiniciar Nginx
docker compose -f docker/docker-compose.yml start nginx
```

### Validação

```bash
curl -I https://ia.clientexemplo.com.br
# Deve retornar HTTP/2 200
```

---

## 10. Mapa Completo de Arquivos White Label

A tabela abaixo lista **todos** os arquivos e locais que precisam ser alterados em uma customização White Label, organizados por categoria:

### Identidade Visual e PWA

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Nome da aplicação | `.env` → `VITE_APP_TITLE` | Título exibido na aba, header, login |
| Logo principal (header) | `.env` → `VITE_APP_LOGO` (URL) | URL do logo SVG/PNG no CDN ou MinIO |
| Favicon | `app/client/public/favicon.ico` | Substituir arquivo ICO (16x16, 32x32, 48x48) |
| Apple Touch Icon | `app/client/index.html` → `<link rel="apple-touch-icon">` | URL do ícone 180x180 |
| Ícone PWA 192x192 | `app/client/public/manifest.webmanifest` → `icons[0].src` | URL do PNG 192x192 |
| Ícone PWA 512x512 | `app/client/public/manifest.webmanifest` → `icons[1].src` | URL do PNG 512x512 |
| Ícone PWA maskable 192 | `app/client/public/manifest.webmanifest` → `icons[2].src` | URL do PNG 192x192 maskable |
| Ícone PWA maskable 512 | `app/client/public/manifest.webmanifest` → `icons[3].src` | URL do PNG 512x512 maskable |
| Nome PWA | `app/client/public/manifest.webmanifest` → `name` | Nome completo da aplicação |
| Nome curto PWA | `app/client/public/manifest.webmanifest` → `short_name` | Nome curto (max 12 chars) |
| Descrição PWA | `app/client/public/manifest.webmanifest` → `description` | Descrição do produto |
| Cor do tema PWA | `app/client/public/manifest.webmanifest` → `theme_color` | Cor hex principal |
| Cor de fundo PWA | `app/client/public/manifest.webmanifest` → `background_color` | Cor hex de fundo |

### Cores e Tema CSS

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Cor principal | `app/client/src/index.css` → `--primary` | Valor OKLCH da cor principal |
| Cor principal (foreground) | `app/client/src/index.css` → `--primary-foreground` | Texto sobre cor principal |
| Cor terminal | `app/client/src/index.css` → `--color-terminal` | Efeito terminal (OKLCH) |
| Cor terminal dim | `app/client/src/index.css` → `--color-terminal-dim` | Versão escura do terminal |
| Cor terminal glow | `app/client/src/index.css` → `--color-terminal-glow` | Brilho do terminal |
| Efeito terminal-glow | `app/client/src/index.css` → `.terminal-glow` | `text-shadow` hardcoded |
| Cursor typing | `app/client/src/index.css` → `.typing-cursor::after` | `color` hardcoded |
| Mermaid border | `app/client/src/index.css` → `.mermaid` | `border-color` hardcoded |

### Textos e Copy

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Título do hero | `app/client/src/pages/Home.tsx` → seção hero | Título principal da landing |
| Subtítulo do hero | `app/client/src/pages/Home.tsx` → seção hero | Descrição abaixo do título |
| Diferenciais do hero | `app/client/src/pages/Home.tsx` → badges abaixo do CTA | 3 diferenciais textuais |
| Seção White Label | `app/client/src/pages/Home.tsx` → seção enterprise/white-label | Copy de implantação |
| Planos/Pricing | `app/client/src/pages/Home.tsx` → seção pricing | Nomes, descrições dos planos |
| Footer | `app/client/src/pages/Home.tsx` → footer | Links, "Desenvolvido por", copyright |
| Texto de boas-vindas do chat | `app/client/src/pages/ChatPage.tsx` | Mensagem inicial do chat |

### Identidade do Agente

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Nome do agente | `app/server/agentIdentity.ts` → `AGENT_NAME` | Nome usado nas respostas |
| Empresa do agente | `app/server/agentIdentity.ts` → `AGENT_COMPANY` | Empresa nas respostas |
| Domínio de atuação | `app/server/agentIdentity.ts` → `AGENT_DOMAIN` | Área de especialidade |
| Bloco de identidade | `app/server/agentIdentity.ts` → `IDENTITY_BLOCK` | System prompt completo |
| Tom das respostas | `app/server/agentIdentity.ts` → `TONE_BLOCK` | Estilo de comunicação |
| Suporte humano | `app/server/agentIdentity.ts` → `HUMAN_SUPPORT_BLOCK` | Regras de escalação |

### Domínio e Infraestrutura

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Domínio | `.env` → `DOMAIN` | Domínio sem protocolo |
| URL da aplicação | `.env` → `APP_URL` | URL completa com `https://` |
| URL base de auth | `.env` → `AUTH_BASE_URL` | URL completa com `https://` |
| E-mail admin | `.env` → `ADMIN_EMAIL` | E-mail de suporte |
| Nginx server_name | `docker/nginx/conf.d/default.conf` | Domínio no bloco `server` |
| Certificado TLS | `/etc/letsencrypt/live/{dominio}/` | Emitir via certbot |

### Autenticação (Google OAuth)

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Client ID | `.env` → `GOOGLE_CLIENT_ID` | Credencial do projeto Google do cliente |
| Client Secret | `.env` → `GOOGLE_CLIENT_SECRET` | Secret do projeto Google do cliente |
| JavaScript Origins | Google Cloud Console → Credentials | `https://ia.clientexemplo.com.br` |
| Redirect URI | Google Cloud Console → Credentials | `https://ia.clientexemplo.com.br/api/auth/google/callback` |
| Consent Screen | Google Cloud Console → OAuth consent | Nome, logo, domínio do cliente |

### Pagamentos (Stripe)

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Secret Key | `.env` → `STRIPE_SECRET_KEY` | `sk_test_...` da conta do cliente |
| Publishable Key | `.env` → `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` da conta do cliente |
| Webhook Secret | `.env` → `STRIPE_WEBHOOK_SECRET` | `whsec_...` do endpoint do cliente |
| Branding | Stripe Dashboard → Settings → Branding | Logo, cores da marca do cliente |
| Produtos | Stripe Dashboard → Products | Planos com nomes/preços do cliente |
| Webhook URL | Stripe Dashboard → Webhooks | `https://ia.clientexemplo.com.br/api/stripe/webhook` |

### Analytics (Google Analytics GA4)

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| GA4 Measurement ID | `.env` → `VITE_ANALYTICS_WEBSITE_ID` | Measurement ID do GA4 do cliente (formato `G-XXXXXXXXXX`). Se vazio, Google Analytics não é carregado. |
| Script gtag.js | `app/client/index.html` → `<script>` no `<head>` | Não precisa alterar — é condicional via variável de ambiente. |
| Analytics self-hosted | `.env` → `VITE_ANALYTICS_ENDPOINT` | URL do Umami/Plausible do cliente (opcional). |

O Google Analytics é carregado condicionalmente: se `VITE_ANALYTICS_WEBSITE_ID` estiver vazio, nenhum script gtag.js é injetado no HTML. Cada implantação White Label pode ter seu próprio Measurement ID do GA4.

### LLM (Motor de IA)

| Item | Arquivo/Local | O que alterar |
|------|--------------|---------------|
| Provedor cloud | `.env` → `LLM_CLOUD_API_URL` | URL do provedor escolhido pelo cliente |
| Chave cloud | `.env` → `LLM_CLOUD_API_KEY` | Chave API do provedor do cliente |
| Modelo cloud | `.env` → `LLM_CLOUD_MODEL` | Nome do modelo preferido |
| Inferência local | `.env` → `ENABLE_LOCAL_INFERENCE` | `true` se usar Ollama/GPU |
| URL Ollama | `.env` → `LOCAL_LLM_BASE_URL` | `http://ollama:11434` ou IP remoto |
| Modelo local | `.env` → `LOCAL_LLM_MODEL` | Modelo Ollama (ex: `qwen3.5:latest`) |

Consulte `docs/15-LLM-PROVIDERS.md` para a lista completa de provedores suportados e configuração detalhada.

### Opções de Implantação

A solução White Label pode ser implantada em diferentes ambientes:

| Ambiente | Descrição | Requisitos |
|----------|-----------|------------|
| **Cloud dedicada** | VPS em provedor cloud (Contabo, DigitalOcean, AWS, etc.) | Docker, 4GB RAM, domínio |
| **VPS própria** | Servidor virtual do cliente | Docker, 4GB RAM, acesso root |
| **Infraestrutura on-premise** | Servidor físico do cliente | Docker, rede, domínio interno ou público |
| **Com GPU (Ollama)** | Qualquer ambiente acima + GPU NVIDIA | Docker + NVIDIA Container Toolkit, 8GB+ VRAM |

Todas as opções suportam identidade visual própria, domínio próprio, OAuth/Stripe próprios e documentação personalizada.

---

## 11. Checklist de Customização

Use este checklist para garantir que todos os pontos foram cobertos:

```
[ ] Logo principal substituído (VITE_APP_LOGO no .env)
[ ] Favicon substituído (app/client/public/favicon.ico)
[ ] Ícones PWA atualizados (manifest.webmanifest + upload dos PNGs)
[ ] manifest.webmanifest atualizado (name, short_name, description, colors)
[ ] Nome da aplicação alterado (VITE_APP_TITLE no .env)
[ ] Cores revisadas em index.css (--primary, --terminal, efeitos)
[ ] Contraste verificado (texto legível contra fundo)
[ ] Domínio configurado (DOMAIN no .env)
[ ] DNS apontando para o servidor (dig + curl)
[ ] Nginx server_name atualizado
[ ] Certificado TLS emitido para novo domínio
[ ] Google OAuth — projeto criado na conta do cliente
[ ] Google OAuth — origins e redirect URIs atualizados
[ ] Google OAuth — consent screen com marca do cliente
[ ] Stripe — conta criada para o cliente
[ ] Stripe — produtos e preços criados
[ ] Stripe — branding configurado (logo, cores)
[ ] Stripe — webhook endpoint atualizado para novo domínio
[ ] Stripe — chaves copiadas para .env
[ ] Google Analytics — VITE_ANALYTICS_WEBSITE_ID com Measurement ID do cliente (ou vazio)
[ ] agentIdentity.ts — AGENT_NAME alterado
[ ] agentIdentity.ts — AGENT_COMPANY alterado
[ ] agentIdentity.ts — AGENT_DOMAIN alterado
[ ] agentIdentity.ts — IDENTITY_BLOCK revisado
[ ] Landing page — textos atualizados (Home.tsx)
[ ] E-mail de suporte revisado (ADMIN_EMAIL no .env)
[ ] Documentação revisada (README, docs sem referência à marca original)
[ ] Build executado com sucesso (docker compose build --no-cache)
[ ] App testado no desktop (landing, login, chat)
[ ] App testado no mobile (responsividade, PWA)
[ ] Login com Google OAuth testado
[ ] Checkout com cartão 4242 testado
[ ] Upload de arquivo testado
[ ] Backup testado (./scripts/backup.sh)
```

---

## 12. Limites e Cuidados

Ao realizar uma customização White Label, observe as seguintes restrições e boas práticas:

| Cuidado | Detalhes |
|---------|----------|
| **Nunca commitar `.env`** | O `.env` contém todos os secrets. Cada implantação tem o seu. |
| **Nunca usar secrets de produção em laboratório** | Ambiente de teste usa chaves de teste (`sk_test_`, `pk_test_`). |
| **Não prometer LLM própria se não houver** | Se o cliente não tem GPU/Ollama, não anunciar "IA local exclusiva". |
| **Não prometer SLA sem contrato** | Disponibilidade e tempo de resposta devem ser formalizados. |
| **Não redistribuir o repositório sem autorização** | O acesso ao código-fonte é restrito conforme contrato. |
| **Validar licenças de assets** | Logos, fontes e ícones do cliente devem ter licença de uso válida. |
| **Não usar fontes sem licença** | Se trocar a fonte (Inter/JetBrains Mono), verificar licença da nova. |
| **Testar em múltiplos dispositivos** | Após trocar cores/logo, validar em desktop, tablet e mobile. |
| **Documentar as alterações** | Manter registro do que foi customizado para facilitar atualizações futuras. |

---

## 13. Modelo de Aula

Este guia pode ser usado como material didático em treinamentos de customização. Abaixo está uma sugestão de divisão em 4 aulas práticas:

| Aula | Tema | Duração | Módulos cobertos |
|------|------|---------|-----------------|
| **Aula 1** | Personalização da marca | 1,5h | Seções 2, 4, 5, 6 — logo, favicon, PWA, cores, identidade do agente |
| **Aula 2** | Domínio e OAuth | 1,5h | Seções 7, 9 — DNS, Nginx, TLS, Google OAuth com novo domínio |
| **Aula 3** | Stripe White Label | 1h | Seção 8 — conta Stripe, produtos, webhook, branding |
| **Aula 4** | Build, validação e entrega | 1h | Seções 10, 11 — checklist, build, testes, limites |

### Pré-requisitos por Aula

| Aula | O que o aluno precisa ter pronto |
|------|----------------------------------|
| 1 | Pacote extraído, `.env` preenchido, Docker rodando |
| 2 | Domínio disponível, acesso ao Google Cloud Console |
| 3 | Conta Stripe criada |
| 4 | Aulas 1-3 concluídas |

### Resultado Esperado

Ao final das 4 aulas, o aluno terá uma implantação funcional com marca própria, domínio próprio, OAuth próprio e Stripe próprio — completamente independente da marca original.

---

## 14. Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| `docs/14-SELF-HOSTED.md` | Guia completo de deploy self-hosted |
| `docs/15-LLM-PROVIDERS.md` | Provedores de LLM: Ollama, OpenAI, Anthropic, Gemini, etc. |
| `docs/16-DEPLOY-GITHUB.md` | Deploy via GitHub (clone, pull, atualização) |
| `docs/17-PRODUCAO-HOMOLOG-WHITELABEL.md` | Diferenças entre ambientes |
| `docs/18-OBSERVABILIDADE.md` | Monitoramento, logs, alertas |
| `docs/19-SEGURANCA.md` | Segurança, hardening, firewall, TLS |

---

## 15. Provisionando um Novo Cliente White Label

Este procedimento cobre o fluxo completo de provisionamento de um novo cliente, desde o clone até a validação.

### Pré-requisitos

- Acesso ao repositório `debuga-ai-prod`
- Servidor preparado (Docker, Docker Compose, GPU opcional)
- Domínio do cliente configurado (DNS A record)
- Credenciais de providers (OpenAI, SMTP, OAuth)

### Passo a Passo

```bash
# 1. Clonar repositório
git clone git@github.com:SperryTecnologia/debuga-ai-prod.git /opt/cliente-ia
cd /opt/cliente-ia

# 2. Copiar template de cliente
cp templates/.env.customer.template .env
chmod 600 .env

# 3. Substituir placeholders do cliente
sed -i 's/cliente_slug/acme/g' .env
sed -i 's/ia.cliente.com.br/ia.acme.com.br/g' .env
sed -i 's/Nome da Solução/ACME IA/g' .env
sed -i 's/Nome da Empresa/ACME Tecnologia/g' .env

# 4. Gerar secrets seguros
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)
DB_PASSWORD=$(openssl rand -base64 48)
MINIO_PASSWORD=$(openssl rand -base64 48)

# 5. Preencher secrets no .env
# Substituir CHANGE_ME_OPENSSL_RAND_BASE64_64 por $JWT_SECRET e $SESSION_SECRET
# Substituir CHANGE_ME_STRONG_PASSWORD_64CHARS por $DB_PASSWORD
# Substituir CHANGE_ME_MINIO_PASSWORD_64CHARS por $MINIO_PASSWORD
# Preencher OPENAI_API_KEY, SMTP_USER, SMTP_PASSWORD, etc.
nano .env

# 6. Personalizar identidade do agente
nano app/server/agentIdentity.ts
# Alterar: AGENT_NAME, AGENT_COMPANY, AGENT_DOMAIN

# 7. Personalizar cores (opcional)
nano app/client/src/index.css
# Alterar variáveis CSS de cor

# 8. Subir ambiente
docker compose -f docker/docker-compose.yml up -d

# 9. Validar
bash scripts/validate-all.sh --env /opt/cliente-ia/.env

# 10. Testar funcionalidades
# - Login (local e/ou OAuth)
# - Chat com agente
# - Upload de arquivos
# - Geração de imagens
# - Painel admin
# - Planos/billing (se Stripe configurado)
```

### Checklist de Validação

| Item | Verificação |
|------|------------|
| Login local funciona | Criar conta, verificar email, logar |
| OAuth funciona (se habilitado) | Login com Google redireciona corretamente |
| Chat responde | Enviar mensagem, receber resposta |
| Streaming funciona | Resposta aparece em tempo real |
| Upload funciona | Enviar imagem/documento, ver no chat |
| Storage acessível | Arquivos salvos no MinIO/S3 |
| Admin panel | Acessar /admin, ver usuários e logs |
| Marca correta | Logo, nome, cores do cliente |
| Domínio correto | Acessar via domínio do cliente |
| Email funciona | Verificação de email chega na caixa |
| Validate-all passa | `APROVADO` ou `APROVADO COM AVISOS` |

### Isolamento entre Clientes

Cada cliente deve ter isolamento completo:

| Recurso | Isolamento |
|---------|-----------|
| Banco de dados | `POSTGRES_DB` único por cliente |
| Storage | `S3_BUCKET` / `MINIO_BUCKET` único |
| Docker network | `COMPOSE_PROJECT_NAME` único |
| Domínio | DNS separado |
| OAuth | Credenciais Google separadas |
| Stripe | Conta Stripe separada (ou Connected Account) |
| Secrets | `.env` separado com `chmod 600` |
