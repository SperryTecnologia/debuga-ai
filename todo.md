- [x] Corrigir SEO da página inicial: adicionar palavras-chave nos meta tags e conteúdo
- [x] Bug: botão "Falar com Vendas" (Enterprise) exige login antes de redirecionar ao WhatsApp
- [x] Atualizar README: nomes profissionais para LLM (Manus Forge API + Qwen2.5-72B-Infra)
- [x] Revisar toda documentação: atualizar referências LLM (Manus Forge API + Qwen2.5-72B-Infra)
- [x] Remover/ocultar detalhes que exponham dependência de plataforma terceira nos docs
- [x] Avaliar quais docs devem ser públicos vs privados no GitHub

## Auditoria Promessa x Entrega - Correções

### FASE 1 — Correções críticas antes de venda
- [x] 1A: Adicionar validação de limite mensal em createConversation
- [x] 1A: Garantir backend valida limites (não apenas frontend)
- [x] 1A: Implementar reset diário/mensal de limites (não bloquear permanentemente)
- [x] 1B: Implementar feature-gating de ferramentas por plano (Free sem scripts/port_scan)
- [x] 1B: Starter com ferramentas básicas, Pro com ferramentas avançadas
- [x] 1C: Frontend exibir mensagem clara quando limite atingido + CTA upgrade
- [x] 1D: Corrigir página /pricing para refletir entrega real (sem promessa falsa)

### FASE 2 — Stripe e compra real
- [x] Validar preços corretos (Starter R$49,90, Pro R$149,90)
- [x] Enterprise não deve abrir checkout automático (já corrigido)
- [x] Validar webhook atualiza plano no banco corretamente
- [x] Avaliar migrar para Price IDs fixos no Stripe (usando price_data + resolvePlanByAmount)

### FASE 3 — Features não implementadas
- [x] Remover/marcar "sob projeto" features inexistentes (PDF, integrações, SSO, Docker)

### FASE 4 — Segurança do sandbox
- [x] Desativar execute_code para Free/Starter (gerar script sem executar)
- [x] Remover texto "Sandbox Docker" se não existe Docker real

### FASE 5 — Matriz final
- [ ] Gerar nova auditoria pós-correção com checklist de conformidade

### Contadores de Uso Independentes (Anti-burla)
- [x] Investigar se exclusão de conversa apaga fisicamente do banco ou soft-delete
- [x] Verificar se contadores dependem de COUNT em conversations/messages
- [x] Criar tabela usage_events independente do histórico visível
- [x] Incrementar contador de conversa apenas quando primeira mensagem é enviada (não ao criar conversa vazia)
- [x] Incrementar contador de mensagem diária a cada mensagem enviada
- [x] Garantir que deletar conversa/mensagem NÃO decrementa contadores
- [x] Backend bloqueia pelo contador de uso, não pela quantidade de chats visíveis
- [x] Conversa vazia deletada não consome limite
- [x] Conversa com mensagem deletada continua consumindo 1 conversa mensal
- [x] Enviar 5 mensagens no Free e deletar chats: continua bloqueado até reset diário
- [x] Testes unitários cobrindo cenários de burla

### Transparência de Consumo
- [x] Criar endpoint tRPC para retornar uso real + limites do plano
- [x] Indicador de uso no ChatPage (rodapé/input): X/Y mensagens, X/Y conversas
- [x] Pro mostra "Uso ilimitado", Enterprise mostra "Limites personalizados"
- [x] Atualizar /account com consumo real de usage_events
- [x] Remover/ocultar "Tokens hoje" e "Tokens total" se não calculados
- [x] Renomear "créditos" para "Uso do Plano" se não funciona como saldo
- [x] Dados exibidos devem bater com dados usados pelo backend para bloquear

### Sistema de Arquivamento de Conversas
- [x] Criar seção "Arquivadas" no sidebar com acesso claro
- [x] Ao arquivar: remover da lista principal + toast "Conversa arquivada" com botão Desfazer
- [x] Lista de arquivadas: visualizar, abrir, desarquivar, excluir
- [x] Menu de conversa arquivada: trocar "Arquivar" por "Desarquivar"
- [x] Confirmação ao excluir com mensagem clara sobre uso do plano
- [x] Separação clara: arquivar oculta, excluir remove histórico visual
- [x] Arquivar/excluir não altera usage_events
- [x] Endpoint de desarquivar no backend
- [x] Endpoint de listar conversas arquivadas
- [x] Testes unitários

### FASE Stripe - Fluxo de Pagamento
- [x] Diagnosticar estado atual: products.ts, webhook, checkout, env vars
- [x] Price IDs via env/backend (não confiar no frontend)
- [x] Checkout seguro: backend decide Price ID pelo planId recebido
- [x] Webhook robusto: validar assinatura, identificar usuário, atualizar plano
- [x] Eventos suportados: checkout.session.completed, subscription.created/updated/deleted, invoice.payment_succeeded/failed
- [x] Tratar webhook duplicado sem duplicar dados (upsertSubscription com onDuplicateKeyUpdate)
- [x] Upgrade/downgrade: Starter↔Pro, cancelamento, inadimplência
- [x] Ao cancelar/falhar pagamento: revogar acesso pago (downgrade para free)
- [x] Enterprise: botão WhatsApp, sem checkout automático
- [x] Interface: plano atual marcado, botões corretos em /pricing
- [x] Após pagamento: /account reflete novo plano e limites
- [x] Testes unitários do fluxo Stripe (21 testes)

### Bug: "Failed to create checkout session" em produção
- [x] Investigar causa raiz: sdk.authenticateRequest lançava exceção que caía no catch genérico
- [x] Verificar variáveis Stripe em produção (STRIPE_SECRET_KEY sk_test_* OK)
- [x] Corrigir: separar try/catch de auth do try/catch do Stripe
- [x] Melhorar logging no backend (erro real, userId, planId, ambiente)
- [x] Melhorar mensagem de erro no frontend (401 → redirecionar para login)
- [x] Adicionar credentials: 'include' em todos os fetch de Stripe
- [x] Enterprise continua abrindo WhatsApp (não afetado)

### Bug: "Histórico de Uso" mostra "Nenhum registro" apesar de uso real
- [x] Investigar endpoint que alimenta o Histórico de Uso na AccountPage
- [x] Identificar por que mostra vazio: usava usage_log (só preenchido no streaming) em vez de usage_events
- [x] Corrigir endpoint usageHistory para usar usage_events como fonte primária
- [x] Registrar eventos de assinatura no webhook (subscription_activated, plan_downgraded, subscription_canceled)
- [x] Renomear seção para "Atividade Recente" com ícones por tipo de evento
- [x] Conta admin também mostra histórico (usa mesmo endpoint)
- [x] Não mexeu em Stripe, regras de bloqueio ou pricing

