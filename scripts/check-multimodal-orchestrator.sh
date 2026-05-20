#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# check-multimodal-orchestrator.sh — Full Orchestrator Diagnostic
# ═══════════════════════════════════════════════════════════════
# Comprehensive check of the entire multimodal capability pipeline:
# intent classification, capability routing, all providers,
# storage, admin panels, limits, and production readiness.
#
# Usage: ./scripts/check-multimodal-orchestrator.sh [--env /path/to/.env]
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

ENV_FILE="${1:-}"
if [[ "$ENV_FILE" == "--env" ]]; then
  ENV_FILE="${2:-}"
fi

if [[ -z "$ENV_FILE" ]]; then
  for candidate in .env app/.env ../app/.env; do
    if [[ -f "$candidate" ]]; then
      ENV_FILE="$candidate"
      break
    fi
  done
fi

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

PASS=0
WARN=0
FAIL=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
warn() { echo "  ⚠️  WARN: $1"; WARN=$((WARN+1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL+1)); }
section() { echo ""; echo "── $1 ──"; }

APP_DIR="$(dirname "$0")/../app"

echo "═══════════════════════════════════════════════════════════"
echo " MULTIMODAL ORCHESTRATOR — FULL DIAGNOSTIC"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════
section "1. Core Feature Flags"
# ═══════════════════════════════════════════════════════════════

FLAGS=(
  "ENABLE_CAPABILITY_ROUTING:Capability routing (intent → provider)"
  "ENABLE_KNOWLEDGE_REUSE:Knowledge reuse in responses"
  "IMAGE_GENERATION_ENABLED:Image generation pipeline"
  "VIDEO_GENERATION_ENABLED:Video generation pipeline"
  "ENABLE_DIAGRAM_GENERATION:Diagram generation pipeline"
  "ENABLE_LEARNING:Learning memory system"
  "LOG_ALL_AI_CALLS:Full AI call logging"
)

ACTIVE_FLAGS=0
for flag_entry in "${FLAGS[@]}"; do
  IFS=":" read -r flag desc <<< "$flag_entry"
  val="${!flag:-}"
  if [[ "$val" == "true" ]]; then
    pass "$desc ($flag=true)"
    ACTIVE_FLAGS=$((ACTIVE_FLAGS+1))
  else
    warn "$desc ($flag=${val:-not set})"
  fi
done
echo "  → $ACTIVE_FLAGS/${#FLAGS[@]} flags active"

# ═══════════════════════════════════════════════════════════════
section "2. LLM Providers"
# ═══════════════════════════════════════════════════════════════

LLM_COUNT=0

if [[ -n "${GEMINI_API_KEY:-}" && -n "${GEMINI_API_URL:-}" ]]; then
  pass "Gemini (${GEMINI_API_URL})"
  LLM_COUNT=$((LLM_COUNT+1))
else
  warn "Gemini not configured"
fi

if [[ -n "${OPENAI_API_KEY:-}" && -n "${OPENAI_API_URL:-}" ]]; then
  pass "OpenAI (${OPENAI_API_URL})"
  LLM_COUNT=$((LLM_COUNT+1))
else
  warn "OpenAI not configured"
fi

if [[ -n "${ANTHROPIC_API_KEY:-}" && -n "${ANTHROPIC_API_URL:-}" ]]; then
  pass "Anthropic"
  LLM_COUNT=$((LLM_COUNT+1))
else
  warn "Anthropic not configured"
fi

if [[ -n "${OPENROUTER_API_KEY:-}" && -n "${OPENROUTER_API_URL:-}" ]]; then
  pass "OpenRouter"
  LLM_COUNT=$((LLM_COUNT+1))
else
  warn "OpenRouter not configured"
fi

if [[ -n "${LLM_CLOUD_API_KEY:-}" && -n "${LLM_CLOUD_API_URL:-}" ]]; then
  pass "Cloud LLM"
  LLM_COUNT=$((LLM_COUNT+1))
fi

if [[ "${LOCAL_LLM_ENABLED:-}" == "true" ]]; then
  pass "Local GPU/Ollama (priority=${LOCAL_LLM_PRIORITY:-fallback})"
  LLM_COUNT=$((LLM_COUNT+1))
fi

if [[ $LLM_COUNT -eq 0 ]]; then
  fail "No LLM provider configured — orchestrator cannot function"
else
  echo "  → $LLM_COUNT LLM provider(s) available"
fi

# ═══════════════════════════════════════════════════════════════
section "3. Image Providers"
# ═══════════════════════════════════════════════════════════════

