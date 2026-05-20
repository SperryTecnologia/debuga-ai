#!/usr/bin/env bash
# ============================================================
# check-turnstile-config.sh
# Valida a configuração do Cloudflare Turnstile (CAPTCHA)
#
# USO:
#   ./scripts/check-turnstile-config.sh
#
# O QUE FAZ:
#   1. Verifica se as variáveis estão definidas
#   2. Testa a Secret Key com a API do Turnstile (dummy token)
#   3. Verifica formato das chaves
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
ENV_FILE="$PROJECT_ROOT/.env"

# Carregar .env
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${RED}✗ Arquivo .env não encontrado em ${ENV_FILE}${NC}"
    exit 1
fi

echo ""
echo "============================================================"
echo "  debuga.ai — Diagnóstico Cloudflare Turnstile"
echo "============================================================"
echo ""

# ── Verificar se está habilitado ──
ENABLED="${ENABLE_TURNSTILE:-false}"
echo -e "${BLUE}1. Status:${NC}"
if [ "$ENABLED" != "true" ]; then
    echo -e "  ${YELLOW}⚠${NC} ENABLE_TURNSTILE = ${ENABLED}"
    echo -e "  ${CYAN}  Turnstile está desabilitado. Para ativar, defina ENABLE_TURNSTILE=true${NC}"
    echo ""
    echo "  Mesmo desabilitado, vou verificar se as chaves estão configuradas..."
    echo ""
fi

# ── Verificar variáveis ──
echo -e "${BLUE}2. Configuração:${NC}"
SITE_KEY="${TURNSTILE_SITE_KEY:-}"
SECRET_KEY="${TURNSTILE_SECRET_KEY:-}"
ON_LOGIN="${TURNSTILE_ON_LOGIN:-false}"

if [ -n "$SITE_KEY" ]; then
    echo -e "  ${GREEN}✓${NC} TURNSTILE_SITE_KEY = ${CYAN}${SITE_KEY:0:4}****${NC}"
else
    echo -e "  ${RED}✗${NC} TURNSTILE_SITE_KEY não definido"
fi

if [ -n "$SECRET_KEY" ]; then
    echo -e "  ${GREEN}✓${NC} TURNSTILE_SECRET_KEY = ${CYAN}${SECRET_KEY:0:4}****${NC}"
else
    echo -e "  ${RED}✗${NC} TURNSTILE_SECRET_KEY não definido"
fi

echo -e "  ${CYAN}ℹ${NC} TURNSTILE_ON_LOGIN = ${ON_LOGIN}"
echo ""

# ── Validar formato ──
echo -e "${BLUE}3. Validação de formato:${NC}"

if [ -n "$SITE_KEY" ]; then
    # Site keys começam com 0x
    if [[ "$SITE_KEY" == 0x* ]]; then
        echo -e "  ${GREEN}✓${NC} SITE_KEY começa com '0x' (formato correto)"
    else
        echo -e "  ${YELLOW}⚠${NC} SITE_KEY não começa com '0x' — verifique se copiou corretamente"
        echo -e "    Chaves de teste do Cloudflare:"
        echo -e "    - Sempre passa: 1x00000000000000000000AA"
        echo -e "    - Sempre falha: 2x00000000000000000000AB"
    fi
fi

if [ -n "$SECRET_KEY" ]; then
    if [[ "$SECRET_KEY" == 0x* ]]; then
        echo -e "  ${GREEN}✓${NC} SECRET_KEY começa com '0x' (formato correto)"
    else
        echo -e "  ${YELLOW}⚠${NC} SECRET_KEY não começa com '0x' — verifique se copiou corretamente"
        echo -e "    Chaves de teste do Cloudflare:"
        echo -e "    - Sempre passa: 1x0000000000000000000000000000000AA"
        echo -e "    - Sempre falha: 2x0000000000000000000000000000000AA"
    fi
fi
echo ""

# ── Teste com API ──
echo -e "${BLUE}4. Teste com API do Cloudflare:${NC}"

if [ -z "$SECRET_KEY" ]; then
    echo -e "  ${YELLOW}⚠${NC} Não é possível testar sem SECRET_KEY"
    exit 1
fi

if ! command -v curl &>/dev/null; then
    echo -e "  ${RED}✗${NC} curl não disponível"
    exit 1
fi

# Enviar token dummy para verificar se a secret key é válida
# Um token inválido deve retornar success=false (não um erro de autenticação)
echo -e "  Enviando token de teste para a API..."
RESPONSE=$(curl -s -X POST "https://challenges.cloudflare.com/turnstile/v0/siteverify" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "secret=${SECRET_KEY}&response=DUMMY_TOKEN_FOR_VALIDATION")

echo -e "  Resposta: ${CYAN}${RESPONSE}${NC}"
echo ""

# Verificar se a resposta contém "success"
if echo "$RESPONSE" | grep -q '"success"'; then
    SUCCESS=$(echo "$RESPONSE" | grep -o '"success":[^,}]*' | cut -d: -f2)
    ERROR_CODES=$(echo "$RESPONSE" | grep -o '"error-codes":\[[^]]*\]' || echo "")

    if echo "$ERROR_CODES" | grep -q "invalid-input-secret"; then
        echo -e "  ${RED}✗ SECRET_KEY INVÁLIDA${NC}"
        echo -e "  A chave secreta não é reconhecida pelo Cloudflare."
        echo -e "  Verifique em: https://dash.cloudflare.com/turnstile"
        exit 1
    elif echo "$ERROR_CODES" | grep -q "invalid-input-response"; then
        echo -e "  ${GREEN}✓ SECRET_KEY VÁLIDA${NC}"
        echo -e "  O erro 'invalid-input-response' é esperado (token dummy)."
        echo -e "  Isso confirma que a SECRET_KEY está correta."
    else
        echo -e "  ${YELLOW}⚠${NC} Resposta inesperada — verifique manualmente"
    fi
else
    echo -e "  ${RED}✗${NC} Resposta inválida da API do Cloudflare"
    echo -e "  Verifique a conectividade com challenges.cloudflare.com"
fi

echo ""
echo "============================================================"
echo "  Referência rápida:"
echo ""
echo "  Obter chaves: https://dash.cloudflare.com/turnstile"
echo "  Docs: docs/23-CLOUDFLARE-TURNSTILE.md"
echo ""
echo "  Chaves de TESTE (para desenvolvimento):"
echo "  Site Key (sempre passa):   1x00000000000000000000AA"
echo "  Secret Key (sempre passa): 1x0000000000000000000000000000000AA"
echo "  Site Key (sempre falha):   2x00000000000000000000AB"
echo "  Secret Key (sempre falha): 2x0000000000000000000000000000000AA"
echo "============================================================"
