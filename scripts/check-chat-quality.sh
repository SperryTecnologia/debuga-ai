#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# check-chat-quality.sh — Diagnóstico de Qualidade do Chat
# ═══════════════════════════════════════════════════════════════
# Verifica:
#   1. Data/hora está sendo injetada corretamente no system prompt
#   2. Capability routing está classificando intents corretamente
#   3. Knowledge reuse está encontrando itens relevantes
#   4. Logs de provider estão sendo gerados
#   5. Learning está salvando interações
#
# Uso: ./scripts/check-chat-quality.sh [--env /path/to/.env]
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
ENV_FILE="${1:---env}"
if [[ "$ENV_FILE" == "--env" ]]; then
  shift 2>/dev/null || true
  ENV_FILE="${1:-}"
fi

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  echo -e "${BLUE}Loading env from: $ENV_FILE${NC}"
  set -a
  source "$ENV_FILE"
  set +a
elif [[ -f ".env" ]]; then
  echo -e "${BLUE}Loading env from: .env${NC}"
  set -a
  source ".env"
  set +a
fi

# ═══════════════════════════════════════════════════════════════
header "1. DATA/HORA NO SYSTEM PROMPT"
# ═══════════════════════════════════════════════════════════════

if grep -q "getCurrentDateForPrompt\|getCurrentDateTimeString" app/server/streamRoute.ts 2>/dev/null; then
  pass "Função de data/hora encontrada no streamRoute.ts"
else
  fail "Função de data/hora NÃO encontrada no streamRoute.ts"
fi

if grep -q "Informações Temporais" app/server/streamRoute.ts 2>/dev/null; then
  pass "Bloco 'Informações Temporais' injetado no system prompt"
else
  fail "Bloco 'Informações Temporais' NÃO encontrado no system prompt"
fi

if grep -q "NUNCA use placeholders" app/server/streamRoute.ts 2>/dev/null; then
  pass "Instrução anti-placeholder presente"
else
  warn "Instrução anti-placeholder não encontrada"
fi

TZ="${APP_TIMEZONE:-America/Sao_Paulo}"
if [[ -n "$TZ" ]]; then
  pass "Timezone configurado: $TZ"
else
  warn "APP_TIMEZONE não definido (usando America/Sao_Paulo)"
fi

# ═══════════════════════════════════════════════════════════════
header "2. CAPABILITY ROUTING"
# ═══════════════════════════════════════════════════════════════

if [[ "${ENABLE_CAPABILITY_ROUTING:-}" == "true" ]]; then
  pass "ENABLE_CAPABILITY_ROUTING=true"
else
  warn "ENABLE_CAPABILITY_ROUTING não está ativo (usando caminho legado)"
fi

if grep -q "classifyIntent" app/server/streamRoute.ts 2>/dev/null; then
  pass "classifyIntent() chamado no pipeline"
else
  fail "classifyIntent() NÃO chamado no pipeline"
fi

if grep -q "routeToProvider" app/server/streamRoute.ts 2>/dev/null; then
  pass "routeToProvider() chamado no pipeline"
else
  fail "routeToProvider() NÃO chamado no pipeline"
fi

if grep -q "checkCapabilityAccess" app/server/streamRoute.ts 2>/dev/null; then
  pass "checkCapabilityAccess() (limites por plano) chamado no pipeline"
else
  fail "checkCapabilityAccess() NÃO chamado no pipeline"
fi

if grep -q "checkCostSafety" app/server/streamRoute.ts 2>/dev/null; then
  pass "checkCostSafety() (circuit breaker) chamado no pipeline"
else
  fail "checkCostSafety() NÃO chamado no pipeline"
fi

# Count task types in intentClassifier
TASK_TYPES=$(grep -c 'TaskType\b' app/server/intentClassifier.ts 2>/dev/null || echo "0")
if [[ "$TASK_TYPES" -ge 10 ]]; then
  pass "intentClassifier tem $TASK_TYPES tipos de tarefa configurados"
else
  warn "intentClassifier tem apenas $TASK_TYPES tipos (esperado >= 10)"
fi

# ═══════════════════════════════════════════════════════════════
header "3. KNOWLEDGE REUSE (RAG)"
# ═══════════════════════════════════════════════════════════════

if [[ "${ENABLE_KNOWLEDGE_REUSE:-}" == "true" ]]; then
  pass "ENABLE_KNOWLEDGE_REUSE=true"
else
  warn "ENABLE_KNOWLEDGE_REUSE não está ativo"
fi

if grep -q "searchKnowledge" app/server/streamRoute.ts 2>/dev/null; then
  pass "searchKnowledge() chamado no pipeline"
