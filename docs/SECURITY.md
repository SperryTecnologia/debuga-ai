# Segurança

Guia de hardening e boas práticas de segurança para o debuga.ai em ambiente self-hosted.

---

## Visão Geral

A segurança de um deploy self-hosted é responsabilidade do operador. Este guia cobre as camadas de proteção recomendadas, da infraestrutura ao aplicativo.

| Camada | Escopo | Prioridade |
|--------|--------|-----------|
| Rede | Firewall, portas, SSH | Crítica |
| TLS/HTTPS | Criptografia em trânsito | Crítica |
| Docker | Isolamento, imagens, secrets | Alta |
| Aplicação | Headers, rate limiting, CORS | Alta |
| Dados | Backup, criptografia em repouso | Alta |
| Secrets | Gestão de credenciais | Crítica |
| Atualizações | Patches de segurança | Média |
| Resposta a Incidentes | Plano de ação | Média |

---

## 1. Firewall (UFW)

### Configuração Básica

```bash
# Instalar UFW (se não instalado)
sudo apt install -y ufw

# Política padrão: negar tudo de entrada, permitir saída
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (ALTERE A PORTA SE NECESSÁRIO)
sudo ufw allow 22/tcp comment "SSH"

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS"

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

### Portas que NÃO devem ser expostas

| Porta | Serviço | Motivo |
|-------|---------|--------|
| 3000 | App (Node.js) | Acessar apenas via Nginx |
| 5432 | PostgreSQL | Acesso apenas interno (Docker network) |
| 9000 | MinIO API | Acesso apenas interno |
| 9001 | MinIO Console | Acesso apenas interno ou VPN |
| 11434 | Ollama | Acesso apenas interno |

Se precisar acessar o MinIO Console externamente (para debug), use SSH tunnel:

```bash
ssh -L 9001:localhost:9001 usuario@servidor
# Acessar http://localhost:9001 no navegador local
```

---

## 2. Hardening SSH

### Configuração Recomendada

Editar `/etc/ssh/sshd_config`:

```bash
sudo nano /etc/ssh/sshd_config
```

Configurações recomendadas:

```
# Desabilitar login por senha (usar apenas chave SSH)
PasswordAuthentication no
PubkeyAuthentication yes

# Desabilitar login como root
PermitRootLogin no

# Limitar tentativas
MaxAuthTries 3
MaxSessions 3

# Timeout de inatividade
ClientAliveInterval 300
ClientAliveCountMax 2

# Desabilitar forwarding desnecessário
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no

# Restringir a usuários específicos
AllowUsers deploy ubuntu

# Mudar porta padrão (opcional, mas recomendado)
# Port 2222
```

Reiniciar SSH:

```bash
sudo systemctl restart sshd
```

### Fail2Ban

```bash
sudo apt install -y fail2ban

sudo tee /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verificar status
sudo fail2ban-client status sshd
```

---

## 3. TLS/HTTPS

### Certificado com Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Gerar certificado
sudo certbot certonly --standalone -d seudominio.com.br

# Renovação automática (já configurada pelo certbot)
sudo certbot renew --dry-run
```

### Configuração Nginx para TLS

```nginx
server {
    listen 443 ssl http2;
    server_name seudominio.com.br;

    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    # Protocolos seguros
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (1 ano)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name seudominio.com.br;
    return 301 https://$server_name$request_uri;
}
```

---

## 4. Docker Security

### Boas Práticas

| Prática | Descrição |
|---------|-----------|
| Não rodar como root | Usar `user:` no docker-compose |
| Imagens oficiais | Usar apenas imagens de fontes confiáveis |
| Versões fixas | Nunca usar `:latest` em produção |
| Read-only filesystem | Usar `read_only: true` quando possível |
| Limitar recursos | Usar `deploy.resources.limits` |
| Rede isolada | Usar redes Docker internas |
| Secrets | Nunca em variáveis de ambiente do compose file |

### Exemplo de Hardening no docker-compose.yml

```yaml
services:
  app:
    # Não rodar como root
    user: "1000:1000"
    # Limitar recursos
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    # Security options
    security_opt:
      - no-new-privileges:true
    # Filesystem read-only (exceto volumes)
    read_only: true
    tmpfs:
      - /tmp
      - /app/node_modules/.cache

  postgres:
    # Limitar recursos
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    # Não expor porta externamente
    # ports: NÃO DEFINIR (usar apenas rede interna)
```

### Atualizar Imagens

```bash
# Verificar imagens desatualizadas
docker images --format "{{.Repository}}:{{.Tag}} {{.CreatedSince}}"

# Atualizar imagens base
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d
```

---

## 5. Headers de Segurança (Nginx)

Adicionar ao bloco `server` do Nginx:

```nginx
# Prevenir clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevenir MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy (ajustar conforme necessário)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com" always;

# Permissions Policy
add_header Permissions-Policy "camera=(), microphone=(self), geolocation=()" always;
```