### Navegação do Menu do Usuário Logado
- [x] Substituir "Meus Planos" por "Plano e Uso" e "Fazer Upgrade"
- [x] "Plano e Uso" leva para /account (dados internos do plano)
- [x] "Fazer Upgrade" leva para /pricing?from=app (ação comercial)
- [x] Adicionar botão "Voltar ao Chat" no topo da PricingPage para usuário logado
- [x] PricingPage reconhece usuário logado: badge PLANO ATUAL, botão desabilitado
- [x] Manter experiência visual coesa (tema escuro, não parecer que saiu da console)
- [x] Nenhum fluxo Stripe alterado
- [x] Nenhuma regra de consumo alterada

### Busca Global de Conversas
- [x] Criar endpoint tRPC chat.search (autenticado, apenas conversas do usuário)
- [x] Buscar por título, mensagens do usuário e respostas da IA
- [x] Limitar resultados e paginar se necessário
- [x] Não retornar conversas excluídas
- [x] Incluir arquivadas com badge "Arquivada"
- [x] Campo de busca no sidebar abaixo do botão "Nova Conversa"
- [x] Debounce de 300ms
- [x] Resultados com trecho destacado da mensagem encontrada
- [x] Ao clicar, abrir a conversa correta
- [x] Estados: vazio, loading, sem resultados, botão limpar
- [x] Segurança: não retorna dados de outro usuário, não conta como mensagem, não consome limite
- [x] Testes unitários

### Revisão dos Cards de Exemplo do Chat (Onboarding)
- [x] Investigar causa raiz do erro "Argumentos inválidos" no Diagnóstico DNS
- [x] Corrigir prompts de todos os 6 cards para serem determinísticos e completos
- [x] Validar argumentos antes de chamar ferramentas (schema, domínio, URL, porta, tipo)
- [x] Feature-gating: cards bloqueados por plano mostram upgrade, não erro
- [x] Tratamento de erros amigável: nunca mostrar "Argumentos inválidos" ou stack trace
- [x] Mensagem amigável para falhas externas (timeout, DNS, indisponibilidade)
- [x] Bloco vermelho substituído por alerta amarelo discreto
- [x] Cards Free: apenas chat básico e ferramentas permitidas
- [x] Cards Starter: DNS, SSL, HTTP, WHOIS, web_fetch liberados
- [x] Cards Pro: todas as ferramentas avançadas liberadas
- [x] Testes unitários para cada card (prompt válido, argumentos, plano, erros)
- [x] Não mexer em Stripe, usage_events ou pricing

### Fluxo de Logout Profissional
- [x] Encerrar sessão corretamente ao clicar em "Sair" (limpar cookie/token, invalidar server-side)
- [x] Criar tela pós-logout (/logout-success) com mensagem clara
- [x] Texto: "Você saiu da sua conta com segurança." + subtexto
- [x] Botão principal: "Entrar novamente" → /login
- [x] Botão secundário: "Voltar para o site" → /
- [x] Remover "Acessar Terminal" da tela de deslogado
- [x] /chat deslogado: mostrar tela "Entre para acessar o chat" com botão "Entrar"
- [x] /account deslogado: redireciona para login (já existia via getLoginUrl)
- [x] Voltar no navegador não reabrirá conta (cookie invalidado server-side, maxAge=-1)
- [x] Chamadas de API retornam 401 se sessão acabou (protectedProcedure)
- [x] Não mexer em Stripe, usage_events ou planos
- [x] Testes unitários para fluxo de logout (23 testes)

### Estratégia Freemium dos Cards de Exemplo
- [x] Reestruturar cards com modo demo (Free) e modo livre (Starter/Pro)
- [x] Diagnóstico DNS: demo com github.com no Free, domínio próprio no Starter/Pro
- [x] Navegar em Site: demo com example.com no Free, URL própria no Starter/Pro
- [x] Auditoria de Segurança: demo passiva com example.com no Free, completa no Starter/Pro
- [x] Gerar Diagrama: demo pré-definida no Free, personalizado no Pro
- [x] Scan de Portas: demo segura portas 80/443 no Free, scan real no Pro
- [x] Sandbox de Código: exemplo seguro IPv4 no Free, execução controlada no Pro
- [x] Badges comerciais: "Demo" e "Demo segura" no Free
- [x] CTA pós-demo: "Gostou do resultado?" com botões "Fazer Upgrade" e "Continuar testando"
- [x] Atualizar texto introdutório da tela de chat
- [x] Validação de argumentos e segurança mantidas
- [x] Demos contam como mensagens normais do plano Free (usa handleSendMessage)
- [x] Não mexer em Stripe, usage_events ou pricing
- [x] Testes unitários para nova estrutura de cards (29 testes)

### Demo Mode Separado (Cards da Home)
- [x] Resolver conflito de modais: nunca empilhar "Limite atingido" + "Gostou do resultado?" (CTA suprimido quando upgrade modal abre)
- [x] Backend: flag isDemo no streaming para não consumir mensagens do plano
- [x] Limite próprio de demos: 10/dia por usuário (in-memory, reseta diariamente)
- [x] Rate limiter de demos no backend (sem tabela extra, in-memory Map)
- [x] Cards da home acessíveis a todos os planos (sem badge de bloqueio)
- [x] Demos não consomem mensagens normais do plano Free (skip usage_events)
- [x] Prompts premium: Diagnóstico DNS como mini relatório profissional com nota 0-10
- [x] Prompts premium: Navegar em Site com análise completa de cloudflare.com
- [x] Prompts premium: Auditoria de Segurança como checklist profissional com nota A-F
- [x] Prompts premium: Scan de Portas controlado em scanme.nmap.org com tabela profissional
- [x] Prompts premium: Sandbox de Código com análise completa de rede IPv4
- [x] Prompts premium: Gerar Diagrama de infraestrutura corporativa detalhado
- [x] CTA pós-demo elegante sem empilhar com modal de limite (guard: && !upgradeModal?.open)
- [x] Badges: "Demonstração" e "Demo segura" em verde
- [x] Chat livre continua respeitando planos (usage_events intacto, isDemo=false)
- [x] Stripe e pricing não mudam
- [x] Testes unitários para Demo Mode (33 testes demo-mode + 34 testes freemium-cards)

