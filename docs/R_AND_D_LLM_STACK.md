# Pesquisa e Evolução LLM

Este documento descreve os repositórios de pesquisa, laboratório e componentes experimentais relacionados ao ecossistema debuga.ai. Esses repositórios são iniciativas de pesquisa e desenvolvimento e **não são dependências obrigatórias** do debuga.ai em produção.

---

## Repositórios de Pesquisa

| Repositório | Função | Status |
|-------------|--------|--------|
| `debuga-llm-stack` | Documentação técnica e pesquisa de arquitetura LLM | Laboratório / Opcional |
| `debuga-qwen-coder-lab` | Avaliação de modelos Qwen-Coder para DevOps, infraestrutura e segurança | Laboratório / Opcional |
| `debuga-vllm-engine` | Estudo de serving de modelos com vLLM | Opcional / Futuro |
| `debuga-llm-gateway` | Estudo de gateway OpenAI-compatible | Opcional / Futuro |

---

## Documentação Estratégica

| Documento | Função | Status |
|-----------|--------|--------|
| Whitepaper PT-BR | Material estratégico e comercial em português | Documentação |
| Whitepaper EN | Material estratégico e comercial em inglês | Documentação |
| Arquitetura PT-BR | Visão arquitetural detalhada em português | Documentação |
| Arquitetura EN | Visão arquitetural detalhada em inglês | Documentação |

---

## Relação com o Produto

O **debuga.ai** em produção funciona de forma autônoma, sem depender de nenhum desses repositórios. A inferência local é feita via Ollama com modelos padrão (ex: `qwen2.5:7b-instruct`), e o fallback cloud usa providers comerciais (OpenAI, Anthropic, Gemini, OpenRouter).

Os repositórios de pesquisa servem para:

- Avaliar novos modelos antes de adotá-los em produção
- Documentar benchmarks e comparações de performance
- Explorar arquiteturas alternativas de serving (vLLM, TGI)
- Estudar gateways compatíveis com a API OpenAI
- Manter registro técnico de decisões arquiteturais

---

## debuga-llm-stack

Repositório de documentação técnica que registra a arquitetura de inferência LLM, incluindo:

- Comparação de modelos por caso de uso (código, infraestrutura, segurança)
- Métricas de latência e throughput por modelo/hardware
- Configurações de quantização (GGUF, AWQ, GPTQ)
- Estratégias de routing entre modelos

---

## debuga-qwen-coder-lab

Laboratório dedicado à avaliação da família Qwen-Coder para tarefas de:

- Geração de código para automação de infraestrutura
- Análise de logs e troubleshooting
- Scripts de segurança e compliance
- Integração com ferramentas DevOps

Inclui benchmarks com GPU NVIDIA RTX 3090, configurações Hyper-V DDA, e comparações com modelos alternativos.

---

## debuga-vllm-engine

Estudo de serving de modelos com vLLM para cenários de alta concorrência:

- Continuous batching
- PagedAttention
- Tensor parallelism
- Compatibilidade com API OpenAI

Status: experimental. Pode ser adotado em versões futuras para cenários enterprise com múltiplos usuários simultâneos.

---

## debuga-llm-gateway

Estudo de gateway unificado compatível com a API OpenAI:

- Roteamento inteligente entre modelos
- Rate limiting por usuário/plano
- Caching de respostas
- Observabilidade (latência, tokens, custos)

Status: experimental. O debuga.ai já implementa roteamento interno via `streamRoute.ts`, mas um gateway dedicado pode ser necessário em cenários multi-tenant enterprise.

---

## Quando Usar

| Cenário | Recomendação |
|---------|-------------|
| Deploy padrão | Não necessário. Use Ollama + providers cloud. |
| Avaliação de novos modelos | Consulte `debuga-qwen-coder-lab` |
| Alta concorrência (50+ usuários) | Considere `debuga-vllm-engine` |
| Multi-tenant enterprise | Considere `debuga-llm-gateway` |
| Documentação de decisões | Consulte `debuga-llm-stack` |
