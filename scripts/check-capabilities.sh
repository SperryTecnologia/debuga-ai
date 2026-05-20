#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# check-capabilities.sh — Diagnóstico do Orquestrador de Capacidades
# debuga.ai
# ═══════════════════════════════════════════════════════════════════════
# Uso: ./scripts/check-capabilities.sh [--env /path/to/.env]
# ═══════════════════════════════════════════════════════════════════════

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

# Parse args
ENV_FILE=".env"
if [[ "${1:-}" == "--env" && -n "${2:-}" ]]; then
  ENV_FILE="$2"
fi

# Load .env if exists
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
  echo -e "${BLUE}[INFO]${NC} Loaded env from: $ENV_FILE"
else
  echo -e "${YELLOW}[WARN]${NC} No .env file found at $ENV_FILE — using current environment"
fi

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}       DEBUGA.AI — Diagnóstico de Capacidades${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""

PASS=0
FAIL=0
WARN=0

# Secret masking: show only first 4 and last 4 chars
mask_secret() {
  local val="$1"
  local len=${#val}
  if [[ $len -le 10 ]]; then
    echo "${val:0:2}...***"
  else
    echo "${val:0:4}...${val: -4}"
  fi
}

check() {
  local label="$1"
  local var_name="$2"
  local required="${3:-false}"
  local value="${!var_name:-}"

  if [[ -n "$value" ]]; then
    # Mask secrets (API keys, passwords, tokens)
    if echo "$var_name" | grep -qiE "key|secret|password|token"; then
      echo -e "  ${GREEN}✓${NC} $label: $(mask_secret "$value")"
    else
      echo -e "  ${GREEN}✓${NC} $label: ${value:0:60}"
    fi
    PASS=$((PASS + 1))
  elif [[ "$required" == "true" ]]; then
    echo -e "  ${RED}✗${NC} $label: NÃO CONFIGURADO (obrigatório)"
    FAIL=$((FAIL + 1))
  else
    echo -e "  ${YELLOW}○${NC} $label: não configurado (opcional)"
    WARN=$((WARN + 1))
  fi
}

check_bool() {
  local label="$1"
  local var_name="$2"
  local value="${!var_name:-}"

  if [[ "$value" == "true" ]]; then
    echo -e "  ${GREEN}✓${NC} $label: HABILITADO"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}○${NC} $label: desabilitado"
    WARN=$((WARN + 1))
  fi
}

# Test a provider with proper authentication headers
# Usage: test_provider "label" "url" "api_key" "model" "provider_type"
# provider_type: openai|anthropic|gemini|ollama
# Returns: 0=PASS, 1=FAIL, 2=WARN(429/degraded)
test_provider() {
  local label="$1"
  local url="$2"
  local api_key="${3:-}"
  local model="${4:-gpt-4o-mini}"
  local provider_type="${5:-openai}"
  local timeout=8

  if [[ -z "$url" ]]; then
    echo -e "  ${YELLOW}○${NC} $label: URL não configurada"
    WARN=$((WARN + 1))
    return 2
  fi

  local http_code=""
  local response=""

  case "$provider_type" in
    ollama)
      # Ollama: just test /api/tags endpoint (no auth needed)
      http_code=$(curl -s --max-time "$timeout" -o /dev/null -w "%{http_code}" "${url}/api/tags" 2>/dev/null || echo "000")
      ;;
    anthropic)
      # Anthropic: uses x-api-key header and different endpoint
      local anthro_base="${url%/v1}"  # Strip trailing /v1 if present
      anthro_base="${anthro_base%/}"  # Strip trailing slash
      http_code=$(curl -s --max-time "$timeout" -o /dev/null -w "%{http_code}" \
        -X POST "${anthro_base}/v1/messages" \
        -H "Content-Type: application/json" \
        -H "x-api-key: ${api_key}" \
        -H "anthropic-version: 2023-06-01" \
        -d "{\"model\":\"${model}\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}" \
        2>/dev/null || echo "000")
      ;;
    gemini)
      # Gemini via OpenAI-compatible endpoint: same as openai but may 429
      url="${url%/}"
      http_code=$(curl -s --max-time "$timeout" -o /dev/null -w "%{http_code}" \
        -X POST "${url}/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${api_key}" \
        -d "{\"model\":\"${model}\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}" \
        2>/dev/null || echo "000")
      ;;
    openai|*)
      # OpenAI-compatible: POST /chat/completions with Bearer token
      url="${url%/}"
      http_code=$(curl -s --max-time "$timeout" -o /dev/null -w "%{http_code}" \
        -X POST "${url}/chat/completions" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${api_key}" \
        -d "{\"model\":\"${model}\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}" \
        2>/dev/null || echo "000")
      ;;
  esac

  case "$http_code" in
    2*)
      echo -e "  ${GREEN}✓${NC} $label: operacional (HTTP $http_code)"
      PASS=$((PASS + 1))
      return 0
      ;;
    429)
      echo -e "  ${YELLOW}⚠${NC} $label: rate limited (HTTP 429 — quota excedida)"
      WARN=$((WARN + 1))
      return 2
      ;;
    401|403)
      echo -e "  ${RED}✗${NC} $label: credenciais inválidas (HTTP $http_code)"
      FAIL=$((FAIL + 1))
      return 1
      ;;
    000)
      echo -e "  ${RED}✗${NC} $label: timeout/inacessível"
      FAIL=$((FAIL + 1))
      return 1
      ;;
    4*)
      # 400, 404, etc. from a real API call usually means the endpoint works
      # but the minimal payload was rejected — still means connectivity is OK
      echo -e "  ${GREEN}✓${NC} $label: acessível (HTTP $http_code — endpoint respondeu)"
      PASS=$((PASS + 1))
      return 0
      ;;
    *)
      echo -e "  ${RED}✗${NC} $label: erro (HTTP $http_code)"
      FAIL=$((FAIL + 1))
      return 1
      ;;
  esac
}