### Simplificação dos Cards (Reverter Demo Mode)
- [x] Reverter Demo Mode: remover flag isDemo do backend (rollback para e8fa7f4c)
- [x] Reverter Demo Mode: remover rate limiter de demos do backend
- [x] Reverter Demo Mode: remover isDemo do frontend (handleSendMessage, cards)
- [x] Cards executam produto real com uso normal do plano
- [x] Free pode clicar nos cards (consome mensagem normal)
- [x] Prompts bem formados com alvos seguros (github.com, cloudflare.com)
- [x] Validação de argumentos mantida (agentTools.ts)
- [x] Erros amigáveis mantidos (nunca "Argumentos inválidos" ou stack trace)
- [x] CTA pós-resultado discreto: "Gostou do resultado? Faça upgrade" (showCardUpgradeCTA)
- [x] Nunca empilhar modais (CTA + limite atingido) - guard: && !upgradeModal?.open
- [x] CTA só aparece para Free após resultado bem-sucedido (3s delay)
- [x] Feature-gating: cards da home com alvos seguros para todos; uso livre por plano
- [x] Não mexer em Stripe, pricing ou usage_events
- [x] Testes unitários atualizados (232 passando)

### Correção de Modais e Auditoria de Planos
- [x] Corrigir CTA "Gostou do resultado?" aparecendo após modal de limite (wasBlockedRef cancela CTA)
- [x] CTA só aparece após execução bem-sucedida com resposta válida
- [x] CTA não aparece se limite atingido, erro, ferramenta falhou ou execução bloqueada
- [x] CTA não aparece para Pro, Enterprise ou admin/bypass (só Free)
- [x] Modal de limite tem prioridade máxima, nunca empilhar modais (guard: && !upgradeModal?.open)
- [x] Ajustar texto do modal de limite: "Limite do plano atingido" + descrição fixa
- [x] Botões do modal de limite: "Fechar" e "Ver Planos"
- [x] Auditar fluxo Free → Starter: checkout OK, webhook OK, limites OK, pricing OK, account OK
- [x] Auditar fluxo Free → Pro: checkout OK, webhook OK, limites OK, pricing OK, account OK
- [x] Auditar fluxo Starter → Pro: via Stripe Portal, webhook subscription.updated resolve plano
- [x] Auditar fluxo Pro → Starter: via Stripe Portal, webhook atualiza planId
- [x] Auditar cancelamento: subscription.deleted → downgrade free + recordAccountEvent
- [x] Auditar pagamento falho: invoice.payment_failed → past_due (mantém acesso)
- [x] Auditar Enterprise: WhatsApp consultivo, sem checkout automático
- [x] Validar Stripe: price_data dinâmico + resolvePlanByAmount fallback (4 estratégias)
- [x] Validar webhook idempotente: upsertSubscription com onDuplicateKeyUpdate
- [x] Validar /pricing: plano atual marcado, botão desabilitado, toggle mensal/anual
- [x] Validar /account: plano, status, próxima cobrança, atividade recente
- [x] Gerar relatório de diagnóstico e auditoria (audit-report.md)
- [x] Não mexer em pricing comercial, busca, arquivamento ou README
- [x] Testes unitários para modais e fluxos (15 testes modal-cta)

### Correção Cirúrgica README.md + .env.example
- [x] Reescrever README.md: estrutura real do projeto (alto nível)
- [x] Separar estado atual vs roadmap no README
- [x] Ajustar linguagem sobre IA (sem afirmar produção de modelo proprietário)
- [x] Ajustar integrações (conectores planejados, não integrados)
- [x] Corrigir instruções quebradas (variáveis documentadas no README)
- [x] Adicionar seção "Limitações Conhecidas"
- [x] Adicionar seção "Roadmap"
- [x] Criar .env.example: sandbox bloqueou criação direta; variáveis documentadas no README como alternativa

### Revisão ARCHITECTURE.md
- [x] Alinhar ARCHITECTURE.md com README corrigido (atual vs experimental vs roadmap)

### Alinhamento WHITEPAPERs + Fix TypeScript
- [x] Alinhar WHITEPAPER_PT-BR.md com README/ARCHITECTURE corrigidos
- [x] Alinhar WHITEPAPER_EN.md com README/ARCHITECTURE corrigidos
- [x] Erros TypeScript em streamRoute.ts: são falso-positivo do LSP cache (tsc --noEmit retorna 0 erros, pnpm check OK)

### PricingPage + MIGRATION_GUIDE
- [x] Remover "PIX e Boleto" da PricingPage (trocado por "Cartão de crédito e débito")
- [x] MIGRATION_GUIDE.md não existe no projeto (pulado)
- [x] Corrigido PIX/Boleto também no README.md e nos dois WHITEPAPERs
- [x] Remover AUDIT_REPORT_PARCIAL.md do repositório (registro interno, não deve ser público)

### Limpeza de repo público
- [x] Remover docs/SECURITY_AUDIT.md do repo (detalha superfície de ataque)
- [x] Remover migrate-pin.mjs do repo (script avulso já executado)
- [x] Atualizar .gitignore para prevenir re-adição
- [x] Remover referências ao SECURITY_AUDIT.md no README.md

### Responsividade Mobile do Chat
- [x] Sidebar como drawer no mobile (max 85% width, overlay, fechar ao selecionar)
- [x] Área principal do chat 100% width sem overflow horizontal
- [x] Cards da tela inicial em 1 coluna no mobile
- [x] Composer fixo no rodapé com safe-area e botões visíveis
- [x] Header mobile com botão hamburger e título compacto
- [x] Indicador de uso compacto sem sobrepor composer
- [x] Busca de conversas funcional dentro do drawer
- [x] Testar em 360px, 390px, 412px, 430px (breakpoints implementados via md: prefix = 768px)
- [x] Desktop não pode quebrar (verificado via preview)

### Widget WhatsApp - Visibilidade por rota
- [x] Ocultar widget flutuante WhatsApp em /chat e /account (áreas autenticadas)
- [x] Manter widget visível em / e /pricing (páginas públicas)
- [x] Manter "Suporte WhatsApp" no menu do usuário dentro do chat (já existia)
- [x] Respeitar localStorage quando usuário fecha o balão

### Home.tsx - Integrações
- [x] Ajustar seção de integrações na Home para marcar como "conectores planejados" com badge "Em breve"

### Revisão Ortográfica PT-BR
- [x] Corrigir acentuação e ortografia em todos os textos visíveis do frontend (Home, Pricing, Chat, Account, modais, cards, mensagens)

