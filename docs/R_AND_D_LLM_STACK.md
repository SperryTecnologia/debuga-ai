# Pesquisa e Desenvolvimento — Stack LLM

**Decisões técnicas e estratégia de inferência da debuga.ai.**

---

## Contexto

A debuga.ai utiliza uma arquitetura de inferência híbrida que combina modelos locais (GPU) com providers cloud. Este documento registra as decisões técnicas, comparações e estratégias adotadas.

---

## Estratégia de Inferência

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Primária | Ollama + GPU NVIDIA | Inferência local, baixa latência, custo zero |
| Fallback | OpenAI, Anthropic, Gemini | Alta qualidade quando GPU indisponível |
| Roteamento | Interno ao backend | Decisão automática baseada em contexto |

---

## Modelos Avaliados

| Modelo | Parâmetros | Caso de uso | Status |
|--------|-----------|-------------|--------|
| Qwen 2.5 7B Instruct | 7B | Uso geral | Produção |
| Qwen 2.5 Coder 7B | 7B | Geração de código | Produção |
| Qwen 2.5 14B Instruct | 14B | Raciocínio complexo | Avaliação |
| DeepSeek Coder V2 Lite | 16B | Código e automação | Avaliação |

---

## Critérios de Seleção

- Qualidade para domínio técnico (infraestrutura, segurança, DevOps)
- Capacidade de tool calling
- Performance em hardware disponível (RTX 3090, 24 GB VRAM)
- Latência aceitável para uso interativo
- Licença compatível com uso comercial

---

## Repositórios Relacionados

| Repositório | Foco |
|-------------|------|
| [debuga-llm-stack](https://github.com/SperryTecnologia/debuga-llm-stack) | Arquitetura completa da stack LLM |
| [debuga-qwen-coder-lab](https://github.com/SperryTecnologia/debuga-qwen-coder-lab) | Avaliação de Qwen-Coder |
| [debuga-vllm-engine](https://github.com/SperryTecnologia/debuga-vllm-engine) | Estudos com vLLM |
| [debuga-llm-gateway](https://github.com/SperryTecnologia/debuga-llm-gateway) | Gateway experimental |

---

*Sperry Tecnologia*
