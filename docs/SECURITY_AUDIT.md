# Auditoria de Segurança — debuga.ai

**Data:** Maio 2026  
**Escopo:** Revisão completa do código-fonte para produção

---

## Resultado: APROVADO para repositório público

### Secrets e API Keys

Nenhuma chave, token ou credencial hardcoded foi encontrada no código-fonte. Todas as variáveis sensíveis são carregadas via `process.env` em tempo de execução:

| Variável | Arquivo | Seguro |
|---|---|---|
| `STRIPE_SECRET_KEY` | `server/stripeRoutes.ts` | Sim — via `process.env`, nunca exposta ao frontend |
| `STRIPE_WEBHOOK_SECRET` | `server/stripeRoutes.ts` | Sim — via `process.env`, usado apenas no webhook |
| `JWT_SECRET` | `server/_core/env.ts` | Sim — via `process.env`, server-side only |
| `BUILT_IN_FORGE_API_KEY` | `server/_core/env.ts` | Sim — via `process.env`, server-side only |
| `DATABASE_URL` | `server/db.ts` | Sim — via `process.env`, server-side only |

### Separação Frontend/Backend

O frontend (pasta `client/`) acessa apenas variáveis prefixadas com `VITE_`:

| Variável Frontend | Risco | Avaliação |
|---|---|---|
| `VITE_FRONTEND_FORGE_API_KEY` | Baixo — token público para proxy de mapas | Aceitável |
| `VITE_OAUTH_PORTAL_URL` | Nenhum — URL pública do portal OAuth | Seguro |
| `VITE_APP_ID` | Nenhum — identificador público da aplicação | Seguro |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Nenhum — chave pública do Stripe (design para ser pública) | Seguro |

Nenhuma variável sensível (STRIPE_SECRET_KEY, JWT_SECRET, DATABASE_URL, BUILT_IN_FORGE_API_KEY) é acessível pelo frontend.

### .gitignore

O `.gitignore` está configurado corretamente, excluindo:
- `.env`, `.env.local`, `.env.*.local` (variáveis de ambiente)
- `node_modules/` (dependências)
- `dist/`, `build/` (artefatos de build)

### Autenticação e Autorização

- Todas as rotas sensíveis usam `protectedProcedure` (requer sessão JWT válida)
- Queries de dados filtram por `userId` do contexto autenticado (sem IDOR)
- Webhook do Stripe verifica assinatura criptográfica antes de processar
- Rate limiting implementado (20 msgs/min por usuário)

### Execução de Código (agentTools.ts)

A ferramenta `execute_code` roda em `/tmp` com timeout de 30s e output limitado a 50KB. Em produção no Manus hosting, isso é aceitável pois o ambiente já é sandboxed. Para hosting próprio, recomenda-se Docker sandbox.

### Recomendação Final

O código está **seguro para repositório público**. Nenhum dado sensível, credencial ou informação proprietária está hardcoded. Toda a configuração sensível é injetada via variáveis de ambiente em runtime.

---

*Auditoria realizada por Sperry Tecnologia — Maio 2026*
