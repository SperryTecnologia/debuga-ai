#!/usr/bin/env bash
# ============================================================
# debuga.ai - Backup Script
# Creates timestamped backups of PostgreSQL and MinIO data.
# Usage: ./scripts/backup.sh
# Recommended: cron job every 6 hours
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[BACKUP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; }
err() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $*"; exit 1; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

[[ -f .env ]] && source .env

BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

mkdir -p "${BACKUP_PATH}"

# ── PostgreSQL backup ──
log "Backing up PostgreSQL..."
docker exec debuga-postgres pg_dump \
  -U "${POSTGRES_USER:-debuga}" \
  -d "${POSTGRES_DB:-debuga_prod}" \
  --format=custom \
  --compress=9 \
  > "${BACKUP_PATH}/postgres.dump" 2>/dev/null || err "PostgreSQL backup failed"

PG_SIZE=$(du -sh "${BACKUP_PATH}/postgres.dump" | cut -f1)
log "PostgreSQL backup: ${PG_SIZE}"

# ── MinIO data backup ──
log "Backing up MinIO data..."
if command -v mc &>/dev/null; then
  mc mirror --overwrite \
    "debuga-minio/${S3_BUCKET:-debuga-prod}" \
    "${BACKUP_PATH}/minio/" 2>/dev/null || log "MinIO backup: no data or mc not configured"
else
  log "MinIO client (mc) not found. Skipping MinIO backup."
fi

# ── Compress ──
log "Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${TIMESTAMP}.tar.gz" "${TIMESTAMP}/"
rm -rf "${TIMESTAMP}/"
FINAL_SIZE=$(du -sh "${TIMESTAMP}.tar.gz" | cut -f1)
log "Backup compressed: ${FINAL_SIZE} → ${BACKUP_DIR}/${TIMESTAMP}.tar.gz"

# ── Cleanup old backups ──
log "Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(ls -1 "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | wc -l)
log "Remaining backups: ${REMAINING}"

log "Backup complete."
