# 29 - Geração Multimodal de Assets

Este documento descreve o pipeline de geração de imagens, vídeos e diagramas do debuga.ai, incluindo configuração de provedores, persistência em storage e limites por plano.

---

## Visão Geral da Arquitetura

```
Usuário → Chat → Agent Loop → Capability Router → Provider
                                    │
                                    ├── imageProvider.ts  → OpenAI DALL-E / gpt-image-1
                                    ├── videoProvider.ts  → Runway ML / Kling AI
                                    └── diagramProvider.ts → Kroki (self-hosted)
                                    │
                                    ▼
                              Storage (S3/MinIO)
                                    │
                                    ▼
                              generated_assets (DB)
```

O **Capability Router** (`server/capabilityRouter.ts`) decide qual provider usar com base em:

1. Tipo de tarefa (imagem, vídeo, diagrama, código, chat)
2. Score de performance de cada provider (aprendizado adaptativo)
3. Configuração de prioridade via variáveis de ambiente
4. Disponibilidade (circuit breaker por provider)

---

## Geração de Imagens

### Provedores Suportados

| Provider | Modelos | Variável de Configuração |
|----------|---------|--------------------------|
| **OpenAI** | DALL-E 3, gpt-image-1 | `IMAGE_PROVIDER=openai` |
| **Replicate** | SDXL, Flux | `IMAGE_PROVIDER=replicate` |
| **Local** | Stable Diffusion (ComfyUI) | `IMAGE_PROVIDER=local` |

### Configuração

```env
# Provider principal de imagens
IMAGE_PROVIDER=openai
IMAGE_API_KEY=sk-...

# Fallback (opcional)
IMAGE_FALLBACK_PROVIDER=replicate
REPLICATE_API_TOKEN=r8_...

# Qualidade e tamanho padrão
IMAGE_DEFAULT_SIZE=1024x1024
IMAGE_DEFAULT_QUALITY=standard
```

### Fluxo de Geração

1. O agente detecta intenção de gerar imagem (via tool calling ou prompt direto)
2. `capabilityRouter` seleciona o provider com melhor score
3. `imageProvider.generateImage()` faz a chamada à API
4. Se S3 está configurado: imagem é persistida com URL permanente
5. Se S3 NÃO está configurado: URL temporária é retornada (expira em ~1h)
6. Metadados são salvos em `generated_assets` (tipo, prompt, URL, custo estimado)
7. Markdown `![Imagem](url)` é inserido na resposta do agente

### Persistência

A função `persistImageToStorage()` em `imageProvider.ts`:

- Detecta se a resposta é base64 ou URL
- Faz download/decode do conteúdo
- Upload para S3 com chave única: `images/{userId}/{timestamp}-{hash}.png`
- Retorna URL pública permanente

Se S3 não estiver configurado, um warning é logado e a URL original é usada.

---

## Geração de Vídeo

### Provedores Suportados

| Provider | Tipo | Variável de Configuração |
|----------|------|--------------------------|
| **Runway ML** | Text-to-video, Image-to-video | `VIDEO_PROVIDER=runway` |
| **Kling AI** | Text-to-video | `VIDEO_PROVIDER=kling` |

### Configuração

```env
# Habilitar geração de vídeo
VIDEO_GENERATION_ENABLED=true
VIDEO_PROVIDER=runway
VIDEO_API_KEY=rw_...

# Limites
VIDEO_MAX_DURATION_SECONDS=10
VIDEO_MAX_RESOLUTION=720p
```

### Fluxo de Geração

1. Agente detecta intenção de gerar vídeo
2. `capabilityRouter` verifica se vídeo está habilitado e se o plano permite
3. `videoProvider.generateVideo()` inicia job assíncrono
4. Polling via `generation_jobs` table (status: pending → processing → completed/failed)
5. Quando completo: download do vídeo, upload para S3, atualização de metadados
6. Link de download é enviado ao usuário

### Jobs Assíncronos

Vídeos são gerados de forma assíncrona. A tabela `generation_jobs` rastreia:

| Campo | Descrição |
|-------|-----------|
| `id` | UUID do job |
| `user_id` | Usuário que solicitou |
| `type` | `video` |
| `provider` | `runway` ou `kling` |
| `status` | `pending`, `processing`, `completed`, `failed` |
| `external_id` | ID do job no provider externo |
| `params` | Parâmetros da geração (prompt, duração, resolução) |
| `result_url` | URL do vídeo gerado (após conclusão) |
| `progress` | Percentual de progresso (0-100) |
| `error` | Mensagem de erro (se falhou) |

