# 05 - Google OAuth 2.0

Este documento explica como configurar a autenticação Google OAuth 2.0 para o ambiente de homologação. No homolog, o Google OAuth substitui o OAuth legado usado na produção, permitindo login com contas Google sem dependência de serviços de terceiros.

## Visão Geral do Fluxo

O fluxo de autenticação segue o padrão OAuth 2.0 Authorization Code:

| Etapa | O que acontece | Quem faz |
|-------|---------------|----------|
| 1 | Usuário clica "Entrar" na landing page | Frontend |
| 2 | Frontend redireciona para `/api/auth/google` | Frontend → Backend |
| 3 | Backend redireciona para Google consent screen | Backend → Google |
| 4 | Usuário autoriza e Google retorna com authorization code | Google → Backend |
| 5 | Backend troca code por access token e busca perfil | Backend → Google API |
| 6 | Backend cria/atualiza usuário no PostgreSQL (`openId = google_<id>`) | Backend → DB |
| 7 | Backend emite cookie JWT de sessão | Backend |
| 8 | Redireciona para `/chat` com sessão ativa | Backend → Frontend |

## Passo 1 — Criar Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com).
2. No seletor de projetos (topo da página), clique em **New Project**.
3. Preencha:

| Campo | Valor sugerido |
|-------|---------------|
| **Project name** | `debuga-ai` |
| **Organization** | Deixar padrão ou selecionar sua organização |
| **Location** | Deixar padrão |

4. Clique em **Create** e aguarde a criação (alguns segundos).
5. Certifique-se de que o projeto `debuga-ai` está selecionado no seletor de projetos.

## Passo 2 — Configurar OAuth Consent Screen

A consent screen é a tela que o Google mostra ao usuário pedindo permissão para compartilhar dados com a aplicação.

1. No menu lateral, vá em **APIs & Services** → **OAuth consent screen**.
2. Selecione **User Type**:

| Tipo | Quando usar |
|------|------------|
| **External** | Para qualquer conta Google poder fazer login (recomendado para homolog) |
| Internal | Apenas para contas da mesma organização Google Workspace |

3. Clique em **Create**.
4. Preencha a tela de configuração:

| Campo | Valor |
|-------|-------|
| **App name** | `debuga.ai (Homolog)` |
| **User support email** | Seu email |
| **App logo** | Opcional |
| **App domain** | `https://seu-dominio.com.br` |
| **Application home page** | `https://seu-dominio.com.br` |
| **Application privacy policy** | `https://seu-dominio.com.br/privacy` (ou deixar vazio) |
| **Application terms of service** | `https://seu-dominio.com.br/terms` (ou deixar vazio) |
| **Authorized domains** | `debuga.ai` |
| **Developer contact email** | Seu email |

5. Clique em **Save and Continue**.

### Scopes

Na tela de Scopes, adicione:

| Scope | Descrição |
|-------|-----------|
| `openid` | Identificação do usuário |
| `email` | Endereço de email |
| `profile` | Nome e foto do perfil |

Clique em **Save and Continue**.

### Usuários de Teste

> **Importante:** Enquanto a app estiver em modo "Testing" (padrão), apenas emails listados como usuários de teste podem fazer login.

1. Clique em **Add users**.
2. Adicione os emails das pessoas que vão testar (incluindo o seu).
3. Clique em **Save and Continue**.

> Para permitir qualquer conta Google, publique a app clicando em **Publish App** na tela de consent screen. Isso requer verificação do Google para apps com mais de 100 usuários, mas para uso interno/homolog geralmente é aprovado rapidamente.

## Passo 3 — Criar Credenciais OAuth 2.0

1. No menu lateral, vá em **APIs & Services** → **Credentials**.
2. Clique em **Create Credentials** → **OAuth 2.0 Client ID**.
3. Preencha:

| Campo | Valor |
|-------|-------|
| **Application type** | Web application |
| **Name** | `debuga-ai-web` |

4. Em **Authorized JavaScript origins**, adicione:

```
https://seu-dominio.com.br
```

5. Em **Authorized redirect URIs**, adicione **exatamente**:

```
https://seu-dominio.com.br/api/auth/google/callback
```

> **A URI de redirect deve ser exata.** Qualquer diferença (barra no final, http em vez de https, porta diferente) causa erro `redirect_uri_mismatch`.

6. Clique em **Create**.

## Passo 4 — Copiar Credenciais para o .env

Após criar o Client ID, o Google mostra o **Client ID** e o **Client Secret**. Copie ambos para o `.env`:

