#!/usr/bin/env bash
# ============================================================
# validate-env.sh
# Valida todas as variáveis de ambiente do debuga.ai
#
# USO:
#   ./scripts/validate-env.sh
#   ./scripts/validate-env.sh /caminho/para/.env
#
# SAÍDA:
#   PASS = todas as variáveis obrigatórias estão configuradas
#   FAIL = variáveis obrigatórias ausentes
#   WARN = variáveis opcionais ausentes (não bloqueia)
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

ERRORS=0
WARNINGS=0

# ── Carregar .env ──
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    echo -e "${GREEN}✓${NC} Arquivo carregado: $ENV_FILE"
else
    echo -e "${RED}✗ Arquivo ${ENV_FILE} não encontrado.${NC}"
    echo "  Copie um template: cp templates/.env.production.template .env"
    exit 1
fi

echo ""
echo "============================================================"
echo "  debuga.ai — Validação de Variáveis de Ambiente"
echo "============================================================"
echo ""

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

check_required() {
    local var_name="$1"
    local description="$2"
    local val="${!var_name:-}"

    if [ -z "$val" ]; then
        echo -e "  ${RED}✗ FALTA${NC} ${var_name} — ${description}"
        ERRORS=$((ERRORS + 1))
    else
        local masked=$(mask_value "$val")
        echo -e "  ${GREEN}✓${NC} ${var_name} = ${CYAN}${masked}${NC}"
    fi
}

check_optional() {
    local var_name="$1"
    local description="$2"
    local val="${!var_name:-}"

    if [ -z "$val" ]; then
        echo -e "  ${YELLOW}⚠ VAZIO${NC} ${var_name} — ${description}"
        WARNINGS=$((WARNINGS + 1))
    else
        local masked=$(mask_value "$val")
        echo -e "  ${GREEN}✓${NC} ${var_name} = ${CYAN}${masked}${NC}"
    fi
}

check_value() {
    local var_name="$1"
    local description="$2"
    local val="${!var_name:-}"

    if [ -z "$val" ]; then
        echo -e "  ${RED}✗ FALTA${NC} ${var_name} — ${description}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "  ${GREEN}✓${NC} ${var_name} = ${CYAN}${val}${NC}"
    fi
}

# ╔══════════════════════════════════════════════════════════════╗
# ║  1. AMBIENTE E DOMÍNIO                                      ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}1. Ambiente e Domínio${NC}"
check_value "NODE_ENV" "Ambiente (production/development/homolog)"
check_required "DOMAIN" "Domínio público"
check_required "APP_URL" "URL pública completa"
check_required "AUTH_BASE_URL" "URL base para auth callbacks"
check_optional "PORT" "Porta do servidor (default: 3000)"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  2. APP / FRONTEND                                          ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}2. App/Frontend${NC}"
check_required "VITE_APP_TITLE" "Título da aplicação"
check_required "VITE_APP_ID" "ID da aplicação"
check_optional "VITE_APP_LOGO" "URL do logo"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  3. BANCO DE DADOS                                          ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}3. Banco de Dados${NC}"

DB_URL="${DATABASE_URL:-}"
PG_USER="${POSTGRES_USER:-}"
PG_PASS="${POSTGRES_PASSWORD:-}"
PG_DB="${POSTGRES_DB:-}"

if [ -n "$DB_URL" ]; then
    local_masked=$(mask_value "$DB_URL")
    echo -e "  ${GREEN}✓${NC} DATABASE_URL = ${CYAN}${local_masked}${NC}"
    # Also show individual vars if present
    if [ -n "$PG_USER" ]; then
        echo -e "  ${GREEN}✓${NC} POSTGRES_USER = ${CYAN}${PG_USER}${NC}"
    fi
    if [ -n "$PG_DB" ]; then
        echo -e "  ${GREEN}✓${NC} POSTGRES_DB = ${CYAN}${PG_DB}${NC}"
    fi
elif [ -n "$PG_USER" ] && [ -n "$PG_PASS" ] && [ -n "$PG_DB" ]; then
    echo -e "  ${YELLOW}⚠${NC} DATABASE_URL ausente — usando POSTGRES_USER/PASSWORD/DB"
    echo -e "  ${GREEN}✓${NC} POSTGRES_USER = ${CYAN}${PG_USER}${NC}"
    echo -e "  ${GREEN}✓${NC} POSTGRES_DB = ${CYAN}${PG_DB}${NC}"
    echo -e "  ${GREEN}✓${NC} POSTGRES_PASSWORD = ${CYAN}$(mask_value "$PG_PASS")${NC}"
    echo -e "  ${CYAN}  → Recomendado: defina DATABASE_URL para evitar ambiguidade${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "  ${RED}✗ FALTA${NC} DATABASE_URL ou conjunto POSTGRES_USER+PASSWORD+DB"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  4. SESSÕES / JWT                                           ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}4. Sessões/JWT${NC}"
