#!/usr/bin/env bash
# ============================================================
# check-stripe-config.sh
# Valida a configuração do Stripe (pagamentos)
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0; WARN=0; FAIL=0
pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS + 1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN=$((WARN + 1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL + 1)); }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

echo "═══════════════════════════════════════════════"
echo " Stripe Configuration Check"
echo "═══════════════════════════════════════════════"
echo ""

# Load .env
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE" 2>/dev/null || true
  set +a
fi

echo "── 1. Variáveis de Ambiente ──"

if [ -n "${STRIPE_SECRET_KEY:-}" ]; then
  if [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
    pass "STRIPE_SECRET_KEY configurada (modo LIVE)"
  elif [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    warn "STRIPE_SECRET_KEY em modo TESTE (ok para homolog)"
  else
    fail "STRIPE_SECRET_KEY formato inválido (deve começar com sk_live_ ou sk_test_)"
  fi
else
  warn "STRIPE_SECRET_KEY não configurada (Stripe desabilitado)"
fi

if [ -n "${VITE_STRIPE_PUBLISHABLE_KEY:-}" ]; then
  if [[ "$VITE_STRIPE_PUBLISHABLE_KEY" == pk_live_* ]]; then
    pass "VITE_STRIPE_PUBLISHABLE_KEY configurada (modo LIVE)"
  elif [[ "$VITE_STRIPE_PUBLISHABLE_KEY" == pk_test_* ]]; then
    warn "VITE_STRIPE_PUBLISHABLE_KEY em modo TESTE"
  else
    fail "VITE_STRIPE_PUBLISHABLE_KEY formato inválido"
  fi
else
  warn "VITE_STRIPE_PUBLISHABLE_KEY não configurada"
fi

if [ -n "${STRIPE_WEBHOOK_SECRET:-}" ]; then
  if [[ "$STRIPE_WEBHOOK_SECRET" == whsec_* ]]; then
    pass "STRIPE_WEBHOOK_SECRET configurada"
  else
    fail "STRIPE_WEBHOOK_SECRET formato inválido (deve começar com whsec_)"
  fi
else
  warn "STRIPE_WEBHOOK_SECRET não configurada (webhooks não funcionarão)"
fi

echo ""
echo "── 2. Consistência de Modo ──"

if [ -n "${STRIPE_SECRET_KEY:-}" ] && [ -n "${VITE_STRIPE_PUBLISHABLE_KEY:-}" ]; then
  SK_MODE="unknown"
  PK_MODE="unknown"
  [[ "$STRIPE_SECRET_KEY" == sk_live_* ]] && SK_MODE="live"
  [[ "$STRIPE_SECRET_KEY" == sk_test_* ]] && SK_MODE="test"
  [[ "$VITE_STRIPE_PUBLISHABLE_KEY" == pk_live_* ]] && PK_MODE="live"
  [[ "$VITE_STRIPE_PUBLISHABLE_KEY" == pk_test_* ]] && PK_MODE="test"

  if [ "$SK_MODE" = "$PK_MODE" ]; then
    pass "Chaves consistentes (ambas em modo $SK_MODE)"
  else
    fail "INCONSISTÊNCIA: Secret Key em modo $SK_MODE, Publishable Key em modo $PK_MODE"
  fi
fi

echo ""
echo "── 3. Código-fonte ──"

APP_DIR="$PROJECT_ROOT/app"

if [ -f "$APP_DIR/server/stripeRoutes.ts" ]; then
  pass "stripeRoutes.ts existe"
else
  fail "stripeRoutes.ts NÃO encontrado"
fi

if [ -f "$APP_DIR/server/products.ts" ]; then
  pass "products.ts existe"
else
  fail "products.ts NÃO encontrado"
fi

if grep -q "STRIPE_NOT_CONFIGURED" "$APP_DIR/server/stripeRoutes.ts" 2>/dev/null; then
  pass "Tratamento de Stripe não configurado implementado"
else
  warn "Sem tratamento explícito para Stripe não configurado"
fi

if grep -q "allow_promotion_codes" "$APP_DIR/server/stripeRoutes.ts" 2>/dev/null; then
  pass "Promoção/cupons habilitados no checkout"
else
  warn "allow_promotion_codes não encontrado"
fi

echo ""
echo "── 4. Webhook Endpoint ──"

if grep -q '/api/stripe/webhook' "$APP_DIR/server/stripeRoutes.ts" 2>/dev/null; then
  pass "Webhook endpoint registrado em /api/stripe/webhook"
else
  fail "Webhook endpoint não encontrado"
fi

if grep -q 'express.raw' "$APP_DIR/server/_core/index.ts" 2>/dev/null; then
  pass "express.raw() configurado antes de express.json()"
else
  fail "express.raw() não configurado (webhook signature falhará)"
fi

if grep -q 'evt_test_' "$APP_DIR/server/stripeRoutes.ts" 2>/dev/null; then
  pass "Tratamento de eventos de teste implementado"
else
  warn "Sem tratamento de evt_test_ (pode falhar em verificação)"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo -e " Resultado: ${GREEN}$PASS PASS${NC} | ${YELLOW}$WARN WARN${NC} | ${RED}$FAIL FAIL${NC}"
echo "═══════════════════════════════════════════════"

[ $FAIL -eq 0 ] && exit 0 || exit 1
