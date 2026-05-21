#!/usr/bin/env bash
# check-public-links.sh — Verifica links públicos retornam HTTP 200
# Uso: ./scripts/check-public-links.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-https://debuga.ai}"
PASS=0
FAIL=0

green() { printf "\033[32m[OK]\033[0m %s → %s\n" "$1" "$2"; }
red() { printf "\033[31m[ERRO]\033[0m %s → %s\n" "$1" "$2"; }

PAGES=(
  "/"
  "/pricing"
  "/docs/whitepaper"
  "/docs/architecture"
  "/docs/white-label-enterprise"
  "/sitemap.xml"
  "/robots.txt"
)

echo "=== Verificação de Links Públicos ==="
echo "URL: $BASE_URL"
echo ""

for page in "${PAGES[@]}"; do
  STATUS=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL$page" 2>/dev/null || echo "TIMEOUT")
  if [ "$STATUS" = "200" ]; then
    green "$page" "HTTP $STATUS"
    PASS=$((PASS + 1))
  else
    red "$page" "HTTP $STATUS"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "---"
TOTAL=$((PASS + FAIL))
echo "Resultado: $PASS/$TOTAL links OK"

if [ "$FAIL" -gt 0 ]; then
  echo "ATENÇÃO: $FAIL link(s) com problema."
  exit 1
fi