check_required "JWT_SECRET" "Chave JWT (mín. 32 chars)"
check_required "SESSION_SECRET" "Chave de sessão (mín. 32 chars)"
check_optional "JWT_EXPIRES_IN" "Expiração JWT (default: 7d)"

# Validar comprimento do JWT_SECRET
JWT_VAL="${JWT_SECRET:-}"
if [ -n "$JWT_VAL" ] && [ ${#JWT_VAL} -lt 32 ]; then
    echo -e "  ${YELLOW}⚠${NC} JWT_SECRET tem apenas ${#JWT_VAL} chars (mínimo recomendado: 32)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  5. LOGIN LOCAL                                             ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}5. Login Local${NC}"
LOCAL_LOGIN="${ENABLE_LOCAL_LOGIN:-}"
GOOGLE_OAUTH="${ENABLE_GOOGLE_OAUTH:-}"

if [ "$LOCAL_LOGIN" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} ENABLE_LOCAL_LOGIN = true"
    check_required "ADMIN_EMAIL" "E-mail do administrador"
elif [ "$LOCAL_LOGIN" = "false" ]; then
    echo -e "  ${CYAN}ℹ${NC} Login local desabilitado"
else
    echo -e "  ${YELLOW}⚠${NC} ENABLE_LOCAL_LOGIN não definido (default: true)"
    check_required "ADMIN_EMAIL" "E-mail do administrador"
fi

# Verificar que pelo menos um método de login está ativo
if [ "$LOCAL_LOGIN" = "false" ] && [ "$GOOGLE_OAUTH" != "true" ]; then
    echo -e "  ${RED}✗${NC} Nenhum método de login ativo! Defina ENABLE_LOCAL_LOGIN=true ou ENABLE_GOOGLE_OAUTH=true"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  6. GOOGLE OAUTH                                            ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}6. Google OAuth${NC}"
if [ "$GOOGLE_OAUTH" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} ENABLE_GOOGLE_OAUTH = true"
    check_required "GOOGLE_CLIENT_ID" "Client ID do Google"
    check_required "GOOGLE_CLIENT_SECRET" "Client Secret do Google"
else
    echo -e "  ${CYAN}ℹ${NC} Google OAuth desabilitado"
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  7. AUTH HARDENING                                          ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}7. Auth Hardening${NC}"
EMAIL_VERIF="${EMAIL_VERIFICATION_ENABLED:-false}"
echo -e "  ${CYAN}ℹ${NC} EMAIL_VERIFICATION_ENABLED = ${EMAIL_VERIF}"
echo -e "  ${CYAN}ℹ${NC} REQUIRE_EMAIL_FOR_CHAT = ${REQUIRE_EMAIL_FOR_CHAT:-false}"
echo -e "  ${CYAN}ℹ${NC} REQUIRE_TERMS_ACCEPTANCE = ${REQUIRE_TERMS_ACCEPTANCE:-false}"
echo -e "  ${CYAN}ℹ${NC} BLOCK_DISPOSABLE_EMAILS = ${BLOCK_DISPOSABLE_EMAILS:-true}"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  8. SMTP / BREVO                                            ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}8. SMTP/Brevo${NC}"
if [ "$EMAIL_VERIF" = "true" ]; then
    echo -e "  ${CYAN}(Obrigatório: EMAIL_VERIFICATION_ENABLED=true)${NC}"
    check_required "SMTP_HOST" "Servidor SMTP"
    check_required "SMTP_PORT" "Porta SMTP"
    check_required "SMTP_USER" "Usuário SMTP"
    check_required "SMTP_PASSWORD" "Senha/Key SMTP"
    check_required "SMTP_FROM" "E-mail remetente"
    check_optional "SMTP_FROM_NAME" "Nome do remetente"
    check_optional "SMTP_REPLY_TO" "E-mail reply-to"
else
    echo -e "  ${CYAN}ℹ${NC} SMTP não obrigatório (EMAIL_VERIFICATION_ENABLED=false)"
    check_optional "SMTP_HOST" "Servidor SMTP"
    check_optional "SMTP_USER" "Usuário SMTP"
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  9. TURNSTILE                                               ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}9. Cloudflare Turnstile${NC}"
TURNSTILE="${ENABLE_TURNSTILE:-false}"
if [ "$TURNSTILE" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} ENABLE_TURNSTILE = true"
    check_required "TURNSTILE_SITE_KEY" "Site Key do Turnstile"
    check_required "TURNSTILE_SECRET_KEY" "Secret Key do Turnstile"
