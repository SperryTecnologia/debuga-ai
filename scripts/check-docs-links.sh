#!/usr/bin/env bash
# check-docs-links.sh — Verifica links internos da documentação
# Uso: ./scripts/check-docs-links.sh

set -euo pipefail

PASS=0
FAIL=0
DOCS_DIR="docs"

green() { printf "\033[32m[OK]\033[0m %s\n" "$1"; }
red() { printf "\033[31m[ERRO]\033[0m %s\n" "$1"; }

echo "=== Verificação de Links Internos da Documentação ==="
echo ""

if [ ! -d "$DOCS_DIR" ]; then
  echo "Diretório $DOCS_DIR não encontrado. Execute na raiz do repositório."
  exit 1
fi

# Verificar links relativos entre documentos
for file in "$DOCS_DIR"/*.md; do
  [ -f "$file" ] || continue
  
  # Extrair links relativos Markdown: [texto](caminho)
  links=$(grep -oP '\]\(\K[^)]+' "$file" | grep -v "^http" | grep -v "^#" || true)
  
  for link in $links; do
    # Resolver caminho relativo
    target="$DOCS_DIR/$link"
    if [ -f "$target" ] || [ -f "$link" ]; then
      PASS=$((PASS + 1))
    else
      red "$file → $link (arquivo não encontrado)"
      FAIL=$((FAIL + 1))
    fi
  done
done

# Verificar links HTTP externos (apenas status, sem seguir redirects)
echo ""
echo "Verificando links externos..."
EXTERNAL_LINKS=$(grep -rohP 'https?://[^\s\)\"]+' "$DOCS_DIR"/*.md README.md 2>/dev/null | sort -u | head -20)

for url in $EXTERNAL_LINKS; do
  STATUS=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "TIMEOUT")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
    PASS=$((PASS + 1))
  else
    red "  $url → HTTP $STATUS"
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
