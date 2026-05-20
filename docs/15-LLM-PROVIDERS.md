# 15. Provedores de LLM

Guia completo de configuração dos provedores de LLM (Large Language Model) suportados pelo debuga.ai, incluindo opções locais, cloud e híbridas.

---

## Arquitetura de Resolução de Providers

O debuga.ai usa a variável `LLM_PROVIDER` para definir o provider principal e `LLM_FALLBACK_PROVIDER` para fallback automático.

```
┌─────────────────────────────────────────────────────────────┐
│  Resolução de Provider (server/_core/env.ts)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LLM_PROVIDER = gemini | openai | anthropic | openrouter   │
│                 | cloud | ollama | forge                    │
│                                                             │
│  Prioridade quando LOCAL_LLM_PRIORITY=first:               │
│    1. Tenta Ollama local (com timeout configurável)         │
│    2. Se falhar → usa LLM_PROVIDER como fallback           │
│                                                             │
│  Prioridade quando LOCAL_LLM_PRIORITY=last (default):      │
│    1. Tenta LLM_PROVIDER (cloud)                           │
│    2. Se falhar → tenta Ollama local como fallback         │
│                                                             │
│  Prioridade quando LOCAL_LLM_PRIORITY=only:                │
│    1. Usa APENAS Ollama local                              │
│    2. Se falhar → erro (sem fallback)                      │
│                                                             │
│  LLM_FALLBACK_PROVIDER = provider alternativo              │
│    Usado quando o provider principal falha                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Variáveis Globais de Controle

| Variável | Valores | Default | Descrição |
|----------|---------|---------|-----------|
| `LLM_PROVIDER` | gemini, openai, anthropic, openrouter, cloud, ollama, forge | — | Provider principal |
| `LLM_FALLBACK_PROVIDER` | (mesmos valores) | — | Provider de fallback |
| `ENABLE_LOCAL_INFERENCE` | true/false | false | Habilitar Ollama local |
| `LOCAL_LLM_PRIORITY` | first, last, only | last | Prioridade do Ollama |
| `LOCAL_LLM_TIMEOUT_SECONDS` | número | 120 | Timeout para inferência local |
| `LOCAL_LLM_FALLBACK_ENABLED` | true/false | true | Fallback cloud quando GPU falha |

---

## 1. Gemini (Google)

### Quando usar

- Contexto muito longo (1M+ tokens)
- Análise multimodal (texto + imagem)
- Custo-benefício excelente (flash é barato)

### Onde obter as chaves

1. Acesse [aistudio.google.com](https://aistudio.google.com/)
2. Clique em **Get API Key** → **Create API Key**
3. Copie a chave (começa com `AIza`)

### Variáveis no .env

```bash
LLM_PROVIDER=gemini
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
```

### Modelos disponíveis

| Modelo | Contexto | Custo relativo | Uso recomendado |
|--------|----------|---------------|-----------------|
| `gemini-2.5-pro` | 1M | Alto | Raciocínio complexo |
| `gemini-2.5-flash` | 1M | Baixo | Uso geral, rápido |
| `gemini-2.0-flash` | 1M | Muito baixo | Alto volume |

---

## 2. OpenAI

### Quando usar

- Modelos de ponta (GPT-4o, GPT-4.1)
- Ecossistema maduro com muita documentação
- Prototipagem rápida

### Onde obter as chaves

1. Acesse [platform.openai.com](https://platform.openai.com/)
2. Vá em **API Keys** → **Create new secret key**
3. Copie a chave (começa com `sk-`)

### Variáveis no .env

```bash
LLM_PROVIDER=openai
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Modelos disponíveis

| Modelo | Contexto | Custo relativo | Uso recomendado |
|--------|----------|---------------|-----------------|
| `gpt-4o` | 128K | Alto | Raciocínio complexo |
| `gpt-4o-mini` | 128K | Baixo | Uso geral, chat |
| `gpt-4.1` | 1M | Alto | Tarefas longas |
| `gpt-4.1-mini` | 1M | Médio | Equilíbrio custo/qualidade |
| `gpt-4.1-nano` | 1M | Muito baixo | Alto volume, tarefas simples |

---

## 3. Anthropic (Claude)

### Quando usar

- Contexto longo (200K tokens)
- Tarefas de análise e raciocínio
- Respostas mais cautelosas e precisas

### Onde obter as chaves

