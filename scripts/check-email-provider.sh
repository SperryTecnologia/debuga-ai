#!/usr/bin/env bash
# ============================================================
# check-email-provider.sh
# Testa a configuração SMTP/Brevo enviando um e-mail de teste
#
# USO:
#   ./scripts/check-email-provider.sh [--env /path/to/.env] [--to email@dominio.com]
#
# FLAGS:
#   --env   Especifica o arquivo .env a usar
#   --to    Destinatário do e-mail de teste
#           Se não fornecido, usa ADMIN_EMAIL ou SMTP_FROM
#
# PRÉ-REQUISITOS:
#   - Variáveis SMTP_* configuradas no .env
#   - swaks instalado (apt install swaks) ou curl disponível
# ============================================================

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE=""
DEST_OVERRIDE=""

# Parse args properly
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      if [[ -n "${2:-}" && ! "$2" =~ ^-- ]]; then
        ENV_FILE="$2"
        shift 2
      else
        echo -e "${RED}✗ --env requer um caminho de arquivo como argumento${NC}"
        exit 1
      fi
      ;;
    --to)
      if [[ -n "${2:-}" && ! "$2" =~ ^-- ]]; then
        DEST_OVERRIDE="$2"
        shift 2
      else
        echo -e "${RED}✗ --to requer um endereço de e-mail como argumento${NC}"
        exit 1
      fi
      ;;
    *)
      # Backward compat: positional arg that looks like an email = --to
      if echo "$1" | grep -qE '^[^@]+@[^@]+\.[^@]+$'; then
        DEST_OVERRIDE="$1"
      fi
      # Positional arg that looks like a file path = --env
      if [[ -f "$1" ]]; then
        ENV_FILE="$1"
      fi
      shift
      ;;
  esac
done

# Resolve .env path
if [[ -z "$ENV_FILE" ]]; then
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    ENV_FILE="$PROJECT_ROOT/.env"
  fi
fi

# Carregar .env
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
  echo -e "${BLUE}[INFO]${NC} Loaded env from: $ENV_FILE"
else
  echo -e "${YELLOW}[WARN]${NC} No .env file found — using current environment"
fi

# Secret masking helper
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

echo ""
echo "============================================================"
echo "  debuga.ai — Diagnóstico de E-mail (SMTP)"
echo "============================================================"
echo ""

# ── Verificar variáveis ──
echo -e "${BLUE}1. Configuração atual:${NC}"

SMTP_HOST_VAL="${SMTP_HOST:-}"
SMTP_PORT_VAL="${SMTP_PORT:-587}"
SMTP_USER_VAL="${SMTP_USER:-}"
SMTP_PASS_VAL="${SMTP_PASSWORD:-}"
SMTP_FROM_VAL="${SMTP_FROM:-}"
SMTP_SECURE_VAL="${SMTP_SECURE:-false}"
SMTP_PROVIDER_VAL="${SMTP_PROVIDER:-smtp}"

echo -e "  Provider:  ${CYAN}${SMTP_PROVIDER_VAL}${NC}"
echo -e "  Host:      ${CYAN}${SMTP_HOST_VAL:-<não definido>}${NC}"
echo -e "  Porta:     ${CYAN}${SMTP_PORT_VAL}${NC}"
echo -e "  Secure:    ${CYAN}${SMTP_SECURE_VAL}${NC}"
echo -e "  Usuário:   ${CYAN}${SMTP_USER_VAL:-<não definido>}${NC}"
if [[ -n "$SMTP_PASS_VAL" ]]; then
  echo -e "  Senha:     ${CYAN}$(mask_secret "$SMTP_PASS_VAL")${NC}"
else
  echo -e "  Senha:     ${CYAN}<não definida>${NC}"
fi
echo -e "  From:      ${CYAN}${SMTP_FROM_VAL:-<não definido>}${NC}"
echo ""

# ── Validar campos obrigatórios ──
MISSING=0
if [ -z "$SMTP_HOST_VAL" ]; then
    echo -e "  ${RED}✗ SMTP_HOST não definido${NC}"
    MISSING=1
fi
if [ -z "$SMTP_USER_VAL" ]; then
    echo -e "  ${RED}✗ SMTP_USER não definido${NC}"
    MISSING=1
fi
if [ -z "$SMTP_PASS_VAL" ]; then
    echo -e "  ${RED}✗ SMTP_PASSWORD não definido${NC}"
    MISSING=1
fi
if [ -z "$SMTP_FROM_VAL" ]; then
    echo -e "  ${RED}✗ SMTP_FROM não definido${NC}"
    MISSING=1
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${RED}Corrija as variáveis acima antes de testar.${NC}"
    echo "Consulte: docs/22-SMTP-BREVO.md"
    exit 1
fi

# ── Teste de conectividade ──
echo -e "${BLUE}2. Teste de conectividade (TCP):${NC}"
if command -v nc &>/dev/null; then
    if nc -z -w5 "$SMTP_HOST_VAL" "$SMTP_PORT_VAL" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Conexão TCP com ${SMTP_HOST_VAL}:${SMTP_PORT_VAL} OK"
    else
        echo -e "  ${RED}✗${NC} Não foi possível conectar em ${SMTP_HOST_VAL}:${SMTP_PORT_VAL}"
        echo -e "  ${YELLOW}  Verifique: firewall, porta bloqueada, host incorreto${NC}"
        exit 1
    fi
