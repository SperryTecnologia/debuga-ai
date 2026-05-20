#!/usr/bin/env bash
# ============================================================
# generate-secrets.sh
# Gera secrets aleatorios para o debuga-ai
#
# USO:
#   chmod +x scripts/generate-secrets.sh
#   ./scripts/generate-secrets.sh
#
# O script exibe os valores gerados no terminal.
# Copie e cole no seu arquivo .env.
#
# NAO gera chaves de APIs externas (Google, Stripe, OpenAI).
# Essas devem ser obtidas nos respectivos dashboards.
# ============================================================

set -euo pipefail

echo "============================================================"
echo "  debuga-ai - Gerador de Secrets"
echo "============================================================"
echo ""
echo "Gerando secrets aleatorios..."
echo ""

# JWT_SECRET (64 caracteres hex = 32 bytes)
JWT_SECRET=$(openssl rand -hex 32)

# SESSION_SECRET (64 caracteres hex = 32 bytes)
SESSION_SECRET=$(openssl rand -hex 32)

# POSTGRES_PASSWORD (32 caracteres alfanumericos, sem especiais)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# MINIO_ROOT_PASSWORD / S3_SECRET_KEY (32 caracteres alfanumericos)
MINIO_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# S3_ACCESS_KEY / MINIO_ROOT_USER (20 caracteres alfanumericos, estilo AWS)
MINIO_USER=$(openssl rand -base64 20 | tr -dc 'A-Z0-9' | head -c 20)

echo "------------------------------------------------------------"
echo "  Copie os valores abaixo para o seu arquivo .env"
echo "------------------------------------------------------------"
echo ""
echo "# Autenticacao e Sessoes"
echo "JWT_SECRET=${JWT_SECRET}"
echo "SESSION_SECRET=${SESSION_SECRET}"
echo ""
echo "# Banco de Dados (PostgreSQL)"
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
echo ""
echo "# Storage (MinIO)"
echo "MINIO_ROOT_USER=${MINIO_USER}"
echo "MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}"
echo "S3_ACCESS_KEY=${MINIO_USER}"
echo "S3_SECRET_KEY=${MINIO_PASSWORD}"
echo ""
echo "------------------------------------------------------------"
echo "  IMPORTANTE"
echo "------------------------------------------------------------"
echo ""
echo "1. Copie os valores acima para o arquivo .env"
echo "2. S3_ACCESS_KEY deve ser IGUAL a MINIO_ROOT_USER"
echo "3. S3_SECRET_KEY deve ser IGUAL a MINIO_ROOT_PASSWORD"
echo "4. NAO commite o arquivo .env no Git"
echo "5. Chaves externas (Google, Stripe, OpenAI) devem ser"
echo "   obtidas nos respectivos dashboards e adicionadas manualmente"
echo ""
echo "Para validar o .env apos preencher:"
echo "  ./scripts/validate-env.sh"
echo ""
