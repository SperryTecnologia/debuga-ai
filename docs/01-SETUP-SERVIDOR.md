# 01 - Setup do Servidor

## Pre-requisitos

O servidor deve rodar Ubuntu 22.04 ou 24.04 LTS com acesso root. O script `scripts/setup.sh` automatiza a instalacao de todas as dependencias.

## Passo a Passo

### 1. Provisionar o Servidor

Recomendamos um VPS com as especificacoes descritas em `00-VISAO-GERAL.md`. Provedores sugeridos para GPU: Hetzner (GPU dedicada), Vast.ai, ou servidor local.

### 2. Configurar DNS

Crie um registro A no seu provedor de DNS apontando `seu-dominio.com.br` para o IP publico do servidor. Aguarde a propagacao (geralmente 5-30 minutos).

### 3. Executar o Script de Setup

```bash
# Conectar ao servidor
ssh root@<IP_DO_SERVIDOR>

# Baixar o pacote (ou transferir via scp)
scp debuga-ai-prod.zip root@<IP>:/opt/
ssh root@<IP>
cd /opt && unzip debuga-ai-prod.zip
cd debuga-ai

# Executar setup
chmod +x scripts/*.sh
sudo ./scripts/setup.sh
```

O script instala: Docker, Docker Compose, NVIDIA Container Toolkit (se GPU detectada), UFW, fail2ban, certbot.

### 4. Verificar Instalacao

```bash
docker --version          # Docker 24+
docker compose version    # Docker Compose v2+
nvidia-smi                # (se GPU presente)
ufw status                # Firewall ativo
```

## Seguranca Aplicada pelo Setup

O script configura automaticamente:

- **UFW**: apenas SSH (22), HTTP (80) e HTTPS (443) abertos
- **fail2ban**: bloqueia IPs apos 3 tentativas SSH falhas
- **Usuario dedicado**: `debuga` com acesso ao grupo docker
- **Portas internas**: PostgreSQL (5432), MinIO (9000/9001), Ollama (11434) acessiveis apenas via localhost

## Proximo Passo

Configurar o arquivo `.env` conforme `02-CONFIGURACAO-ENV.md`.
