# 10 - Troubleshooting

Este documento reúne problemas reais encontrados durante o desenvolvimento e deploy do ambiente de homologação, com diagnóstico e solução para cada um.

## Diagnóstico Rápido

Antes de investigar qualquer problema, execute estes comandos para ter uma visão geral do estado do sistema:

```bash
# Status de todos os containers
docker compose -f docker/docker-compose.yml ps

# Logs da aplicação (últimas 50 linhas)
docker logs debuga-app --tail=50

# Logs do Nginx
docker logs debuga-nginx --tail=20

# Uso de recursos
docker stats --no-stream
```

## Diferença entre setup, install, build e deploy

Antes de diagnosticar, é importante entender o que cada etapa faz:

| Comando | O que faz | Quando usar |
|---------|-----------|-------------|
| `./scripts/setup.sh` | Instala Docker, UFW, fail2ban no servidor | Apenas uma vez, no servidor novo |
| `./scripts/install.sh` | Configura TLS (certbot), MinIO, baixa modelos | Apenas uma vez, após setup |
| `docker compose build` | Compila a imagem Docker da aplicação | Após mudanças no código |
| `docker compose up -d` | Inicia os containers | Após build ou para reiniciar |
| `./scripts/deploy.sh` | Faz build + up automaticamente | Atalho para build + up |

---

## Problemas de Build

### ERR_PNPM_PATCH_NOT_FOUND — patches/wouter@3.7.1.patch

**Sintoma:** O build falha durante `pnpm install` com erro:

```
ERR_PNPM_PATCH_NOT_FOUND  Could not find patch file patches/wouter@3.7.1.patch
```

**Causa:** O `pnpm-lock.yaml` referencia `patchedDependencies` (wouter), mas a pasta `patches/` não foi copiada para o container antes de executar `pnpm install`.

**Status:** **Corrigido no Dockerfile atual.** As linhas `COPY app/patches ./patches` existem em todos os stages (deps e runtime) antes de `pnpm install`.

**Se usar Dockerfile antigo:** Adicione `COPY app/patches ./patches` antes de cada `RUN pnpm install` no Dockerfile.

### Cannot find module '/app/dist/server/index.js'

**Sintoma:** O container `debuga-app` reinicia em loop com erro:

```
Error: Cannot find module '/app/dist/server/index.js'
```

**Causa:** O CMD do Dockerfile apontava para `dist/server/index.js`, mas o esbuild gera o bundle em `dist/index.js`.

**Status:** **Corrigido no Dockerfile atual.** O CMD agora é `["node", "dist/index.js"]`.

**Se usar Dockerfile antigo:** Altere a última linha do Dockerfile para:
```dockerfile
CMD ["node", "dist/index.js"]
```

### Build lento ou travado

**Causa provável:** Pouca memória RAM ou disco cheio.

**Diagnóstico:**
```bash
# Verificar memória
free -h

# Verificar disco
df -h

# Limpar imagens Docker antigas
docker system prune -af
```

---

## Problemas de Container

### App unhealthy (container reiniciando)

**Sintoma:** `docker compose ps` mostra `debuga-app` como `unhealthy` ou `restarting`.

**Diagnóstico:**
```bash
docker logs debuga-app --tail=50
```

**Causas e soluções:**

| Erro no log | Causa | Solução |
|-------------|-------|---------|
| `ECONNREFUSED ...postgres:5432` | PostgreSQL não está pronto | Aguardar healthcheck ou verificar `docker logs debuga-postgres` |
| `JWT_SECRET` vazio | Variável não definida | Preencher no `.env`: `openssl rand -hex 32` |
| `DATABASE_URL` incorreto | String de conexão malformada | Formato: `postgresql://user:pass@postgres:5432/db?sslmode=disable` |
| `GOOGLE_CLIENT_ID` vazio | OAuth não configurado | Preencher no `.env` (ver `docs/05-GOOGLE-OAUTH.md`) |
| `Error: listen EADDRINUSE :::3000` | Porta 3000 já em uso | Parar outro processo na porta ou reiniciar containers |

### Nginx não sobe (depende do app)

**Sintoma:** `debuga-nginx` fica em `waiting` ou não inicia.

**Causa:** O Nginx tem `depends_on: app: condition: service_healthy`. Se a app não ficar healthy, o Nginx nunca inicia.

**Solução:** Resolver primeiro o problema da app (ver seção acima). O Nginx iniciará automaticamente quando a app estiver healthy.