---

## 6. Rate Limiting (Nginx)

### Configuração Global

Em `/etc/nginx/nginx.conf` (ou no bloco `http`):

```nginx
http {
    # Definir zonas de rate limiting
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/s;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;
}
```

### Aplicar por Location

```nginx
server {
    # Páginas gerais
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://app:3000;
    }

    # API tRPC
    location /api/trpc/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://app:3000;
    }

    # Autenticação (mais restritivo)
    location /api/oauth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://app:3000;
    }

    # Webhooks Stripe
    location /api/stripe/webhook {
        limit_req zone=webhook burst=10 nodelay;
        proxy_pass http://app:3000;
    }
}
```

---

## 7. Gestão de Secrets

### Princípios

- Nunca commitar secrets no repositório
- Arquivo `.env` com permissão `600` (apenas owner lê)
- Secrets diferentes para cada ambiente
- Rotacionar secrets periodicamente

### Checklist de Secrets

| Secret | Rotação recomendada | Impacto da rotação |
|--------|--------------------|--------------------|
| `JWT_SECRET` | 90 dias | Invalida todas as sessões |
| `SESSION_SECRET` | 90 dias | Invalida sessões ativas |
| `POSTGRES_PASSWORD` | 180 dias | Requer atualizar app + DB |
| `MINIO_ROOT_PASSWORD` | 180 dias | Requer atualizar app + MinIO |
| `GOOGLE_CLIENT_SECRET` | Quando comprometido | Requer novo no Google Console |
| `STRIPE_SECRET_KEY` | Quando comprometido | Revogar no Stripe Dashboard |
| `LLM_CLOUD_API_KEY` | 90 dias | Gerar nova no provedor |

### Rotação de JWT_SECRET

```bash
# 1. Gerar novo secret
NEW_SECRET=$(openssl rand -base64 48)

# 2. Atualizar .env
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env

# 3. Reiniciar app (invalida sessões existentes)
docker compose -f docker/docker-compose.yml restart app
```

---

## 8. Backup Criptografado

### Criptografar Backup com GPG

```bash
# Gerar chave GPG (uma vez)
gpg --gen-key

# Backup criptografado
pg_dump -h localhost -U postgres debuga_production | \
  gzip | \
  gpg --encrypt --recipient admin@seudominio.com.br \
  > backup-$(date +%Y%m%d).sql.gz.gpg

# Restaurar
gpg --decrypt backup-20250115.sql.gz.gpg | \
  gunzip | \
  psql -h localhost -U postgres debuga_production
```

### Criptografar com OpenSSL (Alternativa)

```bash
# Criptografar
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in backup.sql.gz \
  -out backup.sql.gz.enc \
  -pass file:/opt/debuga-ai/.backup-key

# Descriptografar
openssl enc -aes-256-cbc -d -pbkdf2 \
  -in backup.sql.gz.enc \
  -out backup.sql.gz \
  -pass file:/opt/debuga-ai/.backup-key
```

---

## 9. Vulnerability Scanning

### Scan de Imagens Docker

```bash
# Instalar Trivy
sudo apt install -y wget apt-transport-https gnupg lsb-release
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update && sudo apt install -y trivy

# Scan da imagem do app
trivy image debuga-app:latest

# Scan com severidade mínima
trivy image --severity HIGH,CRITICAL debuga-app:latest
```

### Scan de Dependências (npm)

```bash
# Dentro do container ou no código-fonte
cd app
npm audit

# Corrigir automaticamente
npm audit fix
```

### Atualizações de Segurança do Host

```bash
# Verificar atualizações de segurança
sudo apt list --upgradable 2>/dev/null | grep -i security

# Aplicar apenas atualizações de segurança
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 10. Resposta a Incidentes

### Plano de Ação

| Etapa | Ação | Responsável |
|-------|------|-------------|
| 1. Detectar | Alerta automático ou relato de usuário | Sistema/Equipe |
| 2. Conter | Isolar o serviço afetado | Operador |
| 3. Investigar | Analisar logs e identificar causa | Operador |
| 4. Corrigir | Aplicar fix ou rollback | Operador |
| 5. Comunicar | Informar stakeholders | Gestor |
| 6. Prevenir | Documentar e implementar melhorias | Equipe |

### Ações Imediatas

```bash
# Se suspeitar de comprometimento:

# 1. Bloquear acesso externo (manter SSH)
sudo ufw deny 80/tcp
sudo ufw deny 443/tcp

# 2. Capturar estado atual
docker compose -f docker/docker-compose.yml logs > /tmp/incident-logs-$(date +%s).txt
docker ps -a > /tmp/incident-containers-$(date +%s).txt
netstat -tuln > /tmp/incident-network-$(date +%s).txt

# 3. Parar containers (se necessário)
docker compose -f docker/docker-compose.yml stop