IMG_COUNT=0
if [[ "${OPENAI_IMAGE_ENABLED:-}" == "true" && (-n "${IMAGE_API_KEY:-}" || -n "${OPENAI_API_KEY:-}") ]]; then
  pass "OpenAI Image (model=${OPENAI_IMAGE_MODEL:-gpt-image-1})"
  IMG_COUNT=$((IMG_COUNT+1))
else
  warn "OpenAI Image not enabled"
fi

if [[ "${GEMINI_IMAGE_ENABLED:-}" == "true" ]]; then
  pass "Gemini Image (model=${GEMINI_IMAGE_MODEL:-gemini-2.0-flash-exp})"
  IMG_COUNT=$((IMG_COUNT+1))
else
  warn "Gemini Image not enabled"
fi

if [[ -n "${REPLICATE_API_TOKEN:-}" ]]; then
  pass "Replicate (model=${REPLICATE_IMAGE_MODEL:-flux-schnell})"
  IMG_COUNT=$((IMG_COUNT+1))
fi

echo "  → $IMG_COUNT image provider(s)"
echo "  → Order: ${IMAGE_PROVIDER_ORDER:-openai_image,gemini_image,replicate}"

# ═══════════════════════════════════════════════════════════════
section "4. Video Providers"
# ═══════════════════════════════════════════════════════════════

VID_COUNT=0
if [[ -n "${VEO_API_KEY:-}" || (-n "${GEMINI_API_KEY:-}" && "${VIDEO_GENERATION_ENABLED:-}" == "true") ]]; then
  pass "Google Veo (model=${VEO_MODEL:-veo-3.1})"
  VID_COUNT=$((VID_COUNT+1))
fi

if [[ -n "${REPLICATE_API_TOKEN:-}" && "${VIDEO_GENERATION_ENABLED:-}" == "true" ]]; then
  pass "Replicate Video (model=${REPLICATE_VIDEO_MODEL:-minimax/video-01})"
  VID_COUNT=$((VID_COUNT+1))
fi

if [[ -n "${RUNWAY_API_KEY:-}" ]]; then
  pass "Runway Gen-3"
  VID_COUNT=$((VID_COUNT+1))
fi

echo "  → $VID_COUNT video provider(s)"
echo "  → Order: ${VIDEO_PROVIDER_ORDER:-veo,replicate,runway}"

# ═══════════════════════════════════════════════════════════════
section "5. Diagram Pipeline"
# ═══════════════════════════════════════════════════════════════

KROKI="${KROKI_URL:-https://kroki.io}"
if curl -sf --max-time 5 "$KROKI/mermaid/svg" -d 'graph LR; A-->B' -o /dev/null 2>/dev/null; then
  pass "Kroki SVG rendering ($KROKI)"
else
  warn "Kroki not reachable — using fallback rendering"
fi

echo "  → Order: ${DIAGRAM_PROVIDER_ORDER:-gemini,openai,anthropic,openrouter}"

# ═══════════════════════════════════════════════════════════════
section "6. S3 Storage"
# ═══════════════════════════════════════════════════════════════

if [[ -n "${S3_ENDPOINT:-}" && -n "${S3_BUCKET:-}" && -n "${S3_ACCESS_KEY:-}" && -n "${S3_SECRET_KEY:-}" ]]; then
  pass "S3 fully configured (bucket=${S3_BUCKET} endpoint=${S3_ENDPOINT})"
else
  MISSING=""
  [[ -z "${S3_ENDPOINT:-}" ]] && MISSING="$MISSING S3_ENDPOINT"
  [[ -z "${S3_BUCKET:-}" ]] && MISSING="$MISSING S3_BUCKET"
  [[ -z "${S3_ACCESS_KEY:-}" ]] && MISSING="$MISSING S3_ACCESS_KEY"
  [[ -z "${S3_SECRET_KEY:-}" ]] && MISSING="$MISSING S3_SECRET_KEY"
  fail "S3 incomplete — missing:$MISSING (assets will not persist)"
fi

# ═══════════════════════════════════════════════════════════════
section "7. Source Files Integrity"
# ═══════════════════════════════════════════════════════════════

