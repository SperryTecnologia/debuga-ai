# Providers de IA — debuga.ai

**Visão geral dos providers de inferência suportados pela plataforma.**

---

## Arquitetura de Providers

A debuga.ai suporta múltiplos providers de inferência, organizados em camadas de prioridade. O roteamento é automático e transparente para o usuário final.

---

## Providers Suportados

| Provider | Tipo | Modelos | Caso de uso |
|----------|------|---------|-------------|
| Ollama | Local (GPU) | Qwen 2.5, DeepSeek, Llama | Uso geral, custo zero |
| OpenAI | Cloud | GPT-4o, GPT-4o-mini | Raciocínio complexo, fallback primário |
| Anthropic | Cloud | Claude 3.5 Sonnet, Claude 3 Haiku | Análise longa, documentação |
| Google Gemini | Cloud | Gemini 2.5 Flash, Gemini Pro | Custo-benefício, multimodal |
| OpenRouter | Cloud | Múltiplos | Acesso a modelos adicionais |

---

## Roteamento

O sistema decide automaticamente qual provider utilizar com base em:

| Critério | Descrição |
|----------|-----------|
| Disponibilidade | GPU local disponível e saudável? |
| Complexidade | Consulta simples ou raciocínio complexo? |
| Tipo | Código, texto, imagem, análise? |
| Custo | Dentro dos limites configurados? |
| Latência | Tempo de resposta aceitável? |

---

## Configuração pelo Operador

O operador controla:
- Quais providers estão habilitados
- Ordem de prioridade
- Limites de custo por provider
- Modelos específicos por tipo de consulta
- Fallback automático ou manual

---

## Controle de Custos

| Mecanismo | Descrição |
|-----------|-----------|
| Limite diário | Bloqueio ao atingir USD/dia |
| Limite mensal | Bloqueio ao atingir USD/mês |
| Alerta de threshold | Notificação ao atingir % do limite |
| Prioridade local | GPU local sempre preferida (custo zero) |
| Relatório | Consumo por provider, por usuário, por período |

---

*Sperry Tecnologia*
