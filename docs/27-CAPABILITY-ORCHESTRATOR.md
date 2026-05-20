# 27 — Orquestrador de Capacidades

## Visão Geral

O **Orquestrador de Capacidades** é o sistema central que transforma o debuga.ai de um simples wrapper de LLM em uma plataforma multimodal inteligente. Ele analisa cada mensagem do usuário, classifica a intenção, roteia para o provider ideal, e aplica limites de uso por plano.

## Arquitetura

```
Mensagem do Usuário
        │
        ▼
┌─────────────────────┐
│  Intent Classifier   │  ← Classifica em 13 tipos de tarefa
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Capability Router   │  ← Seleciona provider + modelo ideal
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Capability Limits   │  ← Verifica plano/quota/custo
└─────────┬───────────┘
          │
          ├──── chat_text ──────────► LLM Provider (streaming)
          ├──── image_generation ──► Image Provider (DALL-E/Gemini/Replicate)
          ├──── video_generation ──► Video Provider (Veo/Replicate/Runway)
          ├──── *_diagram ─────────► Diagram Provider (Mermaid/draw.io)
          └──── outros ────────────► LLM Provider (com prompt enhancement)
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │ Learning Memory│  ← Salva interação (fire-and-forget)
                                    └───────────────┘
```

## Módulos

### 1. Intent Classifier (`server/intentClassifier.ts`)

Classifica mensagens em 13 tipos de tarefa usando análise de padrões (regex + heurísticas):

| Task Type | Descrição | Exemplo |
|-----------|-----------|---------|
| `chat_text` | Conversa geral | "Olá, como vai?" |
| `infrastructure_support` | Suporte de infra/DevOps | "Como configurar nginx?" |
| `code_generation` | Geração de código | "Escreva um script Python" |
| `image_generation` | Gerar imagem | "Crie uma imagem de..." |
| `image_editing` | Editar imagem | "Remova o fundo desta imagem" |
| `video_generation` | Gerar vídeo | "Crie um vídeo explicativo" |
| `network_diagram` | Diagrama de rede | "Diagrama da topologia de rede" |
| `architecture_diagram` | Diagrama de arquitetura | "Arquitetura do sistema" |
| `flowchart_diagram` | Fluxograma | "Fluxograma do processo" |
| `document_analysis` | Análise de documentos | "Analise este PDF" |
| `image_analysis` | Análise de imagens | "O que tem nesta imagem?" |
| `audio_transcription` | Transcrição de áudio | "Transcreva este áudio" |
| `web_research` | Pesquisa web | "Pesquise sobre..." |

### 2. Capability Router (`server/capabilityRouter.ts`)

Seleciona o provider ideal baseado em:
- Tipo de tarefa classificada
- Providers configurados no .env
- Score de capacidade (0-100)
- Fallback automático se provider primário falhar

**Provider Matrix** (configurável via .env):

| Provider | Variáveis de Ambiente | Tarefas Ideais |
|----------|----------------------|----------------|
| `local_gpu` | `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL` | chat, code, infra |
| `gemini` | `GEMINI_API_KEY` | chat, code, vision |
| `openai` | `OPENAI_API_KEY` | code, image, vision |
| `anthropic` | `ANTHROPIC_API_KEY` | code, reasoning |
| `openrouter` | `OPENROUTER_API_KEY` | fallback universal |
| `replicate` | `REPLICATE_API_TOKEN` | image, video |
| `cloud` | `LLM_CLOUD_API_URL/KEY` | default fallback |

### 3. Image Provider (`server/imageProvider.ts`)

Gera imagens usando DALL-E 3, Gemini Imagen, ou Replicate (Flux/SDXL).

**Configuração:**
```
IMAGE_GENERATION_ENABLED=true
IMAGE_GENERATION_PROVIDER=openai|gemini|replicate
IMAGE_GENERATION_MODEL=dall-e-3|imagen-3|flux-1.1-pro
OPENAI_API_KEY=sk-...
```

### 4. Video Provider (`server/videoProvider.ts`)

Gera vídeos de forma assíncrona com polling de status.

**Configuração:**
```
VIDEO_GENERATION_ENABLED=true
VIDEO_GENERATION_PROVIDER=replicate|runway|veo
VIDEO_GENERATION_MODEL=minimax/video-01|runway-gen3
REPLICATE_API_TOKEN=r8_...
```

### 5. Diagram Provider (`server/diagramProvider.ts`)

Gera diagramas profissionais usando Mermaid.js (renderização no frontend) ou draw.io XML.

Tipos suportados:
- Diagramas de rede (topologia, firewall, VPN)
- Diagramas de arquitetura (microserviços, cloud)
- Fluxogramas (processos, decisões)
- Diagramas de sequência
- Diagramas ER

### 6. Capability Limits (`server/capabilityLimits.ts`)

Controla acesso por plano:

| Plano | Mensagens/dia | Imagens/dia | Vídeos/dia | Diagramas/dia | Custo/dia |
|-------|--------------|-------------|------------|---------------|-----------|
| Free | 20 | 0 | 0 | 5 | $0.50 |
| Starter | 100 | 10 | 0 | 30 | $3.00 |
| Professional | 500 | 50 | 5 | 100 | $10.00 |
| Enterprise | 5000 | 500 | 50 | 1000 | Custom |

### 7. Learning Memory (`server/learningMemory.ts`)

Salva interações para:
- Análise de padrões de uso
- Sugestões automáticas de KB
- Tracking de performance por provider
- Acumulação de custo por usuário

## Feature Flags

Todas as capacidades são controladas por variáveis de ambiente:

```
ENABLE_CAPABILITY_ROUTING=true    # Ativa classificação + roteamento
ENABLE_KNOWLEDGE_REUSE=true       # Ativa busca RAG na KB
IMAGE_GENERATION_ENABLED=true     # Ativa geração de imagens
VIDEO_GENERATION_ENABLED=true     # Ativa geração de vídeos
ENABLE_LEARNING=true              # Ativa salvamento de interações
```

Quando **desabilitados**, o sistema usa o caminho legado (prompt dinâmico com todas as instruções).

## Segurança de Custo

O sistema implementa múltiplas camadas de proteção:

1. **Limites por plano** — cada plano tem quotas diárias por tipo de capacidade
2. **Circuit breaker de custo** — para operações se custo diário exceder limite
3. **Rate limiting** — por IP e por usuário
4. **Fallback em cascata** — se provider caro falha, tenta alternativa mais barata
5. **Tracking em tempo real** — acumulador in-memory + persistência no banco

## Diagnóstico

Execute o script de diagnóstico para verificar configuração:

```bash
./scripts/check-capabilities.sh --env /path/to/.env
```

## Admin Panel

Acesse `/admin/capabilities` para ver:
- Status de cada capacidade (ativo/inativo)
- Providers configurados e seus modelos
- Performance em tempo real (latência, success rate)
- Feature flags ativos
- Estatísticas de aprendizado

## Migration SQL

Aplique a migration `0006_multimodal_assets.sql` para criar as tabelas:
- `generated_assets` — metadados de imagens/vídeos/diagramas gerados
- `generation_jobs` — jobs assíncronos (vídeo)
- `capability_usage_logs` — tracking de uso por capacidade

```bash
psql $DATABASE_URL < drizzle/0006_multimodal_assets.sql
```
