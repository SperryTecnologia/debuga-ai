# 28 — Variáveis de Ambiente: Capacidades Multimodais

Referência completa das variáveis de ambiente para o orquestrador de capacidades.

> **Importante:** Nunca commite valores reais de API keys. Use este documento apenas como referência de quais variáveis configurar no `.env` do servidor.

## Feature Flags

| Variável | Tipo | Default | Descrição |
|----------|------|---------|-----------|
| `ENABLE_CAPABILITY_ROUTING` | bool | `false` | Ativa classificação de intent + roteamento inteligente |
| `ENABLE_KNOWLEDGE_REUSE` | bool | `false` | Ativa busca RAG na base de conhecimento |
| `IMAGE_GENERATION_ENABLED` | bool | `false` | Ativa interceptação de pedidos de imagem |
| `VIDEO_GENERATION_ENABLED` | bool | `false` | Ativa geração assíncrona de vídeos |
| `ENABLE_LEARNING` | bool | `false` | Ativa salvamento de interações para análise |

## LLM Providers

### Cloud Provider (obrigatório)

| Variável | Tipo | Exemplo | Descrição |
|----------|------|---------|-----------|
| `LLM_CLOUD_API_URL` | URL | `https://generativelanguage.googleapis.com/v1beta/openai` | Endpoint OpenAI-compatible |
| `LLM_CLOUD_API_KEY` | string | `AIza...` | API key do provider cloud |
| `LLM_CLOUD_MODEL` | string | `gemini-2.5-flash` | Modelo padrão |

### Local GPU (opcional)

| Variável | Tipo | Exemplo | Descrição |
|----------|------|---------|-----------|
| `LOCAL_LLM_URL` | URL | `http://192.168.1.100:11434/v1` | Endpoint local (Ollama/vLLM) |
| `LOCAL_LLM_MODEL` | string | `qwen2.5:14b` | Modelo local |
| `LOCAL_LLM_ENABLED` | bool | `false` | Habilitar GPU local |
| `LOCAL_LLM_TIMEOUT_SECONDS` | number | `60` | Timeout para requests locais |

### Providers Adicionais (para routing)

| Variável | Tipo | Descrição |
|----------|------|-----------|
| `OPENAI_API_KEY` | string | API key OpenAI (GPT-4o, DALL-E) |
| `ANTHROPIC_API_KEY` | string | API key Anthropic (Claude) |
| `GEMINI_API_KEY` | string | API key Google AI (Gemini) |
| `OPENROUTER_API_KEY` | string | API key OpenRouter (multi-model) |
| `REPLICATE_API_TOKEN` | string | API token Replicate (imagem/vídeo) |

## Geração de Imagens

| Variável | Tipo | Default | Descrição |
|----------|------|---------|-----------|
| `IMAGE_GENERATION_PROVIDER` | enum | `openai` | Provider: `openai`, `gemini`, `replicate` |
| `IMAGE_GENERATION_MODEL` | string | `dall-e-3` | Modelo de geração |
| `IMAGE_DEFAULT_SIZE` | string | `1024x1024` | Tamanho padrão |
| `IMAGE_DEFAULT_QUALITY` | string | `standard` | Qualidade: `standard`, `hd` |
| `IMAGE_DAILY_LIMIT` | number | `50` | Limite global diário |

## Geração de Vídeos

| Variável | Tipo | Default | Descrição |
|----------|------|---------|-----------|
| `VIDEO_GENERATION_PROVIDER` | enum | `replicate` | Provider: `replicate`, `runway`, `veo` |
| `VIDEO_GENERATION_MODEL` | string | `minimax/video-01` | Modelo de geração |
| `VIDEO_DEFAULT_DURATION` | number | `5` | Duração padrão (segundos) |
| `VIDEO_DAILY_LIMIT` | number | `10` | Limite global diário |
| `RUNWAY_API_KEY` | string | — | API key Runway ML |
| `GOOGLE_CLOUD_PROJECT` | string | — | Projeto GCP (para Veo) |

## Custos e Limites

| Variável | Tipo | Default | Descrição |
|----------|------|---------|-----------|
| `COST_DAILY_LIMIT_USD` | number | `10.00` | Limite de custo diário (USD) |
| `COST_MONTHLY_LIMIT_USD` | number | `200.00` | Limite de custo mensal (USD) |
| `COST_ALERT_THRESHOLD_PERCENT` | number | `80` | % do limite para alertar |

## Routing Avançado

| Variável | Tipo | Default | Descrição |
|----------|------|---------|-----------|
| `ROUTING_PREFER_LOCAL` | bool | `false` | Preferir GPU local quando disponível |
| `ROUTING_FALLBACK_PROVIDER` | string | `cloud` | Provider de fallback global |
| `ROUTING_MAX_RETRIES` | number | `2` | Tentativas antes de fallback |

## Exemplo Mínimo

```env
# Mínimo para funcionar (apenas chat)
LLM_CLOUD_API_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_CLOUD_API_KEY=AIza...
LLM_CLOUD_MODEL=gemini-2.5-flash

# Ativar orquestrador
ENABLE_CAPABILITY_ROUTING=true
ENABLE_KNOWLEDGE_REUSE=true
ENABLE_LEARNING=true

# Adicionar geração de imagens
IMAGE_GENERATION_ENABLED=true
OPENAI_API_KEY=sk-...
```

## Exemplo Completo (Enterprise)

```env
# Cloud LLM
LLM_CLOUD_API_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_CLOUD_API_KEY=AIza...
LLM_CLOUD_MODEL=gemini-2.5-flash

# Local GPU
LOCAL_LLM_ENABLED=true
LOCAL_LLM_URL=http://192.168.1.100:11434/v1
LOCAL_LLM_MODEL=qwen2.5:14b

# Providers adicionais
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
REPLICATE_API_TOKEN=r8_...

# Features
ENABLE_CAPABILITY_ROUTING=true
ENABLE_KNOWLEDGE_REUSE=true
ENABLE_LEARNING=true
IMAGE_GENERATION_ENABLED=true
VIDEO_GENERATION_ENABLED=true

# Imagem
IMAGE_GENERATION_PROVIDER=openai
IMAGE_GENERATION_MODEL=dall-e-3

# Vídeo
VIDEO_GENERATION_PROVIDER=replicate
VIDEO_GENERATION_MODEL=minimax/video-01

# Custos
COST_DAILY_LIMIT_USD=100.00
COST_MONTHLY_LIMIT_USD=2000.00
```