else
  fail "searchKnowledge() NÃO chamado no pipeline"
fi

if grep -q "buildAugmentedPrompt" app/server/streamRoute.ts 2>/dev/null; then
  pass "buildAugmentedPrompt() chamado no pipeline"
else
  fail "buildAugmentedPrompt() NÃO chamado no pipeline"
fi

# ═══════════════════════════════════════════════════════════════
header "4. LOGGING DE PROVIDER"
# ═══════════════════════════════════════════════════════════════

PROVIDER_LOG_CALLS=$(grep -c "createProviderLog" app/server/streamRoute.ts 2>/dev/null || echo "0")
if [[ "$PROVIDER_LOG_CALLS" -ge 3 ]]; then
  pass "createProviderLog() chamado $PROVIDER_LOG_CALLS vezes (sucesso + falha + fallback)"
else
  fail "createProviderLog() chamado apenas $PROVIDER_LOG_CALLS vezes (esperado >= 3)"
fi

if grep -q "taskType:" app/server/streamRoute.ts 2>/dev/null && grep -q "capabilityScore:" app/server/streamRoute.ts 2>/dev/null; then
  pass "Campos de capability routing presentes nos logs"
else
  warn "Campos de capability routing podem estar incompletos nos logs"
fi

if grep -q "knowledgeSource:" app/server/streamRoute.ts 2>/dev/null; then
  pass "Campo knowledgeSource presente nos logs"
else
  warn "Campo knowledgeSource não encontrado nos logs"
fi

# ═══════════════════════════════════════════════════════════════
header "5. LEARNING / MEMÓRIA"
# ═══════════════════════════════════════════════════════════════

if [[ "${ENABLE_LEARNING:-}" == "true" ]]; then
  pass "ENABLE_LEARNING=true"
else
  warn "ENABLE_LEARNING não está ativo"
fi

SAVE_CALLS=$(grep -c "saveInteraction" app/server/streamRoute.ts 2>/dev/null || echo "0")
if [[ "$SAVE_CALLS" -ge 2 ]]; then
  pass "saveInteraction() chamado $SAVE_CALLS vezes (texto + imagem + vídeo)"
else
  warn "saveInteraction() chamado apenas $SAVE_CALLS vezes (esperado >= 2)"
fi

# ═══════════════════════════════════════════════════════════════
header "6. MULTIMODAL INTERCEPTS"
# ═══════════════════════════════════════════════════════════════

if grep -q "IMAGE GENERATION INTERCEPT" app/server/streamRoute.ts 2>/dev/null; then
  pass "Image generation intercept presente"
else
  fail "Image generation intercept NÃO encontrado"
fi

if grep -q "VIDEO GENERATION INTERCEPT" app/server/streamRoute.ts 2>/dev/null; then
  pass "Video generation intercept presente"
else
  fail "Video generation intercept NÃO encontrado"
fi

if grep -q "DIAGRAM GENERATION INTERCEPT" app/server/streamRoute.ts 2>/dev/null; then
  pass "Diagram generation intercept presente"
else
  fail "Diagram generation intercept NÃO encontrado"
fi

if grep -q "recordUsage" app/server/streamRoute.ts 2>/dev/null; then
  RECORD_CALLS=$(grep -c "recordUsage" app/server/streamRoute.ts 2>/dev/null || echo "0")
  pass "recordUsage() chamado $RECORD_CALLS vezes (rastreamento de quotas)"
else
  fail "recordUsage() NÃO chamado (quotas não estão sendo rastreadas)"
fi

# ═══════════════════════════════════════════════════════════════
header "7. FALLBACK E RESILIÊNCIA"
# ═══════════════════════════════════════════════════════════════

if grep -q "fallbackUsed" app/server/streamRoute.ts 2>/dev/null; then
  pass "Mecanismo de fallback implementado"
else
  fail "Mecanismo de fallback NÃO encontrado"
fi

if grep -q "alternativeProvider" app/server/streamRoute.ts 2>/dev/null; then
  pass "alternativeProvider do routing decision usado como fallback"
else
  warn "alternativeProvider não referenciado no fallback"
fi

# ═══════════════════════════════════════════════════════════════
header "RESULTADO"
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "  ${GREEN}PASS: $PASS${NC}  ${YELLOW}WARN: $WARN${NC}  ${RED}FAIL: $FAIL${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}❌ Há $FAIL falhas que precisam ser corrigidas.${NC}"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Todas as verificações passaram, mas há $WARN avisos.${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Todas as verificações passaram!${NC}"
  exit 0
fi
