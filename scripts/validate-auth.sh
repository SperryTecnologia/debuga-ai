#!/usr/bin/env bash
# ============================================================
# debuga.ai — Validate Authentication Pipeline
#
# Testa de ponta a ponta:
#   1. /api/health → DB connection
#   2. /api/auth/config → Auth methods enabled
#   3. /api/auth/local/register → Create test user
#   4. /api/auth/local/login → Login test user
#   5. /api/auth/me → Verify session cookie
#
# Uso:
#   bash scripts/validate-auth.sh
#   bash scripts/validate-auth.sh --base-url https://debuga.ai
#   bash scripts/validate-auth.sh --base-url http://localhost:3000
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="${BASE_URL:-http://localhost:3000}"
VERBOSE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="$2"; shift 2 ;;
    --verbose|-v) VERBOSE=true; shift ;;
    *) shift ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  debuga.ai — Auth Pipeline Validation                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Base URL: $BASE_URL"
echo ""

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local result="$2"
  local expected="$3"

  if echo "$result" | grep -q "$expected"; then
    echo -e "  ${GREEN}✓${NC} $label"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} $label"
    if $VERBOSE; then
      echo "    Response: $result"
    fi
    ((FAIL++))
  fi
}

warn_check() {
  local label="$1"
  local result="$2"
  local expected="$3"

  if echo "$result" | grep -q "$expected"; then
    echo -e "  ${GREEN}✓${NC} $label"
    ((PASS++))
  else
    echo -e "  ${YELLOW}⚠${NC} $label (non-critical)"
    if $VERBOSE; then
      echo "    Response: $result"
    fi
    ((WARN++))
  fi
}

# ── 1. Health Check ──
echo -e "${BLUE}[1/5] Health Check${NC}"
HEALTH=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo -e "\n000")
HEALTH_CODE=$(echo "$HEALTH" | tail -1)
HEALTH_BODY=$(echo "$HEALTH" | sed '$d')

if [[ "$HEALTH_CODE" == "200" ]]; then
  echo -e "  ${GREEN}✓${NC} /api/health → 200 OK"
  ((PASS++))
  
  # Check DB connection
  if echo "$HEALTH_BODY" | grep -q '"connectionTested":true'; then
    echo -e "  ${GREEN}✓${NC} Database connection tested successfully"
    ((PASS++))
  else
    echo -e "  ${RED}✗${NC} Database connection NOT tested"
    echo "    Response: $HEALTH_BODY"
    ((FAIL++))
  fi
else
  echo -e "  ${RED}✗${NC} /api/health → HTTP $HEALTH_CODE"
  echo "    Response: $HEALTH_BODY"
  ((FAIL++))
  echo ""
  echo -e "${RED}FATAL: Health check failed. Fix database connection first.${NC}"
  echo "  Run: bash scripts/sync-postgres-password.sh"
  echo "  Then: docker compose -f docker/docker-compose.yml restart app"
  exit 1
fi

echo ""

# ── 2. Auth Config ──
echo -e "${BLUE}[2/5] Auth Configuration${NC}"
AUTH_CONFIG=$(curl -s "$BASE_URL/api/auth/config" 2>/dev/null || echo "{}")
check "Local auth enabled" "$AUTH_CONFIG" '"localAuth":true'
warn_check "Google OAuth enabled" "$AUTH_CONFIG" '"googleOAuth":true'
warn_check "Turnstile enabled" "$AUTH_CONFIG" '"turnstile"'

echo ""

# ── 3. Register Test ──
echo -e "${BLUE}[3/5] Registration Flow${NC}"
TEST_EMAIL="test_$(date +%s)@validate.local"
TEST_PASSWORD="TestPass123!"
TEST_NAME="Validate Script"

REG_RESULT=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/auth/local/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$TEST_NAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"acceptTerms\":true}" \
  2>/dev/null || echo -e "\n000")

