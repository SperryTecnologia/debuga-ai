#!/usr/bin/env bash
# ============================================================
# debuga.ai — Install Script (Primeira Instalação)
#
# Prepara a VM para rodar debuga.ai em produção.
# Cria diretórios, valida dependências, sobe serviços base,
# garante banco e bucket.
#
# Uso: sudo bash scripts/install.sh [--env /path/to/.env]
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INSTALL]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $*"; }

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# ── Parse args ──
ENV_FILE=".env"
if [[ "${1:-}" == "--env" && -n "${2:-}" ]]; then
  ENV_FILE="$2"
fi

# ============================================================
# 1. Validar pré-requisitos
# ============================================================
log "Verificando pré-requisitos..."

# Docker
if ! command -v docker &>/dev/null; then
  err "Docker não instalado. Instale: https://docs.docker.com/engine/install/ubuntu/"
fi

# Docker Compose (plugin v2)
if ! docker compose version &>/dev/null; then
  err "Docker Compose v2 não encontrado. Instale: sudo apt install docker-compose-plugin"
fi

# .env file
if [[ ! -f "$ENV_FILE" ]]; then
  err "Arquivo .env não encontrado em: $ENV_FILE
  
  Crie a partir do template:
    cp templates/.env.production.template .env
    chmod 600 .env
    nano .env  # preencher valores obrigatórios"
fi

log "Carregando variáveis de: $ENV_FILE"
set -a; source "$ENV_FILE" 2>/dev/null || true; set +a

# ── Validar variáveis obrigatórias ──
REQUIRED_VARS=(
  "POSTGRES_USER"
  "POSTGRES_PASSWORD"
  "POSTGRES_DB"
  "MINIO_ROOT_USER"
  "MINIO_ROOT_PASSWORD"
  "JWT_SECRET"
  "DOMAIN"
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  val="${!var:-}"
  if [[ -z "$val" ]] || [[ "$val" == *"CHANGE_ME"* ]]; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  err "Variáveis obrigatórias não preenchidas no .env:
  ${MISSING[*]}
  
  Preencha antes de continuar."
fi

# ── Validar segurança MinIO ──
if [[ "${MINIO_ROOT_USER:-}" == "minioadmin" ]] || [[ "${MINIO_ROOT_PASSWORD:-}" == "minioadmin" ]]; then
  err "MINIO_ROOT_USER/PASSWORD não pode ser 'minioadmin' em produção.
  Gere credenciais seguras: openssl rand -base64 24"
fi

# ── Validar senha Postgres ──
if [[ ${#POSTGRES_PASSWORD} -lt 12 ]]; then
  warn "POSTGRES_PASSWORD tem menos de 12 caracteres. Recomendado: openssl rand -base64 32"
fi

log "✓ Pré-requisitos validados"

# ============================================================
# 2. Criar diretórios persistentes
# ============================================================
log "Criando diretórios de dados..."

DATA_DIRS=(
  "/data/debuga/postgres"
  "/data/debuga/minio"
  "/data/debuga/ollama"
  "/data/debuga/nginx-logs"
  "/data/debuga/backups"
  "/data/debuga/uploads"
)

for dir in "${DATA_DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    mkdir -p "$dir"
    log "  Criado: $dir"
  else
    info "  Existe: $dir"
  fi
done

# Permissões corretas para Postgres (uid 999 no container)
chown -R 999:999 /data/debuga/postgres 2>/dev/null || true

log "✓ Diretórios prontos"

# ============================================================
# 3. Subir serviços base (Postgres + MinIO)
# ============================================================
log "Iniciando serviços base (postgres, minio)..."

cd docker
docker compose up -d postgres minio
cd ..

# Aguardar Postgres ficar saudável
log "Aguardando PostgreSQL..."
RETRIES=0
MAX_RETRIES=30
until docker exec debuga-postgres pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" &>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [[ $RETRIES -ge $MAX_RETRIES ]]; then
    err "PostgreSQL não ficou pronto após ${MAX_RETRIES}s"
  fi
  sleep 1
done
log "✓ PostgreSQL pronto"

# ============================================================
# 4. Garantir banco existe
# ============================================================
log "Verificando banco de dados..."
bash scripts/ensure-database.sh --env "$ENV_FILE"

# ============================================================
# 5. Configurar MinIO bucket
# ============================================================
log "Configurando MinIO bucket..."

# Aguardar MinIO ficar saudável
RETRIES=0
until docker exec debuga-minio mc ready local &>/dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [[ $RETRIES -ge 30 ]]; then
    warn "MinIO não respondeu em 30s — bucket será criado no deploy"
    break
  fi
  sleep 1
done

S3_BUCKET="${S3_BUCKET:-debuga-prod}"

# Configurar mc alias dentro do container
docker exec debuga-minio mc alias set local http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}" 2>/dev/null || true

# Criar bucket se não existir
if docker exec debuga-minio mc ls "local/${S3_BUCKET}" &>/dev/null 2>&1; then
  info "Bucket '${S3_BUCKET}' já existe"
else
  docker exec debuga-minio mc mb "local/${S3_BUCKET}" 2>/dev/null && \
    log "✓ Bucket '${S3_BUCKET}' criado" || \
    warn "Não foi possível criar bucket — verifique credenciais MinIO"
fi

# ============================================================
# 6. GPU/Ollama (se habilitado)
# ============================================================
if [[ "${ENABLE_LOCAL_INFERENCE:-false}" == "true" ]]; then
  log "GPU habilitada — iniciando Ollama..."
  
  if ! command -v nvidia-smi &>/dev/null; then
    warn "nvidia-smi não encontrado — GPU pode não funcionar"
    warn "Instale: sudo apt install nvidia-driver-550 nvidia-container-toolkit"
  fi
  
  cd docker
  docker compose --profile gpu up -d ollama
  cd ..
  
  log "Aguardando Ollama (pode levar 60s no cold start)..."
  RETRIES=0
  until curl -sf http://127.0.0.1:11434/api/tags &>/dev/null; do
    RETRIES=$((RETRIES + 1))
    if [[ $RETRIES -ge 60 ]]; then
      warn "Ollama não respondeu em 60s — verifique GPU e logs"
      break
    fi
    sleep 2
  done
  
  if curl -sf http://127.0.0.1:11434/api/tags &>/dev/null; then
    log "✓ Ollama respondendo"
    info "Execute scripts/pull-models.sh para baixar modelos"
  fi
else
  info "Inferência local desabilitada (ENABLE_LOCAL_INFERENCE != true)"
  info "Ollama não será iniciado"
fi

# ============================================================
# 7. Resultado
# ============================================================
echo ""
log "========================================="
log "  Instalação concluída!"
log "========================================="
echo ""
log "Próximos passos:"
echo ""
echo "  1. Deploy da aplicação:"
echo "     bash scripts/deploy.sh"
echo ""
echo "  2. (Se GPU) Baixar modelos:"
echo "     bash scripts/pull-models.sh"
echo ""
echo "  3. Certificado TLS (se ainda não tem):"
echo "     sudo certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN:-debuga.ai} -d www.${DOMAIN:-debuga.ai}"
echo ""
echo "  4. Validação completa:"
echo "     bash scripts/validate-all.sh --env ${ENV_FILE}"
echo ""
