#!/usr/bin/env bash
# ============================================================
# debuga.ai - Pull LLM Models
# Downloads recommended models for Ollama (RTX 3070 8GB optimized).
# Usage: ./scripts/pull-models.sh [--all]
# ============================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MODELS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# ── Core models (RTX 3070 8GB VRAM) ──
CORE_MODELS=(
  "qwen3.5:latest"                        # General purpose, ~5.5GB, 54-58 t/s
  "qwen2.5-coder:7b-instruct-q4_K_M"     # Code specialist, ~4.7GB, 45-50 t/s
)

# ── Optional models ──
OPTIONAL_MODELS=(
  "glm4:9b-chat-q4_K_M"                  # Math/reasoning, ~5.5GB
  "nomic-embed-text:latest"               # Embeddings, ~274MB
)

log "Checking Ollama status..."
docker exec debuga-ollama ollama list 2>/dev/null || {
  warn "Ollama container not running. Start it first:"
  warn "  docker compose -f docker/docker-compose.yml up -d ollama"
  exit 1
}

log "Pulling core models..."
for model in "${CORE_MODELS[@]}"; do
  log "  Pulling ${model}..."
  docker exec debuga-ollama ollama pull "$model" || warn "  Failed: ${model}"
done

if [[ "${1:-}" == "--all" ]]; then
  log "Pulling optional models..."
  for model in "${OPTIONAL_MODELS[@]}"; do
    log "  Pulling ${model}..."
    docker exec debuga-ollama ollama pull "$model" || warn "  Failed: ${model}"
  done
fi

echo ""
log "Installed models:"
docker exec debuga-ollama ollama list

echo ""
log "Model pull complete."
log ""
log "RTX 3070 8GB benchmarks (approximate):"
log "  qwen3.5:latest           → 54-58 tokens/s (general)"
log "  qwen2.5-coder:7b Q4_K_M → 45-50 tokens/s (code)"
log "  glm4:9b-chat Q4_K_M     → 40-45 tokens/s (math)"