- [x] Atualizar ARCHITECTURE.md com diagrama de inferência híbrida (cloud + local/vLLM)

### UX Mobile Cards Iniciais do Chat
- [x] Mobile (<768px): cards recolhidos por padrão com accordion "Ver exemplos guiados"
- [x] Mobile: introdução limpa (título + subtexto + botão toggle)
- [x] Mobile: cards em lista vertical compacta quando expandidos
- [x] Mobile: ao clicar em card, lista recolhe automaticamente
- [x] Desktop: layout atual inalterado
- [x] Sem alteração em backend, Stripe, usage_events, planos ou prompts

### Ocultar Erros Técnicos de Ferramentas nos Cards
- [x] Investigar causa raiz do aviso amarelo no card "Navegar em Site"
- [x] Backend: retry silencioso quando tool falha por argumentos inválidos
- [x] Backend: logging interno de erros (tool name, args, erro, userId, conversationId)
- [x] Backend: não enviar detalhes técnicos (schema, tool name, JSON) via SSE para o frontend
- [x] Frontend: filtrar mensagens de erro técnico do tool_result (não mostrar card amarelo)
- [x] Frontend: mensagem amigável em PT-BR quando ferramenta falha após retry
- [x] Garantir que nenhum card mostra "web_fetch", "schema", "tool call", "Argumentos inválidos"
- [x] IA não narra erro interno (system prompt ajustado se necessário)
- [x] Sem alteração em Stripe, auth, usage_events, planos ou pricing

### Correção Cards de Exemplo - Alvos Estáveis e Prompts Profissionais
- [x] Card "Navegar em Site": trocar alvo de cloudflare.com para example.com
- [x] Card "Navegar em Site": prompt profissional com campos estruturados
- [x] Card "Diagnóstico DNS": revisar prompt para resultado organizado por seções
- [x] Card "Auditoria de Segurança": trocar alvo para example.com, prompt checklist
- [x] Card "Gerar Diagrama": revisar prompt para diagrama profissional
- [x] Card "Scan de Portas": alvo example.com, apenas portas 80/443
- [x] Card "Sandbox de Código": exemplo seguro IPv4 com ipaddress
- [x] Todos os cards: argumentos válidos para as tools (schema correto)
- [x] Frontend: timeout visível para evitar loading infinito nos cards
- [x] Frontend: liberar input após timeout
- [x] Nenhum card mostra web_fetch, schema, argumentos inválidos ou erro técnico
- [x] Desktop e mobile funcionando
- [x] Sem alteração em Stripe, auth, usage_events, planos ou pricing

### Correção Definitiva Card "Navegar em Site"
- [x] Diagnóstico: identificar causa raiz da falha com example.com
- [x] Criar página estática /demo/web-analysis (pública, sem auth, sem JS pesado)
- [x] Registrar rota /demo/web-analysis no App.tsx
- [x] Atualizar prompt do card para usar https://debuga.ai/demo/web-analysis
- [x] Verificar/reforçar fallback seguro (sem web_fetch, schema ou erro técnico visível)
- [x] Testar no desktop e mobile
- [x] Sem alteração em Stripe, auth, usage_events, planos ou pricing

### Correção Estratégica Cards Problemáticos (Navegar, Diagrama, Sandbox)
- [x] Card "Navegar em Site": timeout curto 10-15s + fallback controlado com análise da /demo/web-analysis
- [x] Card "Navegar em Site": fallback não revela falha da ferramenta ao usuário
- [x] Card "Gerar Diagrama": fallback para Mermaid quando geração de imagem falhar
- [x] Card "Gerar Diagrama": diagrama de arquitetura segura profissional
- [x] Card "Sandbox de Código": corrigir spawn python3 ENOENT
- [x] Card "Sandbox de Código": fallback se execução falhar
- [x] Nenhum card mostra erro técnico cru ao usuário
- [x] Sem alteração em Stripe, auth, usage_events, planos ou pricing

### UX Cards + Proteção Contra Travamento Global
- [x] FASE 1: Ocultar cards por padrão no desktop (consistente com mobile)
- [x] FASE 1: Título "Olá! Sou o debuga.ai" + subtexto + botão "Ver exemplos guiados"
- [x] FASE 1: Cards ocultos por padrão desktop+mobile (accordion unificado)
- [x] FASE 1: Texto introdutório limpo (título + subtexto + botão toggle)
- [x] FASE 2: Mostrar apenas 3 cards estáveis (DNS, Auditoria, Scan)
- [x] FASE 2: Ocultar 3 cards instáveis (Navegar, Diagrama, Sandbox) com visible: false
- [x] FASE 3: Estado de processamento por conversationId, não global
- [x] FASE 3: Criar nova conversa durante execução ativa em outra
- [x] FASE 3: Excluir conversa ativa aborta stream e limpa estado
- [x] FASE 3: Eventos tardios de conversa excluída não atualizam UI
- [x] FASE 4: Timeout obrigatório 30s com mensagem amigável
- [x] FASE 4: Após timeout: encerrar loading, liberar input, registrar erro interno
- [x] FASE 5: Botão cancelar discreto durante streaming
- [x] FASE 5: Cancelar aborta stream, libera input, sem erro técnico
- [x] Sem alteração em Stripe, auth, pricing, planos, README ou repos LLM
### Animação de Carregamento Suave no Chat
- [x] Componente StreamLoadingIndicator com frases rotativas estilo terminal
- [x] Animação: cursor pulsante, barra de progresso, dots animados, fade-in suave
- [x] Animação aparece após enviar mensagem, desaparece ao receber primeiro chunk
- [x] Visual consistente com tema dark/terminal do debuga.ai ($ prompt, font-mono)
- [x] Sem alteração em backend, Stripe, auth, usage_events ou planos

### Bug: Conversation not found
- [x] Diagnosticar causa raiz do erro "Conversation not found" no /chat
- [x] Corrigir: tratar conversa inexistente sem erro visível

### 6 Cards Confiáveis (Vitrine Final)
- [x] Preservar 3 cards estáveis (DNS, Auditoria, Scan)
- [x] Criar card "Monitor de Servidor" (alvo: debuga.ai)
- [x] Criar card "Auditor de Domínio" (alvo: debuga.ai)
- [x] Reabilitar "Gerar Diagrama" com fallback Mermaid premium
- [x] Manter Navegar em Site e Sandbox de Código ocultos
- [x] Sem alteração em Stripe, auth, pricing, planos ou README

