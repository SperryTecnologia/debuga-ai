#!/usr/bin/env bash
# ============================================================
# debuga.ai — Deploy Script
#
# Builda a aplicação, sobe todos os serviços, garante banco,
# roda migrations e valida health.
#
# Uso:
#   bash scripts/deploy.sh              # Core (sem GPU)
#   bash scripts/deploy.sh --gpu        # Core + Ollama GPU
#   bash scripts/deploy.sh --no-build   # Pula build (usa imagem existente)
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ── Parse args ──
GPU_MODE=false
NO_BUILD=false
ENV_FILE=".env"
prev_arg=""

for arg in "$@"; do
  if [[ "$prev_arg" == "--env" ]]; then
    ENV_FILE="$arg"
    prev_arg="$arg"
    continue
  fi
  case "$arg" in
    --gpu) GPU_MODE=true ;;
    --no-build) NO_BUILD=true ;;
    --env) ;; # next arg is the file
  esac
  prev_arg="$arg"
done

# ── Validar .env ──
[[ -f "$ENV_FILE" ]] || err ".env não encontrado: $ENV_FILE"
set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

COMPOSE_FILES="-f docker/docker-compose.yml"
if $GPU_MODE; then
  COMPOSE_FILES="${COMPOSE_FILES} -f docker/docker-compose.gpu.yml"
  log "Modo GPU ativado"
fi

DOMAIN="${DOMAIN:-debuga.ai}"

# ============================================================
# 1. Build
# ============================================================
if $NO_BUILD; then
  info "Pulando build (--no-build)"
else
  log "Buildando imagem da aplicação..."
  docker compose ${COMPOSE_FILES} build app
  log "✓ Build concluído"
fi

# ============================================================
# 2. Subir serviços
# ============================================================
log "Iniciando serviços..."

if $GPU_MODE; then
  docker compose ${COMPOSE_FILES} --profile gpu up -d
else
  docker compose ${COMPOSE_FILES} up -d
fi

log "✓ Containers iniciados"

# ============================================================
# 3. Garantir banco existe
# ============================================================
log "Verificando banco de dados..."
sleep 5
bash scripts/ensure-database.sh --env "$ENV_FILE"

# ============================================================
# 4. Migrations
# ============================================================
if [[ -d "app/drizzle" ]] && ls app/drizzle/*.sql &>/dev/null 2>&1; then
  log "Migrations disponíveis — serão aplicadas pelo app no startup"
fi

# ============================================================
# 5. Health checks
# ============================================================
log "Aguardando health checks (30s)..."
sleep 15

SERVICES=("debuga-app" "debuga-postgres" "debuga-minio" "debuga-nginx")
if $GPU_MODE; then
  SERVICES+=("debuga-ollama")
fi

ALL_HEALTHY=true
echo ""
for svc in "${SERVICES[@]}"; do
  if ! docker ps --format '{{.Names}}' | grep -q "^${svc}$"; then
    warn "  ✗ ${svc}: não está rodando"
    ALL_HEALTHY=false
    continue
  fi
  
  STATUS=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$svc" 2>/dev/null || echo "unknown")
  
  case "$STATUS" in
    healthy)       log  "  ✓ ${svc}: healthy" ;;
    starting)      info "  ◌ ${svc}: starting (aguardando)" ;;
    no-healthcheck) info "  ○ ${svc}: running (sem healthcheck)" ;;
    *)             warn "  ✗ ${svc}: ${STATUS}"; ALL_HEALTHY=false ;;
  esac
done

echo ""

# ============================================================
# 6. Resultado
# ============================================================
if $ALL_HEALTHY; then
  log "========================================="
  log "  Deploy realizado com sucesso!"
  log "========================================="
  echo ""
  log "  Aplicação:     https://${DOMAIN}"
  log "  MinIO Console: http://127.0.0.1:9001"
  log "  PostgreSQL:    127.0.0.1:5432"
  if $GPU_MODE; then
    log "  Ollama API:    http://127.0.0.1:11434"
  fi
  echo ""
  log "  Validação completa:"
  log "    bash scripts/validate-all.sh --env ${ENV_FILE}"
else
  warn "========================================="
  warn "  Deploy parcial — alguns serviços com problemas"
  warn "========================================="
  echo ""
  warn "  Verificar logs:"
  warn "    docker compose ${COMPOSE_FILES} logs --tail=50"
  echo ""
  exit 1
fi
