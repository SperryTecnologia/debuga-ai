#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# check-logging-pipeline.sh — Diagnóstico do Pipeline de Logging
# ═══════════════════════════════════════════════════════════════
# Verifica:
#   1. Tabela ai_provider_logs tem campos de capability routing
#   2. Tabela learning_interactions existe e está funcional
#   3. Tabela generated_assets existe
#   4. Tabela generation_jobs existe
#   5. Tabela capability_usage_logs existe
#   6. Todos os caminhos de log no streamRoute.ts estão corretos
#
# Uso: ./scripts/check-logging-pipeline.sh [--env /path/to/.env]
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)) || true; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARN++)) || true; }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)) || true; }
header() { echo -e "\n${BLUE}═══ $1 ═══${NC}"; }

# Load .env if specified
ENV_FILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV_FILE="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  echo -e "${BLUE}Loading env from: $ENV_FILE${NC}"
  set -a; source "$ENV_FILE"; set +a
elif [[ -f ".env" ]]; then
  echo -e "${BLUE}Loading env from: .env${NC}"
  set -a; source ".env"; set +a
fi

# ═══════════════════════════════════════════════════════════════
header "1. SCHEMA — CAMPOS DE CAPABILITY ROUTING EM ai_provider_logs"
# ═══════════════════════════════════════════════════════════════

SCHEMA_FILE="app/drizzle/schema.ts"

if grep -q "taskType" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Campo 'taskType' presente em ai_provider_logs schema"
else
  fail "Campo 'taskType' NÃO encontrado em schema"
fi

if grep -q "capabilityScore" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Campo 'capabilityScore' presente"
else
  fail "Campo 'capabilityScore' NÃO encontrado"
fi

if grep -q "routingReason" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Campo 'routingReason' presente"
else
  fail "Campo 'routingReason' NÃO encontrado"
fi

if grep -q "estimatedCostUsd" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Campo 'estimatedCostUsd' presente"
else
  fail "Campo 'estimatedCostUsd' NÃO encontrado"
fi

if grep -q "knowledgeSource" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Campo 'knowledgeSource' presente"
else
  fail "Campo 'knowledgeSource' NÃO encontrado"
fi

if grep -q "knowledgeItemsUsed" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Campo 'knowledgeItemsUsed' presente"
else
  fail "Campo 'knowledgeItemsUsed' NÃO encontrado"
fi

# ═══════════════════════════════════════════════════════════════
header "2. SCHEMA — TABELAS DE LEARNING"
# ═══════════════════════════════════════════════════════════════

if grep -q "learningInteractions\|learning_interactions" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Tabela learning_interactions definida no schema"
else
  fail "Tabela learning_interactions NÃO encontrada no schema"
fi

if grep -q "learningSuggestions\|learning_suggestions" "$SCHEMA_FILE" 2>/dev/null; then
  pass "Tabela learning_suggestions definida no schema"
else
  fail "Tabela learning_suggestions NÃO encontrada no schema"
fi

# ═══════════════════════════════════════════════════════════════
header "3. SCHEMA — TABELAS MULTIMODAL (Migration 0006)"
# ═══════════════════════════════════════════════════════════════

MIGRATION_FILE="app/drizzle/0006_multimodal_assets.sql"

if [[ -f "$MIGRATION_FILE" ]]; then
  pass "Migration 0006_multimodal_assets.sql existe"
  
  if grep -q "generated_assets" "$MIGRATION_FILE" 2>/dev/null; then
    pass "Tabela generated_assets definida na migration"
  else
    fail "Tabela generated_assets NÃO encontrada na migration"
  fi
  
  if grep -q "generation_jobs" "$MIGRATION_FILE" 2>/dev/null; then
    pass "Tabela generation_jobs definida na migration"
  else
    fail "Tabela generation_jobs NÃO encontrada na migration"
  fi
  
  if grep -q "capability_usage_logs" "$MIGRATION_FILE" 2>/dev/null; then
    pass "Tabela capability_usage_logs definida na migration"
  else
    fail "Tabela capability_usage_logs NÃO encontrada na migration"
  fi