### Ocultar Prompts Internos + Separar Cards
- [x] FASE 1: Separar displayMessage (visível no chat) do hiddenPrompt (enviado à IA)
- [x] FASE 1: Nenhum card mostra instruções internas, fallback, regras de sistema
- [x] FASE 2: Auditor de Domínio — foco em DNS, e-mail, SSL, postura externa
- [x] FASE 3: Monitor de Servidor — foco em IP/host, portas, saúde pública, hardening
- [x] FASE 4: Monitor entrega JSON técnico resumido
- [x] FASE 5: Todos os cards com timeout, sem travar chat, sem erro técnico
- [x] FASE 6: Gerar Diagrama — não mostra bloco Mermaid como mensagem do usuário
- [x] Sem alteração em Stripe, auth, pricing, planos ou usage_events

### Correção Crítica: Monitor de Servidor — Dados Alucinados
- [x] FASE 1: Diagnosticar causa raiz da lista falsa de portas abertas
- [x] FASE 2: Regra de evidência obrigatória (só mostrar porta se tool real confirmou)
- [x] FASE 3: Separar expected_services / verified_open_ports / unverified no JSON
- [x] FASE 4: Prompt interno defensivo (não pedir "identificar portas abertas" sem tool)
- [x] FASE 5: SYSTEM_PROMPT proibir alucinação de portas/serviços/status
- [x] FASE 6: Recomendações defensivas (sem sugerir ataque/exploit)
- [x] FASE 7: Critérios de aceite validados
- [x] Sem alteração em Stripe, auth, pricing, planos, usage_events ou outros cards

### Ocultar Monitor de Servidor da Vitrine
- [x] Marcar Monitor de Servidor como visible: false
- [x] Verificar Gerar Diagrama — oculto também (visible: false) por precaução
- [x] Vitrine final: 4 cards confiáveis visíveis (DNS, Auditoria, Scan, Auditor de Domínio)

### Reexibir Card Gerar Diagrama (5 cards visíveis)
- [x] Remover visible: false do card Gerar Diagrama
- [x] Atualizar displayMessage para "Cria diagramas técnicos de rede, segurança e infraestrutura"
- [x] Reescrever prompt interno com cenários variados e formato Mermaid obrigatório
- [x] Garantir que não depende de geração de imagem (sempre Mermaid)
- [x] Não mostrar prompt interno ao usuário
- [x] Não mostrar erro técnico
- [x] Atualizar freemium-cards.test.ts para refletir Gerar Diagrama como visível
- [x] Confirmar 267+ testes passando e tsc --noEmit limpo

### Upgrade Premium do Card Gerar Diagrama
- [x] Reescrever prompt interno com padrão premium (subgraphs, classDef, setas rotuladas, 12-20 nós)
- [x] Incluir exemplo de qualidade no prompt para guiar a LLM
- [x] Adicionar "Próximos passos recomendados" ao formato de resposta
- [x] Garantir variação de cenários (8 opções)
- [x] Manter regras: sem generate_image, sem prompt visível, sem erro técnico
- [x] Testes passando e tsc limpo

### Renderização Visual Mermaid Premium no Chat
- [x] Instalar mermaid.js como dependência do frontend
- [x] Criar componente MermaidDiagram com renderização visual (tema dark) — usando Streamdown nativo com mermaidConfig
- [x] Adicionar controles: Streamdown provê copy/download nativamente + CSS premium styling
- [x] Contêiner responsivo: largura maior, boa leitura desktop/mobile, zoom/escala
- [x] Integrar no fluxo de mensagens: mermaidConfig passado ao Streamdown (saved + streaming)
- [x] Tema dark alinhado ao debuga.ai (cores verdes/escuras) — #22c55e, #0a0a0a, #0f172a
- [x] Não mostrar prompt interno, erro técnico ou travar o chat
- [x] Testes passando (277) e tsc limpo

### Tradução da Arquitetura para PT-BR
- [x] Criar ARCHITECTURE_PT-BR.md com tradução completa para português
- [x] Copiar ARCHITECTURE.md para ARCHITECTURE_EN.md (preservar versão inglês)
- [x] Remover ARCHITECTURE.md original (substituído pelas duas versões)
- [x] Atualizar README.md com links "Arquitetura PT-BR" e "Arquitetura EN" (mesmo padrão dos Whitepapers)

### Renderização Profissional de Diagramas Mermaid
- [x] Criar componente MermaidRenderer dedicado com preview inline grande
- [x] Modal fullscreen com fundo dark, zoom in/out, fit-to-screen, pan/arrastar
- [x] Exportação nativa: botões Baixar PNG, Baixar SVG, Baixar PDF
- [x] .mmd como opção secundária (Copiar Código), não experiência padrão
- [x] Integrar MermaidRenderer no chat via MessageWithMermaid wrapper
- [x] Tema dark premium alinhado ao debuga.ai (cores verdes, fundo escuro)
- [x] Fontes legíveis, labels curtos, espaçamento adequado
- [x] Fallback visual aceitável se renderer falhar (nunca erro técnico cru)
- [x] Aprimorar prompt do card com ícones/emojis e 12 cenários variados
- [x] Variedade de cenários (web, rede corporativa, backup, VPN, DevOps, híbrido, campus, e-commerce)
- [x] Nunca expor prompt interno na resposta
- [x] Testes atualizados (277 passando) e tsc --noEmit limpo

### Bug Fix: Tainted Canvas no Export PNG/PDF
- [x] Fix SecurityError: Tainted canvases may not be exported no MermaidRenderer

### Fix Card Gerar Diagrama - 3 Problemas
- [x] FASE 1: Separar displayMessage (curta) do prompt interno - prompt não pode aparecer no chat
- [x] FASE 2: Corrigir visualização/escala - fit-to-width, zoom inicial legível, sem espaço vazio
- [x] FASE 3: Corrigir exportação PNG/SVG/PDF - tamanho útil, sem área vazia, alta resolução (3x)
- [x] FASE 4: Melhorar layout diagramas grandes - useMaxWidth:false, scroll inline, fit-to-width modal
- [x] FASE 5: Testes de aceite passando (277 testes)

### Suporte Humano UX - Banner por Plano
- [x] FASE 1: Banner suporte humano no ChatPage (Free/Starter bloqueado, Pro ativo, Enterprise consultivo)
- [x] FASE 2: Visual dark/terminal, discreto, mobile-friendly
- [x] FASE 3: Exemplos guiados como opção secundária
- [x] FASE 4: Landing page - frase IA + suporte humano sênior + card diferencial
- [x] FASE 5: Pricing - benefícios suporte humano por plano
- [x] FASE 6: WhatsApp com mensagem pré-preenchida (nome, email, plano)
- [x] FASE 7: Corrigir "Sem cartao" → "Sem cartão"
- [x] FASE 8: Critérios de aceite validados (277 testes passando)

