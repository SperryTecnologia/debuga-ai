# Segurança - debuga.ai

## Principios

| Principio | Implementacao |
|-----------|---------------|
| **Defesa em profundidade** | UFW + Nginx rate limiting + fail2ban + Docker network isolation |
| **Minimo privilegio** | Usuario `debuga` sem root; containers non-root; portas internas em localhost |
| **Secrets fora do codigo** | Todas as credenciais via `.env` (nunca commitado) |
| **TLS obrigatorio** | Let's Encrypt com HSTS; HTTP redireciona para HTTPS |
| **Isolamento de rede** | Rede Docker bridge dedicada; servicos internos inacessiveis externamente |

## Camadas de Seguranca

### 1. Rede

- **UFW**: Apenas SSH (22), HTTP (80), HTTPS (443) abertos
- **fail2ban**: Bloqueia IPs apos 3 tentativas SSH falhas (ban de 1 hora)
- **Docker network**: Rede `debuga-net` isolada; PostgreSQL, MinIO, Ollama acessiveis apenas internamente
- **Portas bind**: Servicos internos vinculados a `127.0.0.1` (nao expostos publicamente)

### 2. Nginx

- **Rate limiting**: 5 req/min para auth, 30 req/s para API, 60 req/s geral
- **Headers de seguranca**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, HSTS
- **CSP**: Content-Security-Policy restritivo (permite apenas origens necessarias)
- **TLS**: TLSv1.2+ com ciphers modernos

### 3. Aplicacao

- **JWT sessions**: Cookies assinados com HS256, expiracao de 1 ano
- **CSRF**: Cookies SameSite=Lax
- **Input validation**: tRPC com Zod schemas
- **SQL injection**: Drizzle ORM (queries parametrizadas)

### 4. Dados

- **Banco**: Acesso apenas via rede Docker interna
- **Storage**: MinIO com credenciais dedicadas
- **Backups**: Comprimidos e com retencao automatica

## O Que NAO Fazer

- Nunca commitar o arquivo `.env`
- Nunca expor PostgreSQL (5432) ou MinIO (9000) publicamente
- Nunca usar as credenciais padrao do MinIO em producao
- Nunca desabilitar o firewall UFW
- Nunca rodar containers como root em producao

## Checklist de Seguranca Pre-Deploy

- [ ] `JWT_SECRET` gerado com `openssl rand -hex 32` (min. 32 chars)
- [ ] `POSTGRES_PASSWORD` forte (min. 16 chars)
- [ ] `MINIO_ROOT_PASSWORD` alterado do padrao
- [ ] UFW ativo com regras corretas
- [ ] fail2ban ativo
- [ ] Certificado TLS valido
- [ ] `.env` com permissoes 600 (`chmod 600 .env`)
- [ ] Google OAuth em modo "Production" (apos testes)
