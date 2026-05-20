#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# check-diagram-pipeline.sh — Diagnóstico do pipeline de diagramas
# ═══════════════════════════════════════════════════════════════
# Verifica: feature flag, Kroki, Mermaid rendering, S3 persistence,
# LLM provider para geração de código Mermaid, React Flow export.
#
# Usage: ./scripts/check-diagram-pipeline.sh [--env /path/to/.env]
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

ENV_FILE="${1:-}"
if [[ "$ENV_FILE" == "--env" ]]; then
  ENV_FILE="${2:-}"
fi

# Try to find .env
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

echo "═══════════════════════════════════════════════════════════"
echo " DIAGRAM PIPELINE DIAGNOSTIC"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Feature Flag ──
echo "── Feature Flag ──"
if [[ "${ENABLE_DIAGRAM_GENERATION:-}" == "true" ]]; then
  pass "ENABLE_DIAGRAM_GENERATION=true"
else
  warn "ENABLE_DIAGRAM_GENERATION not set or false (diagrams disabled)"
fi

if [[ "${ENABLE_CAPABILITY_ROUTING:-}" == "true" ]]; then
  pass "ENABLE_CAPABILITY_ROUTING=true (intent classification active)"
else
  warn "ENABLE_CAPABILITY_ROUTING not set (diagrams may not be auto-detected)"
fi
echo ""

# ── 2. Kroki Server ──
echo "── Kroki SVG Rendering ──"
KROKI="${KROKI_URL:-https://kroki.io}"
if curl -sf --max-time 5 "$KROKI/mermaid/svg" -d 'graph LR; A-->B' -o /dev/null 2>/dev/null; then
  pass "Kroki reachable at $KROKI"
else
  # Try with POST JSON
  if curl -sf --max-time 5 "$KROKI/mermaid/svg" \
    -H "Content-Type: text/plain" \
    -d 'graph LR; A-->B' -o /dev/null 2>/dev/null; then
    pass "Kroki reachable at $KROKI (text/plain)"
  else
    warn "Kroki not reachable at $KROKI — SVG rendering will use fallback"
  fi
fi
echo ""

# ── 3. S3 Storage ──
echo "── S3 Storage for Diagram Persistence ──"
# Accept aliases: S3_ENDPOINT/MINIO_ENDPOINT, S3_BUCKET/MINIO_BUCKET, etc.
S3_EP="${S3_ENDPOINT:-${MINIO_ENDPOINT:-${AWS_S3_ENDPOINT:-}}}"
S3_BKT="${S3_BUCKET:-${MINIO_BUCKET:-${AWS_S3_BUCKET:-}}}"
S3_AK="${S3_ACCESS_KEY:-${MINIO_ROOT_USER:-${AWS_ACCESS_KEY_ID:-}}}"
S3_SK="${S3_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-${AWS_SECRET_ACCESS_KEY:-}}}"

if [[ -n "$S3_EP" && -n "$S3_BKT" && -n "$S3_AK" && -n "$S3_SK" ]]; then
  pass "S3 credentials configured (endpoint=$S3_EP bucket=$S3_BKT)"
else
  warn "S3 not fully configured — diagrams will not be persisted to storage"
  [[ -z "$S3_EP" ]] && warn "S3_ENDPOINT/MINIO_ENDPOINT missing"
  [[ -z "$S3_BKT" ]] && warn "S3_BUCKET/MINIO_BUCKET missing"
  [[ -z "$S3_AK" ]] && warn "S3_ACCESS_KEY/MINIO_ROOT_USER missing"
  [[ -z "$S3_SK" ]] && warn "S3_SECRET_KEY/MINIO_ROOT_PASSWORD missing"
fi
echo ""

# ── 4. LLM Provider for Mermaid Code Generation ──
echo "── LLM Provider (Mermaid code generation) ──"
DIAGRAM_ORDER="${DIAGRAM_PROVIDER_ORDER:-gemini,openai,anthropic,openrouter}"
echo "  Provider order: $DIAGRAM_ORDER"

