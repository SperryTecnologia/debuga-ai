# 18. Observabilidade

Guia de monitoramento, logs e alertas para o debuga.ai em ambiente self-hosted.

---

## Visão Geral

Observabilidade é a capacidade de entender o estado interno do sistema a partir de suas saídas externas. No contexto do debuga.ai, isso envolve três pilares:

| Pilar | O que captura | Ferramentas |
|-------|--------------|-------------|
| **Logs** | Eventos textuais (erros, requisições, ações) | Docker logs, journald |
| **Métricas** | Valores numéricos ao longo do tempo (CPU, RAM, latência) | docker stats, Prometheus |
| **Traces** | Fluxo de uma requisição através dos serviços | OpenTelemetry (opcional) |

Para a maioria dos deploys self-hosted, os **logs** e **métricas básicas** são suficientes. Traces são recomendados apenas para ambientes de alta escala.

---

## 1. Logs do Docker

### Visualizar Logs em Tempo Real

```bash
# Todos os serviços
docker compose -f docker/docker-compose.yml logs -f

# Serviço específico
docker compose -f docker/docker-compose.yml logs -f app
docker compose -f docker/docker-compose.yml logs -f postgres
docker compose -f docker/docker-compose.yml logs -f nginx
docker compose -f docker/docker-compose.yml logs -f minio
docker compose -f docker/docker-compose.yml logs -f ollama

# Últimas N linhas
docker compose -f docker/docker-compose.yml logs --tail=50 app

# Com timestamp
docker compose -f docker/docker-compose.yml logs -f --timestamps app
```

### Filtrar Logs

```bash
# Apenas erros
docker compose -f docker/docker-compose.yml logs app 2>&1 | grep -i "error"

# Requisições HTTP (Nginx)
docker compose -f docker/docker-compose.yml logs nginx | grep "POST\|GET"

# Erros de banco
docker compose -f docker/docker-compose.yml logs postgres | grep -i "fatal\|error"

# Logs de um período específico
docker compose -f docker/docker-compose.yml logs --since="2025-01-15T10:00:00" app
docker compose -f docker/docker-compose.yml logs --since="1h" app
```

### Configurar Log Driver

No `docker-compose.yml`, configure o driver de logs para rotação automática:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"    # Tamanho máximo por arquivo
        max-file: "5"      # Número máximo de arquivos
```

Isso garante que os logs não consumam todo o disco. Com `max-size: 10m` e `max-file: 5`, cada container usa no máximo 50 MB de logs.

---

## 2. Métricas de Recursos

### docker stats (Tempo Real)

```bash
# Todos os containers
docker stats

# Formato personalizado
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Apenas uma vez (sem stream)
docker stats --no-stream
```

### Métricas do Host

```bash
# CPU e RAM
top -bn1 | head -5

# Disco
df -h

# Rede
ss -tuln

# Processos Docker
docker system df
```

### Script de Monitoramento Simples

Crie um script para coletar métricas periodicamente:

```bash
#!/bin/bash
# scripts/monitor.sh
LOG_FILE="/var/log/debuga-monitor.log"
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Métricas do host
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
MEM=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
DISK=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')

# Status dos containers
CONTAINERS=$(docker compose -f /opt/debuga-ai/docker/docker-compose.yml ps --format json 2>/dev/null | jq -r '.State' | sort | uniq -c)

echo "$DATE cpu=$CPU% mem=$MEM% disk=$DISK% containers=[$CONTAINERS]" >> $LOG_FILE

# Alerta se disco > 85%
if [ "$DISK" -gt 85 ]; then
  echo "$DATE ALERTA: Disco em ${DISK}%!" >> $LOG_FILE
fi
```

Adicionar ao cron:

```bash
# A cada 5 minutos
echo "*/5 * * * * /opt/debuga-ai/scripts/monitor.sh" | crontab -
```

---

## 3. Health Checks

### Endpoints de Saúde

O debuga.ai expõe endpoints que podem ser verificados:

| Endpoint | Verifica | Resposta esperada |
|----------|---------|-------------------|
| `GET /` | App rodando | HTTP 200 (HTML) |
| `GET /api/trpc/auth.me` | API + Auth | HTTP 200 (JSON) |

### Script de Health Check

```bash
#!/bin/bash
# scripts/healthcheck.sh
APP_URL="${APP_URL:-https://localhost}"

# Verificar app
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$APP_URL")
if [ "$HTTP_CODE" != "200" ]; then
  echo "$(date -u) ERRO: App retornou HTTP $HTTP_CODE"
  # Opcional: reiniciar automaticamente
  # docker compose -f /opt/debuga-ai/docker/docker-compose.yml restart app
fi

# Verificar PostgreSQL
docker exec debuga-postgres pg_isready -U postgres > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "$(date -u) ERRO: PostgreSQL não está respondendo"
fi

# Verificar MinIO
MINIO_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "http://localhost:9000/minio/health/live")
if [ "$MINIO_CODE" != "200" ]; then
  echo "$(date -u) ERRO: MinIO retornou HTTP $MINIO_CODE"