---

## Geração de Diagramas

### Provider

O debuga.ai usa **Kroki** para renderização de diagramas. Kroki suporta múltiplos formatos:

| Formato | Linguagem | Uso Típico |
|---------|-----------|------------|
| Mermaid | `mermaid` | Fluxogramas, sequência, ER, Gantt |
| PlantUML | `plantuml` | UML, componentes, deployment |
| D2 | `d2` | Arquitetura, infraestrutura |
| GraphViz | `dot` | Grafos, redes |
| Excalidraw | `excalidraw` | Diagramas hand-drawn |

### Configuração

```env
# URL do Kroki (pode ser self-hosted)
KROKI_URL=https://kroki.io

# Para self-hosted:
# docker run -d -p 8000:8000 yuzutech/kroki
# KROKI_URL=http://localhost:8000
```

### Fluxo de Geração

1. LLM gera código Mermaid/PlantUML no markdown da resposta
2. `diagramProvider.processDiagramResponse()` detecta blocos de código de diagrama
3. Código é sanitizado (`sanitizeMermaidCode()` remove emoji, HTML entities, etc.)
4. Requisição POST para Kroki com o código
5. SVG retornado é persistido em S3 (se configurado)
6. Frontend renderiza via `MermaidRenderer` (client-side) ou mostra SVG inline

### Sanitização

O `MermaidRenderer.tsx` aplica sanitização antes de renderizar:

- Remove emojis Unicode que quebram o parser
- Corrige semicolons em nomes de nós
- Substitui HTML entities (`&amp;`, `&lt;`, etc.)
- Remove backticks extras
- Normaliza aspas
- Limpa whitespace excessivo

Se a renderização falhar, um fallback visual é mostrado com o código-fonte em bloco de código.

---

## Limites por Plano

| Capability | Free | Pro | Enterprise |
|-----------|------|-----|-----------|
| **Imagens/dia** | 2 | 20 | Ilimitado |
| **Vídeos/dia** | 0 | 5 | 20 |
| **Diagramas/dia** | 5 | Ilimitado | Ilimitado |
| **Custo máximo/dia** | $0.10 | $5.00 | $50.00 |

O sistema de limites é gerenciado por `capabilityLimits.ts`:

- `checkCapabilityAccess()` — verifica se o plano permite a capability
- `checkCostSafety()` — verifica se o custo diário não foi excedido
- `recordUsage()` — registra uso após geração bem-sucedida

---

## Monitoramento (Admin)

O painel admin (`/admin/assets`) mostra:

- **Stats cards:** Total de assets, por tipo, tamanho total em storage
- **Grid de assets:** Preview inline (imagem/SVG), filtros por tipo/status
- **Capabilities overview:** Score por provider, taxa de sucesso, latência média

O painel admin (`/admin/capabilities`) mostra:

- **Capability matrix:** Quais capabilities estão ativas e com qual provider
- **Performance table:** Sucesso/falha/latência por provider nos últimos 7 dias
- **Learning metrics:** Como os scores evoluem com base em resultados

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| Imagem "quebrada" no chat | URL temporária expirou (S3 não configurado) | Configurar S3 storage |
| Diagrama não renderiza | Código Mermaid com sintaxe inválida | Verificar sanitização, testar em mermaid.live |
| Vídeo fica em "processing" | Provider externo lento ou job perdido | Verificar `generation_jobs`, resubmeter |
| "Capability not available" | Plano não permite ou provider não configurado | Verificar `capabilityLimits` e `.env` |
| Custo diário excedido | Muitas gerações no dia | Aguardar reset (meia-noite UTC) ou ajustar limite |

---

## Scripts de Diagnóstico

```bash
# Verificar pipeline de assets (S3, providers, URLs)
bash scripts/check-assets-pipeline.sh --env .env

# Verificar pipeline de diagramas (Kroki, sanitização)
bash scripts/check-diagram-pipeline.sh

# Verificar pipeline de vídeo (providers, jobs)
bash scripts/check-video-pipeline.sh --env .env

# Orquestrador completo (todos os providers)
bash scripts/check-multimodal-orchestrator.sh
```
