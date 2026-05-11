# Relatório Parcial de Auditoria — debuga.ai

**Data:** 11 de Maio de 2026  
**Status:** PARCIAL (interrompido a pedido do cliente)  
**Escopo analisado:** ~80% do código-fonte, docs, testes, build, schema

---

## 1. Arquivos Analisados

| Categoria | Arquivos |
|---|---|
| **Documentação** | `README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_AUDIT.md`, `docs/WHITEPAPER_PT-BR.md`, `docs/data-model.mmd` |
| **Backend** | `server/streamRoute.ts`, `server/agentTools.ts`, `server/stripeRoutes.ts`, `server/products.ts`, `server/db.ts`, `server/_core/llm.ts`, `server/_core/env.ts`, `server/integrations/index.ts` |
| **Frontend** | `client/src/pages/ChatPage.tsx`, `client/src/pages/Home.tsx`, `client/src/pages/PricingPage.tsx`, `client/src/pages/AccountPage.tsx`, `client/src/App.tsx` |
| **Schema** | `drizzle/schema.ts` |
| **Config** | `package.json`, `.gitignore` |
| **Testes** | 14 arquivos de teste (247 testes passando) |

---

## 2. Problemas Concretos Encontrados

### 2.1 CRÍTICO — Documentação contém afirmações falsas sobre funcionalidades inexistentes

| Afirmação na documentação | Realidade no código | Arquivo |
|---|---|---|
| "Modelo proprietário Qwen2.5-72B-Infra fine-tuned" | Usa apenas `gemini-2.5-flash` via Manus Forge API. Não há nenhum modelo proprietário, nenhum routing, nenhum on-premise. | `server/_core/llm.ts`, `server/streamRoute.ts` |
| "16x NVIDIA RTX 3090 em 3 servidores dedicados" | Não existe nenhuma referência a GPU, vLLM, TGI ou inferência local no código | `docs/ARCHITECTURE.md` §2.2 |
| "Análise TCP/IP profunda (L3-L7), DPI, BGP, OSPF" | Não existe ferramenta `tcp_analysis`. Não há captura de pacotes, DPI, ou análise de tráfego. | `docs/WHITEPAPER_PT-BR.md` §2.3 |
| "Hybrid LLM Inference Layer com routing inteligente" | Uma única chamada direta para `gemini-2.5-flash`. Zero lógica de routing. | `docs/ARCHITECTURE.md` §2 |
| "Integração com Zabbix, Wazuh, Prometheus, Grafana" | O arquivo `server/integrations/index.ts` existe mas **nunca é chamado** em nenhum fluxo real (streaming, tools, routers). Código morto. | `server/integrations/index.ts` |
| "Acesso LLM Proprietária: Básico/Completo/Prioridade" por plano | Todos os planos usam o mesmo modelo `gemini-2.5-flash`. Não há diferenciação. | `server/streamRoute.ts` |

### 2.2 ALTO — README desatualizado e com instruções quebradas

| Problema | Detalhe |
|---|---|
| `cp .env.example .env` | O arquivo `.env.example` **não existe** no projeto. O comando falha. |
| "60 testes automatizados" | Na realidade são **247 testes** em 14 arquivos. |
| Tabela de testes lista apenas 5 suítes | Existem 14 suítes de teste. |
| Referência a `server/tools.ts` na estrutura | O arquivo existe mas a lógica principal está em `server/agentTools.ts`. |

### 2.3 ALTO — PricingPage faz afirmações não suportadas pelo código

| Afirmação na UI | Realidade |
|---|---|
| "Cartão, PIX e Boleto" | O Stripe checkout está configurado apenas com `payment_method_types: ["card"]`. PIX e Boleto não estão habilitados. |
| "Ferramentas de rede (DNS, SSL, HTTP)" bloqueadas no Free | Os cards da home enviam prompts que usam essas ferramentas para Free. A tabela de comparação contradiz o comportamento real. |
| "Integrações customizadas" no Enterprise | Não há nenhuma integração funcional. O código de integrações é morto. |

### 2.4 MÉDIO — Divergências no schema e data model

| Problema | Detalhe |
|---|---|
| `docs/data-model.mmd` não inclui `usage_events` | A tabela `usage_events` existe no schema real mas está ausente do diagrama ER. |
| ARCHITECTURE.md diz "soft-delete semantics" para conversas | O código faz **hard delete** (`db.delete(conversations)` + `db.delete(messages)`). Não há coluna `isDeleted`. |
| ARCHITECTURE.md menciona Redis para session cache | Não há Redis no projeto. Sessões são JWT stateless. |

### 2.5 MÉDIO — Código morto e arquivos órfãos

| Arquivo | Problema |
|---|---|
| `server/integrations/index.ts` | Nunca importado/chamado em nenhum fluxo real. |
| `client/src/pages/ComponentShowcase.tsx` | Página de showcase de componentes. Não está roteada em `App.tsx`. |
| `migrate-pin.mjs` | Script de migração one-off que pode ser removido. |
| `patches/wouter@3.*` | Patch de dependência — verificar se ainda necessário. |

### 2.6 BAIXO — Segurança do execute_code

| Problema | Detalhe |
|---|---|
| Sem sandbox real | `execute_code` usa `child_process.spawn` direto no mesmo processo/servidor. Não há Docker, chroot, seccomp ou isolamento de rede. O SECURITY_AUDIT.md reconhece isso mas minimiza dizendo "o ambiente de deploy já é sandboxed por padrão". |
| Acesso a `process.env` | O código define `env: { ...process.env }` no spawn, expondo todas as variáveis de ambiente (incluindo secrets) para scripts executados pelo usuário. |

