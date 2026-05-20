# Deploy em Ambiente de Homologação

Este documento descreve a configuração do ambiente de homologação (staging), separado da produção.

---

## Dados do Ambiente de Homologação

| Item | Valor |
|------|-------|
| Caminho | `/opt/debuga-ai-homolog` |
| Domínio | `homolog.debuga.ai` |
| Banco de dados | `debuga_homolog` |
| Bucket S3/MinIO | `debuga-homolog` |
| COMPOSE_PROJECT_NAME | `debuga_homolog` |
| Container prefix | `debuga-homolog` |
| Repositório | `SperryTecnologia/debuga-ai-homolog` |

---

## Diferenças em Relação à Produção

| Aspecto | Produção | Homologação |
|---------|----------|-------------|
| Caminho | `/opt/debuga-ai` | `/opt/debuga-ai-homolog` |
| Domínio | `debuga.ai` | `homolog.debuga.ai` |
| Banco | `debuga_prod` | `debuga_homolog` |
| Bucket | `debuga-prod` | `debuga-homolog` |
| Compose project | `debuga` | `debuga_homolog` |
| Stripe | Live keys | Test keys (`sk_test_`) |
| Dados | Reais | Testes |

---

## Deploy de Homologação

```bash
# 1. Clonar repositório de homologação
git clone git@github.com:SperryTecnologia/debuga-ai-homolog.git /opt/debuga-ai-homolog
cd /opt/debuga-ai-homolog

# 2. Configurar ambiente
cp templates/.env.homolog.template .env
chmod 600 .env
nano .env

# 3. Criar diretórios
mkdir -p /data/debuga-homolog/{postgres,minio,ollama,nginx-logs,backups}

# 4. Subir serviços
docker compose -f docker/docker-compose.yml up -d

# 5. Validar
bash scripts/validate-all.sh --env /opt/debuga-ai-homolog/.env
```

---

## Isolamento

Os ambientes de produção e homologação são completamente isolados:

- Bancos de dados separados (nomes diferentes, volumes Docker diferentes)
- Buckets S3/MinIO separados
- Containers com nomes diferentes (via COMPOSE_PROJECT_NAME)
- Volumes de dados em diretórios diferentes (`/data/debuga` vs `/data/debuga-homolog`)
- Chaves API separadas (Stripe test vs live, etc.)

Ambos podem coexistir no mesmo servidor, mas recomenda-se manter apenas um ativo por vez para evitar conflitos de porta.

---

## Convivência no Mesmo Servidor

Se ambos os ambientes precisam rodar simultaneamente:

1. Ajustar portas externas no docker-compose de homologação (ex: 3001 ao invés de 3000)
2. Configurar NGINX para rotear por domínio (`debuga.ai` → produção, `homolog.debuga.ai` → homologação)
3. Garantir que COMPOSE_PROJECT_NAME é diferente em cada ambiente

---

## Promoção de Homologação para Produção

Quando a homologação é aprovada (`validate-all.sh` retorna APROVADO):

1. Parar homologação: `docker compose -f docker/docker-compose.yml down`
2. Atualizar produção: `cd /opt/debuga-ai && git pull origin main`
3. Rebuild produção: `docker compose -f docker/docker-compose.yml up -d --build`
4. Validar produção: `bash scripts/validate-all.sh --env /opt/debuga-ai/.env`

---

## Notas

- O ambiente de homologação usa o repositório `debuga-ai-homolog` (branch main)
- O ambiente de produção usa o repositório `debuga-ai-prod` (branch main)
- Nunca usar chaves Stripe live (`sk_live_`) em homologação
- Nunca usar dados reais de clientes em homologação
