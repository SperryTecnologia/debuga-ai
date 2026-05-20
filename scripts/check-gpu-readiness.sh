#!/bin/bash
# ============================================================
# check-gpu-readiness.sh — Diagnóstico completo de GPU + Ollama
# Verifica: driver, CUDA, container toolkit, Ollama, modelo, inferência
# ============================================================
# Uso: ./scripts/check-gpu-readiness.sh [--env /path/to/.env]
# ============================================================

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }
section() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# Parse args
ENV_FILE=".env"
if [[ "${1:-}" == "--env" && -n "${2:-}" ]]; then
  ENV_FILE="$2"
elif [[ -n "${1:-}" && "${1:-}" != "--"* ]]; then
  ENV_FILE="$1"
fi

# Load .env if exists
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
  echo -e "${BLUE}[INFO]${NC} Loaded env from: $ENV_FILE"
else
  echo -e "${YELLOW}[WARN]${NC} No .env file found at $ENV_FILE — using current environment"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     debuga.ai — GPU Readiness Check                 ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Verifica prontidão para inferência local via GPU   ║"
echo "╚══════════════════════════════════════════════════════╝"

# Track critical failures vs non-critical
CRITICAL_FAIL=0

# ── 1. NVIDIA Driver ──
section "1. Driver NVIDIA"

if command -v nvidia-smi &>/dev/null; then
  pass "nvidia-smi encontrado"
  
  DRIVER_VERSION=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
  if [[ -n "$DRIVER_VERSION" ]]; then
    pass "Driver versão: $DRIVER_VERSION"
  else
    fail "Não foi possível obter versão do driver"
  fi
  
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
  GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1)
  if [[ -n "$GPU_NAME" ]]; then
    pass "GPU detectada: $GPU_NAME ($GPU_VRAM)"
  fi
  
  GPU_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader 2>/dev/null | head -1)
  if [[ -n "$GPU_TEMP" ]]; then
    if [[ "$GPU_TEMP" -lt 80 ]]; then
      pass "Temperatura GPU: ${GPU_TEMP}°C (OK)"
    else
      warn "Temperatura GPU: ${GPU_TEMP}°C (alta — verificar ventilação)"
    fi
  fi
  
  VRAM_USED=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | head -1)
  VRAM_TOTAL=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
  if [[ -n "$VRAM_USED" ]] && [[ -n "$VRAM_TOTAL" ]]; then
    VRAM_PCT=$((VRAM_USED * 100 / VRAM_TOTAL))
    if [[ "$VRAM_PCT" -lt 90 ]]; then
      pass "VRAM: ${VRAM_USED}/${VRAM_TOTAL} MiB (${VRAM_PCT}% usado)"
    else
      warn "VRAM: ${VRAM_USED}/${VRAM_TOTAL} MiB (${VRAM_PCT}% — quase cheia)"
    fi
  fi
else
  fail "nvidia-smi não encontrado — driver NVIDIA não instalado"
  info "Instale: sudo apt install nvidia-driver-550"
  CRITICAL_FAIL=$((CRITICAL_FAIL + 1))
fi

# ── 2. NVIDIA Container Toolkit ──
section "2. Container Toolkit"

if dpkg -l nvidia-container-toolkit &>/dev/null 2>&1; then
  TOOLKIT_VER=$(dpkg -l nvidia-container-toolkit 2>/dev/null | grep ^ii | awk '{print $3}')
  pass "nvidia-container-toolkit instalado: $TOOLKIT_VER"
else
  warn "nvidia-container-toolkit não instalado (necessário apenas se Ollama roda em Docker)"
  info "Se Ollama roda como serviço nativo, isso é OK"
fi

# Test Docker GPU access (non-critical if Ollama runs natively)
if command -v docker &>/dev/null; then
  if docker info 2>/dev/null | grep -qi "nvidia"; then
    pass "Docker configurado com nvidia runtime"
  else
    warn "Docker pode não ter nvidia runtime (OK se Ollama roda nativo)"
  fi
else
  info "Docker não instalado (OK se Ollama roda como serviço nativo)"
fi

# ── 3. Diretórios de Dados ──
section "3. Diretórios de Dados"

DATA_DIR="${DATA_BASE_DIR:-/data/debuga}"
if [[ -d "$DATA_DIR" ]]; then
  pass "Diretório base existe: $DATA_DIR"
  DIRS=("postgres" "minio" "ollama" "nginx-logs" "backups")
  for dir in "${DIRS[@]}"; do
    if [[ -d "$DATA_DIR/$dir" ]]; then
      pass "$DATA_DIR/$dir existe"
    else
      warn "$DATA_DIR/$dir não existe (será criado no deploy)"
    fi
  done