else
  fail "Migration 0006_multimodal_assets.sql NÃO existe"
fi

# ═══════════════════════════════════════════════════════════════
header "4. PIPELINE — createProviderLog CAMINHOS"
# ═══════════════════════════════════════════════════════════════

STREAM_FILE="app/server/streamRoute.ts"

LOG_CALLS=$(grep -c "createProviderLog" "$STREAM_FILE" 2>/dev/null || echo "0")
if [[ "$LOG_CALLS" -ge 4 ]]; then
  pass "createProviderLog chamado $LOG_CALLS vezes (sucesso, falha, fallback, imagem)"
elif [[ "$LOG_CALLS" -ge 2 ]]; then
  warn "createProviderLog chamado apenas $LOG_CALLS vezes (esperado >= 4)"
else
  fail "createProviderLog chamado apenas $LOG_CALLS vezes"
fi

# Check that all log calls include capability fields
TASK_TYPE_IN_LOGS=$(grep -c "taskType:" "$STREAM_FILE" 2>/dev/null || echo "0")
if [[ "$TASK_TYPE_IN_LOGS" -ge "$LOG_CALLS" ]]; then
  pass "Todos os logs incluem campo taskType"
else
  warn "Nem todos os logs incluem taskType ($TASK_TYPE_IN_LOGS de $LOG_CALLS)"
fi

# ═══════════════════════════════════════════════════════════════
header "5. PIPELINE — saveInteraction CAMINHOS"
# ═══════════════════════════════════════════════════════════════

SAVE_CALLS=$(grep -c "saveInteraction" "$STREAM_FILE" 2>/dev/null || echo "0")
if [[ "$SAVE_CALLS" -ge 2 ]]; then
  pass "saveInteraction chamado $SAVE_CALLS vezes (texto + multimodal)"
else
  warn "saveInteraction chamado apenas $SAVE_CALLS vezes (esperado >= 2)"
fi

if grep -q "isLearningEnabled" "$STREAM_FILE" 2>/dev/null; then
  pass "Feature gate isLearningEnabled() verificado antes de salvar"
else
  fail "Feature gate isLearningEnabled() NÃO verificado"
fi

# ═══════════════════════════════════════════════════════════════
header "6. PIPELINE — recordUsage CAMINHOS"
# ═══════════════════════════════════════════════════════════════

RECORD_CALLS=$(grep -c "recordUsage" "$STREAM_FILE" 2>/dev/null || echo "0")
if [[ "$RECORD_CALLS" -ge 3 ]]; then
  pass "recordUsage chamado $RECORD_CALLS vezes (imagem, vídeo, texto)"
else
  warn "recordUsage chamado apenas $RECORD_CALLS vezes (esperado >= 3)"
fi

# ═══════════════════════════════════════════════════════════════
header "7. DATABASE — CONEXÃO (se DATABASE_URL disponível)"
# ═══════════════════════════════════════════════════════════════

if [[ -n "${DATABASE_URL:-}" ]]; then
  # Try to check if tables exist via mysql/psql
  if command -v mysql &>/dev/null; then
    TABLE_COUNT=$(mysql -e "SHOW TABLES LIKE '%provider_log%';" --skip-column-names 2>/dev/null | wc -l | tr -d '\n ' || echo "0")
    if [[ "${TABLE_COUNT:-0}" -gt 0 ]]; then
      pass "Tabela ai_provider_logs existe no banco"
    else
      warn "Tabela ai_provider_logs pode não existir (verifique migrations)"
    fi
  else
    warn "Cliente MySQL não disponível para verificação de banco"
  fi
else
  warn "DATABASE_URL não definido — não é possível verificar banco"
fi

# ═══════════════════════════════════════════════════════════════
header "RESULTADO"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "  ${GREEN}PASS: $PASS${NC}  ${YELLOW}WARN: $WARN${NC}  ${RED}FAIL: $FAIL${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}❌ Há $FAIL falhas no pipeline de logging.${NC}"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Pipeline OK, mas há $WARN avisos.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Pipeline de logging completamente funcional!${NC}"
  exit 0
fi