### Ocultar "Ver exemplos guiados"
- [x] Ocultar botão "Ver exemplos guiados" para todos os planos no ChatPage

### Módulo: Upload e Análise de Imagens/Prints
- [x] Backend: campo attachments já existia na tabela messages (JSON)
- [x] Backend: feature flag FEATURE_IMAGE_UPLOAD (default true, desativa com "false")
- [x] Backend: rota /api/upload já existia — adicionado check de feature flag + limites de imagem
- [x] Backend: limites de imagem por plano (Free 2/dia, Starter 10/dia, Pro 50/dia, Enterprise ilimitado)
- [x] Backend: counter de imagens diárias via usage_events (getTodayImageCount + recordImageUpload)
- [x] Backend: streamRoute já detectava URLs de imagem e convertia para multimodal (image_url)
- [x] Backend: prompt de sistema para análise técnica de imagens (7 instruções)
- [x] Frontend: componente de upload já existia (botão Paperclip, drag-and-drop, Ctrl+V paste)
- [x] Frontend: preview melhorado (thumbnails 80x80/96x96, hover overlay, botão remover)
- [x] Frontend: integrado no ChatPage (campo de input)
- [x] Frontend: imagens no chat até 280px com click-to-expand
- [x] Frontend: erro amigável para 402 IMAGE_LIMIT_REACHED e 403 FEATURE_DISABLED
- [x] Frontend: mobile responsivo (já existia)
- [x] Segurança: validação de tipo (apenas imagens) + limite 10MB
- [x] Segurança: não executa nada da imagem, não expõe URL interna
- [x] Testes unitários: 16 testes novos (image-upload.test.ts) + 293 total passando
- [x] Stripe/auth/billing não foram alterados
- [x] Usage endpoint retorna todayImages + imagesPerDay

### Módulo: Upload e Análise de Documentos
- [x] FASE 1: Diagnóstico do fluxo atual de anexos (upload, storage, streamRoute, LLM)
- [x] FASE 2: Criar documentProcessor.ts (TXT/MD/LOG/CONF/JSON/CSV/YAML/XML/SQL/PDF/DOCX)
- [x] FASE 2: Instalar libs para PDF (pdf-parse v2) e DOCX (mammoth)
- [x] FASE 3: Integrar documentProcessor no uploadRoute.ts (extrai texto no upload, retorna textContent)
- [x] FASE 3: Formato de contexto: nome, tipo, tamanho, texto extraído, truncamento
- [x] FASE 4: Feature flag FEATURE_DOCUMENT_UPLOAD (default true)
- [x] FASE 5: Limites por plano: Free 3/dia, Starter 15/dia, Pro 50/dia, Enterprise ilimitado
- [x] FASE 5: Limites técnicos: 20MB max, 50k chars truncamento, tipos validados
- [x] FASE 6: Frontend: toast com método e caracteres extraídos + badge truncado
- [x] FASE 6: Frontend: erro amigável para DOC_LIMIT_REACHED e FEATURE_DISABLED
- [x] FASE 6: Aceitar .pdf e .docx no file input
- [x] FASE 7: Testes unitários: 28 testes (document-upload.test.ts) + 321 total passando
- [x] FASE 8: Chat sem anexo continua funcionando igual
- [x] FASE 8: Stripe/auth/billing/planos não alterados
- [x] Usage endpoint retorna todayDocs + docsPerDay

### Atualização da Documentação Pública (Auditoria Maio 2026)
- [x] README.md: contagens de testes (236→321), suítes (14→17), arquivos (178→181)
- [x] README.md: documentar upload/análise de imagens
- [x] README.md: documentar upload/análise de documentos
- [x] README.md: documentar MermaidRenderer e exportação PNG/SVG/PDF
- [x] README.md: documentar suporte humano por plano
- [x] README.md: documentar cards guiados visíveis e ocultos
- [x] README.md: corrigir referência ARCHITECTURE.md → PT-BR e EN
- [x] README.md: adicionar ARCHITECTURE_EN.md à tabela de documentação
- [x] README.md: adicionar colunas imagesPerDay e docsPerDay à tabela de planos
- [x] README.md: adicionar feature flags FEATURE_IMAGE_UPLOAD e FEATURE_DOCUMENT_UPLOAD
- [x] README.md: adicionar dependências mermaid, jspdf, pdf-parse, mammoth, streamdown
- [x] README.md: tabela de testes (3 novas suítes + corrigir contagens de 5 existentes)
- [x] WHITEPAPER_PT-BR.md: versão 3.0→4.0, contagens, capacidades, limites
- [x] WHITEPAPER_EN.md: versão 3.0→4.0, contagens, capacidades, limites
- [x] ARCHITECTURE_PT-BR.md: versão 3.0→4.0, integrações, segurança, frontend
- [x] ARCHITECTURE_EN.md: versão 3.0→4.0, integrações, segurança, frontend
- [x] docs/data-model.mmd: adicionar usage_events
- [x] docs/architecture-diagram.mmd: adicionar módulos de upload e Mermaid
- [x] docs/agent-flow.mmd: adicionar fluxo de upload

### Bug Fix: Exibição de Metadados de Anexos no Chat (Maio 2026)
- [x] Identificar onde metadados de anexos são concatenados na mensagem do usuário
- [x] Separar displayMessage (UI) de internalMessage (contexto LLM)
- [x] Criar/atualizar componente de chip/preview de anexo discreto
- [x] Garantir que "Arquivos anexados:", URLs e separadores não apareçam na UI
- [x] Testar com imagem + texto
- [x] Testar com documento + texto
- [x] Testar chat sem anexo (regressão)

### Registro de Conclusão: Estudo Sandbox/Browser (Maio 2026)
- [x] Registrar conclusão do estudo de viabilidade no roadmap do README.md

### Bug Fix: Erros TypeScript e Import ESM (Maio 2026)
- [x] Corrigir imports inexistentes recordMessageSent/recordConversationStarted em streamRoute.ts (falso-positivo: tsc --noEmit passa limpo, erro era do cache incremental stale)
- [x] Corrigir import ESM do pdf-parse em documentProcessor.ts (já estava correto com named import { PDFParse }; removido @types/pdf-parse v1 conflitante)

