#!/usr/bin/env bash
# ============================================================
# debuga.ai - Restore Script
# Restores PostgreSQL from a backup file.
# Usage: ./scripts/restore.sh <backup_file.tar.gz>
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[RESTORE]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $# -ge 1 ]] || err "Usage: ./scripts/restore.sh <backup_file.tar.gz>"

BACKUP_FILE="$1"
[[ -f "$BACKUP_FILE" ]] || err "Backup file not found: $BACKUP_FILE"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

[[ -f .env ]] && source .env

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

DUMP_FILE=$(find "$TEMP_DIR" -name "postgres.dump" | head -1)
[[ -n "$DUMP_FILE" ]] || err "No postgres.dump found in backup"

warn "This will REPLACE the current database. Continue? (y/N)"
read -r CONFIRM
[[ "$CONFIRM" == "y" || "$CONFIRM" == "Y" ]] || { log "Aborted."; exit 0; }

log "Stopping application..."
docker compose -f docker/docker-compose.yml stop app 2>/dev/null || true

log "Restoring PostgreSQL..."
docker exec -i debuga-postgres pg_restore \
  -U "${POSTGRES_USER:-debuga}" \
  -d "${POSTGRES_DB:-debuga_prod}" \
  --clean --if-exists \
  < "$DUMP_FILE" || warn "Some restore warnings (usually safe to ignore)"

# Restore MinIO if present
MINIO_DIR=$(find "$TEMP_DIR" -type d -name "minio" | head -1)
if [[ -n "$MINIO_DIR" ]] && command -v mc &>/dev/null; then
  log "Restoring MinIO data..."
  mc mirror --overwrite "$MINIO_DIR" "debuga-minio/${S3_BUCKET:-debuga-prod}/" 2>/dev/null || true
fi

log "Restarting application..."
docker compose -f docker/docker-compose.yml start app

log "Restore complete."
