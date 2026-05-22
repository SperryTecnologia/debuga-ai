#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# check-public-repo-clean.sh
#
# Verifica que o repositório público não contém referências sensíveis.
# Uso: bash scripts/check-public-repo-clean.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Verificação de Limpeza — Repo Público debuga-ai"
echo "═══════════════════════════════════════════════════"
echo ""

# Patterns that should NOT appear in public repo
SENSITIVE_PATTERNS=(
  "POSTGRES_PASSWORD"
  "API_KEY="
  "SECRET_KEY="
  "BREVO_SMTP"
  "/opt/debuga-ai"
  "node_modules"
  ".manus"
  "checkpoint"
  "sandbox"
  "iluysperry"
  "GITHUB_PAT"
  "Bearer "
  "sk-"
  "ghp_"
)

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
  MATCHES=$(grep -rn "$pattern" "$REPO_DIR" \
    --include="*.md" --include="*.sh" --include="*.ts" --include="*.tsx" \
    --include="*.js" --include="*.json" --include="*.yml" --include="*.yaml" \
    --exclude-dir=".git" --exclude-dir="node_modules" \
    --exclude="check-public-repo-clean.sh" \
    --exclude="VALIDATION_SCRIPTS.md" 2>/dev/null || true)
  
  if [[ -n "$MATCHES" ]]; then
    echo -e "${RED}[FAIL]${NC} Padrão sensível encontrado: '$pattern'"
    echo "$MATCHES" | head -5 | sed 's/^/       /'
    ERRORS=$((ERRORS + 1))
  fi
done

# Check for .env files
ENV_FILES=$(find "$REPO_DIR" -name ".env*" -not -name ".env.example" -not -path "*/.git/*" 2>/dev/null || true)
if [[ -n "$ENV_FILES" ]]; then
  echo -e "${RED}[FAIL]${NC} Arquivo .env encontrado (não deveria estar no repo público):"
  echo "$ENV_FILES" | sed 's/^/       /'
  ERRORS=$((ERRORS + 1))
fi

# Check for large binary files
LARGE_FILES=$(find "$REPO_DIR" -size +1M -not -path "*/.git/*" 2>/dev/null || true)
if [[ -n "$LARGE_FILES" ]]; then
  echo -e "${YELLOW}[WARN]${NC} Arquivos grandes (>1MB) encontrados:"
  echo "$LARGE_FILES" | sed 's/^/       /'
fi

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✓ Repositório público está limpo${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}═══════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ✗ $ERRORS problema(s) encontrado(s)${NC}"
  echo -e "${RED}  Corrija antes de fazer push para o repo público.${NC}"
  echo -e "${RED}═══════════════════════════════════════════════════${NC}"
  exit 1
fi
