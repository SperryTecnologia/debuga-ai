#!/usr/bin/env bash
# ============================================================
# validate-all.sh
# Executa TODOS os scripts de validação e gera relatório consolidado.
#
# REGRA DE APROVAÇÃO:
#   O resultado final é baseado EXCLUSIVAMENTE nos exit codes dos scripts.
#   - Exit 0 = script aprovado (pode ter WARNs internos, isso é OK)
#   - Exit != 0 de script OBRIGATÓRIO = FALHA BLOQUEANTE
#   - Exit != 0 de script OPCIONAL (feature desabilitada) = WARN, não bloqueia
#
#   Contadores de ✓/⚠/✗ são INFORMATIVOS — não determinam aprovação.
#
# USO:
#   ./scripts/validate-all.sh [--quick] [--env /path/to/.env]
#
# FLAGS:
#   --quick   Pula scripts que fazem chamadas de rede
#   --env     Especifica o arquivo .env a usar
# ============================================================
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
QUICK_MODE=false
ENV_ARG=""

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick) QUICK_MODE=true; shift ;;
    --env) ENV_ARG="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# Resolve .env path for passing to sub-scripts
if [ -n "$ENV_ARG" ] && [ -f "$ENV_ARG" ]; then
  ENV_FILE="$ENV_ARG"
elif [ -f "$PROJECT_ROOT/.env" ]; then
  ENV_FILE="$PROJECT_ROOT/.env"
else
  ENV_FILE=""
fi

# Load .env to determine which features are enabled
if [ -n "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

SCRIPTS_RUN=0
SCRIPTS_SKIPPED=0

# Counters based on EXIT CODES (not output symbols)
BLOCKING_FAILURES=0
OPTIONAL_FAILURES=0

# Tracking arrays for the final report
declare -a FAILED_SCRIPTS=()
declare -a FAILED_REASONS=()
declare -a FAILED_BLOCKING=()
declare -a FAILED_ACTIONS=()
declare -a PASSED_SCRIPTS=()

# Scripts que fazem chamadas de rede (skip em --quick)
NETWORK_SCRIPTS=(
  "check-llm-provider.sh"
  "check-gpu-readiness.sh"
  "check-email-provider.sh"
  "check-chat-quality.sh"
)

# Determinar quais features opcionais estão habilitadas
VIDEO_ENABLED="${VIDEO_GENERATION_ENABLED:-${ENABLE_VIDEO_GENERATION:-false}}"
STRIPE_ENABLED="false"
[ -n "${STRIPE_SECRET_KEY:-}" ] && STRIPE_ENABLED="true"
TURNSTILE_ENABLED="${ENABLE_TURNSTILE:-false}"
GPU_ENABLED="${ENABLE_LOCAL_INFERENCE:-false}"

# Determine if a script is for an optional feature that is currently DISABLED
is_optional_and_disabled() {
  local script_name="$1"
  case "$script_name" in
    check-video-pipeline.sh)
      [ "$VIDEO_ENABLED" != "true" ] && return 0 ;;
    check-stripe-config.sh)
      [ "$STRIPE_ENABLED" != "true" ] && return 0 ;;
    check-turnstile-config.sh)
      [ "$TURNSTILE_ENABLED" != "true" ] && return 0 ;;
    check-gpu-readiness.sh)
      [ "$GPU_ENABLED" != "true" ] && return 0 ;;
  esac
  return 1
}