else
    echo -e "  ${CYAN}ℹ${NC} Turnstile desabilitado"
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  10. TELEFONE / WHATSAPP                                    ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}10. Telefone/WhatsApp${NC}"
PHONE_VERIF="${PHONE_VERIFICATION_ENABLED:-false}"
if [ "$PHONE_VERIF" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} PHONE_VERIFICATION_ENABLED = true"
    PHONE_PROV="${PHONE_PROVIDER:-none}"
    echo -e "  ${CYAN}ℹ${NC} PHONE_PROVIDER = ${PHONE_PROV}"
    if [ "$PHONE_PROV" = "twilio" ]; then
        check_required "TWILIO_ACCOUNT_SID" "Account SID do Twilio"
        check_required "TWILIO_AUTH_TOKEN" "Auth Token do Twilio"
        check_required "TWILIO_FROM_NUMBER" "Número remetente Twilio"
    fi
else
    echo -e "  ${CYAN}ℹ${NC} Verificação por telefone desabilitada"
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  11. LLM PROVIDERS                                          ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}11. LLM Providers${NC}"
LLM_PROV="${LLM_PROVIDER:-}"
echo -e "  ${CYAN}ℹ${NC} LLM_PROVIDER = ${LLM_PROV:-<não definido>}"
echo -e "  ${CYAN}ℹ${NC} LLM_FALLBACK_PROVIDER = ${LLM_FALLBACK_PROVIDER:-<nenhum>}"

LLM_OK=false

case "${LLM_PROV}" in
    cloud)
        if [ -n "${LLM_CLOUD_API_KEY:-}" ] && [ -n "${LLM_CLOUD_API_URL:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} Cloud: URL=$(mask_value "${LLM_CLOUD_API_URL}") Key=$(mask_value "${LLM_CLOUD_API_KEY}") Model=${LLM_CLOUD_MODEL:-auto}"
        else
            check_required "LLM_CLOUD_API_URL" "URL do provider Cloud"
            check_required "LLM_CLOUD_API_KEY" "API Key do provider Cloud"
        fi
        ;;
    gemini)
        if [ -n "${GEMINI_API_KEY:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} Gemini: Key=$(mask_value "${GEMINI_API_KEY}") Model=${GEMINI_MODEL:-gemini-2.5-flash}"
        else
            check_required "GEMINI_API_KEY" "API Key do Gemini"
        fi
        ;;
    openai)
        if [ -n "${OPENAI_API_KEY:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} OpenAI: Key=$(mask_value "${OPENAI_API_KEY}") Model=${OPENAI_MODEL:-gpt-4o-mini}"
        else
            check_required "OPENAI_API_KEY" "API Key da OpenAI"
        fi
        ;;
    anthropic)
        if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} Anthropic: Key=$(mask_value "${ANTHROPIC_API_KEY}") Model=${ANTHROPIC_MODEL:-}"
        else
            check_required "ANTHROPIC_API_KEY" "API Key da Anthropic"
        fi
        ;;
    openrouter)
        if [ -n "${OPENROUTER_API_KEY:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} OpenRouter: Key=$(mask_value "${OPENROUTER_API_KEY}") Model=${OPENROUTER_MODEL:-}"
        else
            check_required "OPENROUTER_API_KEY" "API Key do OpenRouter"
        fi
        ;;
    forge)
        if [ -n "${BUILT_IN_FORGE_API_KEY:-}" ] && [ -n "${BUILT_IN_FORGE_API_URL:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} Forge: URL=$(mask_value "${BUILT_IN_FORGE_API_URL}") Key=$(mask_value "${BUILT_IN_FORGE_API_KEY}")"
        else
            check_required "BUILT_IN_FORGE_API_URL" "URL do Forge"
            check_required "BUILT_IN_FORGE_API_KEY" "API Key do Forge"
        fi
        ;;
    ollama)
        if [ "${ENABLE_LOCAL_INFERENCE:-}" = "true" ] && [ -n "${LOCAL_LLM_BASE_URL:-}" ]; then
            LLM_OK=true
            echo -e "  ${GREEN}✓${NC} Ollama: URL=${LOCAL_LLM_BASE_URL} Model=${LOCAL_LLM_MODEL:-}"
        else
            check_required "LOCAL_LLM_BASE_URL" "URL do Ollama"
            echo -e "  ${YELLOW}⚠${NC} ENABLE_LOCAL_INFERENCE deve ser true para usar Ollama"
        fi
        ;;
    "")
        echo -e "  ${RED}✗${NC} LLM_PROVIDER não definido! Defina um provider."
        ERRORS=$((ERRORS + 1))
        ;;
    *)
        echo -e "  ${YELLOW}⚠${NC} Provider desconhecido: ${LLM_PROV}"
        WARNINGS=$((WARNINGS + 1))
        ;;
