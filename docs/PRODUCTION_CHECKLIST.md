# Checklist de Produção — debuga.ai

**Verificações obrigatórias antes e após cada deploy em produção.**

Versão 1.0 | Maio 2026 | Sperry Tecnologia

---

## Pré-Deploy

- [ ] Código revisado e testado em ambiente de staging
- [ ] Migrations de banco aplicadas (se houver)
- [ ] Variáveis de ambiente atualizadas (se houver novas)
- [ ] Build Docker compilando sem erros
- [ ] Testes unitários passando

---

## Deploy

- [ ] `git pull origin main` sem conflitos
- [ ] `docker compose up -d --build --force-recreate app` executado
- [ ] Container `debuga-app` com status `Up`
- [ ] Health check retornando `status: healthy`
- [ ] Database `schemaReady: true` e `missingTables: []`

---

## Pós-Deploy — Funcional

- [ ] Landing page carregando corretamente
- [ ] Login/cadastro funcionando
- [ ] Chat respondendo (enviar mensagem de teste)
- [ ] Stripe checkout abrindo (se alterado)
- [ ] Painel admin acessível (se alterado)

---

## Pós-Deploy — SEO e Analytics

- [ ] `./scripts/check-seo-analytics.sh` passando
- [ ] `./scripts/check-public-links.sh` passando
- [ ] `./scripts/check-security-headers.sh` passando
- [ ] GA4 Realtime mostrando visitas
- [ ] sitemap.xml acessível
- [ ] robots.txt acessível
- [ ] OG image carregando

---

## Pós-Deploy — Segurança

- [ ] HTTPS funcionando (certificado válido)
- [ ] Headers de segurança presentes (HSTS, CSP, X-Frame)
- [ ] Rate limiting ativo
- [ ] Turnstile CAPTCHA funcionando no login/registro
- [ ] Nenhum secret exposto em logs ou console

---

## Rollback

Se algo falhar após o deploy:

```bash
cd /opt/debuga-ai
git log --oneline -5  # identificar commit anterior
git checkout <commit-anterior>
docker compose --env-file .env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.gpu.yml \
  up -d --build --force-recreate app
```

---
