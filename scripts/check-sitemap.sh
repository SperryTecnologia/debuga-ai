#!/usr/bin/env bash
# check-sitemap.sh — Valida estrutura e URLs do sitemap.xml
# Uso: ./scripts/check-sitemap.sh [BASE_URL]

set -euo pipefail

BASE_URL="${1:-https://debuga.ai}"
PASS=0
FAIL=0

green() { printf "\033[32m[OK]\033[0m %s\n" "$1"; }
red() { printf "\033[31m[ERRO]\033[0m %s\n" "$1"; }

check() {
  local desc="$1" result="$2"
  if [ "$result" = "true" ]; then
    green "$desc"
    PASS=$((PASS + 1))
  else
    red "$desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Validação do Sitemap ==="
echo "URL: $BASE_URL/sitemap.xml"
echo ""

SITEMAP=$(curl -sL "$BASE_URL/sitemap.xml")

# 1. Formato XML válido (urlset presente)
HAS_URLSET=$(echo "$SITEMAP" | grep -c "<urlset" || true)
check "Formato XML válido (<urlset> presente)" "$([ "$HAS_URLSET" -gt 0 ] && echo true || echo false)"

# 2. URLs públicas presentes
REQUIRED_URLS=("$BASE_URL/" "$BASE_URL/pricing")
for url in "${REQUIRED_URLS[@]}"; do
  FOUND=$(echo "$SITEMAP" | grep -c "$url" || true)
  check "URL presente: $url" "$([ "$FOUND" -gt 0 ] && echo true || echo false)"
done

# 3. URLs privadas ausentes
PRIVATE_PATTERNS=("/chat" "/account" "/admin" "/api/" "/login" "/register")
for pattern in "${PRIVATE_PATTERNS[@]}"; do
  FOUND=$(echo "$SITEMAP" | grep -c "$pattern" || true)
  check "URL privada ausente: $pattern" "$([ "$FOUND" -eq 0 ] && echo true || echo false)"
done

# 4. Campos obrigatórios
HAS_LOC=$(echo "$SITEMAP" | grep -c "<loc>" || true)
check "Campo <loc> presente" "$([ "$HAS_LOC" -gt 0 ] && echo true || echo false)"

HAS_LASTMOD=$(echo "$SITEMAP" | grep -c "<lastmod>" || true)
check "Campo <lastmod> presente" "$([ "$HAS_LASTMOD" -gt 0 ] && echo true || echo false)"

# 5. Verificar acessibilidade de cada URL no sitemap
echo ""
echo "Verificando acessibilidade das URLs..."
URLS=$(echo "$SITEMAP" | grep -oP '<loc>\K[^<]+' || true)
ALL_OK=true
for url in $URLS; do
  STATUS=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "TIMEOUT")
  if [ "$STATUS" != "200" ]; then
    red "  $url → HTTP $STATUS"
    ALL_OK=false
  fi
done
check "Todas as URLs do sitemap acessíveis" "$ALL_OK"

echo ""
echo "---"
TOTAL=$((PASS + FAIL))
echo "Resultado: $PASS/$TOTAL verificações OK"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
