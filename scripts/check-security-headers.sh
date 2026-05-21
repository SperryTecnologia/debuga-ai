#!/usr/bin/env bash
# check-security-headers.sh — Audita headers de segurança HTTP
# Uso: ./scripts/check-security-headers.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-https://debuga.ai}"
PASS=0
FAIL=0

green() { printf "\033[32m[OK]\033[0m %s: %s\n" "$1" "$2"; }
red() { printf "\033[31m[ERRO]\033[0m %s: %s\n" "$1" "$2"; }

echo "=== Auditoria de Headers de Segurança ==="
echo "URL: $BASE_URL"
echo ""

HEADERS=$(curl -sI -L "$BASE_URL")

check_header() {
  local name="$1"
  local value
  value=$(echo "$HEADERS" | grep -i "^$name:" | head -1 | sed 's/^[^:]*: //' | tr -d '\r')
  if [ -n "$value" ]; then
    green "$name" "$value"
    PASS=$((PASS + 1))
  else
    red "$name" "AUSENTE"
    FAIL=$((FAIL + 1))
  fi
}

check_header "strict-transport-security"
check_header "x-content-type-options"
check_header "x-frame-options"
check_header "content-security-policy"
check_header "referrer-policy"
check_header "permissions-policy"

# Verificar valores específicos
echo ""
echo "--- Verificações de valor ---"
echo ""

HSTS=$(echo "$HEADERS" | grep -i "strict-transport-security" | grep -c "max-age" || true)
if [ "$HSTS" -gt 0 ]; then
  green "HSTS max-age" "presente"
  PASS=$((PASS + 1))
else
  red "HSTS max-age" "ausente ou inválido"
  FAIL=$((FAIL + 1))
fi

XCTO=$(echo "$HEADERS" | grep -i "x-content-type-options" | grep -c "nosniff" || true)
if [ "$XCTO" -gt 0 ]; then
  green "X-Content-Type-Options" "nosniff"
  PASS=$((PASS + 1))
else
  red "X-Content-Type-Options" "não é nosniff"
  FAIL=$((FAIL + 1))
fi

XFO=$(echo "$HEADERS" | grep -i "x-frame-options" | grep -cE "DENY|SAMEORIGIN" || true)
if [ "$XFO" -gt 0 ]; then
  green "X-Frame-Options" "DENY ou SAMEORIGIN"
  PASS=$((PASS + 1))
else
  red "X-Frame-Options" "valor inesperado"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "---"
TOTAL=$((PASS + FAIL))
echo "Resultado: $PASS/$TOTAL verificações OK"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