# 4. Rotacionar todos os secrets
./scripts/generate-secrets.sh

# 5. Após investigação, restaurar acesso
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
docker compose -f docker/docker-compose.yml up -d
```

---

## 11. Auth Hardening (Aplicação)

Além das proteções de infraestrutura, o debuga.ai implementa camadas de segurança na aplicação:

### Rate Limiting (Express)

O servidor aplica rate limiting em todos os endpoints sensíveis:

| Endpoint | Limite | Janela |
|----------|--------|--------|
| `/api/auth/local/login` | 10 tentativas | 15 min |
| `/api/auth/local/register` | 5 registros | 15 min |
| `/api/auth/local/change-password` | 5 tentativas | 15 min |
| `/api/chat/stream` | 20 mensagens | 1 min |
| `/api/auth/verify-email` | 10 tentativas | 15 min |

Configurável via `.env`:
```bash
RATE_LIMIT_ENABLED=true
AUTH_RATE_LIMIT_WINDOW_MINUTES=15
AUTH_RATE_LIMIT_MAX=10
CHAT_RATE_LIMIT_WINDOW_MINUTES=1
CHAT_RATE_LIMIT_MAX=20
```

### Account Lockout

Após 5 tentativas de login falhas consecutivas, a conta é bloqueada por 30 minutos.
O admin pode desbloquear manualmente via `/admin/users`.

### Verificação de E-mail

Quando habilitada (`EMAIL_VERIFICATION_ENABLED=true`), o sistema:
1. Envia token de verificação por e-mail no registro
2. Pode bloquear acesso ao chat até verificação (`REQUIRE_EMAIL_FOR_CHAT=true`)
3. Tokens expiram em 24 horas
4. Rate limit de 1 reenvio a cada 60 segundos

### Cloudflare Turnstile (CAPTCHA)

Proteção anti-bot nos formulários de registro e login:
- Invisível para a maioria dos usuários
- Compatível com LGPD (sem cookies de tracking)
- Docs: `docs/23-CLOUDFLARE-TURNSTILE.md`

### Bloqueio de E-mails Descartáveis

O sistema bloqueia registro com domínios descartáveis (tempmail, guerrillamail, etc.).
Lista com 100+ domínios conhecidos. Configurável via `BLOCK_DISPOSABLE_EMAILS=true`.

### Validação de Senha

Requisitos mínimos:
- 8 caracteres
- 1 letra maiúscula
- 1 letra minúscula
- 1 número
- 1 caractere especial

### Auditoria

Todos os eventos de autenticação são registrados na tabela `audit_logs`:
- Registro, login, logout, falhas
- Mudanças de senha, verificações
- Ações administrativas (promote, block, unlock)

Visualizável em `/admin/audit`.

### Scripts de Diagnóstico

```bash
./scripts/check-auth-security.sh    # Verifica configuração de segurança
./scripts/check-email-provider.sh    # Testa SMTP
./scripts/check-turnstile-config.sh  # Valida Turnstile
```

---

## 12. Checklist de Segurança

### Antes do Deploy

- [ ] Firewall configurado (UFW) — apenas portas 22, 80, 443 abertas
- [ ] SSH com chave (sem senha), root login desabilitado
- [ ] Fail2Ban instalado e ativo
- [ ] `.env` com permissão 600
- [ ] Secrets gerados com entropia adequada (32+ caracteres)
- [ ] Nenhum secret commitado no repositório

### Após o Deploy

- [ ] TLS/HTTPS ativo com certificado válido
- [ ] Renovação automática do certificado (certbot timer)
- [ ] Headers de segurança configurados no Nginx
- [ ] Rate limiting ativo
- [ ] Logs com rotação configurada
- [ ] Backup automático configurado
- [ ] Health checks ativos

### Manutenção Periódica

- [ ] Atualizações de segurança do host (semanal)
- [ ] Scan de vulnerabilidades nas imagens Docker (mensal)
- [ ] Rotação de secrets (trimestral)
- [ ] Revisão de logs de acesso (semanal)
- [ ] Teste de restauração de backup (mensal)
- [ ] Revisão de regras de firewall (trimestral)

---

## Documentos Relacionados

| Documento | Conteúdo |
|-----------|----------|
| `docs/04-DEPLOY.md` | Configuração de Nginx e TLS |
| `docs/09-BACKUP-RESTORE.md` | Backup e restauração |
| `docs/14-SELF-HOSTED.md` | Deploy self-hosted |
| `docs/18-OBSERVABILIDADE.md` | Monitoramento e logs |
| `docs/21-AUTENTICACAO-LOCAL.md` | Login local e-mail/senha |
| `docs/22-SMTP-BREVO.md` | Configuração SMTP/Brevo |
| `docs/23-CLOUDFLARE-TURNSTILE.md` | CAPTCHA Turnstile |
| `docs/24-ENV-REFERENCE.md` | Referência completa de variáveis |
