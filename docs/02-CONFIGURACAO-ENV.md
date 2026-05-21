# 02 - Configuração do Ambiente (.env)

O arquivo `.env` é o ponto central de configuração do debuga.ai. Ele contém todas as credenciais, URLs e flags que os serviços Docker precisam para funcionar. Este documento explica **cada variável**, onde obtê-la, e os cuidados de segurança associados.

> **Referência completa e atualizada:** Consulte também `docs/24-ENV-REFERENCE.md` para a lista canônica de todas as variáveis, incluindo Auth Hardening, SMTP, Turnstile e Rate Limiting.

## Criar o Arquivo .env

```bash
cd /opt/debuga-ai
cp .env.example .env
chmod 600 .env    # Apenas o dono pode ler/escrever
nano .env         # Preencher os valores
```

> **Nunca commite o arquivo `.env` no Git.** Ele contém secrets reais. O `.gitignore` já o exclui, mas verifique sempre.

## Referência Completa de Variáveis

### Domínio e URLs

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `DOMAIN` | Sim | `seu-dominio.com.br` | Domínio público da aplicação (sem `https://`, sem barra final). Usado pelo Nginx e certbot. | Definir conforme seu DNS. | Deve apontar para o IP do servidor via registro A. |
| `APP_URL` | Sim | `https://seu-dominio.com.br` | URL completa da aplicação (com `https://`). Usada para construir links de callback e redirect. | Montar a partir do `DOMAIN`. | Deve incluir `https://`. Sem barra final. |
| `AUTH_BASE_URL` | Sim | `https://seu-dominio.com.br` | URL base para callbacks de autenticação OAuth. | Geralmente igual a `APP_URL`. | Deve incluir `https://`. Sem barra final. |
| `ADMIN_EMAIL` | Sim | `admin@debuga.ai` | Email do administrador. Usado em certbot, OAuth consent screen e suporte. | Seu email real. | Use um email que você monitora. |

### Aplicação

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `NODE_ENV` | Não | `production` | Modo de execução do Node.js. Em produção, desabilita debug e hot-reload. | Não alterar. | Sempre `production` no servidor. |
| `PORT` | Não | `3000` | Porta interna da aplicação dentro do container Docker. | Não alterar. | O Nginx faz proxy da 443 para esta porta. |
| `VITE_APP_ID` | Não | `debuga-ai` | Identificador interno da aplicação. | Não alterar. | — |
| `VITE_APP_TITLE` | Não | `debuga.ai` | Título exibido na interface (navbar, PWA, aba do browser). | Personalizar se desejar. | — |
| `VITE_APP_LOGO` | Não | (vazio) | URL do logo customizado. Se vazio, usa o logo padrão. | Upload de imagem e usar URL pública. | — |
| `VITE_OAUTH_PORTAL_URL` | Sim | `/api/auth/google` | Rota do portal OAuth no frontend. Aponta para a rota interna de Google OAuth. | Usar `/api/auth/google`. | Não alterar para deploy. |

### Autenticação (Google OAuth 2.0)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `GOOGLE_CLIENT_ID` | **Sim** | (vazio) | Client ID do OAuth 2.0. Identifica a aplicação perante o Google. | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client IDs. | Formato: `123456789-abc.apps.googleusercontent.com`. |
| `GOOGLE_CLIENT_SECRET` | **Sim** | (vazio) | Client Secret do OAuth 2.0. Usado pelo backend para trocar o authorization code por access token. | Mesmo local do Client ID. | **Secret sensível.** Nunca exponha em frontend, logs ou prints. |
| `JWT_SECRET` | **Sim** | (vazio) | Chave para assinar cookies de sessão JWT. Deve ter no mínimo 32 caracteres. | Gerar: `openssl rand -hex 32` | **Se vazar, qualquer pessoa pode forjar sessões.** Troque imediatamente se exposto. |
| `SESSION_SECRET` | Sim | (vazio) | Chave para express-session. Pode ser igual ao `JWT_SECRET` em ambientes simples. | Gerar: `openssl rand -hex 32` | Se não definido, o código usa `JWT_SECRET` como fallback. |

