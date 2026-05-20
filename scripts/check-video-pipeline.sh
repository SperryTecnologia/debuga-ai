#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# check-video-pipeline.sh — Diagnóstico do pipeline de vídeo
# ═══════════════════════════════════════════════════════════════
# Verifica: feature flag, providers (Veo/Replicate/Runway),
# S3 persistence, job system, admin panel integration.
#
# Usage: ./scripts/check-video-pipeline.sh [--env /path/to/.env]
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
echo " VIDEO PIPELINE DIAGNOSTIC"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Feature Flag ──
echo "── Feature Flags ──"
if [[ "${VIDEO_GENERATION_ENABLED:-}" == "true" || "${ENABLE_VIDEO_GENERATION:-}" == "true" ]]; then
  pass "Video generation enabled"
else
  warn "VIDEO_GENERATION_ENABLED not set or false (video generation disabled)"
fi

if [[ "${ENABLE_CAPABILITY_ROUTING:-}" == "true" ]]; then
  pass "ENABLE_CAPABILITY_ROUTING=true (intent classification active)"
else
  warn "ENABLE_CAPABILITY_ROUTING not set (video requests may not be auto-detected)"
fi
echo ""

# ── 2. Video Providers ──
echo "── Video Providers ──"
VIDEO_ORDER="${VIDEO_PROVIDER_ORDER:-veo,replicate,runway}"
echo "  Provider order: $VIDEO_ORDER"

HAS_VIDEO=false

# Veo (Google)
if [[ -n "${VEO_API_KEY:-}" ]]; then
  pass "Veo API key configured"
  HAS_VIDEO=true
  VEO_URL="${VEO_API_URL:-https://generativelanguage.googleapis.com/v1beta}"
  VEO_MODEL="${VEO_MODEL:-veo-3.1}"
  echo "    URL: $VEO_URL"
  echo "    Model: $VEO_MODEL"
elif [[ -n "${GEMINI_API_KEY:-}" && "${VIDEO_GENERATION_ENABLED:-}" == "true" ]]; then
  pass "Veo can use GEMINI_API_KEY as fallback"
  HAS_VIDEO=true
else
  warn "Veo not configured (VEO_API_KEY missing)"
fi

# Replicate
if [[ -n "${REPLICATE_API_TOKEN:-}" ]]; then
  pass "Replicate API token configured"
  HAS_VIDEO=true
  REPLICATE_MODEL="${REPLICATE_VIDEO_MODEL:-minimax/video-01}"
  echo "    Model: $REPLICATE_MODEL"
  # Test connectivity
  if curl -sf --max-time 5 "https://api.replicate.com/v1/models" \
    -H "Authorization: Bearer ${REPLICATE_API_TOKEN}" -o /dev/null 2>/dev/null; then
    pass "Replicate API reachable"
  else
    warn "Replicate API not reachable (may be network issue)"
  fi
else
  warn "Replicate not configured (REPLICATE_API_TOKEN missing)"
fi

# Runway
if [[ -n "${RUNWAY_API_KEY:-}" ]]; then
  pass "Runway API key configured"
  HAS_VIDEO=true
  # Test connectivity
  if curl -sf --max-time 5 "https://api.dev.runwayml.com/v1" \
    -H "Authorization: Bearer ${RUNWAY_API_KEY}" -o /dev/null 2>/dev/null; then
    pass "Runway API reachable"
  else
    warn "Runway API not reachable (may need different endpoint)"
  fi
else
  warn "Runway not configured (RUNWAY_API_KEY missing)"
fi

VIDEO_IS_ENABLED=false
if [[ "${VIDEO_GENERATION_ENABLED:-}" == "true" || "${ENABLE_VIDEO_GENERATION:-}" == "true" ]]; then
  VIDEO_IS_ENABLED=true
fi

if [[ "$HAS_VIDEO" == "false" ]]; then
  if [[ "$VIDEO_IS_ENABLED" == "true" ]]; then
    fail "Video generation ENABLED but no video provider configured"
  else
    warn "No video provider configured (ok — video generation is disabled)"
  fi
