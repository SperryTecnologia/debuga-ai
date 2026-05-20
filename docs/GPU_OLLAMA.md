# 26. Single VM GPU — Inferência Local com Ollama

> **Objetivo:** Rodar inferência de LLM na mesma VM da aplicação usando GPU NVIDIA + Ollama, com fallback automático para API cloud quando a GPU estiver indisponível.

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    VM Single (GPU)                           │
│                                                             │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Nginx  │───▶│   App    │───▶│ Postgres │              │
│  │  :443   │    │  :3000   │    │  :5432   │              │
│  └─────────┘    └────┬─────┘    └──────────┘              │
│                      │                                      │
│              ┌───────┴───────┐                             │
│              │               │                             │
│         ┌────▼────┐    ┌────▼────┐                        │
│         │ Ollama  │    │  Cloud  │                        │
│         │ :11434  │    │  API    │                        │
│         │ (GPU)   │    │(fallback)│                        │
│         └─────────┘    └─────────┘                        │
│              │                                             │
│         ┌────▼────┐                                       │
│         │  NVIDIA │                                       │
│         │   GPU   │                                       │
│         └─────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Pré-requisitos

| Componente | Requisito Mínimo | Recomendado |
|---|---|---|
| GPU | NVIDIA com 8GB VRAM (RTX 3060) | 16GB+ VRAM (RTX 4070/A4000) |
| Driver NVIDIA | 525.60+ | 550+ |
| CUDA | 12.0+ | 12.4+ |
| RAM | 16GB | 32GB+ |
| Disco | 50GB livre em /data | SSD NVMe 100GB+ |
| Docker | 24.0+ | 25.0+ |
| nvidia-container-toolkit | 1.14+ | Última versão |

---

## Instalação Passo a Passo

### 1. Instalar Driver NVIDIA + Container Toolkit

```bash
# Ubuntu 22.04/24.04
sudo apt update && sudo apt install -y nvidia-driver-550

# Verificar
nvidia-smi

# Instalar nvidia-container-toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit

# Configurar Docker para usar nvidia runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Testar
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```

### 2. Preparar Diretórios de Dados

```bash
# Criar estrutura persistente
sudo mkdir -p /data/debuga/{postgres,minio,ollama,nginx-logs,backups}
sudo chown -R 1000:1000 /data/debuga
```

### 3. Configurar .env

```bash
# Copiar template
cp templates/.env.production.template .env

# Editar seção 12 (GPU Local):
ENABLE_LOCAL_INFERENCE=true
LOCAL_LLM_BASE_URL=http://ollama:11434
LOCAL_LLM_MODEL=qwen2.5:7b-instruct
LOCAL_LLM_PRIORITY=first
LOCAL_LLM_TIMEOUT_SECONDS=30
LOCAL_LLM_FALLBACK_ENABLED=true
```

### 4. Subir Serviços com GPU

```bash
cd docker

# Subir tudo incluindo Ollama com GPU
docker compose --profile gpu up -d

# Verificar que Ollama está usando GPU
docker logs debuga-ollama 2>&1 | grep -i "gpu\|cuda\|nvidia"

# Baixar o modelo configurado
docker exec debuga-ollama ollama pull qwen2.5:7b-instruct

# Verificar modelo carregado
docker exec debuga-ollama ollama list
```

### 5. Validar Funcionamento

```bash
# Script de diagnóstico
./scripts/check-gpu-readiness.sh

# Teste manual via curl
curl -s http://localhost:11434/api/tags | jq '.models[].name'

# Teste de inferência
curl -s http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:7b-instruct",
    "messages": [{"role": "user", "content": "Diga olá"}],
    "max_tokens": 50
  }' | jq '.choices[0].message.content'
```

---

## Modos de Prioridade

| Modo | `LOCAL_LLM_PRIORITY` | Comportamento |
|---|---|---|
| **GPU Primeiro** | `first` | Tenta GPU local → se timeout/erro → fallback cloud |
| **Cloud Primeiro** | `last` | Tenta cloud → se erro → fallback GPU local |
| **Apenas GPU** | `only` | Apenas GPU local, sem fallback (falha = erro ao usuário) |

