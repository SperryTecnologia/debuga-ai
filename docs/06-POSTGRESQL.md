# 06 - PostgreSQL

## Visao Geral

O homolog usa PostgreSQL 16 em vez do MySQL/TiDB da producao. O schema foi convertido mantendo a mesma estrutura logica.

## Mudancas em Relacao a Producao

| Aspecto | Producao (MySQL) | Homolog (PostgreSQL) |
|---------|-----------------|---------------------|
| Tipos de tabela | `mysqlTable` | `pgTable` |
| Auto-increment | `int().autoincrement()` | `serial()` |
| Enums | `mysqlEnum()` | `pgEnum()` |
| Inteiros | `int()` | `integer()` |
| `onUpdateNow()` | Suportado nativamente | Removido (trigger manual se necessario) |
| Dialect (drizzle) | `mysql` | `postgresql` |

## Schema Inicial

O banco e criado automaticamente pelo script `docker/init-db/01-init.sql` na primeira inicializacao do container PostgreSQL. As tabelas criadas sao:

- `users` - Usuarios com Google OAuth
- `conversations` - Conversas do chat
- `messages` - Mensagens individuais
- `subscriptions` - Assinaturas Stripe
- `credits` - Creditos de uso
- `usage_log` - Log de uso detalhado
- `usage_events` - Contadores de uso

## Acesso ao Banco

```bash
# Via Docker
docker exec -it debuga-postgres psql -U debuga -d debuga_homolog

# Via psql local (se instalado)
psql postgresql://debuga:debuga_secret@localhost:5432/debuga_homolog
```

## Migrations

Para alteracoes no schema apos o deploy inicial:

```bash
# 1. Editar drizzle/schema.ts
# 2. Gerar migration
cd app && pnpm drizzle-kit generate

# 3. Revisar SQL gerado em drizzle/
# 4. Aplicar manualmente
docker exec -i debuga-postgres psql -U debuga -d debuga_homolog < drizzle/XXXX_migration.sql
```

## Promover Usuario a Admin

```sql
UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';
```

## Backup e Restore

Backups sao gerenciados pelos scripts `scripts/backup.sh` e `scripts/restore.sh`. Veja `09-BACKUP-RESTORE.md`.

## Nota sobre onUpdateNow

O PostgreSQL nao suporta `ON UPDATE CURRENT_TIMESTAMP` nativamente como o MySQL. Se necessario, crie um trigger:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
