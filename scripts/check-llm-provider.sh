#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# check-llm-provider.sh — Diagnóstico completo de todos os providers LLM
# ─────────────────────────────────────────────────────────────────────────────
# Uso:
#   ./scripts/check-llm-provider.sh [caminho_do_env]
#
# Exemplos:
#   ./scripts/check-llm-provider.sh
#   ./scripts/check-llm-provider.sh /etc/debuga/.env
#
# Testa cada provider configurado no .env com chamadas reais à API.
# Providers suportados:
#   1. Gemini (API nativa Google)
#   2. OpenAI (OpenAI-compatible)
#   3. Anthropic / Claude (API nativa Anthropic)
#   4. OpenRouter (OpenAI-compatible + headers extras)
#   5. LLM Cloud genérico (OpenAI-compatible)
#   6. Ollama local (GET /api/tags + POST /v1/chat/completions)
#   7. Forge legado (OpenAI-compatible, apenas se explicitamente configurado)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${1:-$PROJECT_ROOT/.env}"

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  debuga.ai — Diagnóstico Completo de Providers LLM${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}ERRO: Arquivo .env não encontrado: ${ENV_FILE}${NC}"
  echo "  Copie um template: cp templates/.env.production.template .env"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo -e "  Arquivo: ${CYAN}${ENV_FILE}${NC}"
echo -e "  Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ── Variáveis de controle ──
PROVIDERS_CONFIGURED=0
PROVIDERS_TESTED=0
PROVIDERS_OK=0
PROVIDERS_FAILED=0
ACTIVE_PROVIDER=""
declare -a RESULTS=()

# ── Helpers ──
mask_value() {
  local val="$1"
  local len=${#val}
  if [ $len -le 4 ]; then
    echo "****"
  elif [ $len -le 8 ]; then
    echo "${val:0:2}****"
  else
    echo "${val:0:4}...${val: -4}"
  fi
}

parse_response_content() {
  # Extrai o conteúdo da resposta OpenAI-compatible
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    c = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    print(c[:80] if c else '(vazio)')
except Exception as e:
    print(f'(parse error: {e})')
" 2>/dev/null < /tmp/llm-test-response.json || echo "(parse error)"
}

# ─────────────────────────────────────────────────────────────────────────────
# TEST: OpenAI-compatible provider
# ─────────────────────────────────────────────────────────────────────────────
test_openai_compatible() {
  local name="$1"
  local url="$2"
  local key="$3"
  local model="$4"
  local extra_headers="${5:-}"

  echo -e "    URL: ${url}/chat/completions"
  echo -e "    Model: ${model}"
  echo -e "    Key: $(mask_value "$key")"

  local curl_args=(
    -s -o /tmp/llm-test-response.json -w "%{http_code}"
    -X POST "${url}/chat/completions"
    -H "Content-Type: application/json"
    -H "Authorization: Bearer ${key}"
  )

  # Adicionar headers extras (OpenRouter)
  if [ -n "$extra_headers" ]; then
    while IFS='=' read -r header_name header_value; do
      curl_args+=(-H "${header_name}: ${header_value}")
    done <<< "$extra_headers"
  fi

  local body
  body=$(cat <<EOF
{
  "model": "${model}",
  "messages": [{"role": "user", "content": "Responda apenas: ok"}],
  "max_tokens": 10,
  "temperature": 0
}
EOF
)

  local http_code
  http_code=$(curl "${curl_args[@]}" -d "$body" --connect-timeout 10 --max-time 30 2>/dev/null) || http_code="000"

  PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))

  if [ "$http_code" = "200" ]; then
    local content
    content=$(parse_response_content)
    echo -e "    ${GREEN}\u2713 HTTP 200 \u2014 Resposta: ${content}${NC}"
    PROVIDERS_OK=$((PROVIDERS_OK + 1))
    RESULTS+=("${GREEN}\u2713${NC} ${name}: HTTP 200")
    if [ -z "$ACTIVE_PROVIDER" ]; then
      ACTIVE_PROVIDER="$name"
    fi
    return 0
  elif [ "$http_code" = "429" ]; then
    # Rate limited / quota exceeded - WARN, not FAIL
    echo -e "    ${YELLOW}\u26a0 HTTP 429 \u2014 Rate limited / quota excedida${NC}"
    local error_msg=""
    if [ -f /tmp/llm-test-response.json ] && [ -s /tmp/llm-test-response.json ]; then
      error_msg=$(cat /tmp/llm-test-response.json | head -c 200)
      echo -e "    ${YELLOW}  Detalhe: ${error_msg}${NC}"
    fi
    # Count as configured but degraded, not failed
    RESULTS+=("${YELLOW}\u26a0${NC} ${name}: HTTP 429 (quota/rate-limit)")
    return 1
  else
    local error_msg=""
    if [ -f /tmp/llm-test-response.json ] && [ -s /tmp/llm-test-response.json ]; then
      error_msg=$(cat /tmp/llm-test-response.json | head -c 300)
    fi
    echo -e "    ${RED}\u2717 HTTP ${http_code}${NC}"
    if [ -n "$error_msg" ]; then
      echo -e "    ${RED}  Erro: ${error_msg}${NC}"
    fi
    PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
    RESULTS+=("${RED}\u2717${NC} ${name}: HTTP ${http_code}")
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# TEST: Gemini (API nativa Google)
# ─────────────────────────────────────────────────────────────────────────────
test_gemini_native() {
  local key="$1"
  local model="${2:-gemini-2.0-flash}"
  local url="${3:-https://generativelanguage.googleapis.com/v1beta}"

  echo -e "    URL: ${url}/models/${model}:generateContent"
  echo -e "    Model: ${model}"
  echo -e "    Key: $(mask_value "$key")"

  local endpoint="${url}/models/${model}:generateContent?key=${key}"
  local http_code
  http_code=$(curl -s -o /tmp/llm-test-response.json -w "%{http_code}" \
    -X POST "$endpoint" \
    -H "Content-Type: application/json" \
    -d '{
      "contents": [{"parts": [{"text": "Responda apenas: ok"}]}],
      "generationConfig": {"maxOutputTokens": 10}
    }' \
    --connect-timeout 10 \
    --max-time 30 2>/dev/null) || http_code="000"

  PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))

  if [ "$http_code" = "200" ]; then
    local content
    content=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '(vazio)'))
