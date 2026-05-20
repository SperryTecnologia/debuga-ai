#!/usr/bin/env bash
# ============================================================
# debuga.ai - Install Script
# Sets up TLS certificates, MinIO bucket, and pulls LLM models.
# Run from the project root: ./scripts/install.sh
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INSTALL]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ── Check .env ──
[[ -f .env ]] || err ".env file not found. Copy .env.example to .env and fill in values."

# shellcheck disable=SC1091
source .env

DOMAIN="${DOMAIN:-debuga.ai}"

# ── TLS Certificate ──
log "Setting up TLS certificate for ${DOMAIN}..."
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  log "Certificate already exists for ${DOMAIN}."
else
  log "Requesting certificate from Let's Encrypt..."
  certbot certonly --standalone \
    -d "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${ADMIN_EMAIL:-admin@debuga.ai}" \
    --http-01-port 80 || {
    warn "Certbot failed. You may need to:"
    warn "  1. Ensure DNS A record points to this server"
    warn "  2. Ensure port 80 is open"
    warn "  3. Run certbot manually: sudo certbot certonly --standalone -d ${DOMAIN}"
  }
fi

# ── Start infrastructure services first ──
log "Starting PostgreSQL and MinIO..."
cd docker
docker compose up -d postgres minio
log "Waiting for services to be healthy..."
sleep 10

# ── MinIO bucket setup ──
log "Setting up MinIO bucket..."
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"
S3_BUCKET="${S3_BUCKET:-debuga-prod}"

# Install mc (MinIO client) if not present
if ! command -v mc &>/dev/null; then
  log "Installing MinIO client (mc)..."
  curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc
  chmod +x /usr/local/bin/mc
fi

mc alias set debuga-minio http://localhost:9000 "${MINIO_USER}" "${MINIO_PASS}" 2>/dev/null || true
mc mb "debuga-minio/${S3_BUCKET}" 2>/dev/null || log "Bucket '${S3_BUCKET}' already exists."
mc anonymous set download "debuga-minio/${S3_BUCKET}" 2>/dev/null || true
log "MinIO bucket '${S3_BUCKET}' ready."

# ── Pull Ollama models ──
log "Starting Ollama and pulling models..."
docker compose up -d ollama
sleep 15

log "Pulling recommended models (this may take 10-30 minutes)..."
docker exec debuga-ollama ollama pull qwen3.5:latest || warn "Failed to pull qwen3.5"
docker exec debuga-ollama ollama pull qwen2.5-coder:7b-instruct-q4_K_M || warn "Failed to pull qwen2.5-coder"

log "Verifying models..."
docker exec debuga-ollama ollama list

cd "$PROJECT_DIR"

echo ""
log "========================================="
log "  Installation complete!"
log "========================================="
log ""
log "Next step: ./scripts/deploy.sh"