### Fluxo de Fallback (priority=first)

```
1. Usuário envia mensagem
2. App tenta Ollama (LOCAL_LLM_BASE_URL)
3. Se resposta em < LOCAL_LLM_TIMEOUT_SECONDS → usa resposta
4. Se timeout/erro:
   a. Se LOCAL_LLM_FALLBACK_ENABLED=true → tenta cloud (LLM_CLOUD_*)
   b. Se LOCAL_LLM_FALLBACK_ENABLED=false → retorna erro ao usuário
5. Provider log registra: provider_used, fallback_used, fallback_reason
```

---

## Modelos Recomendados

| Modelo | VRAM | Qualidade | Velocidade | Uso |
|---|---|---|---|---|
| `qwen2.5:7b-instruct` | 5GB | Boa | Rápido | Chat geral, suporte |
| `qwen2.5:14b-instruct` | 10GB | Muito boa | Médio | Análise, código |
| `qwen2.5-coder:7b-instruct-q4_K_M` | 5GB | Boa (código) | Rápido | Programação |
| `llama3.1:8b-instruct-q5_K_M` | 6GB | Boa | Rápido | Chat geral |
| `mistral:7b-instruct-v0.3-q5_K_M` | 6GB | Boa | Rápido | Multilíngue |
| `deepseek-coder-v2:16b` | 12GB | Excelente (código) | Médio | Programação avançada |

### Trocar Modelo

```bash
# Baixar novo modelo
docker exec debuga-ollama ollama pull qwen2.5:14b-instruct

# Atualizar .env
LOCAL_LLM_MODEL=qwen2.5:14b-instruct

# Reiniciar app (não precisa reiniciar Ollama)
docker compose restart app
```

---

## Tuning de Performance

### Variáveis Ollama

| Variável | Default | Descrição |
|---|---|---|
| `OLLAMA_NUM_PARALLEL` | 2 | Requests simultâneos (mais = mais VRAM) |
| `OLLAMA_MAX_LOADED_MODELS` | 1 | Modelos na VRAM simultaneamente |
| `OLLAMA_FLASH_ATTENTION` | 1 | Flash Attention 2 (reduz VRAM, aumenta velocidade) |
| `OLLAMA_KEEP_ALIVE` | 10m | Tempo que modelo fica na VRAM após último uso |
| `OLLAMA_GPU_OVERHEAD` | 0 | VRAM reservada para sistema (MB) |

### Recomendações por VRAM

| VRAM | Configuração |
|---|---|
| 8GB | `NUM_PARALLEL=1`, `MAX_LOADED=1`, modelo 7B q4 |
| 12GB | `NUM_PARALLEL=2`, `MAX_LOADED=1`, modelo 7B q5 ou 14B q4 |
| 16GB | `NUM_PARALLEL=3`, `MAX_LOADED=1`, modelo 14B q5 |
| 24GB+ | `NUM_PARALLEL=4`, `MAX_LOADED=2`, modelo 14B q8 ou 32B q4 |

---

## Monitoramento

### Via Admin Panel

Acesse `/admin/providers` para ver:
- Status do Ollama (ONLINE/OFFLINE/MODELO AUSENTE)
- Modelos carregados
- Configuração ativa (prioridade, timeout, fallback)
- Botão "Testar GPU Local" com latência e tok/s

### Via CLI

