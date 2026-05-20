#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# check-pre-production.sh — Checklist final pré-produção
# Valida todas as correções da revisão final antes do deploy
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../app" && pwd)"
PASS=0; WARN=0; FAIL=0

pass() { PASS=$((PASS + 1)); echo "  ✅ $1"; }
warn() { WARN=$((WARN + 1)); echo "  ⚠️  $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  ❌ $1"; }

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  debuga.ai — Checklist Pré-Produção (Revisão Final)        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. PLANO GRATUITO (Limites) ──
echo "┌─ 1. Limites do Plano Gratuito ─────────────────────────────┐"

if grep -q "getTodayMessageCount" "$APP_DIR/server/streamRoute.ts"; then
  pass "getTodayMessageCount é usado para verificar limites diários"
else
  fail "getTodayMessageCount não encontrado em streamRoute.ts"
fi

# Verificar que o check de créditos não bloqueia o plano free
if grep -q "creds.usedCredits >= creds.totalCredits" "$APP_DIR/server/streamRoute.ts"; then
  fail "Check de créditos ainda bloqueia plano free (deve ter sido removido)"
else
  pass "Check de créditos removido para plano free (limites por mensagem/dia)"
fi

if grep -q "dailyLimit" "$APP_DIR/server/streamRoute.ts"; then
  pass "dailyLimit referenciado em streamRoute.ts"
else
  warn "dailyLimit não encontrado explicitamente"
fi

echo ""

# ── 2. STRIPE CHECKOUT ──
echo "┌─ 2. Stripe Checkout ────────────────────────────────────────┐"

if grep -q "STRIPE_NOT_CONFIGURED" "$APP_DIR/server/stripeRoutes.ts"; then
  pass "Stripe retorna erro claro quando não configurado"
else
  warn "Mensagem STRIPE_NOT_CONFIGURED não encontrada"
fi

if grep -q "allow_promotion_codes" "$APP_DIR/server/stripeRoutes.ts"; then
  pass "allow_promotion_codes habilitado no checkout"
else
  warn "allow_promotion_codes não encontrado"
fi

if grep -q "STRIPE_NOT_CONFIGURED\|Stripe.*não.*configurado" "$APP_DIR/client/src/pages/PricingPage.tsx"; then
  pass "Frontend trata erro de Stripe não configurado"
else
  warn "Frontend pode não tratar STRIPE_NOT_CONFIGURED"
fi

echo ""

# ── 3. CADASTRO LOCAL ──
echo "┌─ 3. Cadastro Local (Termos + Confirmar Senha) ──────────────┐"

if grep -q "confirmPassword\|confirm_password\|confirmaSenha" "$APP_DIR/client/src/pages/LoginPage.tsx"; then
  pass "Campo de confirmação de senha presente no formulário"
else
  fail "Campo de confirmação de senha ausente"
fi

if grep -q "termos\|terms\|aceito.*termos\|checkbox" "$APP_DIR/client/src/pages/LoginPage.tsx"; then
  pass "Checkbox de termos presente no formulário"
else
  fail "Checkbox de termos ausente"
fi

if grep -q "acceptedTerms\|termsAccepted\|terms_accepted" "$APP_DIR/server/localAuth.ts"; then
  pass "Backend valida aceitação de termos"
else
  warn "Backend pode não validar termos"
fi

echo ""

# ── 4. IMAGEM NO CHAT ──
echo "┌─ 4. Renderização de Imagem no Chat ─────────────────────────┐"

if grep -q "ImageWithFallback\|onError.*setHasError" "$APP_DIR/client/src/components/MessageWithMermaid.tsx"; then
  pass "ImageWithFallback com onError handler implementado"
else
  fail "Fallback de imagem não implementado em MessageWithMermaid"
fi

if grep -q "persistImageToStorage" "$APP_DIR/server/imageProvider.ts"; then
  pass "persistImageToStorage implementado (S3 persistence)"
else
  fail "persistImageToStorage não encontrado"
fi

if grep -q "isStorageConfigured" "$APP_DIR/server/imageProvider.ts"; then
  pass "Verificação de S3 configurado antes de persistir"
else
  warn "isStorageConfigured não verificado"
fi