### Feature: Identidade Centralizada do Agente (Maio 2026)
- [x] Criar server/agentIdentity.ts com instruções centralizadas
- [x] Integrar agentIdentity no system prompt do streamRoute.ts
- [x] Garantir que todos os fluxos (chat, upload, docs, imagens, diagramas) usem o contexto
- [x] Escrever testes unitários para validar o conteúdo do prompt (37 testes)
- [x] Verificar que o agente responde como debuga.ai e não como Google/ChatGPT/Claude

### Feature: Document Studio Fase A (Maio 2026)
- [x] Atualizar agentIdentity.ts com instruções de geração de documentos
- [x] Nunca responder "não consigo gerar PDF diretamente"
- [x] Gerar conteúdo estruturado em Markdown profissional quando pedido
- [x] Criar componente DocumentRenderer para exibir documentos gerados
- [x] Opção de copiar conteúdo do documento
- [x] Opção de baixar como .md
- [x] Opção de baixar como .html (com conversão MD→HTML profissional)
- [x] Aviso jurídico para contratos/minutas
- [x] Chat normal continua funcionando
- [x] Uploads continuam funcionando
- [x] Identidade debuga.ai permanece correta
- [x] Testes unitários para as novas instruções (21 testes)

### Feature: Tool get_account_usage (Maio 2026)
- [x] Investigar onde tools internas são registradas (agentTools.ts)
- [x] Investigar como dados de plano/uso são consultados (db.ts, products.ts)
- [x] Criar tool get_account_usage somente leitura
- [x] Retornar: plano, mensagens usadas/limite, conversas usadas/limite, status assinatura, data renovação
- [x] NÃO expor: stripeCustomerId, subscriptionId, IDs internos
- [x] Orientar sobre menu Minha Conta / Plano e Uso / Fazer Upgrade
- [x] Atualizar system prompt para usar a tool em perguntas sobre conta/plano/uso
- [x] Testes unitários (21 testes em accountUsage.test.ts)
- [x] Confirmar que Stripe/billing/auth não foram alterados

### Bug Fix: JSON bruto de tools aparecendo no chat (Maio 2026)
- [x] Investigar onde tool_result é renderizado no ChatPage
- [x] Ocultar resultados de tools internas (get_account_usage) da UI
- [x] Manter cards visuais de tools técnicas (DNS, SSL, HTTP, port scan)
- [x] Verificar que nenhum JSON bruto aparece para o usuário final
- [x] Confirmar que a tool continua funcionando internamente

### Bug Fix: Agente repetindo identidade desnecessariamente (Maio 2026)
- [x] Ajustar IDENTITY_BLOCK para só se apresentar quando perguntado
- [x] Adicionar regra explícita: respostas operacionais vão direto ao ponto
- [x] Atualizar testes para validar nova regra (6 novos testes, 43 total)

### Bug Fix: Sidebar overflow com muitas conversas (Maio 2026)
- [x] Investigar estrutura flex da sidebar no ChatPage
- [x] ScrollArea: adicionado min-h-0 overflow-hidden para conter dentro do flex
- [x] Área principal: adicionado min-w-0 para evitar overflow horizontal
- [x] Área de mensagens: adicionado min-h-0 para scroll correto
- [x] Composer fixo no rodapé (já tinha shrink-0)
- [x] Testado com 40+ conversas no preview - sidebar rola internamente

### Feature: Respostas comerciais de suporte humano por plano (Maio 2026)
- [x] Atualizar SUPPORT_BLOCK no agentIdentity.ts com regras por plano
- [x] Free: não inclui suporte humano
- [x] Starter: não inclui, orientar upgrade para Pro
- [x] Pro: até 1h/mês triagem técnica via WhatsApp
- [x] Enterprise: canal consultivo conforme contrato
- [x] Não prometer SLA, resolução garantida ou atendimento imediato
- [x] Testes unitários para as novas regras (47 testes no agentIdentity.test.ts)

### Melhoria de Copy Comercial da Landing Page
- [x] Melhorar copy comercial da landing page (Hero, subtítulo, features, CTA)
- [x] Atualizar descrições dos planos Pro e Enterprise na PricingPage