```bash
# Status GPU
nvidia-smi

# VRAM usada pelo Ollama
nvidia-smi --query-compute-apps=pid,used_memory --format=csv

# Logs do Ollama
docker logs -f debuga-ollama --tail 50

# Métricas de provider no banco
docker exec debuga-postgres psql -U debuga -d debuga_homolog -c \
  "SELECT provider, fallback_used, COUNT(*) as total, 
   AVG(response_time_ms) as avg_latency 
   FROM ai_provider_logs 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY provider, fallback_used;"
```

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|---|---|---|
| Ollama OFFLINE no admin | Container não rodando | `docker compose --profile gpu up -d ollama` |
| "MODELO AUSENTE" | Modelo não baixado | `docker exec debuga-ollama ollama pull <modelo>` |
| Timeout constante | Modelo muito grande para VRAM | Usar modelo menor ou aumentar `LOCAL_LLM_TIMEOUT_SECONDS` |
| Fallback frequente | GPU sobrecarregada | Reduzir `OLLAMA_NUM_PARALLEL` ou usar modelo menor |
| "nvidia runtime not found" | nvidia-container-toolkit ausente | Instalar toolkit (seção 1) |
| CUDA out of memory | VRAM insuficiente | Reduzir `NUM_PARALLEL=1`, usar modelo q4 |
| Cold start lento (30s+) | Modelo descarregado da VRAM | Aumentar `OLLAMA_KEEP_ALIVE=30m` |

---

## Migração de Volumes Docker → /data/debuga

Se você já tem dados em volumes Docker nomeados, migre assim:

```bash
# Parar serviços
docker compose down

# Copiar dados do volume para /data/debuga
docker run --rm -v debuga-ai_postgres_data:/source -v /data/debuga/postgres:/dest alpine \
  sh -c "cp -a /source/. /dest/"

docker run --rm -v debuga-ai_minio_data:/source -v /data/debuga/minio:/dest alpine \
  sh -c "cp -a /source/. /dest/"

docker run --rm -v debuga-ai_ollama_data:/source -v /data/debuga/ollama:/dest alpine \
  sh -c "cp -a /source/. /dest/"

# Subir com novos volumes
docker compose --profile gpu up -d

# Verificar dados intactos
docker exec debuga-postgres psql -U debuga -d debuga_homolog -c "SELECT COUNT(*) FROM users;"
```

---

## Custos Estimados (GPU Cloud)

| Provider | GPU | VRAM | Custo/mês (24/7) |
|---|---|---|---|
| Hetzner | RTX 4000 | 8GB | ~€100/mês |
| Vast.ai | RTX 3090 | 24GB | ~$150/mês |
| RunPod | A4000 | 16GB | ~$200/mês |
| Lambda | A10G | 24GB | ~$300/mês |
| AWS | g5.xlarge (A10G) | 24GB | ~$500/mês |

**Comparação com API:**
- Gemini Flash: ~$0.075/1M tokens → 13M tokens/mês = $1/mês
- GPU local: custo fixo, tokens ilimitados, zero latência de rede, dados privados

**Quando GPU local vale a pena:**
- Volume > 50M tokens/mês
- Requisitos de privacidade (dados não saem da VM)
- Latência de rede é problema (>200ms para API)
- Necessidade de modelos customizados/fine-tuned

---

## Checklist de Deploy

- [ ] nvidia-smi funciona no host
- [ ] nvidia-container-toolkit instalado e configurado
- [ ] `docker run --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi` funciona
- [ ] Diretórios /data/debuga/* criados com permissões corretas
- [ ] .env configurado com `ENABLE_LOCAL_INFERENCE=true`
- [ ] `docker compose --profile gpu up -d` sem erros
- [ ] `docker exec debuga-ollama ollama pull <modelo>` concluído
- [ ] `./scripts/check-gpu-readiness.sh` passa todos os checks
- [ ] Admin panel mostra Ollama ONLINE
- [ ] Teste de chat funciona com GPU local
- [ ] Fallback para cloud funciona quando Ollama está parado

---

## Documentos Relacionados

- [15-LLM-PROVIDERS.md](./15-LLM-PROVIDERS.md) — Configuração de providers cloud
- [24-ENV-REFERENCE.md](./24-ENV-REFERENCE.md) — Referência completa de variáveis
- [25-PRODUCTION-READINESS.md](./25-PRODUCTION-READINESS.md) — Checklist de produção