### Banco de Dados (PostgreSQL)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `POSTGRES_USER` | Não | `debuga` | Usuário do PostgreSQL. | Personalizar se desejar. | Evite `postgres` (superusuário padrão). |
| `POSTGRES_PASSWORD` | **Sim** | (vazio) | Senha do PostgreSQL. Mínimo 16 caracteres recomendado. | Gerar: `openssl rand -base64 24` | **Nunca use a senha padrão em produção.** Evite caracteres especiais de shell (`$`, `!`, `` ` ``). |
| `POSTGRES_DB` | Não | `debuga_prod` | Nome do banco de dados. | Personalizar se desejar. | — |

> **Nota:** `DATABASE_URL` é construída automaticamente pelo `docker-compose.yml` a partir das variáveis acima. Não defina manualmente.

### Storage (MinIO / S3-compatível)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `S3_ENDPOINT` | Não | `http://minio:9000` | Endpoint do MinIO dentro da rede Docker. | Não alterar. | URL interna com `http://` (duas barras). |
| `S3_REGION` | Não | `us-east-1` | Região S3 (MinIO aceita qualquer valor). | Não alterar. | — |
| `S3_ACCESS_KEY` | Sim | (vazio) | Chave de acesso do MinIO. **Deve ser igual a `MINIO_ROOT_USER`.** | Definir junto com `MINIO_ROOT_USER`. | **Trocar do padrão `minioadmin`.** |
| `S3_SECRET_KEY` | Sim | (vazio) | Chave secreta do MinIO. **Deve ser igual a `MINIO_ROOT_PASSWORD`.** | Definir junto com `MINIO_ROOT_PASSWORD`. | **Trocar do padrão `minioadmin`.** |
| `S3_BUCKET` | Não | `debuga-prod` | Nome do bucket S3 para armazenamento de arquivos. | Personalizar se desejar. | — |
| `MINIO_ROOT_USER` | Sim | (vazio) | Usuário admin do MinIO (console web na porta 9001). | Definir credencial forte. | **Trocar do padrão.** Mínimo 8 caracteres. |
| `MINIO_ROOT_PASSWORD` | Sim | (vazio) | Senha admin do MinIO. | Definir credencial forte. | **Trocar do padrão.** Mínimo 8 caracteres. |

### LLM - Inferência Local (Ollama)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `ENABLE_LOCAL_INFERENCE` | Não | `false` | Ativa inferência local via Ollama. `false` = deploy padrão sem GPU. `true` = somente com profile gpu ativo. | Definir `true` apenas se tiver Ollama rodando com `--profile gpu`. | Sem Ollama + `true` = erros de conexão (com fallback para cloud). |
| `LOCAL_LLM_BASE_URL` | Não | `http://ollama:11434` | URL do Ollama dentro da rede Docker. | Não alterar. | URL interna com `http://` (duas barras). |
| `LOCAL_LLM_MODEL` | Não | `qwen3.5:latest` | Modelo padrão do Ollama para inferência local. | Escolher da [biblioteca Ollama](https://ollama.com/library). | O modelo precisa estar baixado: `docker exec debuga-ollama ollama pull <modelo>` |

### LLM - Cloud (fallback ou principal)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `LLM_CLOUD_API_URL` | Não | (vazio) | URL de API cloud OpenAI-compatível. Usado como fallback quando Ollama falha, ou como principal se `ENABLE_LOCAL_INFERENCE=false`. | Provedor de LLM cloud (OpenAI, Together, Groq, etc.). | Ex: `https://api.openai.com/v1` |
| `LLM_CLOUD_API_KEY` | Não | (vazio) | Chave de API do provedor cloud. | Dashboard do provedor. | **Secret sensível.** Nunca exponha em frontend. |
| `LLM_CLOUD_MODEL` | Não | (vazio) | Modelo a usar no provedor cloud. | Documentação do provedor. | Ex: `gpt-4o-mini`, `llama-3.1-70b` |

### LLM - Forge API (alternativa cloud)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `BUILT_IN_FORGE_API_URL` | Não | (vazio) | URL da API Forge (server-side). Se preenchido, tem prioridade sobre `LLM_CLOUD_API_URL`. | — | Opcional. |
| `BUILT_IN_FORGE_API_KEY` | Não | (vazio) | Chave da API Forge (server-side). | — | **Secret sensível.** |
| `VITE_FRONTEND_FORGE_API_KEY` | Não | (vazio) | Chave Forge para frontend (chamadas client-side). | — | Opcional. |
| `VITE_FRONTEND_FORGE_API_URL` | Não | (vazio) | URL Forge para frontend. | — | Opcional. |

### Stripe (Pagamentos)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `STRIPE_SECRET_KEY` | Não* | (vazio) | Chave secreta do Stripe. Prefixo `sk_test_` para modo teste. | [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) → Secret key. | **Nunca use `sk_live_` no homolog.** Secret sensível. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Não* | (vazio) | Chave pública do Stripe. Prefixo `pk_test_` para modo teste. | Mesmo dashboard → Publishable key. | Pode ser exposta no frontend (é pública por design). |
| `STRIPE_WEBHOOK_SECRET` | Não* | (vazio) | Secret para validar webhooks do Stripe. Prefixo `whsec_`. | Stripe Dashboard → Webhooks → Signing secret. | **Nunca exponha.** Sem ele, webhooks são ignorados. |

> *As variáveis Stripe são opcionais para o funcionamento básico da app, mas **obrigatórias para testar pagamentos**.

### Owner (Proprietário)

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `OWNER_OPEN_ID` | Não | (vazio) | ID Google (sub claim) do proprietário. Será admin automático. | Após primeiro login, consultar no banco: `SELECT open_id FROM users LIMIT 1`. | — |
| `OWNER_NAME` | Não | (vazio) | Nome do proprietário. | Definir manualmente. | — |

### Analytics (Opcional)

A aplicação suporta dois sistemas de analytics simultaneamente: **Google Analytics (GA4)** e um serviço self-hosted (Umami, Plausible, etc.). Ambos são opcionais e controlados pela mesma variável `VITE_ANALYTICS_WEBSITE_ID`.

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `VITE_ANALYTICS_ENDPOINT` | Não | (vazio) | URL do endpoint de analytics self-hosted (ex: Umami, Plausible). | Seu serviço de analytics. | Se vazio, o script Umami não é carregado. |
| `VITE_ANALYTICS_WEBSITE_ID` | Não | (vazio) | **Google Analytics GA4 Measurement ID** no formato `G-XXXXXXXXXX`. Também usado como ID do website no serviço self-hosted. | [Google Analytics](https://analytics.google.com) → Admin → Data Streams → Measurement ID. Para debuga.ai produção: `G-HG4FKJS83J`. | Se vazio, o Google Analytics **não é carregado** (nenhum script gtag.js é injetado). Para White Label, usar o Measurement ID do GA4 do cliente. |

### Backup

| Variável | Obrigatória | Valor padrão | Função | Onde obter | Cuidados |
|----------|:-----------:|--------------|--------|------------|----------|
| `BACKUP_RETENTION_DAYS` | Não | `7` | Dias para manter backups antigos antes de excluir automaticamente. | Definir conforme política. | — |

## Validação Rápida

Após preencher o `.env`, verifique que as variáveis obrigatórias estão definidas:

```bash
# Verificar variáveis obrigatórias
echo "=== Verificação de variáveis obrigatórias ==="
for var in DOMAIN APP_URL AUTH_BASE_URL JWT_SECRET SESSION_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET POSTGRES_PASSWORD S3_ACCESS_KEY S3_SECRET_KEY MINIO_ROOT_USER MINIO_ROOT_PASSWORD; do
  val=$(grep "^${var}=" .env | cut -d'=' -f2-)
  if [ -z "$val" ] || echo "$val" | grep -q "CHANGE_ME"; then
    echo "FALTANDO: $var"
  else
    echo "OK: $var (${#val} caracteres)"
  fi
done
```

## Checklist Pré-Deploy

Antes de executar `docker compose build`, confirme:

- [ ] `DOMAIN` correto (sem `https://`, sem barra final)
- [ ] `APP_URL` e `AUTH_BASE_URL` com `https://` e sem barra final
- [ ] `VITE_OAUTH_PORTAL_URL=/api/auth/google`
- [ ] Google OAuth configurado (Client ID + Secret + redirect URI exata)
- [ ] `JWT_SECRET` e `SESSION_SECRET` preenchidos (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` forte (mínimo 16 caracteres)
- [ ] MinIO sem `minioadmin`/`minioadmin` (`S3_ACCESS_KEY`, `S3_SECRET_KEY`, `MINIO_ROOT_*`)
- [ ] Stripe em modo teste (`sk_test_`, `pk_test_`) ou vazio se não usar
- [ ] `ENABLE_LOCAL_INFERENCE=false` em VPS sem GPU
- [ ] Arquivo `.env` com permissão `600`: `chmod 600 .env`
- [ ] `.env` está no `.gitignore` (verificar: `grep .env .gitignore`)
- [ ] Nenhum secret aparece em prints, screenshots ou logs compartilhados

## Próximo Passo

Executar a instalação: [03-INSTALACAO.md](03-INSTALACAO.md).
