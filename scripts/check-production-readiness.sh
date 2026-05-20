#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# check-production-readiness.sh — Verifica prontidão para produção
# debuga.ai — 26 checks categorizados
# ═══════════════════════════════════════════════════════════════
# Uso: ./scripts/check-production-readiness.sh [--env /path/to/.env]
# ═══════════════════════════════════════════════════════════════

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

PASS=0
WARN=0
FAIL=0
CHECKS=()

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); CHECKS+=("PASS|$1"); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); CHECKS+=("WARN|$1"); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); CHECKS+=("FAIL|$1"); }
section() { echo -e "\n${BOLD}${BLUE}━━━ $1 ━━━${NC}"; }

# Secret masking
mask_secret() {
  local val="$1"
  local len=${#val}
  if [[ $len -le 8 ]]; then
    echo "****"
  elif [[ $len -le 16 ]]; then
    echo "${val:0:2}...${val: -2}"
  else
    echo "${val:0:4}...${val: -4}"
  fi
}

# Parse args
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE=""

if [[ "${1:-}" == "--env" && -n "${2:-}" ]]; then
  ENV_FILE="$2"
elif [[ -f "$PROJECT_ROOT/.env" ]]; then
  ENV_FILE="$PROJECT_ROOT/.env"
fi

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
  echo -e "${BLUE}[INFO]${NC} Loaded env from: $ENV_FILE"
else
  echo -e "${YELLOW}[WARN]${NC} No .env file found — using current environment"
  echo -e "${YELLOW}       Use --env /path/to/.env to specify${NC}"
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   debuga.ai — Verificação de Prontidão para Produção    ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Ambiente: ${CYAN}${APP_ENV:-não definido}${NC}"
echo -e "  Data:     ${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"

# ═══════════════════════════════════════════════════════════════
section "1. BANCO DE DADOS [obrigatório]"
# ═══════════════════════════════════════════════════════════════

# Check 1: Database URL
if [[ -n "${DATABASE_URL:-}" ]]; then
  pass "DATABASE_URL configurada ($(mask_secret "$DATABASE_URL"))"
elif [[ -n "${POSTGRES_HOST:-}" && -n "${POSTGRES_DB:-}" ]]; then
  pass "Variáveis PostgreSQL individuais configuradas (host: ${POSTGRES_HOST})"
else
  fail "DATABASE_URL ou POSTGRES_* não configuradas"
fi

# Check 2: Database connectivity
if [[ -n "${DATABASE_URL:-}" || -n "${POSTGRES_HOST:-}" ]]; then
  DB_HOST="${POSTGRES_HOST:-}"
  DB_PORT="${POSTGRES_PORT:-5432}"
  if [[ -z "$DB_HOST" && -n "${DATABASE_URL:-}" ]]; then
    DB_HOST=$(echo "$DATABASE_URL" | grep -oP '@\K[^:/]+' || echo "")
    DB_PORT=$(echo "$DATABASE_URL" | grep -oP ':\K[0-9]+(?=/)' || echo "5432")
  fi
  if [[ -n "$DB_HOST" ]]; then
    # Detect if host is a Docker internal hostname (not IP, not localhost)
    IS_DOCKER_HOST=false
    if [[ "$DB_HOST" != "localhost" && "$DB_HOST" != "127.0.0.1" && ! "$DB_HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      IS_DOCKER_HOST=true
    fi

    if timeout 5 bash -c "echo >/dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
      pass "Banco de dados acessível: ${DB_HOST}:${DB_PORT}"
    elif [[ "$IS_DOCKER_HOST" == "true" ]]; then
      # Try localhost with same port (Docker port mapping)
      if timeout 5 bash -c "echo >/dev/tcp/localhost/${DB_PORT}" 2>/dev/null; then
        pass "Banco de dados acessível via localhost:${DB_PORT} (Docker port mapping)"
      elif command -v docker &>/dev/null; then
        # Try via docker exec
        CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i "postgres\|pg\|db" | head -1)
        if [[ -n "$CONTAINER" ]]; then
          if docker exec "$CONTAINER" pg_isready -q 2>/dev/null; then
            pass "Banco de dados acessível via docker exec $CONTAINER"
          else
            fail "Banco de dados inacessível (testado: ${DB_HOST}:${DB_PORT}, localhost:${DB_PORT}, docker exec)"
          fi
        else
          warn "Banco de dados em hostname Docker (${DB_HOST}:${DB_PORT}) — inacessível do host, mas pode estar OK dentro da rede Docker"
        fi
      else
        warn "Banco de dados em hostname Docker (${DB_HOST}:${DB_PORT}) — não testável do host"
      fi
    else
      fail "Banco de dados inacessível: ${DB_HOST}:${DB_PORT}"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════
section "2. AUTENTICAÇÃO [obrigatório]"
# ═══════════════════════════════════════════════════════════════

# Check 3: JWT Secret
if [[ -n "${JWT_SECRET:-}" ]]; then
  if [[ ${#JWT_SECRET} -ge 32 ]]; then
    pass "JWT_SECRET configurado (${#JWT_SECRET} chars)"
  else
    warn "JWT_SECRET curto (${#JWT_SECRET} chars, recomendado: 32+)"
  fi
else
  fail "JWT_SECRET não configurado"
fi

# Check 4: Admin email
if [[ -n "${ADMIN_EMAIL:-}" ]]; then
  pass "ADMIN_EMAIL: ${ADMIN_EMAIL}"
else
  fail "ADMIN_EMAIL não configurado"
fi

# Check 5: Login method
if [[ "${ENABLE_LOCAL_LOGIN:-}" != "false" ]]; then
  pass "Login local habilitado"
elif [[ -n "${GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  pass "Google OAuth configurado (login local desabilitado)"
else
  fail "Nenhum método de login configurado"
fi

# Check 6: Google OAuth (optional)
if [[ -n "${GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  pass "Google OAuth configurado"
else
  warn "Google OAuth não configurado (opcional se login local ativo)"
fi

# Check 7: APP_ENV
if [[ "${APP_ENV:-}" == "production" ]]; then
  pass "APP_ENV=production (cookies seguros, HTTPS enforced)"
else
  warn "APP_ENV=${APP_ENV:-não definido} (cookies podem não ser seguros)"
fi

# ═══════════════════════════════════════════════════════════════
section "3. LLM PROVIDER [obrigatório]"
# ═══════════════════════════════════════════════════════════════

# Check 8: At least one LLM provider
LLM_OK=false

if [[ -n "${LLM_PROVIDER:-}" ]]; then
  pass "LLM_PROVIDER definido: ${LLM_PROVIDER}"
fi

if [[ -n "${LLM_CLOUD_API_KEY:-}" ]]; then
  pass "LLM Cloud API Key: $(mask_secret "$LLM_CLOUD_API_KEY")"
  LLM_OK=true
fi

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  pass "OpenAI API Key: $(mask_secret "$OPENAI_API_KEY")"
  LLM_OK=true
fi

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  pass "Gemini API Key: $(mask_secret "$GEMINI_API_KEY")"
  LLM_OK=true
fi

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  pass "Anthropic API Key: $(mask_secret "$ANTHROPIC_API_KEY")"
  LLM_OK=true
fi

if [[ "${ENABLE_LOCAL_INFERENCE:-}" == "true" ]]; then
  pass "Ollama local habilitado (modelo: ${LOCAL_LLM_MODEL:-qwen2.5-coder:7b})"
  LLM_OK=true
fi

if [[ "$LLM_OK" == false ]]; then
  fail "NENHUM provider LLM configurado — chat não funcionará"
fi

# Check 9: Fallback provider
if [[ -n "${LLM_FALLBACK_PROVIDER:-}" ]]; then
  pass "Fallback provider: ${LLM_FALLBACK_PROVIDER}"
else
  warn "LLM_FALLBACK_PROVIDER não configurado (sem redundância)"
fi

# Check 10: LLM connectivity
if [[ -n "${LLM_CLOUD_API_URL:-}" ]]; then
  HTTP_CODE=$(curl -s --max-time 10 -o /dev/null -w "%{http_code}" "${LLM_CLOUD_API_URL}" 2>/dev/null || echo "000")
  case "$HTTP_CODE" in
    2*|3*) pass "Endpoint LLM acessível (HTTP ${HTTP_CODE})" ;;
    429)   warn "Endpoint LLM em rate-limit (HTTP 429 — funcional mas throttled)" ;;
    401|403) warn "Endpoint LLM retornou ${HTTP_CODE} (credenciais podem estar erradas)" ;;
    000)   warn "Endpoint LLM timeout (${LLM_CLOUD_API_URL})" ;;
    *)     warn "Endpoint LLM retornou HTTP ${HTTP_CODE}" ;;
  esac
fi

# ═══════════════════════════════════════════════════════════════
section "4. SEGURANÇA [recomendado]"
# ═══════════════════════════════════════════════════════════════

# Check 11: Turnstile CAPTCHA
if [[ "${ENABLE_TURNSTILE:-}" == "true" ]]; then
  if [[ -n "${TURNSTILE_SITE_KEY:-}" && -n "${TURNSTILE_SECRET_KEY:-}" ]]; then
    pass "Cloudflare Turnstile configurado"
  else
    fail "Turnstile habilitado mas chaves faltando"
  fi
else
  warn "Cloudflare Turnstile desabilitado (recomendado para produção)"
fi

# Check 12: Rate limiting
if [[ "${RATE_LIMIT_ENABLED:-}" != "false" ]]; then
  pass "Rate limiting ativo"
else
  fail "Rate limiting desabilitado — vulnerável a abuso"
fi

# Check 13: Disposable email blocking
if [[ "${BLOCK_DISPOSABLE_EMAILS:-}" != "false" ]]; then
  pass "Bloqueio de emails descartáveis ativo"
else
  warn "Bloqueio de emails descartáveis desabilitado"
fi

# Check 14: Terms acceptance
if [[ "${REQUIRE_TERMS_ACCEPTANCE:-}" == "true" ]]; then
  pass "Aceite de termos obrigatório (LGPD)"
else
  warn "Aceite de termos não obrigatório (recomendado para LGPD)"
fi

# ═══════════════════════════════════════════════════════════════
section "5. EMAIL/SMTP [condicional]"
# ═══════════════════════════════════════════════════════════════

# Check 15: SMTP configuration
if [[ "${EMAIL_VERIFICATION_ENABLED:-}" == "true" ]]; then
  if [[ -n "${SMTP_HOST:-}" && -n "${SMTP_USER:-}" && -n "${SMTP_PASSWORD:-}${SMTP_PASS:-}" ]]; then
    pass "SMTP configurado: ${SMTP_HOST}:${SMTP_PORT:-587}"
    
    # Check 16: SMTP connectivity
    if timeout 5 bash -c "echo >/dev/tcp/${SMTP_HOST}/${SMTP_PORT:-587}" 2>/dev/null; then
      pass "SMTP acessível: ${SMTP_HOST}:${SMTP_PORT:-587}"
    else
      warn "SMTP não acessível (pode ser bloqueio de firewall)"
    fi
  else
    fail "Email verification habilitada mas SMTP não configurado"
  fi
else
  warn "Verificação de email desabilitada (recomendado para produção)"
fi

# ═══════════════════════════════════════════════════════════════
section "6. STORAGE/S3 [recomendado]"
# ═══════════════════════════════════════════════════════════════

# Check 17: S3 storage
if [[ -n "${S3_ENDPOINT:-}${AWS_S3_ENDPOINT:-}${MINIO_ENDPOINT:-}" ]]; then
  S3_EP="${S3_ENDPOINT:-${AWS_S3_ENDPOINT:-${MINIO_ENDPOINT:-}}}"
  pass "S3 endpoint configurado: ${S3_EP}"
  
  if [[ -n "${S3_ACCESS_KEY:-}${AWS_ACCESS_KEY_ID:-}${MINIO_ACCESS_KEY:-}" ]]; then
    pass "S3 credentials configuradas"
  else
    fail "S3 endpoint sem credentials"
  fi
else
  warn "S3 storage não configurado (imagens geradas usarão URLs temporárias)"
fi

# ═══════════════════════════════════════════════════════════════
section "7. STRIPE/PAGAMENTOS [opcional]"
# ═══════════════════════════════════════════════════════════════

# Check 18: Stripe
if [[ -n "${STRIPE_SECRET_KEY:-}" ]]; then
  if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
    pass "Stripe configurado (modo LIVE)"
  elif [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    warn "Stripe em modo TESTE (ok para homologação)"
  else
    fail "STRIPE_SECRET_KEY formato inválido"
  fi
  
  if [[ -n "${STRIPE_WEBHOOK_SECRET:-}" ]]; then
    pass "Stripe webhook secret configurado"
  else
    warn "STRIPE_WEBHOOK_SECRET não configurado (webhooks não funcionarão)"
  fi
else
  warn "Stripe não configurado (pagamentos desabilitados)"
fi

# ═══════════════════════════════════════════════════════════════
section "8. WHITE LABEL [recomendado]"
# ═══════════════════════════════════════════════════════════════

# Check 19: App title
if [[ -n "${VITE_APP_TITLE:-}" ]]; then
  pass "Nome da aplicação: ${VITE_APP_TITLE}"
else
  warn "VITE_APP_TITLE não configurado (usará padrão)"
fi

# Check 20: Domain
if [[ -n "${APP_DOMAIN:-}${VITE_APP_URL:-}" ]]; then
  pass "Domínio configurado: ${APP_DOMAIN:-${VITE_APP_URL:-}}"
else
  warn "APP_DOMAIN não configurado"
fi

# ═══════════════════════════════════════════════════════════════
section "9. INFRAESTRUTURA [obrigatório]"
# ═══════════════════════════════════════════════════════════════

# Check 21: Docker
if command -v docker &>/dev/null; then
  DOCKER_VERSION=$(docker --version 2>/dev/null | grep -oP '\d+\.\d+' | head -1 || echo "?")
  pass "Docker instalado (v${DOCKER_VERSION})"
else
  fail "Docker não encontrado"
fi

# Check 22: Docker Compose
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_VERSION=$(docker compose version 2>/dev/null | grep -oP '\d+\.\d+' | head -1 || echo "?")
  pass "Docker Compose instalado (v${COMPOSE_VERSION})"
elif command -v docker-compose &>/dev/null; then
  pass "docker-compose (legacy) instalado"
else
  fail "Docker Compose não encontrado"
fi

# Check 23: Disk space
DISK_AVAIL=$(df -BG / 2>/dev/null | awk 'NR==2{print $4}' | tr -d 'G' || echo "0")
if [[ "${DISK_AVAIL:-0}" -ge 20 ]]; then
  pass "Espaço em disco: ${DISK_AVAIL}GB disponíveis"
elif [[ "${DISK_AVAIL:-0}" -ge 10 ]]; then
  warn "Espaço em disco baixo: ${DISK_AVAIL}GB (recomendado: 20GB+)"
else
  fail "Espaço em disco crítico: ${DISK_AVAIL:-?}GB"
fi

# Check 24: RAM
RAM_TOTAL=$(free -g 2>/dev/null | awk '/Mem:/{print $2}' || echo "0")
if [[ "${RAM_TOTAL:-0}" -ge 4 ]]; then
  pass "RAM total: ${RAM_TOTAL}GB"
elif [[ "${RAM_TOTAL:-0}" -ge 2 ]]; then
  warn "RAM baixa: ${RAM_TOTAL}GB (recomendado: 4GB+ sem GPU, 16GB+ com GPU)"
else
  warn "RAM muito baixa: ${RAM_TOTAL:-?}GB"
fi

# Check 25: Internet
if curl -s --max-time 5 -o /dev/null https://www.google.com 2>/dev/null; then
  pass "Acesso à internet OK"
else
  warn "Sem acesso à internet (necessário para providers cloud)"
fi

# ═══════════════════════════════════════════════════════════════
section "10. GPU LOCAL [condicional]"
# ═══════════════════════════════════════════════════════════════

# Check 26: GPU (only if local inference enabled)
if [[ "${ENABLE_LOCAL_INFERENCE:-}" == "true" ]]; then
  if command -v nvidia-smi &>/dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "?")
    GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1 || echo "?")
    pass "GPU detectada: ${GPU_NAME} (${GPU_MEM})"
  else
    warn "nvidia-smi não encontrado (GPU pode não estar configurada)"
  fi
  
  # Check Ollama
  OLLAMA_URL="${LOCAL_LLM_HOST_URL:-http://localhost:11434}"
  if curl -sf --max-time 5 "${OLLAMA_URL}/api/tags" &>/dev/null; then
    pass "Ollama acessível: ${OLLAMA_URL}"
  elif curl -sf --max-time 5 "http://localhost:11434/api/tags" &>/dev/null; then
    pass "Ollama acessível via localhost:11434"
  elif command -v docker &>/dev/null; then
    OLLAMA_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i "ollama" | head -1)
    if [[ -n "$OLLAMA_CONTAINER" ]]; then
      if docker exec "$OLLAMA_CONTAINER" curl -sf --max-time 5 "http://localhost:11434/api/tags" &>/dev/null; then
        pass "Ollama acessível via docker exec $OLLAMA_CONTAINER"
      else
        warn "Container Ollama rodando mas API não responde"
      fi
    else
      warn "Ollama não acessível em ${OLLAMA_URL} (nenhum container encontrado)"
    fi
  else
    warn "Ollama não acessível em ${OLLAMA_URL}"
  fi
else
  warn "Inferência local desabilitada (usando apenas cloud)"
fi

# ═══════════════════════════════════════════════════════════════
# RESULTADO FINAL
# ═══════════════════════════════════════════════════════════════

TOTAL=$((PASS + WARN + FAIL))
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}✓ Passou: ${PASS}/${TOTAL}${NC}  |  ${YELLOW}⚠ Avisos: ${WARN}${NC}  |  ${RED}✗ Falhas: ${FAIL}${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"

if [[ $FAIL -eq 0 && $WARN -eq 0 ]]; then
  echo -e "\n${GREEN}PRONTO PARA PRODUÇÃO — Todos os ${TOTAL} checks passaram!${NC}"
  exit 0
elif [[ $FAIL -eq 0 ]]; then
  echo -e "\n${YELLOW}QUASE PRONTO — ${WARN} aviso(s) não-bloqueante(s).${NC}"
  echo -e "${YELLOW}O sistema funcionará, mas recomenda-se resolver os avisos.${NC}"
  exit 0
else
  echo -e "\n${RED}NÃO PRONTO — ${FAIL} falha(s) bloqueante(s) detectada(s).${NC}"
  echo ""
  echo -e "${RED}Falhas que precisam ser corrigidas:${NC}"
  for check in "${CHECKS[@]}"; do
    if [[ "$check" == FAIL* ]]; then
      echo -e "  ${RED}✗${NC} ${check#FAIL|}"
    fi
  done
  echo ""
  echo "Consulte: docs/PRODUCTION_DEPLOY.md para instruções detalhadas"
  exit 1
fi
