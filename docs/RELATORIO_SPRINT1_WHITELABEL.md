# Relatório Sprint 1 — Consolidação White-Label P0

**Data:** 2026-06-11  
**Status:** Concluída  
**Checkpoint:** `558ea8bd`

---

## Resumo Executivo

A Sprint 1 implementou a infraestrutura base para white-label dinâmico no debuga.ai. Todas as páginas críticas (Home, Chat, Pricing, Logout, WhatsApp) agora consomem valores de branding do banco de dados via um endpoint público e um React Context. A duplicação de prompt entre `routers.ts` e `streamRoute.ts` foi eliminada.

---

## Entregas Realizadas

| # | Entrega | Arquivo(s) |
|---|---------|-----------|
| 1 | Endpoint público `GET /api/branding` | `server/branding.ts` |
| 2 | Cache em memória (60s) com invalidação no admin | `server/branding.ts` |
| 3 | Invalidação automática ao salvar settings | `server/adminRouters.ts` |
| 4 | Registro da rota no Express | `server/_core/index.ts` |
| 5 | `BrandingProvider` + hook `useBranding()` | `client/src/contexts/BrandingContext.tsx` |
| 6 | Helper `getWhatsAppUrl()` exportado | `client/src/contexts/BrandingContext.tsx` |
| 7 | Provider integrado no `main.tsx` | `client/src/main.tsx` |
| 8 | Home.tsx refatorado | `client/src/pages/Home.tsx` |
| 9 | ChatPage.tsx refatorado | `client/src/pages/ChatPage.tsx` |
| 10 | PricingPage.tsx refatorado | `client/src/pages/PricingPage.tsx` |
| 11 | LogoutSuccess.tsx refatorado | `client/src/pages/LogoutSuccess.tsx` |
| 12 | WhatsAppButton.tsx refatorado | `client/src/components/WhatsAppButton.tsx` |
| 13 | SYSTEM_PROMPT estático removido de `routers.ts` | `server/routers.ts` |
| 14 | `buildSystemPrompt()` reutilizado no path tRPC | `server/routers.ts` |
| 15 | Export `getInternalUrl` adicionado | `server/storage.ts` |

---

## Hardcodes Removidos (Páginas Críticas)

| Página | Antes | Depois | Removidos |
|--------|-------|--------|-----------|
| Home.tsx | 18 refs | 1 ref (URL sperrytecnologia.com.br — intencional) | **17** |
| ChatPage.tsx | 8 refs | 2 refs (comentário + URL demo — internos) | **6** |
| PricingPage.tsx | 4 refs | 0 | **4** |
| LogoutSuccess.tsx | 3 refs | 0 | **3** |
| WhatsAppButton.tsx | 2 refs | 0 | **2** |
| **Total páginas críticas** | **35** | **3** | **32** |

---

## Hardcodes Restantes (Não-Críticos)

Estes são hardcodes que **não foram alterados** nesta sprint por estarem fora do escopo ou serem intencionais:

| Categoria | Qtd | Justificativa |
|-----------|-----|---------------|
| `server/agentIdentity.ts` (prompts de identidade) | 14 | Será resolvido na Sprint 2 (Agent Config dinâmico) |
| `server/emailTemplates.ts` (templates de email) | 8 | Requer refatoração de templates — Sprint 2 |
| `server/emailVerification.ts` (fallbacks) | 6 | Já usa `settings?.appName \|\| "debuga.ai"` — funcional |
| `server/branding.ts` (defaults) | 3 | Fallbacks intencionais quando DB indisponível |
| `server/agentTools.ts` (User-Agent) | 2 | Identificação técnica, não visível ao usuário |
| `server/stripeRoutes.ts` (nome no checkout) | 1 | Requer leitura dinâmica — Sprint 2 |
| `client/src/pages/docs/*` (documentação) | 46 | Páginas de docs internas — baixa prioridade |
| `client/src/components/Mermaid*` (tema) | 14 | Comentários CSS internos |
| Comentários `// debuga.ai` em headers | 25 | Apenas comentários de código |
| **Total restante** | **~119** | — |

---

## Correção de Prompt