else
  warn "Diretório base $DATA_DIR não existe (será criado no deploy)"
  info "Crie: sudo mkdir -p $DATA_DIR && sudo chown -R 1000:1000 $DATA_DIR"
fi

# Check disk space
DISK_AVAIL=$(df -BG "${DATA_DIR}" 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G' || echo "")
if [[ -n "$DISK_AVAIL" ]] && [[ "$DISK_AVAIL" -gt 20 ]]; then
  pass "Espaço em disco: ${DISK_AVAIL}GB disponível"
elif [[ -n "$DISK_AVAIL" ]]; then
  warn "Espaço em disco: ${DISK_AVAIL}GB (recomendado 50GB+)"
fi

# ── 4. Ollama Container/Service ──
section "4. Ollama Status"

OLLAMA_RUNNING=false
OLLAMA_METHOD=""

# Check 1: Is Ollama running as a Docker container?
if command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "ollama\|debuga-ollama"; then
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "ollama" | head -1)
    pass "Container Ollama rodando: $CONTAINER_NAME"
    OLLAMA_RUNNING=true
    OLLAMA_METHOD="docker"
    
    # Check if using GPU
    OLLAMA_GPU=$(docker logs "$CONTAINER_NAME" 2>&1 | grep -i "gpu\|cuda\|nvidia" | tail -1)
    if [[ -n "$OLLAMA_GPU" ]]; then
      pass "Ollama detectou GPU: $(echo "$OLLAMA_GPU" | head -c 80)"
    else
      warn "Não encontrou log de GPU no Ollama — pode estar usando CPU"
    fi
  fi
fi

# Check 2: Is Ollama running as a native service?
if [[ "$OLLAMA_RUNNING" == "false" ]]; then
  if systemctl is-active --quiet ollama 2>/dev/null; then
    pass "Ollama rodando como serviço systemd"
    OLLAMA_RUNNING=true
    OLLAMA_METHOD="native"
  elif pgrep -x ollama &>/dev/null; then
    pass "Processo Ollama detectado"
    OLLAMA_RUNNING=true
    OLLAMA_METHOD="native"
  fi
fi

if [[ "$OLLAMA_RUNNING" == "false" ]]; then
  fail "Ollama não está rodando (nem Docker nem nativo)"
  info "Inicie: docker compose --profile gpu up -d ollama"
  info "Ou: sudo systemctl start ollama"
  CRITICAL_FAIL=$((CRITICAL_FAIL + 1))
fi

# ── 5. Ollama API ──
section "5. Ollama API"

# Determine the correct URL to test
# Priority: LOCAL_LLM_HOST_URL > localhost:11434 > LOCAL_LLM_BASE_URL
OLLAMA_TEST_URL="${LOCAL_LLM_HOST_URL:-}"
if [[ -z "$OLLAMA_TEST_URL" ]]; then
  # If LOCAL_LLM_BASE_URL points to a docker hostname (e.g., http://ollama:11434),
  # try localhost instead since we're running on the host
  BASE_URL="${LOCAL_LLM_BASE_URL:-http://localhost:11434}"
  if echo "$BASE_URL" | grep -qE "http://(ollama|debuga-ollama|host\.docker\.internal):"; then
    OLLAMA_TEST_URL="http://localhost:11434"
    info "LOCAL_LLM_BASE_URL ($BASE_URL) é hostname Docker — testando via localhost"
  else
    OLLAMA_TEST_URL="$BASE_URL"
  fi
fi

OLLAMA_API_OK=false

# Try direct HTTP first
if curl -sf --max-time 5 "${OLLAMA_TEST_URL}/api/tags" &>/dev/null; then
  pass "Ollama API respondendo em $OLLAMA_TEST_URL"
  OLLAMA_API_OK=true
else
  # Fallback: try via docker exec if running in container
  if [[ "$OLLAMA_METHOD" == "docker" ]]; then
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "ollama" | head -1)
    if docker exec "$CONTAINER_NAME" curl -sf --max-time 5 "http://localhost:11434/api/tags" &>/dev/null; then
      pass "Ollama API respondendo (via docker exec $CONTAINER_NAME)"
      OLLAMA_API_OK=true
      info "Nota: API acessível apenas dentro do container. Verifique port mapping."
    else
      fail "Ollama API não respondendo (nem host nem docker exec)"
      CRITICAL_FAIL=$((CRITICAL_FAIL + 1))
    fi
  else
    fail "Ollama API não respondendo em $OLLAMA_TEST_URL"
    info "Verifique se o serviço está rodando: systemctl status ollama"
    CRITICAL_FAIL=$((CRITICAL_FAIL + 1))
  fi