elif command -v timeout &>/dev/null; then
    if timeout 5 bash -c "echo >/dev/tcp/${SMTP_HOST_VAL}/${SMTP_PORT_VAL}" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Conexão TCP com ${SMTP_HOST_VAL}:${SMTP_PORT_VAL} OK"
    else
        echo -e "  ${RED}✗${NC} Não foi possível conectar em ${SMTP_HOST_VAL}:${SMTP_PORT_VAL}"
        exit 1
    fi
else
    echo -e "  ${YELLOW}⚠${NC} nc/timeout não disponível — pulando teste TCP"
fi
echo ""

# ── Determinar destinatário ──
if [[ -n "$DEST_OVERRIDE" ]]; then
  DEST="$DEST_OVERRIDE"
elif [[ -n "${TEST_EMAIL:-}" ]]; then
  DEST="$TEST_EMAIL"
elif [[ -n "${ADMIN_EMAIL:-}" ]]; then
  DEST="$ADMIN_EMAIL"
elif [[ -n "$SMTP_FROM_VAL" ]]; then
  DEST="$SMTP_FROM_VAL"
else
  echo -e "  ${YELLOW}⚠${NC} Nenhum destinatário definido."
  echo -e "  Use: --to email@dominio.com ou defina ADMIN_EMAIL no .env"
  echo -e "  ${YELLOW}⚠${NC} Pulando envio de e-mail de teste (configuração SMTP validada)"
  echo ""
  echo -e "${GREEN}✓ Configuração SMTP verificada (sem envio de teste)${NC}"
  exit 0
fi

echo -e "${BLUE}3. Enviando e-mail de teste para: ${CYAN}${DEST}${NC}"
echo ""

if command -v swaks &>/dev/null; then
    echo -e "  Usando swaks..."
    STARTTLS_FLAG=""
    if [ "$SMTP_SECURE_VAL" = "false" ] && [ "$SMTP_PORT_VAL" = "587" ]; then
        STARTTLS_FLAG="--tls"
    elif [ "$SMTP_SECURE_VAL" = "true" ]; then
        STARTTLS_FLAG="--tlsc"
    fi

    swaks \
        --to "$DEST" \
        --from "$SMTP_FROM_VAL" \
        --server "$SMTP_HOST_VAL" \
        --port "$SMTP_PORT_VAL" \
        --auth LOGIN \
        --auth-user "$SMTP_USER_VAL" \
        --auth-password "$SMTP_PASS_VAL" \
        $STARTTLS_FLAG \
        --header "Subject: [debuga.ai] Teste de E-mail" \
        --body "Este é um e-mail de teste do debuga.ai.\n\nSe você recebeu esta mensagem, a configuração SMTP está funcionando corretamente.\n\nProvider: ${SMTP_PROVIDER_VAL}\nHost: ${SMTP_HOST_VAL}\nData: $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        2>&1

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "  ${GREEN}██████  E-MAIL ENVIADO COM SUCESSO  ██████${NC}"
        echo -e "  Verifique a caixa de entrada de: ${DEST}"
    else
        echo ""
        echo -e "  ${RED}██████  FALHA NO ENVIO  ██████${NC}"
        echo -e "  Verifique as credenciais e consulte: docs/22-SMTP-BREVO.md"
        exit 1
    fi
elif command -v curl &>/dev/null; then
    echo -e "  swaks não encontrado. Usando curl (limitado)..."
    echo -e "  ${YELLOW}⚠${NC} Instale swaks para teste completo: apt install swaks"
    echo ""

    CURL_URL="smtp://${SMTP_HOST_VAL}:${SMTP_PORT_VAL}"
    if [ "$SMTP_SECURE_VAL" = "true" ]; then
        CURL_URL="smtps://${SMTP_HOST_VAL}:${SMTP_PORT_VAL}"
    fi

    MAIL_BODY=$(cat <<EOF
From: ${SMTP_FROM_VAL}
To: ${DEST}
Subject: [debuga.ai] Teste de E-mail
Content-Type: text/plain; charset=utf-8

Este é um e-mail de teste do debuga.ai.
Se você recebeu esta mensagem, a configuração SMTP está funcionando corretamente.

Provider: ${SMTP_PROVIDER_VAL}
Host: ${SMTP_HOST_VAL}
Data: $(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF
)

    echo "$MAIL_BODY" | curl --url "$CURL_URL" \
        --ssl-reqd \
        --mail-from "$SMTP_FROM_VAL" \
        --mail-rcpt "$DEST" \
        --user "${SMTP_USER_VAL}:${SMTP_PASS_VAL}" \
        -T - \
        --silent --show-error 2>&1

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "  ${GREEN}██████  E-MAIL ENVIADO COM SUCESSO  ██████${NC}"
    else
        echo ""
        echo -e "  ${RED}██████  FALHA NO ENVIO  ██████${NC}"
        exit 1
    fi
else
    echo -e "  ${RED}✗${NC} Nenhuma ferramenta de envio disponível (swaks ou curl)"
    echo -e "  Instale: apt install swaks"
    exit 1
fi

echo ""
echo "============================================================"
echo "  Dicas de troubleshooting:"
echo "  - Brevo: verifique se o domínio está verificado"
echo "  - Brevo: use a SMTP key (não a API key)"
echo "  - Gmail: use App Password (não a senha normal)"
echo "  - Firewall: porta 587 deve estar aberta para saída"
echo "  - Docs: docs/22-SMTP-BREVO.md"
echo "============================================================"
