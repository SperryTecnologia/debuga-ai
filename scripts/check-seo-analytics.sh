#!/usr/bin/env bash
# check-seo-analytics.sh — Valida SEO e Analytics para debuga.ai
# Uso: ./scripts/check-seo-analytics.sh [BASE_URL]
# Exemplo: ./scripts/check-seo-analytics.sh https://debuga.ai

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

echo "=== Validação SEO e Analytics ==="
echo "URL: $BASE_URL"
echo ""

# 1. GA4 Measurement ID no HTML
HTML=$(curl -sL "$BASE_URL")
GA4=$(echo "$HTML" | grep -c "googletagmanager.com/gtag" || true)
check "GA4 script presente no HTML" "$([ "$GA4" -gt 0 ] && echo true || echo false)"

# 2. sitemap.xml acessível
SITEMAP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml")
check "sitemap.xml acessível (HTTP $SITEMAP_STATUS)" "$([ "$SITEMAP_STATUS" = "200" ] && echo true || echo false)"

# 3. robots.txt acessível
ROBOTS_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt")
check "robots.txt acessível (HTTP $ROBOTS_STATUS)" "$([ "$ROBOTS_STATUS" = "200" ] && echo true || echo false)"

# 4. Meta title presente
TITLE=$(echo "$HTML" | grep -c "<title>" || true)
check "Meta title presente" "$([ "$TITLE" -gt 0 ] && echo true || echo false)"

# 5. Meta description presente
DESC=$(echo "$HTML" | grep -c 'name="description"' || true)
check "Meta description presente" "$([ "$DESC" -gt 0 ] && echo true || echo false)"

# 6. OG image acessível
OG_IMG=$(echo "$HTML" | grep -oP 'property="og:image" content="\K[^"]+' || true)
if [ -n "$OG_IMG" ]; then
  OG_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$OG_IMG")
  check "OG image acessível ($OG_STATUS)" "$([ "$OG_STATUS" = "200" ] && echo true || echo false)"
else
  check "OG image presente no HTML" "false"
fi

# 7. CSP inclui domínios GA4
CSP_HEADER=$(curl -sI "$BASE_URL" | grep -i "content-security-policy" || true)
CSP_GA4=$(echo "$CSP_HEADER" | grep -c "googletagmanager.com" || true)
check "CSP inclui domínios GA4" "$([ "$CSP_GA4" -gt 0 ] && echo true || echo false)"

# 8. Páginas públicas retornam 200
PUBLIC_PAGES=("/" "/pricing")
ALL_OK=true
for page in "${PUBLIC_PAGES[@]}"; do
  STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE_URL$page")
  if [ "$STATUS" != "200" ]; then
    ALL_OK=false
    red "  $page retornou HTTP $STATUS"
  fi
done
check "Páginas públicas retornam 200" "$ALL_OK"

# 9. /chat não aparece no sitemap
SITEMAP_CONTENT=$(curl -sL "$BASE_URL/sitemap.xml")
CHAT_IN_SITEMAP=$(echo "$SITEMAP_CONTENT" | grep -c "/chat" || true)
check "/chat ausente do sitemap" "$([ "$CHAT_IN_SITEMAP" -eq 0 ] && echo true || echo false)"

# 10. /api não aparece no sitemap
API_IN_SITEMAP=$(echo "$SITEMAP_CONTENT" | grep -c "/api" || true)
check "/api ausente do sitemap" "$([ "$API_IN_SITEMAP" -eq 0 ] && echo true || echo false)"

echo ""
echo "---"
TOTAL=$((PASS + FAIL))
echo "Resultado: $PASS/$TOTAL verificações OK"

if [ "$FAIL" -gt 0 ]; then
  echo "ATENÇÃO: $FAIL verificação(ões) falharam."
  exit 1
fi