**Diagnóstico:**
```bash
# Verificar se a app está healthy
docker inspect debuga-app | grep -A 5 '"Health"'

# Se a app está rodando mas não healthy, testar manualmente
docker exec debuga-app wget --no-verbose --tries=1 --spider http://localhost:3000/
```

### Ollama unhealthy em VPS sem GPU

**Sintoma:** `debuga-ollama` aparece como `unhealthy` ou extremamente lento.

**Causa:** O Ollama está rodando em CPU (sem GPU), o que é muito lento para modelos grandes.

**Solução:** O Ollama é **opcional**. No deploy padrão, ele não é iniciado (usa `profiles: [gpu]`). Se foi iniciado acidentalmente:

```bash
# Parar apenas o Ollama
docker compose -f docker/docker-compose.yml stop ollama

# Garantir que ENABLE_LOCAL_INFERENCE=false no .env
grep ENABLE_LOCAL_INFERENCE .env
```

### Porta 3000 recusada (Connection refused)

**Sintoma:** `curl http://localhost:3000/` retorna "Connection refused".

**Diagnóstico:**
```bash
# Verificar se o container está rodando
docker compose -f docker/docker-compose.yml ps app

# Verificar se a porta está mapeada
docker port debuga-app

# Verificar logs
docker logs debuga-app --tail=30
```

**Causas comuns:**
- Container não está rodando (verificar `docker compose ps`)
- App falhou ao iniciar (verificar logs)
- Porta mapeada para `127.0.0.1:3000` (correto — não é acessível externamente, apenas via Nginx)

---

## Problemas de Rede e TLS

### Certbot falha — DNS não propagado

**Sintoma:** `certbot` retorna erro de validação ao tentar emitir certificado.

**Causa:** O DNS ainda não propagou ou o registro A está incorreto.

**Solução:**
```bash
# Verificar DNS
dig seu-dominio.com.br +short
# Deve retornar o IP do servidor

# Se não retornar, aguardar propagação (até 48h, geralmente minutos)
# Ou verificar o registro A no painel do provedor DNS
```

### Certbot falha — porta 80 bloqueada

**Sintoma:** Certbot não consegue validar o domínio (challenge HTTP-01 falha).

**Causa:** A porta 80 está bloqueada pelo firewall do provedor de VPS (além do UFW local).

**Solução:**
1. Verificar UFW local:
   ```bash
   sudo ufw status
   # Deve mostrar 80 e 443 como ALLOW
   ```
2. Verificar firewall do provedor (painel web da VPS):
   - AWS: Security Group → Inbound Rules → permitir 80 e 443
   - DigitalOcean: Networking → Firewalls → permitir 80 e 443
   - Outros: Verificar painel de firewall/segurança

3. Testar se a porta 80 está acessível:
   ```bash
   # Do seu computador local
   nc -zv <IP_DO_SERVIDOR> 80
   # Deve retornar "Connection succeeded"
   ```

### Provedor bloqueia portas 80/443

**Sintoma:** Mesmo com UFW configurado, as portas não são acessíveis externamente.

**Causa:** Alguns provedores de VPS (especialmente os mais baratos) bloqueiam portas por padrão ou exigem configuração adicional no painel.

**Solução:**
- Usar uma VPS de provedor que não bloqueie portas (DigitalOcean, Linode, Vultr, Hetzner).
- Ou configurar o firewall externo no painel do provedor.
- Para testes rápidos, usar `ngrok` ou `cloudflared` como tunnel temporário.

### Certificado TLS expirado

**Sintoma:** Navegador mostra "Connection not secure" ou `ERR_CERT_DATE_INVALID`.

**Solução:**
```bash
# Renovar certificado
sudo certbot renew

# Restart Nginx para carregar o novo certificado
docker compose -f docker/docker-compose.yml restart nginx

# Verificar validade
sudo certbot certificates
```

---

## Problemas de Autenticação

### redirect_uri_mismatch (Google OAuth)

**Causa:** A URI de redirect no Google Console não corresponde exatamente à que a aplicação envia.

**Solução:** Verificar que **Authorized redirect URIs** no Google Console contém exatamente:
```
https://seu-dominio.com.br/api/auth/google/callback
```

Erros frequentes: `http://` em vez de `https://`, barra no final (`/callback/`), porta na URL, `www.` no domínio.

Ver `docs/05-GOOGLE-OAUTH.md` para detalhes completos.

### access_denied (Google OAuth)

