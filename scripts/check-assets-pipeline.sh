#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# check-assets-pipeline.sh — Diagnóstico do pipeline de assets
# debuga.ai — Geração e persistência de imagens/vídeos/diagramas
#
# USO:
#   ./scripts/check-assets-pipeline.sh [--env /path/to/.env]
# ═══════════════════════════════════════════════════════════════
set -uo pipefail

PASS=0; WARN=0; FAIL=0
pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
warn() { WARN=$((WARN + 1)); echo "  ⚠️  $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1"; }

# Mask secrets: show first 4 and last 4 chars only
mask() {
  local val="${1:-}"
  local len=${#val}
  if [ $len -le 8 ]; then
    echo "****"
  else
    echo "${val:0:4}...${val: -4}"
  fi
}

# ─── Load .env ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Accept --env flag or auto-detect
if [ "${1:-}" = "--env" ] && [ -f "${2:-}" ]; then
  ENV_FILE="$2"
elif [ -f "$PROJECT_ROOT/.env" ]; then
  ENV_FILE="$PROJECT_ROOT/.env"
else
  ENV_FILE=""
fi

if [ -n "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

APP_DIR="$PROJECT_ROOT/app"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  DIAGNÓSTICO: Pipeline de Assets Multimodais            ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo ""

# ─── Resolve aliases ──────────────────────────────────────────
# Image generation flag
IMG_ENABLED="${IMAGE_GENERATION_ENABLED:-${ENABLE_IMAGE_GENERATION:-}}"
# Image API key (multiple possible names)
IMG_API_KEY="${IMAGE_API_KEY:-${OPENAI_API_KEY:-${LLM_CLOUD_API_KEY:-${BUILT_IN_FORGE_API_KEY:-}}}}"
# Image API URL
IMG_API_URL="${IMAGE_API_URL:-${OPENAI_API_URL:-${LLM_CLOUD_API_URL:-${BUILT_IN_FORGE_API_URL:-}}}}"
# S3 endpoint (MinIO or AWS)
S3_EP="${S3_ENDPOINT:-${MINIO_ENDPOINT:-${AWS_S3_ENDPOINT:-}}}"
# S3 bucket
S3_BKT="${S3_BUCKET:-${MINIO_BUCKET:-${AWS_S3_BUCKET:-}}}"
# S3 access key
S3_AK="${S3_ACCESS_KEY:-${MINIO_ROOT_USER:-${AWS_ACCESS_KEY_ID:-}}}"
# S3 secret key
S3_SK="${S3_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-${AWS_SECRET_ACCESS_KEY:-}}}"

# ─── 1. Tabelas no banco ───────────────────────────────────────
echo "📋 1. Tabelas de assets no schema"
if grep -q "generated_assets\|generatedAssets" "$APP_DIR/drizzle/schema.ts" 2>/dev/null; then
  pass "generated_assets definida no schema.ts"
else
  fail "generated_assets NÃO definida no schema.ts"
fi

if grep -q "generation_jobs\|generationJobs" "$APP_DIR/drizzle/schema.ts" 2>/dev/null; then
  pass "generation_jobs definida no schema.ts"
else
  fail "generation_jobs NÃO definida no schema.ts"
fi

# ─── 2. Image Provider ────────────────────────────────────────
echo ""
echo "🖼️  2. Image Provider"
if [ -f "$APP_DIR/server/imageProvider.ts" ]; then
  pass "imageProvider.ts existe"
  
  if grep -q "persistImageToStorage" "$APP_DIR/server/imageProvider.ts"; then
    pass "persistImageToStorage() implementada"
  else
    fail "persistImageToStorage() NÃO encontrada"
  fi
  
  if grep -q "storagePut" "$APP_DIR/server/imageProvider.ts"; then
    pass "storagePut importado para persistência S3"
  else
    warn "storagePut NÃO importado — imagens não serão persistidas"
  fi
  
  if grep -q "b64_json\|base64" "$APP_DIR/server/imageProvider.ts"; then
    pass "Suporte a base64 (gpt-image-1) implementado"
  else
    warn "Sem suporte a base64 — gpt-image-1 pode falhar"
  fi
else
  fail "imageProvider.ts NÃO existe"
fi

# ─── 3. Variáveis de ambiente ─────────────────────────────────
echo ""
echo "🔑 3. Variáveis de ambiente para geração de imagem"

if [ -n "$IMG_ENABLED" ]; then
  if [ "$IMG_ENABLED" = "true" ] || [ "$IMG_ENABLED" = "1" ]; then
    pass "Image generation HABILITADA ($IMG_ENABLED)"
  else
    warn "Image generation DESABILITADA ($IMG_ENABLED)"
  fi
else
  warn "Nenhuma flag de image generation definida (IMAGE_GENERATION_ENABLED ou ENABLE_IMAGE_GENERATION)"
fi

if [ -n "$IMG_API_KEY" ]; then
  pass "API Key para imagem configurada ($(mask "$IMG_API_KEY"))"
else
  # Only FAIL if image generation is enabled
  if [ "$IMG_ENABLED" = "true" ] || [ "$IMG_ENABLED" = "1" ]; then
    fail "Image generation habilitada mas nenhuma API key configurada"
  else
    warn "Nenhuma API key para imagem (ok se image generation desabilitada)"
  fi
fi

if [ -n "$IMG_API_URL" ]; then
  pass "API URL para imagem configurada"
else
  if [ "$IMG_ENABLED" = "true" ] || [ "$IMG_ENABLED" = "1" ]; then
    warn "Nenhuma API URL para imagem (usará default OpenAI)"
  fi
fi

if [ -n "${OPENAI_IMAGE_MODEL:-${IMAGE_OPENAI_MODEL:-}}" ]; then
  pass "Image model=${OPENAI_IMAGE_MODEL:-${IMAGE_OPENAI_MODEL:-}}"
else
  warn "Image model não definido (default: dall-e-3)"
fi

# ─── 4. Storage (S3) ──────────────────────────────────────────
echo ""
echo "☁️  4. Storage (S3) para persistência"

if [ -n "$S3_EP" ]; then
  pass "S3 endpoint configurado ($S3_EP)"
else
  # Only FAIL if image generation is enabled
  if [ "$IMG_ENABLED" = "true" ] || [ "$IMG_ENABLED" = "1" ]; then
    fail "S3 endpoint NÃO configurado — imagens geradas não serão persistidas"
  else
    warn "S3 endpoint não configurado (ok se image generation desabilitada)"
  fi
fi

if [ -n "$S3_BKT" ]; then
  pass "S3 bucket configurado ($S3_BKT)"
else
  warn "S3 bucket não definido"
fi

if [ -n "$S3_AK" ]; then
  pass "S3 access key configurada ($(mask "$S3_AK"))"
else
  warn "S3 access key não configurada"
fi

if [ -n "$S3_SK" ]; then
  pass "S3 secret key configurada ($(mask "$S3_SK"))"
else
  warn "S3 secret key não configurada"
fi

# ─── 5. streamRoute.ts integration ────────────────────────────
echo ""
echo "🔗 5. Integração no streamRoute.ts"

if grep -q "generatedAssets" "$APP_DIR/server/streamRoute.ts" 2>/dev/null; then
  pass "streamRoute.ts importa generatedAssets"
else
  fail "streamRoute.ts NÃO importa generatedAssets"
fi

if grep -q "insert(generatedAssets)" "$APP_DIR/server/streamRoute.ts" 2>/dev/null; then
  pass "streamRoute.ts salva assets no banco (sucesso)"
else
  fail "streamRoute.ts NÃO salva assets no banco"
fi

FAIL_INSERT=$(grep -c "status.*failed\|\"failed\"" "$APP_DIR/server/streamRoute.ts" 2>/dev/null || echo "0")
if [ "$FAIL_INSERT" -gt 0 ]; then
  pass "streamRoute.ts salva assets com status=failed ($FAIL_INSERT ocorrências)"
else
  warn "streamRoute.ts pode não salvar assets com status=failed"
fi

# ─── 6. Admin Assets page ─────────────────────────────────────
echo ""
echo "📊 6. Admin Assets page"

ADMIN_ASSETS="$APP_DIR/client/src/pages/admin/AdminAssets.tsx"
if [ -f "$ADMIN_ASSETS" ]; then
  pass "AdminAssets.tsx existe"
  
  if grep -q "trpc\." "$ADMIN_ASSETS"; then
    pass "AdminAssets usa tRPC (não mock data)"
  else
    warn "AdminAssets pode estar usando dados mock"
  fi
  
  if grep -q "failed\|error\|Error" "$ADMIN_ASSETS"; then
    pass "AdminAssets trata estados de erro/failed"
  else
    warn "AdminAssets pode não mostrar assets com erro"
  fi
else
  fail "AdminAssets.tsx NÃO existe"
fi

# ─── 7. Admin Logs page ───────────────────────────────────────
echo ""
echo "📋 7. Admin Logs page"

ADMIN_LOGS="$APP_DIR/client/src/pages/admin/AdminLogs.tsx"
if [ -f "$ADMIN_LOGS" ]; then
  pass "AdminLogs.tsx existe"
  
  if grep -q "isError\|error" "$ADMIN_LOGS"; then
    pass "AdminLogs trata estado de erro"
  else
    warn "AdminLogs pode ficar em loading infinito se query falhar"
  fi
else
  fail "AdminLogs.tsx NÃO existe"
fi

# ─── 8. Mermaid sanitization ──────────────────────────────────
echo ""
echo "📐 8. Mermaid sanitization"

MERMAID_RENDERER="$APP_DIR/client/src/components/MermaidRenderer.tsx"
if [ -f "$MERMAID_RENDERER" ]; then
  if grep -q "sanitizeMermaidCode\|sanitize" "$MERMAID_RENDERER"; then
    pass "MermaidRenderer tem sanitização de código"
  else
    warn "MermaidRenderer sem sanitização"
  fi
  
  if grep -q "renderError\|setRenderError" "$MERMAID_RENDERER"; then
    pass "MermaidRenderer trata erros de renderização graciosamente"
  else
    warn "MermaidRenderer pode não tratar erros de renderização"
  fi
else
  warn "MermaidRenderer.tsx não encontrado"
fi

# ─── 9. Video Provider ────────────────────────────────────────
echo ""
echo "🎬 9. Video Provider"

if [ -f "$APP_DIR/server/videoProvider.ts" ]; then
  pass "videoProvider.ts existe"
  
  if grep -q "submitVideoGeneration" "$APP_DIR/server/videoProvider.ts"; then
    pass "submitVideoGeneration() exportada"
  else
    warn "submitVideoGeneration() não encontrada"
  fi
else
  warn "videoProvider.ts não existe (vídeo não disponível)"
fi

# ─── 10. Diagram Provider ─────────────────────────────────────
echo ""
echo "📊 10. Diagram Provider"

if [ -f "$APP_DIR/server/diagramProvider.ts" ]; then
  pass "diagramProvider.ts existe"
  
  # Check for any exported generation function
  if grep -q "getDiagramSystemPrompt\|generateDiagram\|renderDiagram\|handleDiagram" "$APP_DIR/server/diagramProvider.ts"; then
    pass "Função de geração de diagrama encontrada"
  else
    warn "Nenhuma função de geração de diagrama encontrada"
  fi
else
  warn "diagramProvider.ts não existe"
fi

# ─── Summary ──────────────────────────────────────────────────
echo ""
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  RESULTADO                                              ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo ""
echo "  ✅ PASS: $PASS"
echo "  ⚠️  WARN: $WARN"
echo "  ❌ FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "  ⛔ Pipeline de assets tem $FAIL problemas críticos."
  exit 1
elif [ "$WARN" -gt 3 ]; then
  echo "  ⚠️  Pipeline funcional mas com $WARN avisos."
  exit 0
else
  echo "  ✅ Pipeline de assets operacional!"
  exit 0
fi
