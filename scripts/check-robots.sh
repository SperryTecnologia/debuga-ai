#!/usr/bin/env bash
# check-robots.sh — Verifica conformidade do robots.txt
# Uso: ./scripts/check-robots.sh [BASE_URL]

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

echo "=== Validação do robots.txt ==="
echo "URL: $BASE_URL/robots.txt"
echo ""

ROBOTS=$(curl -sL "$BASE_URL/robots.txt")
STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt")

# 1. Acessível
check "robots.txt acessível (HTTP $STATUS)" "$([ "$STATUS" = "200" ] && echo true || echo false)"

# 2. User-agent presente
UA=$(echo "$ROBOTS" | grep -ci "User-agent" || true)
check "User-agent definido" "$([ "$UA" -gt 0 ] && echo true || echo false)"

# 3. Allow: / presente
ALLOW=$(echo "$ROBOTS" | grep -c "Allow: /" || true)
check "Allow: / presente" "$([ "$ALLOW" -gt 0 ] && echo true || echo false)"

# 4. Rotas privadas bloqueadas
PRIVATE_ROUTES=("/api/" "/admin" "/chat" "/account" "/login" "/register")
for route in "${PRIVATE_ROUTES[@]}"; do
  BLOCKED=$(echo "$ROBOTS" | grep -c "Disallow: $route" || true)
  check "Rota bloqueada: $route" "$([ "$BLOCKED" -gt 0 ] && echo true || echo false)"
done

# 5. Sitemap referenciado
SITEMAP_REF=$(echo "$ROBOTS" | grep -ci "Sitemap:" || true)
check "Referência ao Sitemap presente" "$([ "$SITEMAP_REF" -gt 0 ] && echo true || echo false)"

# 6. Páginas públicas NÃO bloqueadas
PUBLIC_ROUTES=("/" "/pricing")
for route in "${PUBLIC_ROUTES[@]}"; do
  BLOCKED=$(echo "$ROBOTS" | grep -c "Disallow: $route$" || true)
  check "Página pública NÃO bloqueada: $route" "$([ "$BLOCKED" -eq 0 ] && echo true || echo false)"
done

echo ""
echo "---"
TOTAL=$((PASS + FAIL))
echo "Resultado: $PASS/$TOTAL verificações OK"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