HAS_LLM=false
# Only need API key (URL has defaults)
if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  pass "Gemini configured (primary for diagram code generation)"
  HAS_LLM=true
fi
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  pass "OpenAI configured"
  HAS_LLM=true
fi
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  pass "Anthropic configured"
  HAS_LLM=true
fi
if [[ -n "${LLM_CLOUD_API_KEY:-}" ]]; then
  pass "Cloud LLM configured"
  HAS_LLM=true
fi

if [[ "$HAS_LLM" == "false" ]]; then
  fail "No LLM provider configured — cannot generate Mermaid code"
fi
echo ""

# ── 5. Diagram Provider File ──
echo "── Source Files ──"
APP_DIR="$(dirname "$0")/../app"
if [[ -f "$APP_DIR/server/diagramProvider.ts" ]]; then
  pass "diagramProvider.ts exists"
  # Check for key exports (actual function names in the provider)
  if grep -q "renderAndPersistDiagram\|processDiagramResponse\|renderMermaidToSvg" "$APP_DIR/server/diagramProvider.ts"; then
    pass "Diagram generation functions exported (renderAndPersistDiagram, processDiagramResponse)"
  else
    fail "No diagram generation functions found in diagramProvider.ts"
  fi
  if grep -q "isDiagramGenerationAvailable" "$APP_DIR/server/diagramProvider.ts"; then
    pass "isDiagramGenerationAvailable() exported (feature gate)"
  else
    warn "isDiagramGenerationAvailable() not found"
  fi
  if grep -q "convertToReactFlow" "$APP_DIR/server/diagramProvider.ts"; then
    pass "convertToReactFlow() exported (React Flow support)"
  else
    warn "convertToReactFlow() not found — React Flow export may be missing"
  fi
  if grep -q "renderMermaidToSvg\|kroki" "$APP_DIR/server/diagramProvider.ts"; then
    pass "Kroki/SVG rendering logic present"
  else
    warn "Kroki rendering logic not found"
  fi
else
  fail "diagramProvider.ts not found at $APP_DIR/server/"
fi

if [[ -f "$APP_DIR/client/src/components/MermaidRenderer.tsx" ]]; then
  pass "MermaidRenderer.tsx exists (client-side rendering)"
else
  warn "MermaidRenderer.tsx not found — client may not render diagrams inline"
fi
echo ""

# ── 6. Intent Classifier ──
echo "── Intent Classifier (Diagram Detection) ──"
if [[ -f "$APP_DIR/server/intentClassifier.ts" ]]; then
  DIAGRAM_TYPES=$(grep -c "diagram" "$APP_DIR/server/intentClassifier.ts" 2>/dev/null || echo "0")
  if [[ "$DIAGRAM_TYPES" -gt 3 ]]; then
    pass "Intent classifier has diagram detection ($DIAGRAM_TYPES references)"
  else
    warn "Intent classifier has limited diagram references ($DIAGRAM_TYPES)"
  fi
else
  fail "intentClassifier.ts not found"
fi
echo ""

# ── 7. Database Schema ──
echo "── Database Schema ──"
if [[ -f "$APP_DIR/drizzle/schema.ts" ]]; then
  if grep -q "generated_assets\|generatedAssets" "$APP_DIR/drizzle/schema.ts"; then
    pass "generated_assets table defined in schema"
  else
    warn "generated_assets table not found in schema"
  fi
else
  warn "schema.ts not found"
fi
echo ""

# ── Summary ──
echo "═══════════════════════════════════════════════════════════"
echo " RESULTS: $PASS passed, $WARN warnings, $FAIL failures"
echo "═══════════════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo " STATUS: ❌ DIAGRAM PIPELINE HAS ISSUES"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo " STATUS: ⚠️  DIAGRAM PIPELINE PARTIALLY READY"
  exit 0
else
  echo " STATUS: ✅ DIAGRAM PIPELINE FULLY OPERATIONAL"
  exit 0
fi