```bash
# No arquivo .env
GOOGLE_CLIENT_ID=123456789012-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWx
```

| Variável | Formato | Exemplo |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | `<números>-<letras>.apps.googleusercontent.com` | `123456789012-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-<caracteres>` | `GOCSPX-AbCdEfGhIjKlMn` |

> **O Client Secret é sensível.** Nunca exponha em frontend, logs, prints ou repositórios públicos.

## Passo 5 — Testar o Login

1. Certifique-se de que a aplicação está rodando:
   ```bash
   docker compose -f docker/docker-compose.yml ps
   # app, postgres, minio e nginx devem estar "healthy" ou "running"
   ```

2. Acesse `https://seu-dominio.com.br` no navegador.
3. Clique em **"Entrar"** ou **"Começar agora"**.
4. Você será redirecionado para a tela de consent do Google.
5. Selecione uma conta Google (que esteja na lista de usuários de teste, se a app ainda estiver em modo Testing).
6. Autorize o acesso.
7. Você deve ser redirecionado para `/chat` com sessão ativa.

### Verificar no Banco

Após o primeiro login, verifique que o usuário foi criado:

```bash
docker exec debuga-postgres psql -U debuga -d debuga_homolog -c "SELECT id, open_id, name, email FROM users;"
```

O `open_id` terá o formato `google_<google_user_id>`.

## Erros Comuns e Soluções

### "redirect_uri_mismatch"

**Causa:** A URI de redirect configurada no Google Console não corresponde exatamente à que a aplicação envia.

**Solução:**
1. Vá em **APIs & Services** → **Credentials** → clique no Client ID.
2. Verifique que **Authorized redirect URIs** contém exatamente:
   ```
   https://seu-dominio.com.br/api/auth/google/callback
   ```
3. Erros frequentes:
   - `http://` em vez de `https://`
   - Barra no final: `.../callback/` (não deve ter)
   - Porta na URL: `https://seu-dominio.com.br:443/...` (não incluir porta)
   - Domínio diferente: `https://www.seu-dominio.com.br/...` (sem `www`)

### "access_denied"

**Causa:** A app está em modo **Testing** e o email do usuário não está na lista de usuários de teste.

**Solução:**
1. Vá em **APIs & Services** → **OAuth consent screen**.
2. Na seção **Test users**, adicione o email do usuário.
3. Ou publique a app clicando em **Publish App** (permite qualquer conta Google).

### "Usuário não autorizado" ou tela em branco após callback

**Causa:** O backend não conseguiu processar o callback. Possíveis razões:
- `GOOGLE_CLIENT_ID` ou `GOOGLE_CLIENT_SECRET` incorretos no `.env`.
- `JWT_SECRET` vazio.
- PostgreSQL não está rodando.

**Solução:**
```bash
# Verificar logs da aplicação
docker logs debuga-app --tail=50 | grep -i "auth\|oauth\|google\|error"

# Verificar que as variáveis estão definidas
docker exec debuga-app env | grep GOOGLE
```

### "Domínio não verificado" ao publicar a app

**Causa:** O Google requer verificação do domínio para apps publicadas com scopes sensíveis.

**Solução:** Para homolog/uso interno, geralmente não é necessário publicar. Mantenha em modo Testing e adicione os emails dos testadores. Se precisar publicar, siga o processo de verificação do Google (adicionar registro TXT no DNS ou meta tag no HTML).

### Cookie não persiste (login funciona mas sessão some)

**Causa:** `JWT_SECRET` vazio ou diferente entre restarts.

**Solução:**
1. Verifique que `JWT_SECRET` está definido no `.env` com pelo menos 32 caracteres.
2. Verifique que o `.env` está sendo lido pelo container:
   ```bash
   docker exec debuga-app env | grep JWT_SECRET
   ```
3. Se alterou o `JWT_SECRET`, todos os cookies antigos serão invalidados (usuários precisam fazer login novamente).

## Arquivos Relevantes

| Arquivo | Função |
|---------|--------|
| `server/_core/oauth.ts` | Implementação do Google OAuth (passport-google-oauth20) |
| `server/_core/env.ts` | Leitura das variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` |
| `client/src/const.ts` | URL de login aponta para `/api/auth/google` |

## Formato do openId

No homolog, o `openId` dos usuários segue o formato `google_<google_user_id>`, diferente da produção que usa o formato legado. Isso garante isolamento total entre os ambientes — um usuário do homolog não existe na produção e vice-versa.

## Referências

- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
- [OAuth Consent Screen Configuration](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)
