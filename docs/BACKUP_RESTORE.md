# Backup e Restore

## Backup Automatico

O script `scripts/backup.sh` cria backups comprimidos do PostgreSQL e MinIO.

```bash
./scripts/backup.sh
```

### O Que e Salvo

- **PostgreSQL**: dump completo no formato custom (comprimido)
- **MinIO**: mirror do bucket (se `mc` estiver instalado)

### Saida

Os backups sao salvos em `backups/YYYYMMDD_HHMMSS.tar.gz`.

### Agendamento (Cron)

Para backups automaticos a cada 6 horas:

```bash
crontab -e
# Adicionar:
0 */6 * * * /opt/debuga-ai/scripts/backup.sh >> /var/log/debuga-backup.log 2>&1
```

### Retencao

Backups com mais de 7 dias sao removidos automaticamente. Altere `BACKUP_RETENTION_DAYS` no `.env` para mudar.

## Restore

```bash
./scripts/restore.sh backups/20260512_120000.tar.gz
```

O script:

1. Extrai o arquivo
2. Pede confirmacao (operacao destrutiva)
3. Para a aplicacao
4. Restaura o PostgreSQL (`pg_restore --clean`)
5. Restaura o MinIO (se presente no backup)
6. Reinicia a aplicacao

## Restore Manual do PostgreSQL

```bash
# Extrair backup
tar -xzf backups/20260512_120000.tar.gz

# Restaurar
docker exec -i debuga-postgres pg_restore \
  -U debuga -d debuga_prod --clean --if-exists \
  < 20260512_120000/postgres.dump
```

## Boas Praticas

- Teste o restore periodicamente em um ambiente separado
- Mantenha pelo menos 1 backup offsite (copiar para outro servidor ou S3)
- Antes de migrations destrutivas, execute `backup.sh` manualmente