**Causa:** App em modo "Testing" e o email não está na lista de usuários de teste.

**Solução:** Adicionar o email em **APIs & Services** → **OAuth consent screen** → **Test users**. Ou publicar a app.

### Cookie não persiste após login

**Causa:** `JWT_SECRET` vazio ou alterado entre restarts.

**Solução:**
```bash
# Verificar que JWT_SECRET está definido
docker exec debuga-app env | grep JWT_SECRET
# Deve retornar uma string de 32+ caracteres
```

---

## Problemas de Pagamento (Stripe)

### Webhook retorna 400/401

**Causa:** `STRIPE_WEBHOOK_SECRET` incorreto ou ausente.

**Solução:** Verificar que o `whsec_` no `.env` corresponde ao endpoint no Dashboard do Stripe. Cada endpoint tem seu próprio secret.

### Webhook retorna 404

**Causa:** URL do webhook incorreta.

**Solução:** A URL deve ser exatamente: `https://seu-dominio.com.br/api/stripe/webhook`

### Chaves live no homolog

**Sintoma:** Cobranças reais aparecem no Stripe.

**Causa:** Chaves `sk_live_` / `pk_live_` foram usadas em vez de `sk_test_` / `pk_test_`.

**Solução URGENTE:**
1. Trocar imediatamente para chaves de teste no `.env`.
2. Restart da app: `docker compose -f docker/docker-compose.yml restart app`
3. No Dashboard do Stripe, reverter/estornar cobranças indevidas.

---

## Problemas de Storage (MinIO)

### MinIO inacessível

```bash
# Verificar health
curl -sf http://localhost:9000/minio/health/live && echo "MinIO OK"

# Verificar logs
docker logs debuga-minio --tail=20

# Verificar se o container está rodando
docker compose -f docker/docker-compose.yml ps minio
```

### Bucket não existe

**Causa:** O bucket é criado automaticamente pela aplicação no primeiro uso. Se a app não iniciou corretamente, o bucket pode não existir.

**Solução:** Reiniciar a app ou criar manualmente via MinIO console (porta 9001 via SSH tunnel).

---

## Problemas de Banco de Dados

### PostgreSQL não aceita conexões

```bash
# Verificar health
docker exec debuga-postgres pg_isready -U debuga -d debuga_homolog

# Verificar logs
docker logs debuga-postgres --tail=20
```

### Banco corrompido

```bash
# Verificar integridade
docker exec debuga-postgres pg_isready -U debuga

# Restaurar backup
./scripts/restore.sh backups/<ultimo_backup>.tar.gz
```

---

## Comandos de Diagnóstico Avançado

| Comando | O que mostra |
|---------|-------------|
| `docker compose -f docker/docker-compose.yml ps` | Status de todos os containers |
| `docker logs <container> --tail=50` | Últimas 50 linhas de log |
| `docker logs <container> -f` | Logs em tempo real |
| `docker inspect <container> \| grep -A 5 Health` | Estado do healthcheck |
| `docker exec <container> env` | Variáveis de ambiente do container |
| `docker stats --no-stream` | Uso de CPU/RAM de cada container |
| `docker system df` | Uso de disco pelo Docker |
| `docker network inspect debuga-net` | IPs dos containers na rede |
| `sudo ss -tlnp \| grep -E ':(80\|443\|3000\|5432)'` | Portas em uso no host |

## Resumo de Correções Aplicadas

| Problema | Status | Detalhes |
|----------|--------|----------|
| CMD errado (`dist/server/index.js`) | Corrigido | CMD agora é `node dist/index.js` |
| Patches ENOENT no build | Corrigido | `patches/` copiado antes de `pnpm install` em todos os stages |
| Healthcheck 401 | Corrigido | Healthcheck usa `GET /` em vez de `/api/trpc/auth.me` |
| Ollama obrigatório | Corrigido | Ollama movido para `profiles: [gpu]` — opcional |
| `VITE_OAUTH_PORTAL_URL` ausente no build | Corrigido | Adicionado como build arg no `docker-compose.yml` |

## Reiniciar Tudo

```bash
cd /opt/debuga-ai

# Sem Ollama (padrão)
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d

# Com Ollama
docker compose -f docker/docker-compose.yml --profile gpu down
docker compose -f docker/docker-compose.yml --profile gpu up -d
```

## Suporte

Para problemas não cobertos aqui, verifique os logs detalhados e abra uma issue no repositório interno.
