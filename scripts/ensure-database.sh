#!/usr/bin/env bash
# ============================================================
# debuga.ai - Ensure Database Exists
# Cria o banco de dados definido em POSTGRES_DB se ele não existir.
# Idempotente: pode ser executado múltiplas vezes sem efeito colateral.
#
# Uso:
#   bash scripts/ensure-database.sh --env /opt/debuga-ai/.env
#   bash scripts/ensure-database.sh  (usa .env no diretório atual)
#
# Cenário:
#   Quando o volume /data/debuga/postgres já existe (PGDATA não-vazio),
#   o Postgres pula a inicialização e não cria POSTGRES_DB.
#   Este script resolve isso criando o banco manualmente.
# ============================================================

set -euo pipefail

# ── Carregar .env ──
ENV_FILE=".env"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# ── Defaults ──
POSTGRES_USER="${POSTGRES_USER:-debuga}"
POSTGRES_DB="${POSTGRES_DB:-debuga_prod}"
CONTAINER_NAME="${CONTAINER_NAME:-debuga-postgres}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  debuga.ai — Ensure Database                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Container: $CONTAINER_NAME"
echo "  User:      $POSTGRES_USER"
echo "  Database:  $POSTGRES_DB"
echo ""

# ── Verificar se container está rodando ──
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "⚠ Container '$CONTAINER_NAME' não está rodando."
  echo "  Tentando iniciar o Postgres..."
  docker compose -f docker/docker-compose.yml up -d postgres 2>/dev/null || true
  echo "  Aguardando 10s para Postgres iniciar..."
  sleep 10
fi

# ── Verificar se container está acessível ──
if ! docker exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -q 2>/dev/null; then
  echo "✗ Postgres não está respondendo no container '$CONTAINER_NAME'."
  echo "  Verifique: docker logs $CONTAINER_NAME"
  exit 1
fi

# ── Verificar se banco existe ──
DB_EXISTS=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname='$POSTGRES_DB'" 2>/dev/null || echo "")

if [[ "$DB_EXISTS" == "1" ]]; then
  echo "✓ Banco '$POSTGRES_DB' já existe."
else
  echo "→ Banco '$POSTGRES_DB' não existe. Criando..."
  docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c \
    "CREATE DATABASE \"$POSTGRES_DB\" OWNER \"$POSTGRES_USER\";" 2>/dev/null

  if [[ $? -eq 0 ]]; then
    echo "✓ Banco '$POSTGRES_DB' criado com sucesso."
  else
    echo "✗ Falha ao criar banco '$POSTGRES_DB'."
    exit 1
  fi
fi

# ── Verificar conectividade ao banco ──
if docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "✓ Conexão ao banco '$POSTGRES_DB' verificada."
else
  echo "✗ Falha ao conectar ao banco '$POSTGRES_DB' após criação."
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Resultado: Banco '$POSTGRES_DB' pronto para uso."
echo "═══════════════════════════════════════════════════════════"