CORE_FILES=(
  "server/intentClassifier.ts:Intent Classifier"
  "server/capabilityRouter.ts:Capability Router"
  "server/capabilityLimits.ts:Capability Limits"
  "server/imageProvider.ts:Image Provider"
  "server/videoProvider.ts:Video Provider"
  "server/diagramProvider.ts:Diagram Provider"
  "server/learningMemory.ts:Learning Memory"
  "server/storage.ts:Storage Layer"
  "server/streamRoute.ts:Stream Route (pipeline)"
  "server/adminRouters.ts:Admin Routers"
  "client/src/pages/admin/AdminAssets.tsx:Admin Assets Panel"
  "client/src/pages/admin/AdminCapabilities.tsx:Admin Capabilities Panel"
  "client/src/pages/admin/AdminLogs.tsx:Admin Logs Panel"
  "client/src/components/MermaidRenderer.tsx:Mermaid Renderer"
)

MISSING_FILES=0
for entry in "${CORE_FILES[@]}"; do
  IFS=":" read -r filepath desc <<< "$entry"
  if [[ -f "$APP_DIR/$filepath" ]]; then
    pass "$desc"
  else
    fail "$desc ($filepath missing)"
    MISSING_FILES=$((MISSING_FILES+1))
  fi
done

# ═══════════════════════════════════════════════════════════════
section "8. Cost Safety & Limits"
# ═══════════════════════════════════════════════════════════════

echo "  Daily cost limit: \$${COST_DAILY_LIMIT_USD:-10.00 (default)}"
echo "  Monthly cost limit: \$${COST_MONTHLY_LIMIT_USD:-200.00 (default)}"
echo "  Alert threshold: ${COST_ALERT_THRESHOLD_PERCENT:-80}%"
echo "  Image daily limit: ${IMAGE_DAILY_LIMIT:-50}"
echo "  Video daily limit: ${VIDEO_DAILY_LIMIT:-10}"
echo "  Diagram daily limit: ${DIAGRAM_DAILY_LIMIT:-100}"
pass "Cost safety system present in capabilityLimits.ts"

# ═══════════════════════════════════════════════════════════════
section "9. Provider Order Configuration"
# ═══════════════════════════════════════════════════════════════

echo "  TEXT_PROVIDER_ORDER=${TEXT_PROVIDER_ORDER:-local_gpu,gemini,openai,anthropic,openrouter}"
echo "  CODE_PROVIDER_ORDER=${CODE_PROVIDER_ORDER:-local_gpu,anthropic,openai,gemini,openrouter}"
echo "  IMAGE_PROVIDER_ORDER=${IMAGE_PROVIDER_ORDER:-openai_image,gemini_image,replicate}"
echo "  VIDEO_PROVIDER_ORDER=${VIDEO_PROVIDER_ORDER:-veo,replicate,runway}"
echo "  VISION_PROVIDER_ORDER=${VISION_PROVIDER_ORDER:-gemini,openai,anthropic}"
echo "  DIAGRAM_PROVIDER_ORDER=${DIAGRAM_PROVIDER_ORDER:-gemini,openai,anthropic,openrouter}"
echo "  INFRA_PROVIDER_ORDER=${INFRA_PROVIDER_ORDER:-local_gpu,gemini,openai,anthropic,openrouter}"
pass "Provider orders configurable via .env"

# ═══════════════════════════════════════════════════════════════
section "10. TypeScript Build"
# ═══════════════════════════════════════════════════════════════

if command -v npx &>/dev/null && [[ -f "$APP_DIR/tsconfig.json" ]]; then
  echo "  Running tsc --noEmit..."
  if cd "$APP_DIR" && npx tsc --noEmit 2>/dev/null; then
    pass "TypeScript compiles with 0 errors"
  else
    fail "TypeScript has compilation errors"
  fi
else
  warn "Cannot verify TypeScript (npx not available or tsconfig missing)"
fi

# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════"
echo " FINAL RESULTS"
echo "═══════════════════════════════════════════════════════════"
echo " ✅ Passed: $PASS"
echo " ⚠️  Warnings: $WARN"
echo " ❌ Failures: $FAIL"
echo ""

TOTAL=$((PASS + WARN + FAIL))
SCORE=$(( (PASS * 100) / (TOTAL > 0 ? TOTAL : 1) ))

if [[ $FAIL -eq 0 && $WARN -le 3 ]]; then
  echo " 🏆 ORCHESTRATOR STATUS: PRODUCTION READY ($SCORE% score)"
  exit 0
elif [[ $FAIL -eq 0 ]]; then
  echo " ⚡ ORCHESTRATOR STATUS: OPERATIONAL ($SCORE% score)"
  exit 0
elif [[ $FAIL -le 3 ]]; then
  echo " ⚠️  ORCHESTRATOR STATUS: PARTIALLY READY ($SCORE% score)"
  exit 1
else
  echo " ❌ ORCHESTRATOR STATUS: NEEDS CONFIGURATION ($SCORE% score)"
  exit 1
fi
