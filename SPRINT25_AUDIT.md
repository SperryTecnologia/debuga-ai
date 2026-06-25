# Sprint 25 — Auditoria Completa da Landing Page

**Data:** 25 de Junho de 2026
**Analista:** Head de Produto (perspectiva)
**Objetivo:** Análise crítica de Product Marketing, UX e arquitetura da informação

---

## 1. Hero

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Layout 2-colunas (texto + animação), tipografia bold, animação de partículas elegante |
| **O que está bom** | Badges "Teste gratuito / Sem cartão / Cancele quando quiser", estrutura visual Enterprise |
| **O que está ruim** | Título "TI, Segurança e Infraestrutura" — posicionamento antigo e limitante |
| **O que está desatualizado** | Subtítulo menciona "suporte humano sênior" como diferencial primário (era serviço, agora é produto) |
| **O que deve ser removido** | Texto "IA + Suporte Humano" na animação central; CTA "Começar Agora" apontando para /pricing |
| **O que deve ser criado** | Título focado em "conhecimento operacional"; subtítulo sobre aprendizado contínuo de fontes |
| **Impacto esperado** | Visitante entende em 5s que o debuga.ai aprende com documentos, APIs, bancos e sistemas |

**Proposta para o texto central da animação:** "Operational Knowledge" — comunica que o núcleo do produto é conhecimento operacional, não apenas IA genérica.

---

## 2. Navegação

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Nav fixa com blur, logo + links + CTAs |
| **O que está bom** | Responsividade (hidden md:flex) |
| **O que está ruim** | Link "Planos" aponta para /pricing com preços expostos (viola política) |
| **O que está desatualizado** | "Integrações" como label (são conectores planejados, não integrações ativas) |
| **O que deve ser removido** | Link direto para /pricing na nav |
| **O que deve ser criado** | Links: Recursos, Como Funciona, Casos de Uso, Enterprise |
| **Impacto esperado** | Navegação reflete a jornada do visitante Enterprise |

---

## 3. CTAs

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Dois CTAs no hero (primário + secundário) |
| **O que está ruim** | CTA primário "Começar Agora" → /pricing (expõe preços); CTA "Ver Planos" no final da página |
| **O que deve ser removido** | Todos os links para /pricing |
| **O que deve ser criado** | CTA primário: "Solicitar Demonstração" ou "Começar Gratuitamente" → login; CTA secundário: "Ver Como Funciona" → scroll |
| **Impacto esperado** | Conversão orientada a demonstração (Enterprise) em vez de self-service com preço |

---

## 4. Recursos (Features)

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Grid 3-colunas, cards com ícones, badges "Diferencial" |
| **O que está bom** | Variedade de capacidades técnicas listadas |
| **O que está ruim** | 12 cards é excessivo — dilui a mensagem; foco em "TI/Segurança/Infra" limita o público |
| **O que está desatualizado** | "Roadmap Enterprise" como feature card; "SIEM & Monitoramento" com "em breve" |
| **O que deve ser removido** | Cards de roadmap que não são features reais |
| **O que deve ser criado** | 6-8 cards focados em capacidades reais do agente (aprender, consultar, executar, gerar) |
| **Impacto esperado** | Mensagem mais clara e focada; visitante entende o que o produto FAZ hoje |

---

## 5. Conectores Inteligentes (Integrações)

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Conceito de mostrar integrações futuras |
| **O que está ruim** | Todos marcados "Em breve" — seção inteira é promessa vazia; lista limitada a 6 ferramentas de monitoramento |
| **O que está desatualizado** | Foco exclusivo em Zabbix/Wazuh/Prometheus/Grafana |
| **O que deve ser removido** | Lista atual de 6 ícones genéricos |
| **O que deve ser criado** | Categorias de fontes de dados (APIs REST, Documentos, Bancos SQL, Logs, Monitoramento, Segurança, Sistemas Corporativos) com status claro |
| **Impacto esperado** | Comunica plataforma aberta em vez de lista fechada de integrações |

---

## 6. White Label / Enterprise

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | 6 cards com benefícios, CTA para WhatsApp comercial |
| **O que está bom** | Tom consultivo, sem compromisso |
| **O que está ruim** | Menciona "provedores LLM" e "inferência local experimental" — linguagem técnica interna |
| **O que deve ser removido** | Referências a LLM, S3, GPU, PostgreSQL |
| **O que deve ser criado** | Foco em benefícios de negócio: marca própria, base isolada, domínio, conectores próprios |
| **Impacto esperado** | CIO/Diretor entende a proposta sem conhecer stack técnica |

---

