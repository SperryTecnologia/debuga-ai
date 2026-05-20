# Procedimento de Rollback

Este documento descreve como reverter uma atualização em produção caso ocorram problemas após um deploy.

---

## Cenários de Rollback

| Cenário | Ação |
|---------|------|
| Bug crítico após atualização | Rollback para commit anterior |
| Migração de banco com erro | Restaurar dump + rollback código |
| Serviço não inicia após build | Rollback para imagem anterior |
| Perda de dados | Restaurar backup completo |

---

## Rollback Rápido (Código)

```bash
# 1. Parar produção
cd /opt/debuga-ai
docker compose -f docker/docker-compose.yml down

# 2. Voltar para commit anterior
git log --oneline -10  # identificar commit estável
git checkout <commit-hash>

# 3. Rebuild e restart
docker compose -f docker/docker-compose.yml up -d --build

# 4. Validar
bash scripts/validate-all.sh --env /opt/debuga-ai/.env
```

---

## Rollback com Restauração de Banco

Se a atualização incluiu migração de banco que corrompeu dados:

```bash
# 1. Parar produção
cd /opt/debuga-ai
docker compose -f docker/docker-compose.yml down

# 2. Voltar código
git checkout <commit-anterior>

# 3. Restaurar dump do banco
bash scripts/restore.sh /data/debuga/backups/<backup-pre-update>.tar.gz

# 4. Subir serviços
docker compose -f docker/docker-compose.yml up -d --build

# 5. Validar
bash scripts/validate-all.sh --env /opt/debuga-ai/.env
```

---

## Rollback para Homologação (Emergência)

Em caso de falha total da produção, é possível redirecionar o tráfego para o ambiente de homologação enquanto o problema é resolvido:

```bash
# 1. Parar produção
cd /opt/debuga-ai
docker compose -f docker/docker-compose.yml down

# 2. Subir homologação (se disponível)
cd /opt/debuga-ai-homolog
docker compose -f docker/docker-compose.yml up -d

# 3. Atualizar DNS (Cloudflare)
# Apontar debuga.ai para o IP do servidor de homologação
# Ou ajustar NGINX para rotear para a porta de homologação

# 4. Validar
bash scripts/validate-all.sh --env /opt/debuga-ai-homolog/.env
```

---

## Restauração Completa

Para restaurar todo o ambiente a partir de um backup:

```bash
# 1. Parar tudo
cd /opt/debuga-ai
docker compose -f docker/docker-compose.yml down

# 2. Restaurar .env (se necessário)
cp /data/debuga/backups/.env.backup .env

# 3. Restaurar banco + storage
bash scripts/restore.sh /data/debuga/backups/<arquivo>.tar.gz

# 4. Voltar código para versão estável
git checkout <commit-estavel>

# 5. Rebuild
docker compose -f docker/docker-compose.yml up -d --build

# 6. Validar
curl -I https://debuga.ai
bash scripts/validate-all.sh --env /opt/debuga-ai/.env
```

---

## Reverter DNS (Cloudflare)

Se o rollback envolve mudança de servidor:

1. Acessar Cloudflare Dashboard
2. Selecionar domínio `debuga.ai`
3. DNS → Records
4. Alterar registro A para o IP do servidor anterior
5. TTL: 1 minuto (para propagação rápida)
6. Aguardar propagação (1-5 minutos com proxy ativo)

---

## Checklist Pré-Rollback

```
[ ] Identificar commit estável (git log)
[ ] Verificar se há backup recente do banco
[ ] Comunicar equipe sobre indisponibilidade temporária
[ ] Documentar o problema que motivou o rollback
[ ] Após rollback, validar com validate-all.sh
[ ] Após estabilização, investigar causa raiz
```

---

## Prevenção

Para minimizar a necessidade de rollback:

1. Sempre fazer backup antes de atualizar: `bash scripts/backup.sh`
2. Testar em homologação antes de aplicar em produção
3. Usar `validate-all.sh` após cada deploy
4. Manter pelo menos 3 backups recentes em `/data/debuga/backups/`
5. Documentar cada deploy com commit hash e data