### Antes
```
routers.ts: SYSTEM_PROMPT = "Você é o debuga.ai..." (hardcoded, 26 linhas)
streamRoute.ts: buildSystemPrompt(TECHNICAL_CAPABILITIES) (dinâmico, 260+ linhas)
```

**Problema:** Dois caminhos divergentes — o path tRPC usava um prompt estático simplificado que ignorava toda a configuração dinâmica (identidade, tom, segurança, suporte humano, document studio).

### Depois
```
routers.ts: SYSTEM_PROMPT = buildSystemPrompt(TECHNICAL_CAPABILITIES_TRPC)
streamRoute.ts: BASE_SYSTEM_PROMPT = buildSystemPrompt(TECHNICAL_CAPABILITIES)
```

**Resultado:** Ambos os paths agora usam o mesmo pipeline de `agentIdentity.ts`, garantindo consistência de identidade, tom e regras comportamentais.

---

## Arquitetura do Branding

```
┌─────────────────────────────────────────────────────────┐
│  Admin Panel (/admin/white-label)                       │
│  saveSettings() → DB app_settings                       │
│  → invalidateBrandingCache()                            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  GET /api/branding                                      │
│  Cache: 60s in-memory                                   │
│  Fallback: defaults hardcoded (se DB falhar)            │
│  Headers: Cache-Control: public, max-age=60             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  BrandingProvider (React Context)                       │
│  Fetch on mount → provides to all children              │
│  Hook: useBranding()                                    │
│  Helper: getWhatsAppUrl(number, message)                │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Home.tsx    ChatPage.tsx  PricingPage.tsx
       (dinâmico)  (dinâmico)   (dinâmico)
```

---

## Campos Disponíveis via `/api/branding`

| Campo | Origem DB | Fallback |
|-------|-----------|----------|
| `appName` | `app_settings.appName` | `"debuga.ai"` |
| `agentName` | `app_settings.agentName` | `"debuga.ai"` |
| `companyName` | `app_settings.legalCompanyName` | `"Sperry Tecnologia"` |
| `domain` | — | `"Infraestrutura de TI..."` |
| `description` | `app_settings.landingSubtitle` | `"Agente Autônomo de IA..."` |
| `primaryColor` | `app_settings.primaryColor` | `"#22c55e"` |
| `logoUrl` | `app_settings.logoUrl` | `""` |
| `faviconUrl` | `app_settings.faviconUrl` | `""` |
| `supportEmail` | `app_settings.supportEmail` | `""` |
| `supportWhatsapp` | `app_settings.supportWhatsapp` | `""` |
| `welcomeMessage` | `app_settings.welcomeMessage` | `""` |
| `footerText` | `institutionalLinks.footerText` | `""` |
| `termsUrl` | `app_settings.termsUrl` | `"/termos"` |
| `privacyUrl` | `app_settings.privacyUrl` | `"/privacidade"` |
| `githubUrl` | `institutionalLinks.githubUrl` | `""` |

---

## O que NÃO foi alterado

- Stripe / Billing / Checkout
- Auth / OAuth / Login
- Uploads / Storage (exceto export fix)
- Áudio / Transcrição
- Imagens / Diagramas
- StreamRoute principal (pipeline de streaming)
- Ferramentas do agente
- Base de conhecimento
- Usage events / Rate limiting

---

## Próximos Passos (Sprint 2)

1. **Agent Config dinâmico** — Tornar `agentIdentity.ts` configurável via admin (nome, empresa, domínio no prompt)
2. **Email templates dinâmicos** — Usar branding do DB nos templates de email
3. **Feature flags no DB** — Mover flags de env para tabela configurável
4. **Prompt Preview** — Endpoint para visualizar o prompt final montado
5. **CSS dinâmico** — Injetar `primaryColor` como variável CSS no frontend

---

## Verificação TypeScript

```
$ npx tsc --noEmit
(sem erros)
```

Os erros de TS reportados pelo LSP são stale (cache do watcher anterior) e não se reproduzem em execução limpa.

---

## Conclusão

A Sprint 1 estabeleceu a **infraestrutura completa** para white-label dinâmico. Uma instalação nova do debuga.ai agora pode trocar nome, logo, empresa, WhatsApp e links apenas configurando o painel `/admin/white-label` — sem alterar código. O prompt da IA também é unificado e consistente entre os dois paths de chat (streaming e tRPC).