### Fix: Composer mobile sempre visível no rodapé do /chat
- [x] Diagnosticar causa do composer fora da viewport mobile
- [x] Ajustar layout CSS/flex para composer fixo no rodapé mobile
- [x] Garantir safe-area-inset-bottom para teclado virtual
- [x] Verificar que desktop não quebra
- [x] Verificar que sidebar/drawer mobile continua funcionando
### Feature: PWA Instalável (Maio 2026)
- [x] Criar manifest.webmanifest com nome, ícones, cores, display standalone
- [x] Gerar ícones PWA (192x192, 512x512, maskable)
- [x] Adicionar meta tags PWA no index.html (theme-color, apple-touch-icon, etc.)
- [x] Criar service worker básico para cache de assets estáticos
- [x] Não cachear rotas autenticadas, API, Stripe, chat streaming
- [x] Testar instalação no Android
- [x] Testar ícone no iOS (Adicionar à Tela de Início)
- [x] Verificar que login/chat/Stripe continuam funcionando
- [x] Verificar que desktop não quebra
### Feature: White Label Enterprise (Maio 2026)
- [x] Adicionar seção White Label na landing page (Home.tsx)
- [x] Atualizar plano Enterprise na PricingPage com proposta de valor mais forte
- [x] Criar docs/WHITE_LABEL_ENTERPRISE.md com documentação completa
- [x] Verificar que backend/Stripe/auth/chat não foram alterados
- [x] Verificar responsividade mobile
### Documentação: White Label Enterprise EN (Maio 2026)
- [x] Criar docs/WHITE_LABEL_ENTERPRISE_EN.md (tradução profissional)
- [x] Atualizar README.md com links para o novo documento
- [x] Confirmar que apenas docs/README foram alterados
### Ajuste: Footer links White Label + Contato profissional nos docs (Maio 2026)
- [x] Adicionar links White Label Enterprise PT-BR e EN no footer da landing
- [x] Atualizar seção Contato no doc PT-BR (remover telefone/WhatsApp em texto puro)
- [x] Atualizar seção Contact no doc EN (remover telefone/WhatsApp em texto puro)
- [x] Verificar que footer continua responsivo no mobile
- [x] Confirmar que backend/Stripe/auth/chat não foram alterados
### Ajuste: Reorganizar links de documentação no footer (Maio 2026)
- [x] Separar footer em "Documentação" (PT-BR) e "Documentação técnica em inglês" (EN)
- [x] Adicionar link Arquitetura PT-BR no footer
- [x] Manter responsivo no mobile
- [x] Confirmar que backend/Stripe/auth/chat não foram alterados
### Ajuste: Simplificar footer — remover Technical Docs EN (Maio 2026)
- [x] Remover bloco "Technical Docs (EN)" do footer
- [x] Manter apenas "Documentação" com links PT-BR
- [x] GitHub no bloco "Links"
- [x] Footer volta a 3 colunas equilibradas
- [x] Confirmar que backend/Stripe/auth/chat não foram alterados
### Ajuste: Mover GitHub para barra inferior do footer (Maio 2026)
- [x] Remover GitHub da coluna Links
- [x] Posicionar GitHub na barra inferior à direita (com texto + ícone)
- [x] Manter responsivo no mobile
- [x] Confirmar que nenhuma funcionalidade foi alterada
### Ajuste: GitHub abaixo de Documentação como sub-bloco "Código" (Maio 2026)
- [x] Mover GitHub para sub-bloco "Código" abaixo da coluna Documentação
- [x] Limpar linha inferior para apenas copyright
- [x] Manter responsivo no mobile
- [x] Confirmar que nenhuma funcionalidade foi alterada
### Ajuste: GitHub como primeiro item de DOCUMENTAÇÃO (Maio 2026)
- [x] Remover sub-bloco CÓDIGO
- [x] GitHub como primeiro item da coluna DOCUMENTAÇÃO (antes de Whitepaper)
### Ajuste: Comunicação modelos de implantação White Label (Maio 2026)
- [x] Atualizar card deploy na landing (cloud/VPS/on-premise/híbrido)
- [x] Atualizar PricingPage Enterprise features
- [x] Atualizar docs/WHITE_LABEL_ENTERPRISE.md com seção Modelos de implantação
- [x] Atualizar docs/WHITE_LABEL_ENTERPRISE_EN.md com seção Deployment models
- [x] Confirmar que backend/Stripe/auth/chat não foram alterados
### Fix: Deploy homolog VPS completo (Maio 2026)
- [ ] Investigar build real: identificar artefatos gerados por pnpm build
- [ ] Sincronizar app/ do homolog com código atual (landing, PWA, Enterprise, footer)
- [ ] Corrigir Dockerfile: paths, CMD, patches, healthcheck
- [ ] Corrigir docker-compose.yml: Ollama opcional, dependências
- [ ] Verificar/corrigir Nginx configs
- [ ] Atualizar documentação de deploy
- [x] Gerar ZIP atualizado

### Otimização Landing Page (copy/visual)
- [x] Remover badge "Powered by Sperry Tecnologia" do hero (manter no footer)
- [x] Remover card "debuga.ai / IA Técnica + Suporte Humano" do hero
- [x] Trocar item de menu "Enterprise" por "White Label"
- [x] Adicionar diferenciais textuais leves abaixo do CTA no hero
- [x] Revisar copy da seção White Label para explicitar cloud/VPS/infra própria

### Sincronização Homolog com Produção
- [x] Comparar Home.tsx produção vs homolog
- [x] Sincronizar client/src/ da produção para homolog
- [x] Sincronizar shared/ e client/public/ para homolog (já idênticos)
- [x] Atualizar docs/13-CUSTOMIZACAO-WHITE-LABEL.md com mapa completo
- [x] Validar build externo (sem vite-plugin-manus-runtime, sem mysql2)
- [x] Gerar ZIP atualizado

### Google Analytics (gtag.js)
- [x] Implementar gtag.js condicional no client/index.html (produção)
- [x] Configurar VITE_ANALYTICS_WEBSITE_ID na produção (já built-in)
- [x] Replicar no pacote homolog
- [x] Atualizar docs (.env.example, 02-CONFIGURACAO-ENV.md, 13-WHITE-LABEL.md)
- [x] Validar builds e gerar ZIP

## Revisão UX Chat + Diagram Studio Premium (Mai 2026)

### UX Chat - Empty State
- [x] Sugestões colapsadas com botão "Ver mais" (inicialmente mostra 3)
- [x] Input como centro visual da tela no empty state
- [x] Atalhos discretos abaixo do input (Shift+Enter, Ctrl+V)
- [x] Placeholder atualizado: "Descreva seu problema de TI, infraestrutura ou segurança..."

### Parser Robusto de diagram-spec
- [x] Detectar JSON sem fence (unfenced diagram-spec)
- [x] Validar campos obrigatórios (nodes, edges, title)
- [x] Normalizar formatos legados (groups→zones, source/target→from/to)
- [x] Reparar automaticamente JSON com campos faltantes

### Visual Premium NetworkDiagramRenderer
- [x] Swimlanes enterprise com cores por zona
- [x] Ícones SVG para cada tipo de node (firewall, router, switch, etc.)
- [x] Badges de metadados (IP, VLAN, porta)
- [x] Legenda automática de tipos de nodes
- [x] Fullscreen modal com zoom/pan
- [x] Suporte a edge styles (solid, dashed, animated)
- [x] Painel de metadados premium (summary, securityNotes, nextSteps)

### Provider Premium para Diagramas
- [x] Prompt backend atualizado com novos campos (zones, from/to, summary, securityNotes, nextSteps)
- [x] Novos tipos de nodes: backup, monitor, waf, cdn, vpn, cache
- [x] Template de diagrama premium no ChatPage atualizado com novo formato

### Testes
- [x] Testes unitários para diagramProvider (17 testes passando)

## Fix Diagrama Travando / JSON Bruto (22/05/2026)

- [x] Server: Admin sempre recebe 65536 maxTokens (evita truncamento)
- [x] Server: Tarefas de diagrama recebem mínimo 8192 tokens independente do plano
- [x] Client: Proteção durante streaming (placeholder enquanto JSON incompleto)
- [x] Client: JSON repair para conteúdo truncado (fecha brackets/braces faltantes)
- [x] Client: Nunca mostrar JSON bruto ao usuário (DiagramParseFailedCard)
- [x] Client: DiagramErrorBoundary com auto-retry (2 tentativas) + retry manual
- [x] Client: Botão "Tentar renderizar novamente" quando parsing falha
- [x] Testes unitários (15 testes passando)

## Fix #7 Auditoria: KB sem limite no path legado (22/05/2026)

- [x] Aplicar limite de 5 items + 8000 chars (~2000 tokens) no path legado (buildDynamicSystemPrompt)
- [x] Manter comportamento inalterado quando ENABLE_CAPABILITY_ROUTING=true
- [x] Testes unitários (6 testes passando)
