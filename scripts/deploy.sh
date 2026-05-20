#!/usr/bin/env bash
# ============================================================
# debuga.ai - Deploy Script
# Builds and starts all services.
# Usage: ./scripts/deploy.sh [--gpu]
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

[[ -f .env ]] || err ".env file not found."

GPU_FLAG=""
COMPOSE_FILES="-f docker/docker-compose.yml"

if [[ "${1:-}" == "--gpu" ]]; then
  GPU_FLAG="--gpu"
  COMPOSE_FILES="${COMPOSE_FILES} -f docker/docker-compose.gpu.yml"
  log "GPU mode enabled."
fi

log "Building application image..."
docker compose ${COMPOSE_FILES} build app

log "Starting all services..."
docker compose ${COMPOSE_FILES} up -d

log "Waiting for health checks..."
sleep 15

# ── Health check ──
log "Checking service health..."
SERVICES=("debuga-app" "debuga-postgres" "debuga-minio" "debuga-ollama" "debuga-nginx")
ALL_HEALTHY=true

for svc in "${SERVICES[@]}"; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "no-healthcheck")
  if [[ "$STATUS" == "healthy" || "$STATUS" == "no-healthcheck" ]]; then
    log "  ✓ ${svc}: ${STATUS}"
  else
    warn "  ✗ ${svc}: ${STATUS}"
    ALL_HEALTHY=false
  fi
done

echo ""
if $ALL_HEALTHY; then
  log "========================================="
  log "  Deploy successful!"
  log "========================================="
  log ""
  log "  Application: https://${DOMAIN:-debuga.ai}"
  log "  MinIO Console: http://localhost:9001"
  log "  PostgreSQL: localhost:5432"
  log "  Ollama API: http://localhost:11434"
else
  warn "Some services are not healthy. Check logs:"
  warn "  docker compose ${COMPOSE_FILES} logs --tail=50"
fi