1. Acesse [console.anthropic.com](https://console.anthropic.com/)
2. Vá em **API Keys** → **Create Key**
3. Copie a chave (começa com `sk-ant-`)

### Variáveis no .env

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_URL=https://api.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### Formato da API

> **Importante:** A API nativa da Anthropic usa formato próprio (header `x-api-key`, `anthropic-version: 2023-06-01`). O script `check-llm-provider.sh` detecta automaticamente se a URL aponta para `api.anthropic.com` e usa o formato nativo.
>
> Se você usar um proxy OpenAI-compatible (ex: LiteLLM), configure como `LLM_PROVIDER=cloud` com a URL do proxy.

### Modelos disponíveis

| Modelo | Contexto | Custo relativo | Uso recomendado |
|--------|----------|---------------|-----------------|
| `claude-sonnet-4-20250514` | 200K | Alto | Raciocínio avançado |
| `claude-3-5-sonnet-20241022` | 200K | Médio | Uso geral |
| `claude-3-5-haiku-20241022` | 200K | Baixo | Alto volume |

---

## 4. OpenRouter

### Quando usar

- Acesso a múltiplos modelos com uma única chave
- Comparação entre providers
- Fallback automático entre modelos

### Onde obter as chaves

1. Acesse [openrouter.ai](https://openrouter.ai/)
2. Vá em **Keys** → **Create Key**
3. Copie a chave (começa com `sk-or-`)

### Variáveis no .env

```bash
LLM_PROVIDER=openrouter
OPENROUTER_API_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### Headers especiais

O sistema envia automaticamente os headers recomendados pelo OpenRouter:

```
HTTP-Referer: https://seu-dominio.com.br
X-Title: debuga.ai homolog
```

### Modelos populares

| Modelo | Provider | Custo relativo | Uso recomendado |
|--------|----------|---------------|-----------------|
| `openai/gpt-4o-mini` | OpenAI | Baixo | Uso geral |
| `anthropic/claude-sonnet-4-20250514` | Anthropic | Alto | Raciocínio |
| `google/gemini-2.5-flash` | Google | Baixo | Rápido |
| `meta-llama/llama-3.1-70b-instruct` | Meta | Médio | Open-source |
| `deepseek/deepseek-chat` | DeepSeek | Muito baixo | Código |

---

## 5. LLM Cloud Genérico (OpenAI-Compatible)

### Quando usar

- Qualquer provedor que implemente a API OpenAI-compatible
- Proxies como LiteLLM, vLLM, LM Studio
- Providers não listados acima

### Variáveis no .env

```bash
LLM_PROVIDER=cloud
LLM_CLOUD_API_URL=https://api.exemplo.com/v1
LLM_CLOUD_API_KEY=sk-...
LLM_CLOUD_MODEL=nome-do-modelo
```

### Providers compatíveis

| Provedor | URL base | Observação |
|----------|---------|-----------|
| [Groq](https://groq.com/) | `https://api.groq.com/openai/v1` | Inferência ultra-rápida |
| [Together AI](https://together.ai/) | `https://api.together.xyz/v1` | Modelos open-source |
| [Fireworks AI](https://fireworks.ai/) | `https://api.fireworks.ai/inference/v1` | Modelos otimizados |
| [DeepSeek](https://deepseek.com/) | `https://api.deepseek.com/v1` | Modelos chineses |
| [vLLM](https://github.com/vllm-project/vllm) | `http://localhost:8000/v1` | Self-hosted, alta performance |
| [LM Studio](https://lmstudio.ai/) | `http://localhost:1234/v1` | Desktop, fácil de usar |
| [LiteLLM](https://github.com/BerriAI/litellm) | `http://localhost:4000/v1` | Proxy multi-provider |

---

## 6. Ollama Local (GPU)

### Quando usar

- Servidor com GPU NVIDIA (RTX 3090, A100, etc.)
- Privacidade total (dados não saem da rede)
- Latência mínima (sem chamadas de rede externas)
- Custo zero após investimento em hardware

### Variáveis no .env

```bash
LLM_PROVIDER=ollama
ENABLE_LOCAL_INFERENCE=true
LOCAL_LLM_BASE_URL=http://ollama:11434
LOCAL_LLM_MODEL=qwen2.5:7b-instruct
LOCAL_LLM_PRIORITY=first
LOCAL_LLM_TIMEOUT_SECONDS=120
LOCAL_LLM_FALLBACK_ENABLED=true
LOCAL_LLM_REQUIRE_GPU=false
```

### Modelos recomendados

| Modelo | VRAM | Velocidade | Uso recomendado |
|--------|------|-----------|-----------------|
| `qwen2.5:7b-instruct` | ~5 GB | Rápido | Uso geral, chat |
| `qwen2.5-coder:7b-instruct` | ~5 GB | Rápido | Código, DevOps |
| `qwen2.5-coder:14b-instruct` | ~10 GB | Médio | Código avançado |
| `qwen2.5:32b-instruct` | ~20 GB | Lento | Raciocínio complexo |
| `llama3.1:8b-instruct` | ~5 GB | Rápido | Alternativa Meta |
| `deepseek-coder-v2:16b` | ~10 GB | Médio | Código especializado |

### Deploy

```bash
# Subir com profile GPU
docker compose -f docker/docker-compose.yml --profile gpu up -d

# Baixar modelo
docker exec debuga-ollama ollama pull qwen2.5:7b-instruct

# Verificar modelos disponíveis
docker exec debuga-ollama ollama list

# Testar endpoint
curl http://localhost:11434/api/tags
```

### Ollama Remoto (sem Docker)

Se o Ollama estiver em outro servidor da rede:

```bash
ENABLE_LOCAL_INFERENCE=true
LOCAL_LLM_BASE_URL=http://192.168.1.100:11434
LOCAL_LLM_MODEL=qwen2.5:7b-instruct
```

---

## 7. Forge (Legado — Apenas Cloud)

### Importante: NÃO disponível para self-hosted

As variáveis `BUILT_IN_FORGE_API_URL` e `BUILT_IN_FORGE_API_KEY` são injetadas automaticamente pela plataforma de deploy. **Não existe painel público para gerar essas chaves.**

Para deploy self-hosted, use uma das opções acima.

### Variáveis no .env (apenas se explicitamente configurado)

```bash
LLM_PROVIDER=forge
BUILT_IN_FORGE_API_URL=<injetado automaticamente>
BUILT_IN_FORGE_API_KEY=<injetado automaticamente>
```

---

## Configuração Híbrida (Local + Cloud)

A configuração recomendada para produção com GPU:

```bash
# Provider principal: Ollama local (tenta primeiro)
LLM_PROVIDER=gemini
ENABLE_LOCAL_INFERENCE=true
LOCAL_LLM_BASE_URL=http://ollama:11434
LOCAL_LLM_MODEL=qwen2.5:7b-instruct
LOCAL_LLM_PRIORITY=first
LOCAL_LLM_TIMEOUT_SECONDS=120
LOCAL_LLM_FALLBACK_ENABLED=true

# Fallback: Gemini cloud (quando Ollama falha)
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash

# Fallback secundário (opcional)
LLM_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Fluxo de fallback

```
1. LOCAL_LLM_PRIORITY=first → Tenta Ollama
   ├── Sucesso → Responde via GPU local
   └── Falha (timeout/erro) → 
       2. Tenta LLM_PROVIDER (gemini)
          ├── Sucesso → Responde via Gemini
          └── Falha →
              3. Tenta LLM_FALLBACK_PROVIDER (openai)
                 ├── Sucesso → Responde via OpenAI
                 └── Falha → Erro para o usuário
```

---

## Tabela Comparativa

| Provider | Privacidade | Latência | Custo | Contexto | Setup |
|----------|------------|----------|-------|----------|-------|
| Ollama Local | Total | Muito baixa | Zero (após GPU) | Depende do modelo | Médio |
| Gemini | Baixa | Média | Por token | 1M+ | Fácil |
| OpenAI | Baixa | Média | Por token | 128K-1M | Fácil |
| Anthropic | Baixa | Média | Por token | 200K | Fácil |
| OpenRouter | Baixa | Média | Por token | Varia | Fácil |
| Cloud genérico | Varia | Varia | Varia | Varia | Médio |
| Forge | N/A | N/A | N/A | N/A | Automático |

---

## Diagnóstico e Verificação

### Script de teste

```bash
# Testar TODOS os providers configurados
./scripts/check-llm-provider.sh

# Saída mostra:
# - Quais providers estão configurados
# - HTTP status de cada teste
# - Resposta curta da API
# - Erro real quando falha
# - Resumo final com totais
```

### Verificação manual

```bash
# Ollama
curl http://localhost:11434/api/tags
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:7b-instruct","messages":[{"role":"user","content":"ping"}],"max_tokens":10}'

# OpenAI-compatible (Gemini, OpenAI, Cloud)
curl -H "Authorization: Bearer $API_KEY" \
     "$API_URL/chat/completions" \
     -H "Content-Type: application/json" \
     -d '{"model":"MODEL","messages":[{"role":"user","content":"ping"}],"max_tokens":10}'

# Anthropic nativo
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}'
```

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| `docs/24-ENV-REFERENCE.md` | Referência completa de variáveis |
| `docs/26-SINGLE-VM-GPU.md` | Setup completo de VM com GPU |
| `docs/07-LLM-LOCAL.md` | Configuração detalhada do Ollama |
| `docs/14-SELF-HOSTED.md` | Deploy self-hosted completo |
| `scripts/check-llm-provider.sh` | Script de diagnóstico de providers |
| `scripts/check-gpu-readiness.sh` | Script de diagnóstico de GPU |