# Get recommended action for a failed script
get_recommended_action() {
  local script_name="$1"
  case "$script_name" in
    check-video-pipeline.sh)
      echo "Configurar VIDEO_GENERATION_PROVIDER ou desabilitar com VIDEO_GENERATION_ENABLED=false" ;;
    check-stripe-config.sh)
      echo "Configurar STRIPE_SECRET_KEY ou aceitar como opcional" ;;
    check-turnstile-config.sh)
      echo "Configurar TURNSTILE_SITE_KEY/SECRET_KEY ou desabilitar com ENABLE_TURNSTILE=false" ;;
    check-gpu-readiness.sh)
      echo "Verificar Ollama/GPU ou desabilitar com ENABLE_LOCAL_INFERENCE=false" ;;
    check-llm-provider.sh)
      echo "Verificar API keys e URLs dos providers LLM" ;;
    check-email-provider.sh)
      echo "Configurar SMTP_HOST/USER/PASSWORD" ;;
    check-capabilities.sh)
      echo "Verificar providers com erro. Configurar LLM_FALLBACK_PROVIDER" ;;
    check-production-readiness.sh)
      echo "Verificar variáveis obrigatórias: DOMAIN, APP_URL, JWT_SECRET, DATABASE_URL" ;;
    check-auth-security.sh)
      echo "Verificar configuração de autenticação" ;;
    check-assets-pipeline.sh)
      echo "Configurar S3/MinIO (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)" ;;
    check-pre-production.sh)
      echo "Verificar arquivos de código-fonte e dependências" ;;
    *)
      echo "Verificar output do script para detalhes" ;;
  esac
}

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       debuga.ai — Validação Completa de Produção        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  Modo: $($QUICK_MODE && echo 'QUICK (sem rede)' || echo 'COMPLETO')"
[ -n "$ENV_FILE" ] && echo -e "  Env:  $ENV_FILE"
echo ""
echo -e "  Features opcionais:"
echo -e "    Vídeo:     $( [ "$VIDEO_ENABLED" = "true" ] && echo -e "${GREEN}habilitado${NC}" || echo -e "${YELLOW}desabilitado${NC}" )"
echo -e "    Stripe:    $( [ "$STRIPE_ENABLED" = "true" ] && echo -e "${GREEN}habilitado${NC}" || echo -e "${YELLOW}desabilitado${NC}" )"
echo -e "    Turnstile: $( [ "$TURNSTILE_ENABLED" = "true" ] && echo -e "${GREEN}habilitado${NC}" || echo -e "${YELLOW}desabilitado${NC}" )"
echo -e "    GPU local: $( [ "$GPU_ENABLED" = "true" ] && echo -e "${GREEN}habilitado${NC}" || echo -e "${YELLOW}desabilitado${NC}" )"
# ── Pre-flight security checks ──
PREFLIGHT_WARNINGS=0

# Check MinIO default credentials
if [ "${MINIO_ROOT_USER:-}" = "minioadmin" ] || [ "${MINIO_ROOT_PASSWORD:-}" = "minioadmin" ]; then
  echo -e "  ${RED}✗ SEGURANÇA: MinIO usando credenciais padrão (minioadmin)${NC}"
  echo -e "    Ação: Definir MINIO_ROOT_USER e MINIO_ROOT_PASSWORD no .env"
  BLOCKING_FAILURES=$((BLOCKING_FAILURES + 1))
  FAILED_SCRIPTS+=("pre-flight-minio-credentials")
  FAILED_REASONS+=("Credenciais padrão minioadmin detectadas")
  FAILED_BLOCKING+=("SIM")
  FAILED_ACTIONS+=("Definir MINIO_ROOT_USER e MINIO_ROOT_PASSWORD com valores seguros no .env")
fi