except Exception as e:
    print(f'(parse error: {e})')
" 2>/dev/null < /tmp/llm-test-response.json || echo "(parse error)")
    echo -e "    ${GREEN}✓ HTTP 200 — Resposta: ${content}${NC}"
    PROVIDERS_OK=$((PROVIDERS_OK + 1))
    RESULTS+=("${GREEN}✓${NC} Gemini: HTTP 200")
    if [ -z "$ACTIVE_PROVIDER" ]; then
      ACTIVE_PROVIDER="Gemini"
    fi
    return 0
  else
    local error_msg=""
    if [ -f /tmp/llm-test-response.json ] && [ -s /tmp/llm-test-response.json ]; then
      error_msg=$(cat /tmp/llm-test-response.json | head -c 300)
    fi
    echo -e "    ${RED}✗ HTTP ${http_code}${NC}"
    if [ -n "$error_msg" ]; then
      echo -e "    ${RED}  Erro: ${error_msg}${NC}"
    fi
    PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
    RESULTS+=("${RED}✗${NC} Gemini: HTTP ${http_code}")
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# TEST: Anthropic (API nativa Claude)
# Nota: A API Anthropic usa formato próprio (não OpenAI-compatible).
# O debuga.ai usa wrapper OpenAI-compatible no streamRoute.ts, mas este
# script testa a API nativa para validar que a chave funciona.
# Se ANTHROPIC_API_URL apontar para um proxy OpenAI-compatible (ex: LiteLLM),
# o teste usará formato OpenAI em vez do nativo.
# ─────────────────────────────────────────────────────────────────────────────
test_anthropic_native() {
  local key="$1"
  local model="${2:-claude-sonnet-4-20250514}"
  local url="${3:-https://api.anthropic.com}"

  # Normalizar URL: remover /v1 trailing para evitar /v1/v1/messages
  url="${url%/}"      # Remove trailing slash
  url="${url%/v1}"    # Remove trailing /v1 if present

  # Detectar se é API nativa Anthropic ou proxy OpenAI-compatible
  if [[ "$url" == *"anthropic.com"* ]]; then
    echo -e "    URL: ${url}/v1/messages (formato nativo Anthropic)"
    echo -e "    Model: ${model}"
    echo -e "    Key: $(mask_value "$key")"

    local http_code
    http_code=$(curl -s -o /tmp/llm-test-response.json -w "%{http_code}" \
      -X POST "${url}/v1/messages" \
      -H "Content-Type: application/json" \
      -H "x-api-key: ${key}" \
      -H "anthropic-version: 2023-06-01" \
      -d "{
        \"model\": \"${model}\",
        \"max_tokens\": 10,
        \"messages\": [{\"role\": \"user\", \"content\": \"Responda apenas: ok\"}]
      }" \
      --connect-timeout 10 \
      --max-time 30 2>/dev/null) || http_code="000"

    PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))

    if [ "$http_code" = "200" ]; then
      local content
      content=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    blocks = d.get('content', [])
    text = blocks[0].get('text', '(vazio)') if blocks else '(vazio)'
    print(text[:80])