## 7. Pricing

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Estrutura de 4 planos (Free, Starter, Pro, Enterprise) |
| **O que está ruim** | **VIOLAÇÃO P0:** Preços visíveis (R$ 49,90 / R$ 149,90 / R$ 499,90) — política proíbe |
| **O que está desatualizado** | Vende "quantidade" (mensagens/dia) em vez de "capacidade" |
| **O que deve ser removido** | Preços numéricos; link /pricing na nav e CTAs |
| **O que deve ser criado** | Seção na landing com 3 tiers baseados em capacidade (sem preço): Starter (aprende documentos), Pro (conectores + APIs), Enterprise (White Label + dedicado) |
| **Impacto esperado** | Posicionamento Enterprise; conversão via contato comercial |

---

## 8. FAQ

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | N/A — não existe |
| **O que deve ser criado** | FAQ com 6-8 perguntas orientadas ao decisor: "Substitui minha equipe?", "Funciona com ERP?", "Funciona on-premise?", "Como aprende?", "Posso usar minha marca?" |
| **Impacto esperado** | Reduz objeções; aumenta confiança do visitante Enterprise |

---

## 9. Footer

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | 3 colunas (Brand, Links, Docs), copyright |
| **O que está ruim** | Links para /pricing; links de docs com nomes antigos (WHITEPAPER_PTBR.md) |
| **O que está desatualizado** | Descrição "infraestrutura, segurança, DevOps e telecomunicações" |
| **O que deve ser removido** | Link /pricing |
| **O que deve ser criado** | Links atualizados; descrição alinhada com novo posicionamento |
| **Impacto esperado** | Consistência com o resto da página |

---

## 10. Consistência Visual

| Aspecto | Avaliação |
|---------|-----------|
| **O que funciona** | Tema dark, verde primário, font-mono para labels, animações suaves |
| **O que está bom** | Identidade visual coerente e Enterprise |
| **O que NÃO deve ser alterado** | Cores, tipografia, espaçamento, animações, layout geral |
| **Impacto** | Manter 100% da identidade visual; alterar apenas conteúdo e estrutura da informação |

---

## 11. Problemas Críticos Adicionais

| Problema | Severidade | Localização |
|----------|-----------|-------------|
| Doc redirects em App.tsx apontam para repo errado (`debuga-ai` em vez de `debuga-ai-prod`) | P1 | App.tsx linhas 62-64 |
| Footer links usam `githubUrl` + nomes antigos (`WHITEPAPER_PTBR.md`) | P1 | Home.tsx linhas 574-596 |
| BrandingContext description = "Agente Autônomo de IA para Infraestrutura" (antigo) | P2 | BrandingContext.tsx linha 46 |
| BrandingContext domain = "Infraestrutura de TI, Segurança..." (antigo) | P2 | BrandingContext.tsx linha 45 |
| Botão "Começar" na nav vai para /pricing | P1 | Home.tsx linha 188 |

---

## 12. Seções Ausentes (Devem ser Criadas)

| Seção | Posição | Justificativa |
|-------|---------|---------------|
| **Como Funciona** | Logo após o Hero | Fluxo visual 1→2→3 (Conecte → Aprenda → Consulte) |
| **Casos de Uso** | Após Recursos | Mostra aplicações reais em diferentes setores |
| **FAQ** | Antes do Footer | Reduz objeções e aumenta conversão |

---

## 13. Plano de Implementação Proposto

| Ordem | Ação | Impacto |
|-------|------|---------|
| 1 | Reescrever Hero (título, subtítulo, CTAs, texto da animação) | Alto |
| 2 | Criar seção "Como Funciona" | Alto |
| 3 | Criar seção "Casos de Uso" | Médio-Alto |
| 4 | Reescrever seção Recursos (6-8 cards focados) | Médio |
| 5 | Reescrever seção Conectores (categorias com status) | Médio |
| 6 | Atualizar White Label (remover termos técnicos) | Médio |
| 7 | Substituir Pricing por seção de capacidades (sem preço) | Alto |
| 8 | Criar FAQ | Médio |
| 9 | Atualizar Footer e Nav | Baixo |
| 10 | Corrigir links e BrandingContext | Baixo |

---

## 14. Decisões de Design Propostas

**Texto central da animação:** "Operational Knowledge" — transmite que o produto é um motor de conhecimento operacional, não apenas um chatbot.

**Evolução da animação:** Adicionar labels discretos nos 6 nós endpoint existentes (API, SQL, Docs, Logs, ERP, REST) — os data streams já convergem para o centro, basta adicionar texto nos nós. Se prejudicar elegância, manter apenas a troca do texto central.

**Estrutura de planos na landing (sem preço):**
- **Starter** — Aprende documentos, responde perguntas, gera relatórios
- **Pro** — Conectores inteligentes, APIs, logs, automações, ferramentas avançadas
- **Enterprise** — White Label, conectores ilimitados, ambientes dedicados, treinamento

**CTA principal:** "Começar Gratuitamente" → login direto (em vez de /pricing)

---

*Auditoria concluída. Aguardando aprovação para implementação.*