echo ""

# ── 5. DIAGRAMAS MERMAID ──
echo "┌─ 5. Diagramas Mermaid (Sanitização) ────────────────────────┐"

if grep -q "sanitizeMermaidCode" "$APP_DIR/client/src/components/MermaidRenderer.tsx"; then
  pass "sanitizeMermaidCode implementado"
else
  fail "sanitizeMermaidCode não encontrado"
fi

if grep -q "\\\\u200B" "$APP_DIR/client/src/components/MermaidRenderer.tsx"; then
  pass "Remove zero-width characters"
else
  warn "Remoção de zero-width characters não encontrada"
fi

if grep -q "&lt;" "$APP_DIR/client/src/components/MermaidRenderer.tsx"; then
  pass "Converte HTML entities (&lt; &gt; etc)"
else
  warn "Conversão de HTML entities não encontrada"
fi

if grep -q "renderError" "$APP_DIR/client/src/components/MermaidRenderer.tsx"; then
  pass "Fallback visual para erro de renderização"
else
  fail "Sem fallback visual para erros"
fi

echo ""

# ── 6. GPU WARMUP / FALLBACK ──
echo "┌─ 6. GPU Warmup e Fallback ──────────────────────────────────┐"

if grep -q "warmupGpu" "$APP_DIR/server/adminRouters.ts"; then
  pass "Endpoint warmupGpu disponível para admin"
else
  warn "warmupGpu não encontrado"
fi

if grep -q "AbortController" "$APP_DIR/server/streamRoute.ts"; then
  pass "AbortController com timeout para LLM requests"
else
  fail "Sem timeout para LLM requests"
fi

if grep -q "getFallbackProvider\|fallbackUsed" "$APP_DIR/server/streamRoute.ts"; then
  pass "Mecanismo de fallback entre providers implementado"
else
  fail "Sem fallback entre providers"
fi

if grep -q "localHealth" "$APP_DIR/server/adminRouters.ts"; then
  pass "Health check de GPU local disponível"
else
  warn "localHealth não encontrado"
fi

echo ""

# ── 7. TYPESCRIPT BUILD ──
echo "┌─ 7. TypeScript Build ────────────────────────────────────────┐"

cd "$APP_DIR"
TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)

if [ "$TSC_ERRORS" -eq 0 ]; then
  pass "TypeScript: 0 erros de compilação"
else
  fail "TypeScript: $TSC_ERRORS erros de compilação"
  echo "    Primeiros erros:"
  echo "$TSC_OUTPUT" | grep "error TS" | head -5 | sed 's/^/    /'
fi

echo ""

# ── 8. ARQUIVOS CRÍTICOS ──
echo "┌─ 8. Arquivos Críticos ───────────────────────────────────────┐"

CRITICAL_FILES=(
  "server/streamRoute.ts"
  "server/stripeRoutes.ts"
  "server/localAuth.ts"
  "server/imageProvider.ts"
  "server/videoProvider.ts"
  "server/diagramProvider.ts"
  "server/capabilityRouter.ts"
  "server/capabilityLimits.ts"
  "server/intentClassifier.ts"
  "server/learningMemory.ts"
  "server/adminRouters.ts"
  "client/src/components/MermaidRenderer.tsx"
  "client/src/components/MessageWithMermaid.tsx"
  "client/src/pages/LoginPage.tsx"
  "client/src/pages/PricingPage.tsx"
  "client/src/pages/ChatPage.tsx"
)

for f in "${CRITICAL_FILES[@]}"; do
  if [ -f "$APP_DIR/$f" ]; then
    pass "$f existe"
  else
    fail "$f AUSENTE"
  fi
done

echo ""

# ── RESUMO ──
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  RESUMO                                                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  ✅ PASS: %-3d  ⚠️  WARN: %-3d  ❌ FAIL: %-3d              ║\n" "$PASS" "$WARN" "$FAIL"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "⛔ BLOQUEADO para produção — corrija os itens FAIL acima."
  exit 1
elif [ "$WARN" -gt 3 ]; then
  echo "⚠️  Pode ir para produção, mas revise os warnings."
  exit 0
else
  echo "✅ APROVADO para deploy em produção."
  exit 0
fi