except Exception as e:
    print(f'(parse error: {e})')
" 2>/dev/null < /tmp/llm-test-response.json || echo "(parse error)")
      echo -e "    ${GREEN}✓ HTTP 200 — Resposta: ${content}${NC}"
      PROVIDERS_OK=$((PROVIDERS_OK + 1))
      RESULTS+=("${GREEN}✓${NC} Anthropic: HTTP 200")
      if [ -z "$ACTIVE_PROVIDER" ]; then
        ACTIVE_PROVIDER="Anthropic"
      fi
      return 0
    else
      local error_msg=""
      if [ -f /tmp/llm-test-response.json ] && [ -s /tmp/llm-test-response.json ]; then
        error_msg=$(cat /tmp/llm-test-response.json | head -c 300)
      fi
      echo -e "    ${RED}✗ HTTP ${http_code}${NC}"
      if [ -n "$error_msg" ]; then
        echo -e "    ${RED}  Erro: ${error_msg}${NC}"
      fi
      PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
      RESULTS+=("${RED}✗${NC} Anthropic: HTTP ${http_code}")
      return 1
    fi
  else
    # Proxy OpenAI-compatible (ex: LiteLLM, AWS Bedrock proxy)
    echo -e "    ${YELLOW}(Detectado proxy OpenAI-compatible: ${url})${NC}"
    test_openai_compatible "Anthropic (proxy)" "$url" "$key" "$model"
    return $?
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# TEST: Ollama local
# Testa: GET /api/tags (listar modelos) + POST /v1/chat/completions (inferência)
# ─────────────────────────────────────────────────────────────────────────────
test_ollama() {
  local url="$1"
  local model="${2:-}"

  echo -e "    URL: ${url}"
  echo -e "    Model: ${model:-<auto>}"

  # Teste 1: GET /api/tags (listar modelos disponíveis)
  echo -e "    ${BLUE}[1/2] GET /api/tags${NC}"
  local tags_code
  tags_code=$(curl -s -o /tmp/llm-test-ollama-tags.json -w "%{http_code}" \
    -X GET "${url}/api/tags" \
    --connect-timeout 5 \
    --max-time 10 2>/dev/null) || tags_code="000"

  if [ "$tags_code" = "200" ]; then
    local model_count
    model_count=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    models = d.get('models', [])
    names = [m.get('name', '?') for m in models[:5]]
    print(f'{len(models)} modelo(s): {', '.join(names)}')
except:
    print('(parse error)')
" 2>/dev/null < /tmp/llm-test-ollama-tags.json || echo "(parse error)")
    echo -e "      ${GREEN}✓ HTTP 200 — ${model_count}${NC}"
  else
    echo -e "      ${RED}✗ HTTP ${tags_code} — Ollama não está respondendo em ${url}${NC}"
    if [ -f /tmp/llm-test-ollama-tags.json ] && [ -s /tmp/llm-test-ollama-tags.json ]; then
      echo -e "      ${RED}  $(cat /tmp/llm-test-ollama-tags.json | head -c 200)${NC}"
    fi
    PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))
    PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
    RESULTS+=("${RED}✗${NC} Ollama: HTTP ${tags_code} (não acessível)")
    return 1
  fi

  # Teste 2: POST /v1/chat/completions (OpenAI-compatible)
  echo -e "    ${BLUE}[2/2] POST /v1/chat/completions${NC}"

  # Se modelo não especificado, pegar o primeiro disponível
  if [ -z "$model" ]; then
    model=$(python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    models = d.get('models', [])
    print(models[0].get('name', '') if models else '')
except:
    print('')
" 2>/dev/null < /tmp/llm-test-ollama-tags.json || echo "")
    if [ -z "$model" ]; then
      echo -e "      ${YELLOW}⚠ Nenhum modelo instalado no Ollama${NC}"
      echo -e "      ${YELLOW}  Execute: docker exec debuga-ollama ollama pull qwen2.5:7b-instruct${NC}"
      PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))
      PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
      RESULTS+=("${YELLOW}⚠${NC} Ollama: acessível mas sem modelos")
      return 1
    fi
    echo -e "      (Usando primeiro modelo disponível: ${model})"
  fi

  local http_code
  http_code=$(curl -s -o /tmp/llm-test-response.json -w "%{http_code}" \
    -X POST "${url}/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"${model}\",
      \"messages\": [{\"role\": \"user\", \"content\": \"Responda apenas: ok\"}],
      \"max_tokens\": 10,
      \"temperature\": 0
    }" \
    --connect-timeout 10 \
    --max-time 60 2>/dev/null) || http_code="000"

  PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))

  if [ "$http_code" = "200" ]; then
    local content
    content=$(parse_response_content)
    echo -e "      ${GREEN}✓ HTTP 200 — Resposta: ${content}${NC}"
    PROVIDERS_OK=$((PROVIDERS_OK + 1))
    RESULTS+=("${GREEN}✓${NC} Ollama: HTTP 200 (modelo: ${model})")
    if [ -z "$ACTIVE_PROVIDER" ]; then
      ACTIVE_PROVIDER="Ollama"
    fi
    return 0
  else
    local error_msg=""
    if [ -f /tmp/llm-test-response.json ] && [ -s /tmp/llm-test-response.json ]; then
      error_msg=$(cat /tmp/llm-test-response.json | head -c 300)
    fi
    echo -e "      ${RED}✗ HTTP ${http_code}${NC}"
    if [ -n "$error_msg" ]; then
      echo -e "      ${RED}  Erro: ${error_msg}${NC}"
    fi
    PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
    RESULTS+=("${RED}✗${NC} Ollama: HTTP ${http_code}")
    return 1
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# EXECUÇÃO DOS TESTES
# ═══════════════════════════════════════════════════════════════════════════════