---

## 3. Divergências Confirmadas: Docs vs Código

| # | Documento | Afirmação | Código Real | Severidade |
|---|---|---|---|---|
| 1 | WHITEPAPER §2.1 | "Modelo de linguagem proprietário (Qwen2.5-72B-Infra, fine-tuned)" | `model: "gemini-2.5-flash"` hardcoded | **CRÍTICO** |
| 2 | ARCHITECTURE §2.2 | "On-Premise Path: 16x RTX 3090, vLLM/TGI" | Nenhum código de routing ou on-premise | **CRÍTICO** |
| 3 | WHITEPAPER §2.3 | "Análise TCP/IP profunda L3-L7" | Nenhuma ferramenta tcp_analysis existe | **CRÍTICO** |
| 4 | ARCHITECTURE §2.3 | "Routing Logic: query complexity, domain specificity, latency" | Zero lógica de routing | **CRÍTICO** |
| 5 | Home.tsx | "Integração com Zabbix, Wazuh, Prometheus e Grafana" | Código morto, nunca chamado | **ALTO** |
| 6 | README | `cp .env.example .env` | Arquivo não existe | **ALTO** |
| 7 | README | "60 testes automatizados" | 247 testes | **MÉDIO** |
| 8 | ARCHITECTURE §5 | "soft-delete semantics" | Hard delete real | **MÉDIO** |
| 9 | ARCHITECTURE §8 | "redis (session cache)" | Sem Redis, JWT stateless | **MÉDIO** |
| 10 | PricingPage | "PIX e Boleto" | Apenas `card` no checkout | **ALTO** |
| 11 | data-model.mmd | 6 tabelas | 7 tabelas reais (falta usage_events) | **BAIXO** |
| 12 | WHITEPAPER §3 | "Acesso LLM Proprietária" diferenciado por plano | Mesmo modelo para todos | **CRÍTICO** |

---

## 4. O Que Ainda Falta Analisar

- **Fluxo completo de upgrade/downgrade em produção** (testar com conta real)
- **Webhook Stripe em produção** (verificar se eventos reais são processados corretamente)
- **Comportamento do rate limiter sob carga** (apenas in-memory, perde estado em restart)
- **Cobertura de testes** (quais fluxos críticos não têm teste)
- **Bundle size e performance** (build gerou ~500KB, verificar se há otimizações)
- **Acessibilidade e responsividade** (não testado em mobile)
- **SEO e meta tags** (não verificado)
- **Logs de produção** (verificar se há logging adequado para debugging)
- **WHITEPAPER_EN.md** (verificar se tem as mesmas divergências que o PT-BR)

---

## 5. Próximos Passos Recomendados (por prioridade de risco)

### Prioridade 1 — URGENTE (risco legal/reputacional)

1. **Reescrever WHITEPAPER**: Remover todas as referências a modelo proprietário, GPU cluster, análise TCP/IP, DPI. Substituir por descrição honesta: "Agente autônomo powered by Gemini 2.5 Flash via Manus Forge API com 8 ferramentas de diagnóstico de rede."

2. **Reescrever ARCHITECTURE.md §2**: Remover "Hybrid LLM Inference Layer", "On-Premise Path", "Routing Logic". Descrever a arquitetura real: single-model via API gateway.

3. **Remover seção "Integrações" da Home.tsx**: Ou marcar claramente como "Em breve" / "Roadmap". Atualmente implica que o produto se conecta a Zabbix/Wazuh/Prometheus, o que é falso.

4. **Corrigir PricingPage**: Remover "PIX e Boleto" (ou habilitar no Stripe). Remover "Integrações customizadas" do Enterprise (ou marcar como "sob projeto").

### Prioridade 2 — ALTO (funcionalidade/confiança)

5. **Criar `.env.example`** com todas as variáveis necessárias documentadas.

6. **Atualizar README**: Corrigir contagem de testes (247), atualizar tabela de suítes, remover referência a `.env.example` até que exista.

7. **Corrigir vazamento de env no execute_code**: Remover `...process.env` do spawn e passar apenas variáveis seguras (PATH, HOME, LANG).

8. **Remover código morto**: `server/integrations/index.ts` (ou implementar de fato), `ComponentShowcase.tsx`, `migrate-pin.mjs`.

### Prioridade 3 — MÉDIO (consistência)

9. **Atualizar data-model.mmd**: Adicionar tabela `usage_events`.

10. **Corrigir ARCHITECTURE.md**: "soft-delete" → "hard delete", remover Redis da arquitetura de deploy.

11. **Atualizar WHITEPAPER roadmap**: "60 testes" → "247 testes". Mover itens não implementados para fases futuras corretas.

12. **Decidir sobre Enterprise**: Se não há checkout automático nem integrações reais, considerar remover da PricingPage ou marcar como "Contato comercial".

---

## 6. Resumo Executivo

O **código funcional** do debuga.ai está sólido: autenticação, streaming, ferramentas, billing, testes. O produto real funciona bem como um agente de chat com 8 ferramentas de diagnóstico de rede.

O **problema grave** está na documentação e marketing: WHITEPAPER, ARCHITECTURE.md e landing page fazem afirmações sobre funcionalidades que **não existem no código** (modelo proprietário, GPU cluster, análise TCP/IP, integrações com Zabbix/Wazuh). Isso configura risco reputacional e potencialmente legal se apresentado a investidores ou clientes como capacidade real.

**Recomendação:** Priorizar a correção da documentação antes de qualquer feature nova. O produto real é bom — a documentação é que precisa refletir a realidade.

---

*Relatório parcial — Auditoria interrompida a pedido do cliente*