# ═══════════════════════════════════════════════════════════════
# 1. Feature Flags
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[1/7] Feature Flags${NC}"
check_bool "Capability Routing" "ENABLE_CAPABILITY_ROUTING"
check_bool "Knowledge Reuse" "ENABLE_KNOWLEDGE_REUSE"
check_bool "Image Generation" "IMAGE_GENERATION_ENABLED"
check_bool "Video Generation" "VIDEO_GENERATION_ENABLED"
check_bool "Learning" "ENABLE_LEARNING"
echo ""

# ═══════════════════════════════════════════════════════════════
# 2. LLM Providers (Text)
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[2/7] LLM Providers (Texto)${NC}"
echo -e "  Provider principal: ${LLM_PROVIDER:-não definido}"
echo -e "  Provider fallback:  ${LLM_FALLBACK_PROVIDER:-não definido}"
echo ""
check "Cloud API URL" "LLM_CLOUD_API_URL" "false"
check "Cloud API Key" "LLM_CLOUD_API_KEY" "false"
check "Cloud Model" "LLM_CLOUD_MODEL" "false"
check "Local LLM URL" "LOCAL_LLM_BASE_URL" "false"
check "Local LLM Host URL" "LOCAL_LLM_HOST_URL" "false"
check "Local LLM Model" "LOCAL_LLM_MODEL" "false"
check "OpenAI API Key" "OPENAI_API_KEY" "false"
check "OpenRouter API Key" "OPENROUTER_API_KEY" "false"
check "Anthropic API Key" "ANTHROPIC_API_KEY" "false"
check "Gemini API Key" "GEMINI_API_KEY" "false"
echo ""

# ═══════════════════════════════════════════════════════════════
# 3. Image Generation
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[3/7] Geração de Imagens${NC}"
check "Image Provider" "IMAGE_GENERATION_PROVIDER" "false"
check "OpenAI API Key (DALL-E)" "OPENAI_API_KEY" "false"
check "Replicate API Token" "REPLICATE_API_TOKEN" "false"
echo ""

# ═══════════════════════════════════════════════════════════════
# 4. Video Generation
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[4/7] Geração de Vídeos${NC}"
check "Video Provider" "VIDEO_GENERATION_PROVIDER" "false"
check "Replicate API Token" "REPLICATE_API_TOKEN" "false"
check "Runway API Key" "RUNWAY_API_KEY" "false"
echo ""

