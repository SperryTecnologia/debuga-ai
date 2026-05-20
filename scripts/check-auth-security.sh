#!/usr/bin/env bash
# ============================================================
# check-auth-security.sh
# Diagnostica a configuracao de seguranca de autenticacao.
#
# USO:
#   chmod +x scripts/check-auth-security.sh
#   ./scripts/check-auth-security.sh
#   ./scripts/check-auth-security.sh /caminho/para/.env
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${1:-$PROJECT_ROOT/.env}"

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${RED}Arquivo ${ENV_FILE} nao encontrado.${NC}"
    exit 1
fi

echo ""
echo "============================================================"
echo "  debuga.ai — Diagnostico de Seguranca Auth"
echo "============================================================"
echo ""

SCORE=0
MAX_SCORE=0

check_security() {
    local label="$1"
    local condition="$2"
    local points="$3"
    local recommendation="$4"
    MAX_SCORE=$((MAX_SCORE + points))

    if eval "$condition"; then
        echo -e "  ${GREEN}[+${points}]${NC} ${label}"
        SCORE=$((SCORE + points))
    else
        echo -e "  ${RED}[ 0]${NC} ${label}"
        echo -e "       ${YELLOW}→ ${recommendation}${NC}"
    fi
}

# ---- Verificacao de E-mail ----
echo -e "${BLUE}1. Verificacao de E-mail${NC}"
check_security "Email verification habilitado" \
    '[ "${EMAIL_VERIFICATION_ENABLED:-}" = "true" ]' \
    3 "Defina EMAIL_VERIFICATION_ENABLED=true no .env"

check_security "SMTP configurado" \
    '[ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_USER:-}" ]' \
    2 "Configure SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM"

check_security "Bloqueio de chat sem verificacao" \
    '[ "${REQUIRE_EMAIL_FOR_CHAT:-}" = "true" ]' \
    2 "Defina REQUIRE_EMAIL_FOR_CHAT=true para bloquear usuarios nao verificados"
echo ""

# ---- CAPTCHA ----
echo -e "${BLUE}2. CAPTCHA (Cloudflare Turnstile)${NC}"
check_security "Turnstile configurado" \
    '[ -n "${TURNSTILE_SITE_KEY:-}" ] && [ -n "${TURNSTILE_SECRET_KEY:-}" ]' \
    3 "Configure TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY (gratuito em dash.cloudflare.com)"

check_security "Turnstile no login" \
    '[ "${TURNSTILE_ON_LOGIN:-}" = "true" ]' \
    1 "Defina TURNSTILE_ON_LOGIN=true para CAPTCHA no login tambem"
echo ""

# ---- Rate Limiting ----
echo -e "${BLUE}3. Rate Limiting${NC}"
check_security "Rate limiting habilitado" \
    '[ "${RATE_LIMIT_ENABLED:-}" != "false" ]' \
    2 "Nao desabilite RATE_LIMIT_ENABLED em producao"
echo ""

# ---- Termos e Privacidade ----
echo -e "${BLUE}4. Termos de Uso e Privacidade${NC}"
check_security "Aceite de termos obrigatorio" \
    '[ "${REQUIRE_TERMS_ACCEPTANCE:-}" = "true" ]' \
    1 "Defina REQUIRE_TERMS_ACCEPTANCE=true e configure URLs no admin"
echo ""

# ---- Telefone/WhatsApp ----
echo -e "${BLUE}5. Verificacao por Telefone/WhatsApp${NC}"
check_security "Phone verification habilitado" \
    '[ "${PHONE_VERIFICATION_ENABLED:-}" = "true" ]' \
    2 "Defina PHONE_VERIFICATION_ENABLED=true (requer Twilio ou WhatsApp API)"

if [ "${PHONE_VERIFICATION_ENABLED:-}" = "true" ]; then
    check_security "Provider de telefone configurado" \
        '[ "${PHONE_OTP_PROVIDER:-console}" != "console" ]' \
        1 "Defina PHONE_OTP_PROVIDER=twilio ou whatsapp (console e apenas para dev)"
fi
echo ""

# ---- Senhas e Sessoes ----
echo -e "${BLUE}6. Senhas e Sessoes${NC}"
JWT_VAL="${JWT_SECRET:-}"
check_security "JWT_SECRET com 32+ caracteres" \
    '[ ${#JWT_VAL} -ge 32 ]' \
    2 "Use um JWT_SECRET com pelo menos 32 caracteres aleatorios"

check_security "Login local habilitado" \
    '[ "${ENABLE_LOCAL_LOGIN:-}" != "false" ]' \
    0 "Login local esta desabilitado (ok se usando apenas Google OAuth)"
echo ""

# ---- Google OAuth ----
echo -e "${BLUE}7. Google OAuth (opcional)${NC}"
check_security "Google OAuth configurado" \
    '[ -n "${GOOGLE_CLIENT_ID:-}" ] && [ -n "${GOOGLE_CLIENT_SECRET:-}" ]' \
    1 "Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET para login social"
echo ""

# ---- Resultado ----
echo "============================================================"
PERCENT=$((SCORE * 100 / MAX_SCORE))

if [ $PERCENT -ge 80 ]; then
    COLOR=$GREEN
    GRADE="EXCELENTE"
elif [ $PERCENT -ge 60 ]; then
    COLOR=$YELLOW
    GRADE="BOM"
elif [ $PERCENT -ge 40 ]; then
    COLOR=$YELLOW
    GRADE="REGULAR"
else
    COLOR=$RED
    GRADE="INSUFICIENTE"
fi

echo -e "  Score: ${COLOR}${SCORE}/${MAX_SCORE} (${PERCENT}%) — ${GRADE}${NC}"
echo ""
echo "  Recomendacoes minimas para producao:"
echo "    - EMAIL_VERIFICATION_ENABLED=true + SMTP configurado"
echo "    - TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY configurados"
echo "    - RATE_LIMIT_ENABLED=true (default)"
echo "    - JWT_SECRET com 64+ caracteres"
echo "============================================================"
