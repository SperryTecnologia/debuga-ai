# 17. Produção vs Homologação vs White Label

Guia para entender as diferenças entre os três ambientes de deploy do debuga.ai e quando usar cada um.

---

## Visão Geral

O debuga.ai opera em três ambientes distintos, cada um com propósito, configuração e ciclo de vida próprios.

| Aspecto | Produção | Homologação | White Label |
|---------|----------|-------------|-------------|
| **Propósito** | Atender clientes finais | Testar antes de publicar | Marca do cliente |
| **Domínio** | `debuga.ai` | `seu-dominio.com.br` | `app.cliente.com.br` |
| **Dados** | Reais | Teste | Reais (do cliente) |
| **Stripe** | Chaves live (`sk_live_`) | Chaves teste (`sk_test_`) | Chaves do cliente |
| **Google OAuth** | Projeto verificado | Projeto em teste | Projeto do cliente |
| **LLM** | Forge API (cloud-only) | Cloud ou local | Escolha do cliente |
| **Analytics** | GA4 produção | GA4 homolog ou vazio | GA4 do cliente |
| **Backup** | Diário, 30 dias | Semanal, 7 dias | Conforme contrato |
| **Acesso** | Público | Equipe interna | Equipe do cliente |

---

## Produção

O ambiente de produção é o que atende os clientes finais do debuga.ai. Roda na infraestrutura de produção com deploy gerenciado.

### Características

- Domínio principal: `debuga.ai`
- Stripe em modo live (transações reais)
- Google OAuth verificado pelo Google (sem limite de usuários)
- LLM via Forge API (gateway cloud — não disponível para self-hosted)
- Monitoramento e analytics ativos
- Backup automático diário

### Template de .env

```bash
cp templates/.env.production.template .env
```

### Checklist de Produção

- [ ] Domínio com DNS configurado e TLS ativo
- [ ] Stripe com chaves live e webhook verificado
- [ ] Google OAuth com projeto verificado (não mais em modo teste)
- [ ] LLM configurado e testado
- [ ] Backup automático configurado (cron)
- [ ] Monitoramento de logs ativo
- [ ] Analytics (GA4) configurado
- [ ] Teste de carga realizado

---

## Homologação

O ambiente de homologação é usado para testar novas versões, treinar equipe e validar configurações antes de ir para produção.

### Características

- Subdomínio: `seu-dominio.com.br` (ou outro subdomínio)
- Stripe em modo teste (cartão 4242 4242 4242 4242)
- Google OAuth em modo teste (limite de 100 usuários de teste)
- LLM pode ser local (Ollama) ou cloud com chaves de teste
- Dados de teste (não usar dados reais de clientes)
- Ideal para treinamento e laboratório

### Template de .env

```bash
cp templates/.env.homolog.template .env
```

### Checklist de Homologação

- [ ] Subdomínio configurado e acessível
- [ ] Stripe com chaves de teste
- [ ] Google OAuth com usuários de teste adicionados
- [ ] LLM configurado (local ou cloud)
- [ ] Dados de teste inseridos
- [ ] Equipe com acesso ao ambiente

---

## White Label

O ambiente White Label é uma instância completa do debuga.ai implantada com a marca e infraestrutura de um cliente.

### Características

- Domínio do cliente: `app.cliente.com.br`
- Marca do cliente (logo, cores, nome, textos)
- Conta Stripe do cliente
- Projeto Google OAuth do cliente
- LLM escolhido pelo cliente (local, cloud ou híbrido)
- Analytics do cliente
- Infraestrutura do cliente (cloud, VPS ou on-premises)

### Template de .env

```bash
cp templates/.env.whitelabel.template .env
```

### O que Personalizar

Consulte `docs/13-CUSTOMIZACAO-WHITE-LABEL.md` para o guia completo. Resumo:

| Categoria | Arquivos | O que mudar |
|-----------|----------|------------|
| Marca | `.env`, `manifest.webmanifest` | Nome, logo, favicon |
| Cores | `client/src/index.css` | Variáveis CSS (OKLCH) |
| Textos | `client/src/pages/Home.tsx` | Landing page, CTAs |
| Agente | `server/agentIdentity.ts` | Nome, personalidade, blocos |
| Auth | `.env`, Google Cloud Console | Projeto OAuth do cliente |
| Pagamentos | `.env`, Stripe Dashboard | Conta Stripe do cliente |
| Analytics | `.env` | GA4 do cliente |
| Domínio | `.env`, `nginx/conf.d/` | DNS, TLS, server_name |

### Checklist White Label

- [ ] Domínio do cliente configurado com DNS e TLS
- [ ] Logo e favicon do cliente aplicados
- [ ] Cores personalizadas em index.css
- [ ] Textos da landing page atualizados
- [ ] Nome do agente personalizado em agentIdentity.ts
- [ ] Google OAuth com projeto do cliente
- [ ] Stripe com conta do cliente
- [ ] Analytics com GA4 do cliente
- [ ] Manifest PWA atualizado
- [ ] Build realizado (`docker compose build --no-cache app`)
- [ ] Teste completo (login, chat, pagamento)

---

## Diferenças Técnicas

### Banco de Dados

Cada ambiente deve ter seu próprio banco de dados, nunca compartilhar.

| Ambiente | `POSTGRES_DB` | Observação |
|----------|--------------|-----------|
| Produção | `debuga_production` | Dados reais, backup diário |
| Homologação | `debuga_homolog` | Dados de teste, pode ser resetado |
| White Label | `cliente_production` | Dados do cliente, backup conforme contrato |

### Storage (MinIO/S3)

Cada ambiente deve ter seu próprio bucket.

| Ambiente | `S3_BUCKET` | Observação |
|----------|------------|-----------|
| Produção | `debuga-production` | Arquivos reais |
| Homologação | `debuga-homolog` | Arquivos de teste |
| White Label | `cliente-files` | Arquivos do cliente |

### Stripe

| Ambiente | Tipo de chave | Webhook URL |
|----------|--------------|-------------|
| Produção | `sk_live_*` / `pk_live_*` | `https://debuga.ai/api/stripe/webhook` |
| Homologação | `sk_test_*` / `pk_test_*` | `https://seu-dominio.com.br/api/stripe/webhook` |
| White Label | Chaves do cliente | `https://app.cliente.com.br/api/stripe/webhook` |

---

## Fluxo de Atualização Recomendado

```
1. Desenvolver no ambiente de produção (produção)
2. Gerar novo pacote homolog (ZIP ou git push)
3. Testar em homologação
4. Se aprovado, aplicar em produção
5. Atualizar instâncias White Label conforme contrato
```

Para cada instância White Label, manter um registro de:
- Versão atual do código
- Personalizações aplicadas
- Configurações específicas do cliente
- Data da última atualização

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| `docs/02-CONFIGURACAO-ENV.md` | Todas as variáveis de ambiente |
| `docs/13-CUSTOMIZACAO-WHITE-LABEL.md` | Guia completo de personalização |
| `docs/14-SELF-HOSTED.md` | Deploy self-hosted |
| `docs/16-DEPLOY-GITHUB.md` | Deploy via GitHub |
