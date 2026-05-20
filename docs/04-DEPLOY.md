# 04 - Deploy

## Pré-requisitos

- Docker Engine 24+ e Docker Compose v2
- Certificado TLS configurado (ver `03-TLS.md`)
- Arquivo `.env` preenchido (ver `02-CONFIGURACAO.md`)

## Deploy Padrão (sem GPU / sem Ollama)

A maioria dos deploys não precisa de GPU ou Ollama local. O agente funciona normalmente usando LLM cloud (configurado via `LLM_API_KEY` e `LLM_API_URL` no `.env`).

```bash
cd /opt/debuga-ai

# Copiar e preencher variáveis de ambiente
cp .env.example .env
nano .env  # preencher secrets obrigatórios

# Build da imagem (multi-stage, inclui frontend + backend)
docker compose -f docker/docker-compose.yml build --no-cache

# Iniciar serviços essenciais (postgres, minio, app, nginx)
docker compose -f docker/docker-compose.yml up -d
```

Os serviços iniciados são: **postgres**, **minio**, **app** e **nginx**. O Ollama **não** é iniciado por padrão (usa `profiles: [gpu]`).

## Deploy com GPU (Ollama local)

Se você possui GPU NVIDIA e deseja inferência local com Ollama:

```bash
# Iniciar TODOS os serviços, incluindo Ollama
docker compose -f docker/docker-compose.yml --profile gpu up -d

# Após o Ollama estar rodando, baixar o modelo desejado
docker exec debuga-ollama ollama pull llama3.1:8b
```

Certifique-se de que:
- O NVIDIA Container Toolkit está instalado no host
- `ENABLE_LOCAL_INFERENCE=true` está definido no `.env`
- Descomente a seção `deploy.resources` no `docker-compose.yml` para reservar a GPU

## O Que o Deploy Faz

1. **Build da imagem Docker** da aplicação (multi-stage: deps → build → runtime)
   - O Dockerfile copia `patches/` antes de `pnpm install` (necessário para `patchedDependencies` do wouter)
   - Frontend é compilado com Vite → `dist/public/`
   - Backend é compilado com esbuild → `dist/index.js`
2. **Inicia os serviços** na ordem correta (postgres → minio → app → nginx)
3. **Healthcheck** da app usa `GET /` (retorna a SPA)
4. **Nginx** faz proxy reverso com TLS, rate limiting e SSE support

## Verificação Pós-Deploy

```bash
# Status dos containers
docker compose -f docker/docker-compose.yml ps

# Logs da aplicação
docker logs debuga-app --tail=50

# Testar endpoint (deve retornar HTML da SPA)
curl -sf https://seu-dominio.com.br/ && echo "App OK"

# Testar API (retorna 401 se não autenticado — isso é esperado)
curl -s https://seu-dominio.com.br/api/trpc/auth.me | head -c 200
```

## Atualização (Re-deploy)

Para aplicar alterações no código:

```bash
cd /opt/debuga-ai

# Rebuild e restart apenas da app
docker compose -f docker/docker-compose.yml build --no-cache app
docker compose -f docker/docker-compose.yml up -d app

# Nginx reinicia automaticamente quando a app fica healthy
```

## Parar Todos os Serviços

```bash
docker compose -f docker/docker-compose.yml down
```

Para remover volumes (**PERDA DE DADOS**):

```bash
docker compose -f docker/docker-compose.yml down -v
```

## Detalhes Técnicos

| Item | Valor |
|------|-------|
| CMD do container | `node dist/index.js` |
| Porta interna | 3000 |
| Healthcheck | `GET /` (wget) |
| Build output (frontend) | `dist/public/` |
| Build output (backend) | `dist/index.js` |
| Patches | `patches/wouter@3.7.1.patch` (copiado antes do install) |
| Ollama | Opcional — profile `gpu` |

## Próximo Passo

Configurar Google OAuth: `05-GOOGLE-OAUTH.md`.
