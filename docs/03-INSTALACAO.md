# 03 - Instalacao

## Pre-requisitos

- Servidor preparado (`01-SETUP-SERVIDOR.md`)
- Arquivo `.env` configurado (`02-CONFIGURACAO-ENV.md`)
- DNS apontando para o servidor

## Executar Instalacao

```bash
cd /opt/debuga-ai
sudo ./scripts/install.sh
```

O script executa automaticamente:

1. **Certificado TLS** via Let's Encrypt (certbot standalone)
2. **PostgreSQL** e **MinIO** inicializados
3. **Bucket MinIO** criado (`debuga-homolog`)
4. **Modelos Ollama** baixados (qwen3.5 + qwen2.5-coder)

## Tempo Estimado

| Etapa | Tempo |
|-------|-------|
| Certificado TLS | 30 segundos |
| PostgreSQL + MinIO | 1-2 minutos |
| Download qwen3.5 (~5.5 GB) | 5-15 minutos |
| Download qwen2.5-coder (~4.7 GB) | 5-10 minutos |

## Verificacao

```bash
# PostgreSQL
docker exec debuga-postgres psql -U debuga -d debuga_homolog -c "SELECT 1;"

# MinIO
curl -sf http://localhost:9000/minio/health/live && echo "MinIO OK"

# Ollama
docker exec debuga-ollama ollama list
```

## Problemas Comuns

**Certbot falha**: Verifique se o DNS ja propagou (`dig seu-dominio.com.br`) e se a porta 80 esta aberta.

**MinIO nao inicia**: Verifique se a porta 9000 nao esta em uso: `sudo lsof -i :9000`.

**Ollama nao baixa modelos**: Verifique conectividade: `docker exec debuga-ollama curl -sf https://ollama.com`.

## Proximo Passo

Deploy da aplicacao: `04-DEPLOY.md`.
