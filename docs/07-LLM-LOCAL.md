# 07 - LLM Local (Ollama + GPU)

## Visão Geral

> **O Ollama é opcional.** O container Ollama usa `profiles: [gpu]` no `docker-compose.yml`, ou seja, **não é iniciado por padrão**. A aplicação funciona normalmente usando apenas LLM cloud.

O gateway LLM do homolog suporta dois modos de operação controlados pela variável `ENABLE_LOCAL_INFERENCE`:

- **`false` (padrão)**: Usa endpoint cloud OpenAI-compatível (mesmo da produção). Ollama não precisa estar rodando.
- **`true`**: Usa Ollama local com fallback automático para cloud em caso de falha

## Modelos Recomendados para RTX 3070 8GB

| Modelo | Tamanho | Velocidade | Uso |
|--------|---------|-----------|-----|
| **qwen3.5:latest** | ~5.5 GB | 54-58 t/s | General purpose (campeao) |
| **qwen2.5-coder:7b Q4_K_M** | ~4.7 GB | 45-50 t/s | Codigo e debugging |
| **glm4:9b-chat Q4_K_M** | ~5.5 GB | 40-45 t/s | Matematica e raciocinio |
| **nomic-embed-text** | ~274 MB | N/A | Embeddings (futuro RAG) |

## Ativar Inferência Local

1. Iniciar o Ollama (usa profile `gpu`):
```bash
docker compose -f docker/docker-compose.yml --profile gpu up -d ollama
```

2. Baixar o modelo desejado:
```bash
docker exec debuga-ollama ollama pull qwen3.5:latest
# Ou usar o script:
./scripts/pull-models.sh
```

3. Editar `.env`:
```
ENABLE_LOCAL_INFERENCE=true
LOCAL_LLM_MODEL=qwen3.5:latest
```

4. Restart da app para aplicar:
```bash
docker compose -f docker/docker-compose.yml restart app
```

## Comportamento do Gateway

O arquivo `server/_core/llm.ts` implementa a logica:

1. Se `ENABLE_LOCAL_INFERENCE=true` e `LOCAL_LLM_BASE_URL` configurado:
   - Envia request para Ollama via API OpenAI-compativel (`/v1/chat/completions`)
   - `max_tokens` limitado a 8192 (restricao de VRAM)
   - `thinking` e `tool_choice` desabilitados para modelos locais
2. Se request local falha e credenciais cloud existem:
   - Fallback automatico para endpoint cloud
   - Log de warning no console
3. Se `ENABLE_LOCAL_INFERENCE=false`:
   - Usa endpoint cloud diretamente (comportamento identico a producao)

## Limitacoes da Inferencia Local

- **Sem function calling confiavel**: Modelos 7-9B nao suportam tool_choice de forma estavel. O gateway desabilita automaticamente.
- **Contexto limitado**: 8192 tokens max (vs 32768 no cloud). Conversas longas podem ser truncadas.
- **Sem thinking/reasoning**: O parametro `thinking.budget_tokens` e removido para modelos locais.
- **Latencia no primeiro request**: O modelo precisa ser carregado na VRAM (~5-10 segundos).

## Monitoramento

```bash
# Ver logs do Ollama
docker logs debuga-ollama --tail=50

# Verificar uso de GPU
nvidia-smi

# Testar inferencia diretamente
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3.5:latest",
  "prompt": "Explique o que e DNS em uma frase.",
  "stream": false
}'
```

## Trocar Modelo em Runtime

```bash
# Editar .env
LOCAL_LLM_MODEL=qwen2.5-coder:7b-instruct-q4_K_M

# Restart apenas da app (Ollama mantem os modelos)
docker compose -f docker/docker-compose.yml restart app
```

## Fallback Cloud

Se o Ollama estiver indisponivel (crash, GPU ocupada, modelo nao encontrado), o gateway tenta automaticamente o endpoint cloud configurado em `BUILT_IN_FORGE_API_URL` / `LLM_CLOUD_API_URL`. Isso garante que o chat nunca fica completamente indisponivel.

## Laboratório Avançado (GPU Dedicada)

Para configurações avançadas com GPU dedicada (RTX 3090, Hyper-V DDA, benchmarks, tool calling), consulte o repositório complementar:

> **[debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab)** — Laboratório de IA local com Ollama, GPU via Hyper-V DDA, modelos Qwen (7B a 30B), scripts de benchmark, testes de qualidade e guia de integração com o debuga.ai homolog.

O lab cobre:
- Configuração de GPU pass-through (Hyper-V DDA + NVIDIA Container Toolkit)
- Comparativo detalhado de modelos Qwen (2.5, 3, Coder)
- Scripts de benchmark (velocidade e qualidade)
- Execução isolada e tool calling com LLM local
- Troubleshooting específico de GPU/CUDA/Ollama