fi

# List models if API is accessible
if [[ "$OLLAMA_API_OK" == "true" ]]; then
  MODELS_JSON=""
  if curl -sf --max-time 5 "${OLLAMA_TEST_URL}/api/tags" &>/dev/null; then
    MODELS_JSON=$(curl -sf --max-time 5 "${OLLAMA_TEST_URL}/api/tags" 2>/dev/null)
  elif [[ "$OLLAMA_METHOD" == "docker" ]]; then
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "ollama" | head -1)
    MODELS_JSON=$(docker exec "$CONTAINER_NAME" curl -sf --max-time 5 "http://localhost:11434/api/tags" 2>/dev/null)
  fi

  if [[ -n "$MODELS_JSON" ]]; then
    MODELS=$(echo "$MODELS_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
models = data.get('models', [])
for m in models:
    size_gb = m.get('size', 0) / 1024 / 1024 / 1024
    print(f\"    {m['name']} ({size_gb:.1f}GB)\")
if not models:
    print('    (nenhum modelo)')
" 2>/dev/null || echo "    (erro ao listar)")
    
    MODEL_COUNT=$(echo "$MODELS_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(len(data.get('models', [])))
" 2>/dev/null || echo "0")

    if [[ "$MODEL_COUNT" -gt 0 ]]; then
      pass "Modelos disponíveis ($MODEL_COUNT):"
      echo "$MODELS"
    else
      warn "Nenhum modelo carregado no Ollama"
      info "Baixe: ollama pull ${LOCAL_LLM_MODEL:-qwen2.5:7b-instruct}"
    fi
    
    # Check configured model
    CONFIGURED_MODEL="${LOCAL_LLM_MODEL:-qwen2.5:7b-instruct}"
    MODEL_BASE=$(echo "$CONFIGURED_MODEL" | cut -d: -f1)
    if echo "$MODELS_JSON" | grep -q "$MODEL_BASE"; then
      pass "Modelo configurado ($CONFIGURED_MODEL) está disponível"
    else
      fail "Modelo configurado ($CONFIGURED_MODEL) NÃO está disponível"
      info "Baixe: ollama pull $CONFIGURED_MODEL"
      CRITICAL_FAIL=$((CRITICAL_FAIL + 1))
    fi
  fi
fi

# ── 6. Teste de Inferência ──
section "6. Teste de Inferência"

if [[ "$OLLAMA_API_OK" == "true" ]]; then
  CONFIGURED_MODEL="${LOCAL_LLM_MODEL:-qwen2.5:7b-instruct}"
  
  info "Testando inferência com $CONFIGURED_MODEL..."
  START_TIME=$(date +%s%N)
  
  RESPONSE=""
  if curl -sf --max-time 5 "${OLLAMA_TEST_URL}/api/tags" &>/dev/null; then
    RESPONSE=$(curl -sf --max-time 60 "${OLLAMA_TEST_URL}/v1/chat/completions" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"$CONFIGURED_MODEL\",
        \"messages\": [{\"role\": \"user\", \"content\": \"Responda apenas: GPU OK\"}],
        \"max_tokens\": 10,
        \"stream\": false
      }" 2>/dev/null || echo "")
  elif [[ "$OLLAMA_METHOD" == "docker" ]]; then
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "ollama" | head -1)
    RESPONSE=$(docker exec "$CONTAINER_NAME" curl -sf --max-time 60 "http://localhost:11434/v1/chat/completions" \
      -H "Content-Type: application/json" \
      -d "{
        \"model\": \"$CONFIGURED_MODEL\",
        \"messages\": [{\"role\": \"user\", \"content\": \"Responda apenas: GPU OK\"}],
        \"max_tokens\": 10,
        \"stream\": false
      }" 2>/dev/null || echo "")
  fi
  
  END_TIME=$(date +%s%N)
  LATENCY_MS=$(( (END_TIME - START_TIME) / 1000000 ))
  
  if [[ -n "$RESPONSE" ]]; then
    CONTENT=$(echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(data.get('choices', [{}])[0].get('message', {}).get('content', 'EMPTY'))
" 2>/dev/null || echo "PARSE_ERROR")
    
    if [[ -n "$CONTENT" ]] && [[ "$CONTENT" != "EMPTY" ]] && [[ "$CONTENT" != "PARSE_ERROR" ]]; then
      pass "Inferência funcionando! Latência: ${LATENCY_MS}ms"
      info "Resposta: \"$CONTENT\""
      
      if [[ "$LATENCY_MS" -lt 5000 ]]; then
        pass "Latência aceitável (< 5s) — modelo quente na VRAM"
      elif [[ "$LATENCY_MS" -lt 15000 ]]; then
        warn "Latência alta (${LATENCY_MS}ms) — cold start detectado"
        info "Execute warmup: curl -X POST /api/admin/warmup-gpu"
      else
        warn "Latência muito alta (${LATENCY_MS}ms) — considere modelo menor"
      fi
    else
      fail "Inferência retornou resposta vazia ou inválida"
      info "Pode ser cold start — tente novamente em 30s"
    fi
  else
    fail "Inferência falhou (timeout 60s ou erro de conexão)"
    info "Causa provável: modelo não carregado ou GPU sem memória"
  fi
else
  info "Pulando teste de inferência (Ollama API offline)"
fi

# ── 7. Configuração .env ──
section "7. Configuração .env"

if [[ "${ENABLE_LOCAL_INFERENCE:-false}" == "true" ]]; then
  pass "ENABLE_LOCAL_INFERENCE=true"
else
  warn "ENABLE_LOCAL_INFERENCE=${ENABLE_LOCAL_INFERENCE:-não definido} (GPU desativada no app)"
fi

info "LOCAL_LLM_BASE_URL=${LOCAL_LLM_BASE_URL:-não definido}"
info "LOCAL_LLM_HOST_URL=${LOCAL_LLM_HOST_URL:-não definido}"
info "LOCAL_LLM_MODEL=${LOCAL_LLM_MODEL:-não definido}"
info "LOCAL_LLM_PRIORITY=${LOCAL_LLM_PRIORITY:-não definido}"
info "LOCAL_LLM_TIMEOUT_SECONDS=${LOCAL_LLM_TIMEOUT_SECONDS:-não definido}"
info "LOCAL_LLM_FALLBACK_ENABLED=${LOCAL_LLM_FALLBACK_ENABLED:-não definido}"

if [[ -n "${LLM_CLOUD_API_KEY:-}" ]] && [[ "${LOCAL_LLM_FALLBACK_ENABLED:-false}" == "true" ]]; then
  pass "Fallback cloud configurado (LLM_CLOUD_API_KEY presente + fallback habilitado)"
elif [[ "${LOCAL_LLM_PRIORITY:-}" == "only" ]]; then
  info "Modo 'only' — fallback desativado intencionalmente"
elif [[ -n "${LLM_CLOUD_API_KEY:-}" ]]; then
  warn "LLM_CLOUD_API_KEY presente mas LOCAL_LLM_FALLBACK_ENABLED não é 'true'"
else
  warn "Sem fallback cloud configurado (LLM_CLOUD_API_KEY vazio)"
fi

# ── Resultado Final ──
section "RESULTADO"

echo ""
echo -e "  ${GREEN}Passou:${NC} $PASS"
echo -e "  ${YELLOW}Avisos:${NC} $WARN"
echo -e "  ${RED}Falhou:${NC} $FAIL"
echo ""

if [[ $CRITICAL_FAIL -gt 0 ]]; then
  echo -e "  ${RED}❌ GPU NÃO está pronta — $CRITICAL_FAIL falha(s) crítica(s)${NC}"
  echo -e "  ${BLUE}📖 Consulte: docs/26-SINGLE-VM-GPU.md${NC}"
  exit 1
elif [[ $FAIL -gt 0 ]]; then
  echo -e "  ${YELLOW}⚠ GPU parcialmente funcional — $FAIL item(ns) com falha (não-críticos)${NC}"
  echo -e "  ${BLUE}📖 Consulte: docs/26-SINGLE-VM-GPU.md${NC}"
  exit 0
elif [[ $WARN -gt 0 ]]; then
  echo -e "  ${YELLOW}⚠ GPU funcional com avisos — revisar itens amarelos${NC}"
  exit 0
else
  echo -e "  ${GREEN}🎉 GPU pronta para produção!${NC}"
  exit 0
fi