echo -e "${CYAN}── Testando providers configurados ──${NC}"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# [1] GEMINI
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${GEMINI_API_KEY:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[1] Google Gemini${NC}"
  GEMINI_URL="${GEMINI_API_URL:-https://generativelanguage.googleapis.com/v1beta}"
  # Verificar se a URL é OpenAI-compatible (termina em /openai ou /v1)
  if [[ "$GEMINI_URL" == *"/openai"* ]] || [[ "$GEMINI_URL" == *"/v1"* ]]; then
    echo -e "    ${BLUE}(Usando endpoint OpenAI-compatible)${NC}"
    test_openai_compatible "Gemini" "$GEMINI_URL" "$GEMINI_API_KEY" "${GEMINI_MODEL:-gemini-2.5-flash}" || true
  else
    test_gemini_native "$GEMINI_API_KEY" "${GEMINI_MODEL:-gemini-2.5-flash}" "$GEMINI_URL" || true
  fi
  echo ""
else
  echo -e "${BLUE}[1] Google Gemini — ${CYAN}não configurado (GEMINI_API_KEY vazio)${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# [2] OPENAI
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${OPENAI_API_KEY:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[2] OpenAI${NC}"
  test_openai_compatible "OpenAI" "${OPENAI_API_URL:-https://api.openai.com/v1}" "$OPENAI_API_KEY" "${OPENAI_MODEL:-gpt-4o-mini}" || true
  echo ""
else
  echo -e "${BLUE}[2] OpenAI — ${CYAN}não configurado (OPENAI_API_KEY vazio)${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# [3] ANTHROPIC / CLAUDE
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[3] Anthropic / Claude${NC}"
  test_anthropic_native "$ANTHROPIC_API_KEY" "${ANTHROPIC_MODEL:-claude-sonnet-4-20250514}" "${ANTHROPIC_API_URL:-https://api.anthropic.com}" || true
  echo ""
else
  echo -e "${BLUE}[3] Anthropic / Claude — ${CYAN}não configurado (ANTHROPIC_API_KEY vazio)${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# [4] OPENROUTER
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[4] OpenRouter${NC}"
  OPENROUTER_URL="${OPENROUTER_API_URL:-https://openrouter.ai/api/v1}"
  # Headers recomendados pelo OpenRouter
  OPENROUTER_HEADERS="HTTP-Referer=${APP_URL:-https://debuga.ai}
X-Title=debuga.ai"
  echo -e "    Headers extras: HTTP-Referer, X-Title"
  test_openai_compatible "OpenRouter" "$OPENROUTER_URL" "$OPENROUTER_API_KEY" "${OPENROUTER_MODEL:-openai/gpt-4o-mini}" "$OPENROUTER_HEADERS" || true
  echo ""
else
  echo -e "${BLUE}[4] OpenRouter — ${CYAN}não configurado (OPENROUTER_API_KEY vazio)${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# [5] LLM CLOUD GENÉRICO
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${LLM_CLOUD_API_KEY:-}" ] && [ -n "${LLM_CLOUD_API_URL:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[5] LLM Cloud (genérico)${NC}"
  test_openai_compatible "LLM Cloud" "$LLM_CLOUD_API_URL" "$LLM_CLOUD_API_KEY" "${LLM_CLOUD_MODEL:-gpt-4o-mini}" || true
  echo ""
else
  echo -e "${BLUE}[5] LLM Cloud — ${CYAN}não configurado (LLM_CLOUD_API_URL ou LLM_CLOUD_API_KEY vazio)${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# [6] OLLAMA LOCAL
# ─────────────────────────────────────────────────────────────────────────────
if [ "${ENABLE_LOCAL_INFERENCE:-}" = "true" ] && [ -n "${LOCAL_LLM_BASE_URL:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[6] Ollama Local${NC}"
  # Determinar URL de teste:
  # - LOCAL_LLM_HOST_URL: para scripts rodando no host (ex: http://127.0.0.1:11434)
  # - LOCAL_LLM_BASE_URL: para containers Docker (ex: http://ollama:11434)
  OLLAMA_TEST_URL="${LOCAL_LLM_HOST_URL:-$LOCAL_LLM_BASE_URL}"
  # Se a URL usa hostname Docker (ollama, debuga-ollama), tentar localhost
  if [[ "$OLLAMA_TEST_URL" == *"://ollama:"* ]] || [[ "$OLLAMA_TEST_URL" == *"://debuga-ollama:"* ]]; then
    OLLAMA_PORT=$(echo "$OLLAMA_TEST_URL" | grep -oP ':\K[0-9]+' | tail -1)
    OLLAMA_HOST_URL="http://127.0.0.1:${OLLAMA_PORT:-11434}"
    echo -e "    ${BLUE}(URL Docker detectada: $OLLAMA_TEST_URL → testando via host: $OLLAMA_HOST_URL)${NC}"
    OLLAMA_TEST_URL="$OLLAMA_HOST_URL"
  fi
  test_ollama "$OLLAMA_TEST_URL" "${LOCAL_LLM_MODEL:-}" || true
  echo ""
elif [ "${ENABLE_LOCAL_INFERENCE:-}" = "true" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[6] Ollama Local${NC}"
  echo -e "    ${RED}✗ ENABLE_LOCAL_INFERENCE=true mas LOCAL_LLM_BASE_URL não definido${NC}"
  PROVIDERS_TESTED=$((PROVIDERS_TESTED + 1))
  PROVIDERS_FAILED=$((PROVIDERS_FAILED + 1))
  RESULTS+=("${RED}✗${NC} Ollama: LOCAL_LLM_BASE_URL não definido")
  echo ""
else
  echo -e "${BLUE}[6] Ollama Local — ${CYAN}desabilitado (ENABLE_LOCAL_INFERENCE != true)${NC}"
  echo ""
fi

# ─────────────────────────────────────────────────────────────────────────────
# [7] FORGE LEGADO (apenas se explicitamente configurado)
# ─────────────────────────────────────────────────────────────────────────────
if [ -n "${BUILT_IN_FORGE_API_KEY:-}" ] && [ -n "${BUILT_IN_FORGE_API_URL:-}" ]; then
  PROVIDERS_CONFIGURED=$((PROVIDERS_CONFIGURED + 1))
  echo -e "${YELLOW}[7] Forge (legado)${NC}"
  echo -e "    ${YELLOW}⚠ Forge é um provider legado. Considere migrar para Gemini/OpenAI/Anthropic.${NC}"
  test_openai_compatible "Forge" "$BUILT_IN_FORGE_API_URL" "$BUILT_IN_FORGE_API_KEY" "anthropic/claude-sonnet-4-20250514" || true
  echo ""
else
  echo -e "${BLUE}[7] Forge (legado) — ${CYAN}não configurado${NC}"
  echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════════
# RESUMO FINAL
# ═══════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  RESUMO${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Resultados individuais
for result in "${RESULTS[@]:-}"; do
  if [ -n "$result" ]; then
    echo -e "  $result"
  fi
done
echo ""

# Estatísticas
echo -e "  ┌─────────────────────────────────────────────────────────┐"
echo -e "  │ Providers configurados:  ${CYAN}${PROVIDERS_CONFIGURED}${NC}"
echo -e "  │ Providers testados:      ${CYAN}${PROVIDERS_TESTED}${NC}"
echo -e "  │ Providers funcionando:   ${GREEN}${PROVIDERS_OK}${NC}"
echo -e "  │ Providers com falha:     ${RED}${PROVIDERS_FAILED}${NC}"
echo -e "  │"

# Provider principal (conforme LLM_PROVIDER)
LLM_PROV="${LLM_PROVIDER:-<não definido>}"
echo -e "  │ Provider principal:      ${CYAN}${LLM_PROV}${NC} (LLM_PROVIDER)"

# Fallback (conforme LLM_FALLBACK_PROVIDER)
LLM_FALLBACK="${LLM_FALLBACK_PROVIDER:-<nenhum>}"
echo -e "  │ Fallback configurado:    ${CYAN}${LLM_FALLBACK}${NC} (LLM_FALLBACK_PROVIDER)"

# Local inference
LOCAL_INF="${ENABLE_LOCAL_INFERENCE:-false}"
if [ "$LOCAL_INF" = "true" ]; then
  LOCAL_PRIORITY="${LOCAL_LLM_PRIORITY:-last}"
  echo -e "  │ Inferência local:       ${GREEN}ativa${NC} (prioridade: ${LOCAL_PRIORITY})"
else
  echo -e "  │ Inferência local:       ${YELLOW}desativada${NC}"
fi

# Fallback cloud para GPU
LOCAL_FALLBACK="${LOCAL_LLM_FALLBACK_ENABLED:-true}"
if [ "$LOCAL_INF" = "true" ]; then
  if [ "$LOCAL_FALLBACK" = "true" ]; then
    echo -e "  │ Fallback cloud (GPU):   ${GREEN}ativo${NC}"
  else
    echo -e "  │ Fallback cloud (GPU):   ${RED}desativado${NC} (se GPU falhar, erro direto)"
  fi
fi

echo -e "  └─────────────────────────────────────────────────────────┘"
echo ""

# Resultado final
if [ $PROVIDERS_CONFIGURED -eq 0 ]; then
  echo -e "  ${RED}██ NENHUM PROVIDER CONFIGURADO ██${NC}"
  echo ""
  echo -e "  Configure pelo menos um provider no .env:"
  echo -e "    • GEMINI_API_KEY (recomendado)"
  echo -e "    • OPENAI_API_KEY"
  echo -e "    • ANTHROPIC_API_KEY"
  echo -e "    • OPENROUTER_API_KEY"
  echo -e "    • LLM_CLOUD_API_URL + LLM_CLOUD_API_KEY"
  echo -e "    • ENABLE_LOCAL_INFERENCE=true + LOCAL_LLM_BASE_URL"
  echo ""
  echo -e "  Docs: docs/15-LLM-PROVIDERS.md"
  exit 1
elif [ $PROVIDERS_OK -eq 0 ]; then
  echo -e "  ${RED}██ TODOS OS PROVIDERS FALHARAM ██${NC}"
  echo ""
  echo -e "  ${PROVIDERS_CONFIGURED} provider(s) configurado(s), ${PROVIDERS_TESTED} testado(s), 0 funcionando."
  echo -e "  Verifique:"
  echo -e "    • Chaves de API válidas e não expiradas"
  echo -e "    • Conectividade de rede (firewall, DNS)"
  echo -e "    • Ollama rodando e com modelos instalados"
  echo ""
  echo -e "  Docs: docs/15-LLM-PROVIDERS.md"
  exit 1
else
  echo -e "  ${GREEN}██ ${PROVIDERS_OK}/${PROVIDERS_TESTED} PROVIDER(S) FUNCIONANDO ██${NC}"
  echo ""
  if [ -n "$ACTIVE_PROVIDER" ]; then
    echo -e "  Primeiro provider que respondeu: ${CYAN}${ACTIVE_PROVIDER}${NC}"
  fi
  echo -e "  O sistema usará ${CYAN}${LLM_PROV}${NC} como provider principal."
  if [ "$LLM_FALLBACK" != "<nenhum>" ]; then
    echo -e "  Em caso de falha, fallback para: ${CYAN}${LLM_FALLBACK}${NC}"
  fi
  exit 0
fi