fi
```

### Docker Health Checks (docker-compose.yml)

Adicionar health checks nativos do Docker:

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 4. Rotação de Logs

### Logrotate (Host)

Se os logs forem persistidos no host, configure o logrotate:

```bash
sudo tee /etc/logrotate.d/debuga << 'EOF'
/var/log/debuga-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF
```

### Docker Log Rotation

Configurar globalmente em `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Após alterar, reiniciar o Docker:

```bash
sudo systemctl restart docker
```

---

## 5. Alertas

### Alerta por E-mail (Simples)

Usando `msmtp` ou `sendmail`:

```bash
#!/bin/bash
# scripts/alert.sh
SUBJECT="[debuga.ai] ALERTA: $1"
BODY="$2"
RECIPIENT="admin@seudominio.com.br"

echo -e "Subject: $SUBJECT\n\n$BODY" | msmtp "$RECIPIENT"
```

### Alerta via Webhook (Discord/Slack)

```bash
#!/bin/bash
# scripts/alert-webhook.sh
WEBHOOK_URL="https://discord.com/api/webhooks/..."
MESSAGE="$1"

curl -H "Content-Type: application/json" \
     -d "{\"content\": \"🚨 **debuga.ai** - $MESSAGE\"}" \
     "$WEBHOOK_URL"
```

### Integrar com Health Check

```bash
#!/bin/bash
# scripts/healthcheck-alert.sh
APP_URL="${APP_URL:-https://localhost}"

HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "$APP_URL" --max-time 10)
if [ "$HTTP_CODE" != "200" ]; then
  ./scripts/alert-webhook.sh "App offline! HTTP $HTTP_CODE em $(date -u)"
fi
```

Cron para verificação a cada 2 minutos:

```bash
*/2 * * * * /opt/debuga-ai/scripts/healthcheck-alert.sh
```

---

## 6. Agregação de Logs (Avançado)

Para ambientes maiores ou múltiplas instâncias White Label, considere uma stack de agregação:

### Opção A: Loki + Grafana (Recomendado)

| Componente | Função | Recurso |
|-----------|--------|---------|
| Loki | Armazenamento de logs | ~512 MB RAM |
| Promtail | Coleta de logs | ~128 MB RAM |
| Grafana | Visualização e alertas | ~256 MB RAM |

Adicionar ao `docker-compose.yml`:

```yaml
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
```

### Opção B: Dozzle (Visualização Simples)

Para apenas visualizar logs via web, sem persistência:

```yaml
services:
  dozzle:
    image: amir20/dozzle:latest
    ports:
      - "9999:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

Acesse `http://servidor:9999` para ver logs de todos os containers em tempo real.

---

## 7. Monitoramento de GPU (Ollama)

Se estiver usando GPU:

```bash
# Status da GPU
nvidia-smi

# Monitoramento contínuo (a cada 2s)
watch -n 2 nvidia-smi

# Uso de VRAM pelo Ollama
docker exec debuga-ollama nvidia-smi --query-gpu=memory.used,memory.total --format=csv

# Logs do Ollama
docker compose -f docker/docker-compose.yml logs -f ollama
```

---

## 8. Métricas de Aplicação

### Logs Estruturados do App

O debuga.ai emite logs no formato:

```
[timestamp] [level] [module] message
```

Para extrair métricas dos logs:

```bash
# Contagem de erros por hora
docker compose -f docker/docker-compose.yml logs --since="1h" app | grep -c "ERROR"

# Requisições ao LLM (novo formato de log)
docker compose -f docker/docker-compose.yml logs --since="1h" app | grep -c "\[LLM\] Provider:"

# Fallbacks LLM (local -> cloud)
docker compose -f docker/docker-compose.yml logs --since="1h" app | grep -c "\[LLM\] FALLBACK:"

# Logins
docker compose -f docker/docker-compose.yml logs --since="24h" app | grep -c "oauth/callback"
```

---

## Resumo de Comandos Essenciais

| Ação | Comando |
|------|---------|
| Ver logs em tempo real | `docker compose logs -f app` |
| Ver últimos erros | `docker compose logs app \| grep -i error \| tail -20` |
| Status dos containers | `docker compose ps` |
| Uso de recursos | `docker stats --no-stream` |
| Espaço em disco | `df -h && docker system df` |
| Health check manual | `curl -I https://seudominio.com.br` |
| Verificar PostgreSQL | `docker exec debuga-postgres pg_isready` |
| Verificar MinIO | `curl http://localhost:9000/minio/health/live` |
| Limpar logs antigos | `docker system prune --volumes` |

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| `docs/10-TROUBLESHOOTING.md` | Problemas comuns e soluções |
| `docs/14-SELF-HOSTED.md` | Deploy self-hosted |
| `docs/19-SEGURANCA.md` | Segurança e hardening |
| `docs/09-BACKUP-RESTORE.md` | Backup e restauração |
