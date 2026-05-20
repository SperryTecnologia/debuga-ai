# 25 — Checklist de Produção (Production Readiness)

Checklist completo para validar que o debuga.ai está pronto para uso em produção.

---

## 1. Infraestrutura

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Docker Engine | v24+ instalado | `docker --version` |
| Docker Compose | v2+ instalado | `docker compose version` |
| RAM disponível | Mínimo 4GB (8GB com Ollama) | `free -h` |
| Disco | Mínimo 20GB livres | `df -h /` |
| Portas abertas | 80, 443 (Nginx/Traefik) | `ss -tlnp \| grep -E '80\|443'` |
| DNS configurado | Domínio apontando para o servidor | `dig +short seudominio.com` |
| SSL/TLS | Certificado válido (Let's Encrypt) | `curl -I https://seudominio.com` |
| Firewall | Apenas 80/443/22 abertos | `ufw status` |

---

## 2. Banco de Dados (PostgreSQL)

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| PostgreSQL rodando | Container `db` healthy | `docker compose ps db` |
| Schema aplicado | Todas as tabelas criadas | `psql -c "\dt"` |
| Migrações em dia | 0001 a 0004 aplicadas | Verificar `drizzle/*.sql` |
| Backup configurado | pg_dump agendado (cron) | `crontab -l` |
| Conexão testada | App conecta sem erros | `docker compose logs app \| grep "Database"` |
| Senha forte | Não usar `postgres`/`password` | Verificar `.env` → `POSTGRES_PASSWORD` |

---

## 3. LLM Provider

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Provider configurado | Pelo menos 1 provider ativo | `./scripts/check-llm-provider.sh` |
| API Key válida | Teste de conexão passa | Admin → Providers → Testar Conexão |
| Modelo definido | `LLM_CLOUD_MODEL` preenchido | Verificar `.env` |
| Fallback configurado | Provider secundário definido | `LLM_FALLBACK_PROVIDER=ollama` |
| Rate limit ativo | Protege contra abuso | `RATE_LIMIT_ENABLED=true` |
| Latência aceitável | < 2000ms no teste | Admin → Providers → Latência |

---

## 4. Autenticação

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Login local funciona | Registro + login OK | Testar em `/login` |
| Google OAuth funciona | Redirect + callback OK | Testar botão Google |
| Admin promovido | Pelo menos 1 admin existe | `./scripts/promote-admin.sh email@...` |
| Cookie seguro | `secure: true` em produção | Verificar `APP_ENV=production` |
| JWT_SECRET forte | Mínimo 32 caracteres aleatórios | `openssl rand -hex 32` |
| Lockout funciona | 5 tentativas → bloqueio 15min | Testar login errado 5x |

---

## 5. Verificação de Email

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| SMTP configurado | Host + user + pass preenchidos | `./scripts/check-email-provider.sh` |
| Email de teste enviado | Chega na caixa de entrada | Registrar novo usuário |
| Template correto | Link de verificação funciona | Clicar no link do email |
| SPF/DKIM configurado | Email não cai em spam | Verificar DNS do domínio |
| Fallback console | Em dev, loga no terminal | `EMAIL_VERIFICATION_ENABLED=true` sem SMTP |

---

## 6. Segurança

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| HTTPS obrigatório | Redirect HTTP → HTTPS | `curl -I http://seudominio.com` |
| Turnstile ativo | CAPTCHA no login/registro | `ENABLE_TURNSTILE=true` |
| Emails descartáveis bloqueados | Rejeita mailinator, etc. | `BLOCK_DISPOSABLE_EMAILS=true` |
| Rate limiting ativo | Protege auth e chat | `RATE_LIMIT_ENABLED=true` |
| Senha forte exigida | Mínimo 8 chars, 1 maiúscula, 1 número | Testar registro |
| Headers de segurança | X-Frame-Options, CSP, etc. | Nginx/Traefik config |
| Logs de auditoria | Eventos registrados | Admin → Auditoria |
| Sem secrets no código | Nenhum valor real commitado | `grep -rn "sk-\|AIza" app/` |

---

## 7. White Label

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Nome da empresa | Preenchido no admin | Admin → White Label |
| Logo configurado | URL válida | Admin → White Label |
| Cores personalizadas | Primary/secondary definidas | Admin → White Label |
| Razão social | Preenchida (LGPD) | Admin → White Label → Dados Legais |
| Email de suporte | Preenchido | Admin → White Label |
| WhatsApp suporte | Preenchido (opcional) | Admin → White Label |
| Termos de uso | URL configurada | Admin → White Label → URLs Legais |
| Política de privacidade | URL configurada | Admin → White Label → URLs Legais |

---

## 8. Páginas Legais (LGPD)

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| /termos acessível | Página carrega sem erro | `curl -s https://seudominio.com/termos` |
| /privacidade acessível | Página carrega sem erro | `curl -s https://seudominio.com/privacidade` |
| Dados da empresa corretos | CNPJ, endereço, DPO | Verificar conteúdo das páginas |
| Checkbox no registro | Aceite obrigatório | `REQUIRE_TERMS_ACCEPTANCE=true` |
| Links no footer | Visíveis em todas as páginas | Verificar footer do chat |

---

## 9. Funcionalidades Core

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Chat funciona | Mensagem enviada → resposta recebida | Testar como usuário |
| Streaming funciona | Resposta aparece progressivamente | Observar animação |
| Histórico salvo | Conversas persistem após reload | Recarregar página |
| Admin dashboard | Estatísticas carregam | Acessar `/admin` |
| Instruções IA | CRUD funciona | Admin → Instruções IA |
| Base de conhecimento | CRUD funciona | Admin → Base de Conhecimento |
| Aprendizado | Sugestões aparecem | Admin → Aprendizado |
| Logs de provider | Registros salvos | Admin → Logs IA |
| Gestão de usuários | Listar/editar/bloquear | Admin → Usuários |

---

## 10. Performance

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Tempo de resposta < 3s | Primeira mensagem rápida | Medir com DevTools |
| Build otimizado | `NODE_ENV=production` | Verificar `.env` |
| Gzip ativo | Respostas comprimidas | `curl -H "Accept-Encoding: gzip" -I ...` |
| Sem memory leaks | RAM estável após 24h | `docker stats` |
| Logs não crescem infinito | Rotação configurada | `logrotate` ou Docker log driver |

---

## 11. Monitoramento

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| Health check | `/api/health` retorna 200 | `curl https://seudominio.com/api/health` |
| Logs acessíveis | `docker compose logs -f app` | Verificar output |
| Alertas configurados | Uptime monitor ativo | UptimeRobot, Pingdom, etc. |
| Backup automático | pg_dump diário | Verificar cron |
| Disk space monitor | Alerta em 80% uso | Configurar alerta |

---

## 12. Deploy Final

| Item | Verificação | Comando/Ação |
|------|-------------|--------------|
| `.env` revisado | Todos os campos preenchidos | `./scripts/validate-env.sh` |
| Build passa | Sem erros TypeScript | `pnpm build` |
| Docker compose up | Todos os containers healthy | `docker compose up -d && docker compose ps` |
| Smoke test | Login + chat + admin OK | Testar manualmente |
| DNS propagado | Domínio resolve corretamente | `nslookup seudominio.com` |
| SSL válido | Certificado não expirado | `echo \| openssl s_client -connect ...` |

---

## Scripts de Validação

Execute todos os scripts de validação antes do deploy:

```bash
# Validar variáveis de ambiente
./scripts/validate-env.sh

# Verificar provider LLM
./scripts/check-llm-provider.sh

# Verificar email SMTP
./scripts/check-email-provider.sh

# Verificar Turnstile
./scripts/check-turnstile-config.sh

# Verificar segurança de autenticação
./scripts/check-auth-security.sh

# Verificar prontidão geral
./scripts/check-production-readiness.sh
```

---

## Ordem de Deploy Recomendada

1. Configurar servidor (Docker, firewall, DNS)
2. Clonar repositório e configurar `.env`
3. Executar `./scripts/validate-env.sh`
4. Subir containers: `docker compose up -d`
5. Aplicar migrações: `psql < drizzle/0003_auth_hardening.sql && psql < drizzle/0004_learning_suggestions.sql`
6. Promover admin: `./scripts/promote-admin.sh admin@empresa.com`
7. Configurar White Label no admin
8. Testar login, chat, e admin
9. Configurar SSL (Certbot/Traefik)
10. Configurar backup automático
11. Configurar monitoramento

---

## Documentos Relacionados

- [02-CONFIGURACAO-ENV.md](./02-CONFIGURACAO-ENV.md) — Configuração de variáveis
- [19-SEGURANCA.md](./19-SEGURANCA.md) — Práticas de segurança
- [21-AUTENTICACAO-LOCAL.md](./21-AUTENTICACAO-LOCAL.md) — Sistema de autenticação
- [22-SMTP-BREVO.md](./22-SMTP-BREVO.md) — Configuração de email
- [23-CLOUDFLARE-TURNSTILE.md](./23-CLOUDFLARE-TURNSTILE.md) — Proteção anti-bot
- [24-ENV-REFERENCE.md](./24-ENV-REFERENCE.md) — Referência completa de variáveis