fi
echo ""

# ── 3. S3 Storage ──
echo "── S3 Storage (Video Persistence) ──"
# Accept aliases
S3_EP="${S3_ENDPOINT:-${MINIO_ENDPOINT:-${AWS_S3_ENDPOINT:-}}}"
S3_BKT="${S3_BUCKET:-${MINIO_BUCKET:-${AWS_S3_BUCKET:-}}}"
S3_AK="${S3_ACCESS_KEY:-${MINIO_ROOT_USER:-${AWS_ACCESS_KEY_ID:-}}}"
S3_SK="${S3_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-${AWS_SECRET_ACCESS_KEY:-}}}"

if [[ -n "$S3_EP" && -n "$S3_BKT" && -n "$S3_AK" && -n "$S3_SK" ]]; then
  pass "S3 credentials configured (endpoint=$S3_EP)"
else
  warn "S3 not fully configured — videos may not be persisted"
fi
echo ""

# ── 4. Source Files ──
echo "── Source Files ──"
APP_DIR="$(dirname "$0")/../app"
if [[ -f "$APP_DIR/server/videoProvider.ts" ]]; then
  pass "videoProvider.ts exists"
  if grep -q "generateVideo\|startVideoGeneration\|submitVideoGeneration" "$APP_DIR/server/videoProvider.ts"; then
    pass "Video generation function exported"
  else
    if [[ "$VIDEO_IS_ENABLED" == "true" ]]; then
      fail "Video generation function not found"
    else
      warn "Video generation function not found (ok — feature disabled)"
    fi
  fi
  if grep -q "storagePut\|persistVideo\|S3" "$APP_DIR/server/videoProvider.ts"; then
    pass "S3 persistence logic present"
  else
    warn "S3 persistence not found in videoProvider"
  fi
  if grep -q "generation_jobs\|generationJobs\|jobId" "$APP_DIR/server/videoProvider.ts"; then
    pass "Job system (async generation) present"
  else
    warn "Job system not found — video may be synchronous only"
  fi
else
  if [[ "$VIDEO_IS_ENABLED" == "true" ]]; then
    fail "videoProvider.ts not found (video generation enabled but no provider file)"
  else
    warn "videoProvider.ts not found (ok — video generation is disabled)"
  fi
fi
echo ""

# ── 5. Database Schema ──
echo "── Database Schema ──"
if [[ -f "$APP_DIR/drizzle/schema.ts" ]]; then
  if grep -q "generation_jobs\|generationJobs" "$APP_DIR/drizzle/schema.ts"; then
    pass "generation_jobs table defined"
  else
    warn "generation_jobs table not found in schema"
  fi
  if grep -q "generated_assets\|generatedAssets" "$APP_DIR/drizzle/schema.ts"; then
    pass "generated_assets table defined"
  else
    warn "generated_assets table not found in schema"
  fi
else
  warn "schema.ts not found"
fi
echo ""

# ── 6. Cost Limits ──
echo "── Cost Safety ──"
DAILY="${COST_DAILY_LIMIT_USD:-not set}"
MONTHLY="${COST_MONTHLY_LIMIT_USD:-not set}"
VIDEO_DAILY="${VIDEO_DAILY_LIMIT:-10}"
echo "  Daily cost limit: \$$DAILY"
echo "  Monthly cost limit: \$$MONTHLY"
echo "  Video daily limit: $VIDEO_DAILY"
if [[ "$DAILY" != "not set" ]]; then
  pass "Cost daily limit configured"
else
  warn "COST_DAILY_LIMIT_USD not set (using plan defaults)"
fi
echo ""

# ── Summary ──
echo "═══════════════════════════════════════════════════════════"
echo " RESULTS: $PASS passed, $WARN warnings, $FAIL failures"
echo "═══════════════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo " STATUS: ❌ VIDEO PIPELINE HAS ISSUES"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo " STATUS: ⚠️  VIDEO PIPELINE PARTIALLY READY"
  exit 0
else
  echo " STATUS: ✅ VIDEO PIPELINE FULLY OPERATIONAL"
  exit 0
fi