# Check weak Postgres password
if [ "${POSTGRES_PASSWORD:-}" = "debuga_secret" ] || [ "${POSTGRES_PASSWORD:-}" = "postgres" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo -e "  ${RED}✗ SEGURANÇA: PostgreSQL usando senha fraca ou vazia${NC}"
  echo -e "    Ação: Definir POSTGRES_PASSWORD com valor forte no .env"
  BLOCKING_FAILURES=$((BLOCKING_FAILURES + 1))
  FAILED_SCRIPTS+=("pre-flight-postgres-password")
  FAILED_REASONS+=("Senha fraca/padrão detectada")
  FAILED_BLOCKING+=("SIM")
  FAILED_ACTIONS+=("Gerar senha forte: openssl rand -base64 48")
fi

echo ""
echo "──────────────────────────────────────────────────────────"
echo ""

run_script() {
  local script="$1"
  local name
  name=$(basename "$script" .sh)
  local script_basename
  script_basename=$(basename "$script")

  # Skip network scripts in quick mode
  if $QUICK_MODE; then
    for ns in "${NETWORK_SCRIPTS[@]}"; do
      if [ "$script_basename" = "$ns" ]; then
        echo -e "  ${CYAN}⏭${NC}  $name (skipped — modo rápido)"
        SCRIPTS_SKIPPED=$((SCRIPTS_SKIPPED + 1))
        return 0
      fi
    done
  fi

  SCRIPTS_RUN=$((SCRIPTS_RUN + 1))
  echo -e "${BLUE}▶${NC} Executando: ${BOLD}$name${NC}"

  # Check if this is an optional feature that's disabled
  local is_optional_disabled=false
  if is_optional_and_disabled "$script_basename"; then
    is_optional_disabled=true
    echo -e "  ${CYAN}(feature opcional desabilitada — exit != 0 será WARN, não FAIL)${NC}"
  fi

  echo ""

  # Build args for sub-script
  local script_args=()
  if [ -n "$ENV_FILE" ]; then
    if grep -q "\-\-env" "$script" 2>/dev/null; then
      script_args=("--env" "$ENV_FILE")
    else
      script_args=("$ENV_FILE")
    fi
  fi

  # Run the script and capture output + exit code
  local output
  local exit_code=0
  output=$(bash "$script" "${script_args[@]}" 2>&1) || exit_code=$?

  # Print the output
  echo "$output"
  echo ""

  # ─── DECISION LOGIC (based on EXIT CODE only) ───
  if [ $exit_code -eq 0 ]; then
    # Script passed — regardless of internal ✗ symbols in its output
    PASSED_SCRIPTS+=("$name")
    echo -e "  ${GREEN}↳ $name: APROVADO (exit 0)${NC}"
  elif [ "$is_optional_disabled" = "true" ]; then
    # Optional feature disabled + failed = WARN (not blocking)
    OPTIONAL_FAILURES=$((OPTIONAL_FAILURES + 1))
    echo -e "  ${YELLOW}↳ $name: WARN (feature desabilitada, exit $exit_code → não bloqueante)${NC}"
    # Still record for informational purposes
    local reason
    reason=$(echo "$output" | grep -E "❌|✗|RESULTADO|FAIL" | grep -v "Falhou: 0" | tail -1 | sed 's/.*[❌✗] //' | head -c 100)
    [ -z "$reason" ] && reason="Exit code $exit_code (feature desabilitada)"
    FAILED_SCRIPTS+=("$name")
    FAILED_REASONS+=("$reason")
    FAILED_BLOCKING+=("NÃO (feature desabilitada)")
    local action
    action=$(get_recommended_action "$script_basename")
    FAILED_ACTIONS+=("$action")
  else
    # Required script failed = BLOCKING
    BLOCKING_FAILURES=$((BLOCKING_FAILURES + 1))
    local reason
    reason=$(echo "$output" | grep -E "❌|✗|RESULTADO|FAIL" | grep -v "Falhou: 0" | tail -1 | sed 's/.*[❌✗] //' | head -c 100)
    [ -z "$reason" ] && reason="Exit code $exit_code"
    FAILED_SCRIPTS+=("$name")
    FAILED_REASONS+=("$reason")
    FAILED_BLOCKING+=("SIM")
    local action
    action=$(get_recommended_action "$script_basename")
    FAILED_ACTIONS+=("$action")
    echo -e "  ${RED}↳ $name: FALHA BLOQUEANTE (exit $exit_code)${NC}"
  fi

  echo "──────────────────────────────────────────────────────────"
  echo ""
}

# Run all check scripts in order
for script in "$SCRIPT_DIR"/check-*.sh; do
  if [ -f "$script" ] && [ -x "$script" ]; then
    run_script "$script"
  fi
done

# ═══════════════════════════════════════════════════════════════
# RELATÓRIO CONSOLIDADO
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║                  RELATÓRIO CONSOLIDADO                   ║${NC}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
echo -e "${BOLD}║${NC}  Scripts executados:      $SCRIPTS_RUN"
[ $SCRIPTS_SKIPPED -gt 0 ] && echo -e "${BOLD}║${NC}  Scripts pulados (quick): $SCRIPTS_SKIPPED"
echo -e "${BOLD}║${NC}  Scripts aprovados:       ${#PASSED_SCRIPTS[@]}"
echo -e "${BOLD}║${NC}"
echo -e "${BOLD}║${NC}  ${GREEN}✓ Aprovados:${NC}             ${#PASSED_SCRIPTS[@]}"
echo -e "${BOLD}║${NC}  ${YELLOW}⚠ Opcionais com falha:${NC}  $OPTIONAL_FAILURES"
echo -e "${BOLD}║${NC}  ${RED}✗ Bloqueantes com falha:${NC} $BLOCKING_FAILURES"
echo -e "${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"

# List failures if any
if [ ${#FAILED_SCRIPTS[@]} -gt 0 ]; then
  echo -e "${BOLD}║${NC}"
  if [ $BLOCKING_FAILURES -gt 0 ]; then
    echo -e "${BOLD}║${NC}  ${RED}${BOLD}FALHAS BLOQUEANTES:${NC}"
  else
    echo -e "${BOLD}║${NC}  ${YELLOW}${BOLD}AVISOS (não bloqueantes):${NC}"
  fi
  echo -e "${BOLD}║${NC}"
  for i in "${!FAILED_SCRIPTS[@]}"; do
    local_blocking="${FAILED_BLOCKING[$i]}"
    if [ "$local_blocking" = "SIM" ]; then
      echo -e "${BOLD}║${NC}  ${RED}$((i+1)). ${FAILED_SCRIPTS[$i]}${NC}"
    else
      echo -e "${BOLD}║${NC}  ${YELLOW}$((i+1)). ${FAILED_SCRIPTS[$i]}${NC}"
    fi
    echo -e "${BOLD}║${NC}     Motivo:     ${FAILED_REASONS[$i]}"
    echo -e "${BOLD}║${NC}     Bloqueante: ${local_blocking}"
    echo -e "${BOLD}║${NC}     Ação:       ${FAILED_ACTIONS[$i]}"
    echo -e "${BOLD}║${NC}"
  done
  echo -e "${BOLD}╠══════════════════════════════════════════════════════════╣${NC}"
fi

echo -e "${BOLD}║${NC}"
if [ $BLOCKING_FAILURES -eq 0 ]; then
  if [ $OPTIONAL_FAILURES -gt 0 ]; then
    echo -e "${BOLD}║${NC}  ${GREEN}${BOLD}RESULTADO: ✅ APROVADO COM AVISOS${NC}"
    echo -e "${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}  Todos os scripts obrigatórios passaram (exit 0)."
    echo -e "${BOLD}║${NC}  $OPTIONAL_FAILURES feature(s) opcional(is) desabilitada(s) — não bloqueiam."
    echo -e "${BOLD}║${NC}  Para habilitar, configure as variáveis no .env e re-execute."
  else
    echo -e "${BOLD}║${NC}  ${GREEN}${BOLD}RESULTADO: ✅ APROVADO PARA PRODUÇÃO${NC}"
    echo -e "${BOLD}║${NC}"
    echo -e "${BOLD}║${NC}  Todos os scripts passaram com sucesso."
  fi
else
  echo -e "${BOLD}║${NC}  ${RED}${BOLD}RESULTADO: ❌ NÃO APROVADO${NC}"
  echo -e "${BOLD}║${NC}"
  echo -e "${BOLD}║${NC}  $BLOCKING_FAILURES script(s) obrigatório(s) falharam."
  echo -e "${BOLD}║${NC}  Corrija os itens BLOQUEANTES listados acima e re-execute."
fi

echo -e "${BOLD}║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

[ $BLOCKING_FAILURES -eq 0 ] && exit 0 || exit 1