esac

if [ "$LLM_OK" = "false" ] && [ -n "$LLM_PROV" ]; then
    echo -e "  ${RED}✗${NC} Provider '${LLM_PROV}' configurado mas sem credenciais válidas"
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  12. OLLAMA                                                 ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}12. Ollama/Local (GPU)${NC}"
if [ "${ENABLE_LOCAL_INFERENCE:-}" = "true" ]; then
    echo -e "  ${GREEN}✓${NC} ENABLE_LOCAL_INFERENCE = true"
    check_required "LOCAL_LLM_BASE_URL" "URL do Ollama"
    check_optional "LOCAL_LLM_MODEL" "Modelo Ollama"
    echo -e "  ${CYAN}ℹ${NC} LOCAL_LLM_PRIORITY = ${LOCAL_LLM_PRIORITY:-last}"
    echo -e "  ${CYAN}ℹ${NC} LOCAL_LLM_TIMEOUT_SECONDS = ${LOCAL_LLM_TIMEOUT_SECONDS:-120}"
    echo -e "  ${CYAN}ℹ${NC} LOCAL_LLM_FALLBACK_ENABLED = ${LOCAL_LLM_FALLBACK_ENABLED:-true}"
    echo -e "  ${CYAN}ℹ${NC} LOCAL_LLM_REQUIRE_GPU = ${LOCAL_LLM_REQUIRE_GPU:-false}"
else
    echo -e "  ${CYAN}ℹ${NC} Inferência local desabilitada"
fi
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  13. STORAGE                                                ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}13. Storage (MinIO/S3)${NC}"
check_required "S3_ENDPOINT" "Endpoint S3/MinIO"
check_required "S3_ACCESS_KEY" "Access Key S3"
check_required "S3_SECRET_KEY" "Secret Key S3"
check_required "S3_BUCKET" "Bucket S3"
check_optional "S3_REGION" "Região S3 (default: us-east-1)"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  14. STRIPE                                                 ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}14. Stripe${NC}"
check_optional "STRIPE_SECRET_KEY" "Chave secreta Stripe"
check_optional "STRIPE_WEBHOOK_SECRET" "Webhook secret Stripe"
check_optional "VITE_STRIPE_PUBLISHABLE_KEY" "Chave pública Stripe"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  15. WHITE LABEL                                            ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}15. White Label${NC}"
check_optional "WHITE_LABEL_ENABLED" "White Label habilitado"
check_optional "VITE_SUPPORT_EMAIL" "E-mail de suporte"
check_optional "VITE_SUPPORT_WHATSAPP" "WhatsApp de suporte"
check_optional "PRIVACY_POLICY_URL" "URL política de privacidade"
check_optional "TERMS_OF_USE_URL" "URL termos de uso"
check_optional "LEGAL_COMPANY_NAME" "Nome legal da empresa"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  16. SEGURANÇA                                              ║
# ╚══════════════════════════════════════════════════════════════╝
echo -e "${BLUE}16. Segurança${NC}"
echo -e "  ${CYAN}ℹ${NC} RATE_LIMIT_ENABLED = ${RATE_LIMIT_ENABLED:-true}"
echo -e "  ${CYAN}ℹ${NC} AUDIT_LOG_ENABLED = ${AUDIT_LOG_ENABLED:-true}"
echo -e "  ${CYAN}ℹ${NC} LOG_LEVEL = ${LOG_LEVEL:-info}"
echo ""

# ╔══════════════════════════════════════════════════════════════╗
# ║  RESULTADO                                                  ║
# ╚══════════════════════════════════════════════════════════════╝
echo "============================================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}██████  PASS  ██████${NC}"
    echo ""
    echo -e "  Erros: ${GREEN}0${NC} | Warnings: ${YELLOW}${WARNINGS}${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "  ${YELLOW}→ Variáveis opcionais ausentes não bloqueiam o deploy.${NC}"
    fi
    echo ""
    echo "  O ambiente está pronto para uso."
    exit 0
else
    echo -e "  ${RED}██████  FAIL  ██████${NC}"
    echo ""
    echo -e "  Erros: ${RED}${ERRORS}${NC} | Warnings: ${YELLOW}${WARNINGS}${NC}"
    echo ""
    echo -e "  ${RED}→ Corrija os erros obrigatórios antes de iniciar o deploy.${NC}"
    exit 1
fi
