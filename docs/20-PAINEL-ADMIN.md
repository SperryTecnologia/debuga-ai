# 20 — Painel Administrativo

## Visão Geral

O painel administrativo permite ao operador da plataforma gerenciar todos os aspectos do debuga.ai sem necessidade de acessar o banco de dados ou editar arquivos de configuração manualmente. O acesso é restrito a usuários com papel `admin`.

**URL de acesso:** `https://seu-dominio.com/admin`

---

## Seções do Painel

| Seção | Rota | Descrição |
|-------|------|-----------|
| Visão Geral | `/admin` | Dashboard com métricas gerais (usuários, conversas, mensagens, chamadas LLM, ativos 7d) |
| White Label | `/admin/white-label` | Personalização visual: nome, cores, logo, favicon, CSS customizado |
| Instruções IA | `/admin/instructions` | Regras de comportamento injetadas no system prompt |
| Base de Conhecimento | `/admin/knowledge` | Informações de referência que a IA usa nas respostas |
| Modelos / Providers | `/admin/providers` | Referência de configuração dos provedores LLM + botão "Testar Provider" |
| Logs IA | `/admin/logs` | Histórico de chamadas ao LLM com provider, modelo, tokens e status |
| Conversas | `/admin/conversations` | Listagem de todas as conversas dos usuários |
| Usuários | `/admin/users` | Gestão de usuários: criar, promover, desativar |
| Auditoria | `/admin/audit` | Log de ações administrativas para compliance |

---

## Primeiro Acesso

O primeiro usuário que fizer login com o e-mail definido em `ADMIN_EMAIL` no `.env` será automaticamente promovido a admin.

**Opção 1 — Via script (recomendado):**

```bash
./scripts/promote-admin.sh admin@empresa.com
```

**Opção 2 — Via SQL direto:**

```sql
UPDATE users SET role = 'admin', updated_at = NOW()
WHERE LOWER(email) = LOWER('seu-email@exemplo.com');
```

**Opção 3 — Via variável de ambiente (automático no próximo login):**

```env
ADMIN_EMAIL=seu-email@exemplo.com
```

---

## Instruções IA

As instruções são regras que personalizam o comportamento do agente. Cada instrução possui:

| Campo | Descrição |
|-------|-----------|
| **Título** | Nome identificador da instrução |
| **Categoria** | Classificação (comportamento, atendimento, suporte_tecnico, vendas, restrições, encaminhamento_humano, segurança, cliente_específico) |
| **Conteúdo** | Texto da instrução injetado no system prompt |
| **Prioridade** | Ordem de importância (0-100, maior = mais prioritário) |
| **Ativa** | Se deve ser incluída no prompt ou não |

As instruções ativas são carregadas dinamicamente a cada mensagem do chat e incluídas no system prompt da IA.

---

## Base de Conhecimento

Itens da base de conhecimento são informações factuais que a IA usa como referência. Diferente das instruções (que definem comportamento), a base de conhecimento fornece dados concretos.

**Exemplos de uso:**
- Horário de funcionamento da empresa
- Tabela de preços e planos
- FAQ de suporte técnico
- Informações de contato
- Políticas e termos

Cada item possui título, conteúdo, categoria opcional e tags para organização.

---

## Gestão de Usuários

O painel `/admin/users` permite gerenciamento completo:

| Ação | Descrição |
|------|-----------|
| **Criar usuário** | Cadastro manual com nome, e-mail, senha e papel |
| **Promover/Rebaixar** | Alterar entre `admin` e `user` |
| **Ativar/Desativar** | Bloquear acesso sem excluir dados |
| **Verificar e-mail** | Marcar e-mail como verificado manualmente |
| **Verificar telefone** | Marcar telefone como verificado manualmente |
| **Desbloquear conta** | Remover lockout (após 5 falhas de login) |
| **Reset de senha** | Gerar nova senha temporária para o usuário |
| **Buscar** | Filtrar por nome, e-mail ou status |

### Informações exibidas por usuário

- Nome, e-mail, telefone
- Status: ativo/inativo, verificado/não-verificado
- Provider de auth (local, google)
- Data de registro e último login
- Número de tentativas de login falhas
- Status de lockout

---

## Logs e Auditoria

**Logs IA** registram cada chamada ao provedor de LLM:
- Data/hora, provider, modelo, tokens consumidos, status (sucesso/erro)

**Auditoria** registra ações administrativas:
- Criação/edição/exclusão de instruções, knowledge base, usuários
- Alterações de papel e status
- IP do administrador que executou a ação

---

## Segurança

- Todas as rotas `/admin/*` verificam `user.role === "admin"` tanto no frontend quanto no backend
- O backend usa `adminProcedure` (tRPC middleware) que rejeita requisições de não-admins
- Ações sensíveis são registradas na tabela `audit_logs`
- Tokens JWT expiram em 7 dias por padrão (`JWT_EXPIRES_IN`)

---

## Variáveis de Ambiente Relacionadas

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `ADMIN_EMAIL` | E-mail auto-promovido a admin no primeiro login | (vazio) |
| `JWT_SECRET` | Chave para assinar tokens de sessão | (obrigatório) |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `7d` |
| `ENABLE_LOCAL_AUTH` | Habilitar login por e-mail/senha | `true` |

---

## Documentos Relacionados

- [13 — Customização White Label](./13-CUSTOMIZACAO-WHITE-LABEL.md)
- [15 — LLM Providers](./15-LLM-PROVIDERS.md)
- [19 — Segurança](./19-SEGURANCA.md)
- [21 — Autenticação Local](./21-AUTENTICACAO-LOCAL.md)
- [22 — SMTP/Brevo](./22-SMTP-BREVO.md)
- [24 — Referência ENV](./24-ENV-REFERENCE.md)