# ═══════════════════════════════════════════════════════════════
# 5. Diagram Generation
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[5/7] Geração de Diagramas${NC}"
echo -e "  ${GREEN}✓${NC} Mermaid.js: sempre disponível (renderização no frontend)"
PASS=$((PASS + 1))
if command -v mmdc &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} mermaid-cli (mmdc): instalado"
  PASS=$((PASS + 1))
else
  echo -e "  ${YELLOW}○${NC} mermaid-cli (mmdc): não instalado (renderização server-side indisponível)"
  WARN=$((WARN + 1))
fi
echo ""

# ═══════════════════════════════════════════════════════════════
# 6. Cost & Limits
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[6/7] Custos e Limites${NC}"
check "Daily Cost Limit (USD)" "COST_DAILY_LIMIT_USD" "false"
check "Monthly Cost Limit (USD)" "COST_MONTHLY_LIMIT_USD" "false"
echo ""

# ═══════════════════════════════════════════════════════════════
# 7. Connectivity Tests (with proper auth headers)
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}[7/7] Testes de Conectividade${NC}"

HEALTHY_PROVIDERS=0
DEGRADED_PROVIDERS=0
FAILED_PROVIDERS=0

# Test Local LLM (Ollama) — use HOST URL when running on host, docker exec as fallback
if [[ -n "${LOCAL_LLM_BASE_URL:-}" || -n "${LOCAL_LLM_HOST_URL:-}" ]]; then
  ollama_url="${LOCAL_LLM_HOST_URL:-http://127.0.0.1:11434}"
  test_provider "Ollama (Local LLM)" "$ollama_url" "" "${LOCAL_LLM_MODEL:-qwen2.5:7b-instruct}" "ollama"
  ollama_result=$?
  # If direct access failed, try docker exec
  if [[ $ollama_result -ne 0 ]] && command -v docker &>/dev/null; then
    OLLAMA_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i "ollama" | head -1)
    if [[ -n "$OLLAMA_CONTAINER" ]]; then
      docker_code=$(docker exec "$OLLAMA_CONTAINER" curl -sf --max-time 5 -o /dev/null -w "%{http_code}" "http://localhost:11434/api/tags" 2>/dev/null || echo "000")
      if [[ "$docker_code" == "200" ]]; then
        echo -e "  ${GREEN}✓${NC} Ollama (via docker exec $OLLAMA_CONTAINER): operacional"
        PASS=$((PASS + 1))
        # Override the previous FAIL
        FAIL=$((FAIL > 0 ? FAIL - 1 : 0))
        ollama_result=0
      fi
    fi
  fi
  case $ollama_result in
    0) HEALTHY_PROVIDERS=$((HEALTHY_PROVIDERS + 1)) ;;
    2) DEGRADED_PROVIDERS=$((DEGRADED_PROVIDERS + 1)) ;;
    1) FAILED_PROVIDERS=$((FAILED_PROVIDERS + 1)) ;;
  esac
fi

# Test OpenAI
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  openai_url="${OPENAI_API_URL:-https://api.openai.com/v1}"
  openai_url="${openai_url%/}"
  test_provider "OpenAI API" "$openai_url" "${OPENAI_API_KEY}" "${OPENAI_MODEL:-gpt-4o-mini}" "openai"
  case $? in
    0) HEALTHY_PROVIDERS=$((HEALTHY_PROVIDERS + 1)) ;;
    2) DEGRADED_PROVIDERS=$((DEGRADED_PROVIDERS + 1)) ;;
    1) FAILED_PROVIDERS=$((FAILED_PROVIDERS + 1)) ;;
  esac
fi

# Test Cloud/Gemini
if [[ -n "${LLM_CLOUD_API_KEY:-}" && -n "${LLM_CLOUD_API_URL:-}" ]]; then
  test_provider "Cloud LLM (Gemini)" "${LLM_CLOUD_API_URL}" "${LLM_CLOUD_API_KEY}" "${LLM_CLOUD_MODEL:-gemini-2.5-flash}" "gemini"
  case $? in
    0) HEALTHY_PROVIDERS=$((HEALTHY_PROVIDERS + 1)) ;;
    2) DEGRADED_PROVIDERS=$((DEGRADED_PROVIDERS + 1)) ;;
    1) FAILED_PROVIDERS=$((FAILED_PROVIDERS + 1)) ;;
  esac
