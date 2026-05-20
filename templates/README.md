# Templates de Configuração — debuga.ai

Esta pasta contém templates de variáveis de ambiente para diferentes cenários de implantação. Nenhum template contém secrets reais — todos usam placeholders `CHANGE_ME`.

---

## Qual template usar?

| Cenário | Template | Descrição |
|---------|----------|-----------|
| Produção oficial debuga.ai | `.env.production.template` | Deploy principal com GPU + cloud fallback |
| Homologação | `.env.homolog.template` | Testes pré-produção, auth relaxado |
| Novo cliente white label | `.env.customer.template` | Base para provisionar clientes |
| On-premise com GPU | `.env.onprem-gpu.template` | Soberania de dados, inferência local |
| On-premise sem GPU | `.env.onprem-cpu.template` | Cloud como provider principal |
| Cloud-only (sem Ollama) | `.env.cloud-only.template` | Deploy leve, 100% cloud |

---

## Como usar

```bash
# 1. Copiar o template adequado
cp templates/.env.production.template .env

# 2. Proteger o arquivo
chmod 600 .env

# 3. Editar e preencher secrets
nano .env

# 4. Gerar secrets seguros
openssl rand -base64 64    # Para JWT_SECRET e SESSION_SECRET
openssl rand -base64 48    # Para senhas de banco e MinIO

# 5. Validar configuração
bash scripts/validate-all.sh --env .env
```

---

## Regras de Segurança

- **Nunca commitar** o arquivo `.env` real no repositório
- **Nunca colocar** secrets reais nos templates
- **Sempre usar** `chmod 600 .env` para proteger o arquivo
- **Sempre validar** com `validate-all.sh` antes de subir o ambiente
- O `.gitignore` já protege contra commit acidental de `.env`

---

## Detalhes por Template

### .env.production.template

Template completo para produção oficial. Inclui todas as variáveis necessárias com defaults seguros.

- GPU habilitada (Ollama)
- Fallback cloud (OpenAI)
- Auth hardening ativo (verificação de email, Turnstile, rate limiting)
- Stripe em modo live
- Logs em nível `warn`
- Cost safety com limites diários e mensais

### .env.homolog.template

Idêntico à produção, mas com configurações relaxadas para facilitar testes:

- Auth hardening desabilitado (sem verificação de email obrigatória)
- Turnstile desabilitado
- Rate limiting mais permissivo
- Stripe em modo teste
- Logs em nível `info`
- Limites de custo mais altos para testes

### .env.customer.template

Base para provisionar novos clientes white label. Contém placeholders genéricos que devem ser substituídos:

- `cliente_slug` → identificador único do cliente
- `ia.cliente.com.br` → domínio do cliente
- `Nome da Solução` → nome do produto do cliente
- `Nome da Empresa` → razão social do cliente
- Banco e bucket isolados por cliente

### .env.onprem-gpu.template

Para clientes que precisam de soberania total de dados:

- GPU como provider principal
- Fallback cloud opcional (pode ser removido)
- Dados nunca saem do ambiente
- OLLAMA_KEEP_ALIVE=-1 (modelo sempre carregado)
- Ideal para ambientes regulados (LGPD, compliance)

### .env.onprem-cpu.template

Para ambientes sem GPU disponível:

- Cloud como provider principal (OpenAI)
- Gemini como fallback
- Inferência local desabilitada
- Deploy mais leve (sem container Ollama)
- Custos de API maiores — ajustar limites

### .env.cloud-only.template

Deploy mínimo sem qualquer componente de inferência local:

- OpenAI como provider principal
- Anthropic como fallback
- Ollama completamente desabilitado
- Requisitos de hardware mínimos
- Ideal para MVPs e testes rápidos

---

## Provisionando um Novo Cliente

```bash
# 1. Clonar repositório
git clone git@github.com:SperryTecnologia/debuga-ai-prod.git /opt/cliente-ia

# 2. Copiar template de cliente
cd /opt/cliente-ia
cp templates/.env.customer.template .env
chmod 600 .env

# 3. Substituir placeholders
sed -i 's/cliente_slug/acme/g' .env
sed -i 's/ia.cliente.com.br/ia.acme.com.br/g' .env
sed -i 's/Nome da Solução/ACME IA/g' .env
sed -i 's/Nome da Empresa/ACME Tecnologia/g' .env

# 4. Gerar e preencher secrets
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)
DB_PASSWORD=$(openssl rand -base64 48)
MINIO_PASSWORD=$(openssl rand -base64 48)
# ... editar .env com os valores gerados

# 5. Validar
bash scripts/validate-all.sh --env .env

# 6. Subir ambiente
docker compose -f docker/docker-compose.yml up -d

# 7. Testar
# - Login
# - Chat com agente
# - Upload de arquivos
# - Painel admin
```

---

## Variáveis Obrigatórias (todos os templates)

| Variável | Descrição | Como gerar |
|----------|-----------|-----------|
| `POSTGRES_PASSWORD` | Senha do banco | `openssl rand -base64 48` |
| `JWT_SECRET` | Assinatura de tokens | `openssl rand -base64 64` |
| `SESSION_SECRET` | Assinatura de sessões | `openssl rand -base64 64` |
| `MINIO_ROOT_PASSWORD` | Senha do storage | `openssl rand -base64 48` |
| `OPENAI_API_KEY` | Chave OpenAI (se cloud) | [platform.openai.com](https://platform.openai.com) |
| `ADMIN_EMAIL` | Email do administrador | Definir manualmente |
| `DOMAIN` | Domínio da aplicação | Definir manualmente |

---

## Validação

Após configurar o `.env`, sempre validar:

```bash
# Validação completa
bash scripts/validate-all.sh --env /opt/debuga-ai/.env

# Resultado esperado:
# ✅ APROVADO PARA PRODUÇÃO (ou APROVADO COM AVISOS)
```

Se houver falhas, o relatório indicará exatamente o que corrigir.
