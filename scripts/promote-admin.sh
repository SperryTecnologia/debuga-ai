#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# promote-admin.sh — Promove um usuário a administrador no debuga.ai
# ─────────────────────────────────────────────────────────────────────────────
# Uso:
#   ./scripts/promote-admin.sh <email>
#
# Exemplos:
#   ./scripts/promote-admin.sh admin@empresa.com
#   ./scripts/promote-admin.sh "joao@debuga.ai"
#
# Requisitos:
#   - Docker rodando com container PostgreSQL (debuga-postgres)
#   - Ou variável DATABASE_URL definida para conexão direta
#   - Arquivo .env na raiz do projeto com POSTGRES_DB, POSTGRES_USER
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -lt 1 ]; then
  echo -e "${RED}Erro: Informe o e-mail do usuário.${NC}"
  echo ""
  echo "Uso: $0 <email>"
  echo "Exemplo: $0 admin@empresa.com"
  exit 1
fi

EMAIL="$1"

# ── Load .env if available ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

if [ -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}Carregando variáveis de: ${ENV_FILE}${NC}"
  set -a
  source "$ENV_FILE"
  set +a
fi

# ── Resolve database name and user from env (with fallbacks) ──
DB_NAME="${POSTGRES_DB:-debuga_db}"
DB_USER="${POSTGRES_USER:-debuga}"

echo -e "${YELLOW}Promovendo ${EMAIL} a admin no banco '${DB_NAME}'...${NC}"

# ── SQL to execute ──
SQL="UPDATE users SET role = 'admin', \"isActive\" = true, \"updatedAt\" = NOW()
WHERE LOWER(email) = LOWER('${EMAIL}')
RETURNING id, email, name, role;"

# Determine how to connect to PostgreSQL
if [ -n "${DATABASE_URL:-}" ]; then
  # Use DATABASE_URL directly (preferred)
  echo -e "${YELLOW}Conectando via DATABASE_URL...${NC}"
  RESULT=$(psql "${DATABASE_URL}" -t -A -c "$SQL")
elif command -v docker &> /dev/null && docker ps --format '{{.Names}}' | grep -q "debuga-postgres"; then
  # Use Docker container with correct DB name
  echo -e "${YELLOW}Conectando via Docker (container: debuga-postgres, db: ${DB_NAME})...${NC}"
  RESULT=$(docker exec debuga-postgres psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$SQL")
else
  echo -e "${RED}Erro: Não foi possível conectar ao banco.${NC}"
  echo "Opções:"
  echo "  1. Defina DATABASE_URL no ambiente ou .env"
  echo "  2. Certifique-se que o container 'debuga-postgres' está rodando"
  echo ""
  echo "Variáveis detectadas:"
  echo "  POSTGRES_DB=${DB_NAME}"
  echo "  POSTGRES_USER=${DB_USER}"
  echo "  DATABASE_URL=${DATABASE_URL:-(não definida)}"
  exit 1
fi

if [ -z "$RESULT" ]; then
  echo -e "${RED}Erro: Nenhum usuário encontrado com o e-mail '${EMAIL}'.${NC}"
  echo ""
  echo "Verifique se o usuário já fez login/registro pelo menos uma vez."
  echo ""
  echo "Usuários disponíveis:"
  LIST_SQL="SELECT id, email, name, role FROM users ORDER BY id LIMIT 20;"
  if [ -n "${DATABASE_URL:-}" ]; then
    psql "${DATABASE_URL}" -c "$LIST_SQL"
  elif docker ps --format '{{.Names}}' | grep -q "debuga-postgres" 2>/dev/null; then
    docker exec debuga-postgres psql -U "$DB_USER" -d "$DB_NAME" -c "$LIST_SQL"
  fi
  exit 1
fi

echo -e "${GREEN}Sucesso! Usuário promovido a admin:${NC}"
echo "$RESULT" | while IFS='|' read -r id email name role; do
  echo "  ID: $id"
  echo "  Email: $email"
  echo "  Nome: $name"
  echo "  Role: $role"
done

echo ""
echo -e "${GREEN}O usuário agora pode acessar /admin no navegador.${NC}"