fi

# Test Anthropic
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  anthro_url="${ANTHROPIC_API_URL:-https://api.anthropic.com}"
  test_provider "Anthropic API" "$anthro_url" "${ANTHROPIC_API_KEY}" "${ANTHROPIC_MODEL:-claude-3-haiku-20240307}" "anthropic"
  case $? in
    0) HEALTHY_PROVIDERS=$((HEALTHY_PROVIDERS + 1)) ;;
    2) DEGRADED_PROVIDERS=$((DEGRADED_PROVIDERS + 1)) ;;
    1) FAILED_PROVIDERS=$((FAILED_PROVIDERS + 1)) ;;
  esac
fi

# Test OpenRouter
if [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
  openrouter_url="${OPENROUTER_API_URL:-https://openrouter.ai/api/v1}"
  openrouter_url="${openrouter_url%/}"
  test_provider "OpenRouter API" "$openrouter_url" "${OPENROUTER_API_KEY}" "${OPENROUTER_MODEL:-openai/gpt-4o-mini}" "openai"
  case $? in
    0) HEALTHY_PROVIDERS=$((HEALTHY_PROVIDERS + 1)) ;;
    2) DEGRADED_PROVIDERS=$((DEGRADED_PROVIDERS + 1)) ;;
    1) FAILED_PROVIDERS=$((FAILED_PROVIDERS + 1)) ;;
  esac
fi

echo ""
echo -e "  Providers saudáveis: $HEALTHY_PROVIDERS"
echo -e "  Providers degradados (429): $DEGRADED_PROVIDERS"
echo -e "  Providers com falha: $FAILED_PROVIDERS"

# Evaluate overall health
# At least one healthy or degraded provider = system can operate
if [[ $HEALTHY_PROVIDERS -eq 0 && $DEGRADED_PROVIDERS -eq 0 ]]; then
  if [[ $FAILED_PROVIDERS -gt 0 ]]; then
    echo -e "  ${RED}✗${NC} NENHUM provider LLM acessível — sistema inoperante"
    FAIL=$((FAIL + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} Nenhum provider configurado para teste de conectividade"
    WARN=$((WARN + 1))
  fi
elif [[ $HEALTHY_PROVIDERS -eq 0 && $DEGRADED_PROVIDERS -gt 0 ]]; then
  echo -e "  ${YELLOW}⚠${NC} Todos os providers estão em rate-limit (429) — sistema degradado"
  echo -e "  ${YELLOW}  Recomendação: aguardar reset de quota ou alterar provider${NC}"
  WARN=$((WARN + 1))
elif [[ $HEALTHY_PROVIDERS -gt 0 && $FAILED_PROVIDERS -gt 0 ]]; then
  echo -e "  ${GREEN}✓${NC} Sistema operacional com fallback (${HEALTHY_PROVIDERS} OK, ${FAILED_PROVIDERS} com falha)"
  PASS=$((PASS + 1))
  if [[ -n "${LLM_FALLBACK_PROVIDER:-}" ]]; then
    echo -e "  ${BLUE}  Fallback configurado: ${LLM_FALLBACK_PROVIDER}${NC}"
  fi
elif [[ $HEALTHY_PROVIDERS -gt 0 ]]; then
  echo -e "  ${GREEN}✓${NC} Todos os providers configurados estão saudáveis ($HEALTHY_PROVIDERS OK)"
  PASS=$((PASS + 1))
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}RESUMO:${NC}"
echo -e "  ${GREEN}✓ Passou:${NC} $PASS"
echo -e "  ${YELLOW}○ Avisos:${NC} $WARN"
echo -e "  ${RED}✗ Falhou:${NC} $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}[RESULTADO] Há $FAIL configuração(ões) com falha.${NC}"
  echo -e "Consulte docs/24-ENV-REFERENCE.md para instruções de configuração."
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "${YELLOW}[RESULTADO] Sistema funcional, mas $WARN capacidade(s) opcional(is) não configurada(s) ou degradada(s).${NC}"
  exit 0
else
  echo -e "${GREEN}[RESULTADO] Todas as capacidades configuradas e operacionais!${NC}"
  exit 0
fi
