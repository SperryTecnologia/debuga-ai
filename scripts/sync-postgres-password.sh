#!/usr/bin/env bash
# ============================================================
# debuga.ai — Sync PostgreSQL Password
#
# Problema: Quando o volume /data/debuga/postgres já existe,
# o Postgres NÃO re-executa initdb, então a senha do .env
# pode estar diferente da senha no banco (se foi alterada).
#
# Este script:
#   1. Lê POSTGRES_USER e POSTGRES_PASSWORD do .env
#   2. Altera a senha do usuário no PostgreSQL via ALTER ROLE
#   3. Testa conexão TCP com a nova senha (como o app faz)
#
# Uso:
#   bash scripts/sync-postgres-password.sh --env /opt/debuga-ai/.env
#   bash scripts/sync-postgres-password.sh  (usa .env no diretório atual)
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
else
  echo -e "${RED}✗ .env não encontrado: $ENV_FILE${NC}"
  exit 1
fi

# ── Defaults ──
POSTGRES_USER="${POSTGRES_USER:-debuga}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}"
POSTGRES_DB="${POSTGRES_DB:-debuga_prod}"
CONTAINER_NAME="${CONTAINER_NAME:-debuga-postgres}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  debuga.ai — Sync PostgreSQL Password                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Container: $CONTAINER_NAME"
echo "  User:      $POSTGRES_USER"
echo "  Database:  $POSTGRES_DB"
echo ""

# ── Verificar se container está rodando ──
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${RED}✗ Container '$CONTAINER_NAME' não está rodando.${NC}"
  exit 1
fi

# ── Alterar senha via peer auth (socket local dentro do container) ──
echo "→ Alterando senha do usuário '$POSTGRES_USER'..."

# Escape single quotes in password for SQL
ESCAPED_PASSWORD="${POSTGRES_PASSWORD//\'/\'\'}"

docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -c \
  "ALTER ROLE \"$POSTGRES_USER\" WITH PASSWORD '${ESCAPED_PASSWORD}';" 2>/dev/null

if [[ $? -eq 0 ]]; then
  echo -e "${GREEN}✓ Senha alterada com sucesso via ALTER ROLE.${NC}"
else
  echo -e "${RED}✗ Falha ao alterar senha.${NC}"
  exit 1
fi

# ── Testar conexão TCP com a nova senha (como o app faz) ──
echo ""
echo "→ Testando conexão TCP com a nova senha..."

# Use pg_isready with password via PGPASSWORD env var
RESULT=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER_NAME" \
  psql -h 127.0.0.1 -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 'tcp_ok'" 2>&1 || echo "FAIL")

if [[ "$RESULT" == *"tcp_ok"* ]]; then
  echo -e "${GREEN}✓ Conexão TCP autenticada com sucesso!${NC}"
else
  echo -e "${RED}✗ Conexão TCP falhou: $RESULT${NC}"
  echo ""
  echo -e "${YELLOW}Possíveis causas:${NC}"
  echo "  1. pg_hba.conf não permite auth via md5/scram para 127.0.0.1"
  echo "  2. Senha contém caracteres que precisam de escape"
  echo "  3. Banco '$POSTGRES_DB' não existe (rode ensure-database.sh primeiro)"
  exit 1
fi

# ── Testar a DATABASE_URL completa ──
echo ""
echo "→ Testando DATABASE_URL completa..."

# URL-encode the password for the connection string
ENCODED_PASSWORD=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$POSTGRES_PASSWORD', safe=''))" 2>/dev/null || echo "$POSTGRES_PASSWORD")
TEST_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}?sslmode=disable"

RESULT2=$(docker exec -e DATABASE_URL="$TEST_URL" "$CONTAINER_NAME" \
  psql "$TEST_URL" -tAc "SELECT current_user || '@' || current_database()" 2>&1 || echo "FAIL")

if [[ "$RESULT2" == *"${POSTGRES_USER}@${POSTGRES_DB}"* ]]; then
  echo -e "${GREEN}✓ DATABASE_URL funciona: $RESULT2${NC}"
else
  echo -e "${YELLOW}⚠ Teste DATABASE_URL falhou (pode ser normal se python3 não está no container).${NC}"
  echo "  O teste TCP direto passou, então a senha está correta."
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Resultado: Senha sincronizada com sucesso.${NC}"
echo ""
echo "  Próximo passo: reiniciar o app para usar a nova conexão:"
echo "    docker compose -f docker/docker-compose.yml restart app"
echo "═══════════════════════════════════════════════════════════"