REG_CODE=$(echo "$REG_RESULT" | tail -1)
REG_BODY=$(echo "$REG_RESULT" | sed '$d')

if [[ "$REG_CODE" == "201" ]]; then
  echo -e "  ${GREEN}✓${NC} Registration → 201 Created"
  ((PASS++))
  check "Response has user.id" "$REG_BODY" '"id"'
elif [[ "$REG_CODE" == "400" ]] && echo "$REG_BODY" | grep -q "CAPTCHA\|Turnstile\|verificação"; then
  echo -e "  ${YELLOW}⚠${NC} Registration blocked by Turnstile (expected in production)"
  ((WARN++))
elif [[ "$REG_CODE" == "503" ]]; then
  echo -e "  ${RED}✗${NC} Registration → 503 (Database unavailable)"
  echo "    Response: $REG_BODY"
  ((FAIL++))
else
  echo -e "  ${RED}✗${NC} Registration → HTTP $REG_CODE"
  echo "    Response: $REG_BODY"
  ((FAIL++))
fi

echo ""

# ── 4. Login Test ──
echo -e "${BLUE}[4/5] Login Flow${NC}"

LOGIN_RESULT=$(curl -s -w "\n%{http_code}" -c /tmp/validate-cookies.txt \
  -X POST "$BASE_URL/api/auth/local/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  2>/dev/null || echo -e "\n000")

LOGIN_CODE=$(echo "$LOGIN_RESULT" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESULT" | sed '$d')

if [[ "$LOGIN_CODE" == "200" ]]; then
  echo -e "  ${GREEN}✓${NC} Login → 200 OK"
  ((PASS++))
  check "Response has success:true" "$LOGIN_BODY" '"success":true'
elif [[ "$LOGIN_CODE" == "401" ]]; then
  echo -e "  ${YELLOW}⚠${NC} Login → 401 (user may not exist if registration was blocked by Turnstile)"
  ((WARN++))
elif [[ "$LOGIN_CODE" == "503" ]]; then
  echo -e "  ${RED}✗${NC} Login → 503 (Database unavailable)"
  ((FAIL++))
else
  echo -e "  ${RED}✗${NC} Login → HTTP $LOGIN_CODE"
  echo "    Response: $LOGIN_BODY"
  ((FAIL++))
fi

echo ""

# ── 5. Session Verification ──
echo -e "${BLUE}[5/5] Session Verification${NC}"

if [[ -f /tmp/validate-cookies.txt ]]; then
  ME_RESULT=$(curl -s -w "\n%{http_code}" -b /tmp/validate-cookies.txt \
    "$BASE_URL/api/auth/me" 2>/dev/null || echo -e "\n000")
  ME_CODE=$(echo "$ME_RESULT" | tail -1)
  ME_BODY=$(echo "$ME_RESULT" | sed '$d')

  if [[ "$ME_CODE" == "200" ]]; then
    echo -e "  ${GREEN}✓${NC} /api/auth/me → 200 (session valid)"
    ((PASS++))
    check "Response has user object" "$ME_BODY" '"user"'
  elif [[ "$ME_CODE" == "401" ]]; then
    echo -e "  ${YELLOW}⚠${NC} /api/auth/me → 401 (no valid session — may be expected)"
    ((WARN++))
  else
    echo -e "  ${RED}✗${NC} /api/auth/me → HTTP $ME_CODE"
    ((FAIL++))
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Skipped (no cookies from login)"
  ((WARN++))
fi

# Cleanup
rm -f /tmp/validate-cookies.txt

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$WARN warnings${NC}"
echo "═══════════════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  echo -e "${RED}Some checks failed. Common fixes:${NC}"
  echo "  1. DB connection: bash scripts/sync-postgres-password.sh"
  echo "  2. Restart app:   docker compose -f docker/docker-compose.yml restart app"
  echo "  3. Check logs:    docker logs debuga-app --tail=50"
  exit 1
fi

exit 0
