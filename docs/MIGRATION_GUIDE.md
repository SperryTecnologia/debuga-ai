# Guia de Migração — Hosting Próprio com Google OAuth

**debuga.ai — De Manus Hosting para Infraestrutura Própria**

**Versão:** 1.0  
**Data:** Maio 2026  
**Autor:** Sperry Tecnologia

---

## Sumário Executivo

Este guia detalha como migrar o debuga.ai do hosting gerenciado pelo Manus para infraestrutura própria, incluindo a substituição do sistema de autenticação OAuth do Manus pelo Google OAuth com tela de login personalizada. O processo é dividido em 5 etapas e **não requer GPUs** — o debuga.ai é um aplicativo web convencional que consome APIs de LLM externas.

---

## 1. Requisitos de Infraestrutura

### 1.1 O que Você Precisa (Sem GPUs)

O debuga.ai é um app web Node.js que chama APIs de LLM externas. A IA roda nos servidores do provedor de LLM (Google, OpenAI, etc.), não na sua infraestrutura. Portanto, os requisitos são modestos:

| Componente | Especificação Mínima | Recomendado | Custo Estimado |
|---|---|---|---|
| Servidor (VPS) | 2 vCPUs, 4GB RAM, 40GB SSD | 4 vCPUs, 8GB RAM, 80GB SSD | R$ 50-150/mês |
| Banco de Dados | MySQL 8.0+ (1GB) | TiDB Serverless ou PlanetScale | R$ 0-50/mês |
| Armazenamento S3 | Qualquer compatível S3 | Cloudflare R2 (free tier generoso) | R$ 0-20/mês |
| Domínio | debuga.ai (já registrado) | — | R$ 40-80/ano |
| SSL/TLS | Let's Encrypt (gratuito) | — | R$ 0 |
| API de LLM | Google Gemini API | OpenAI GPT-4o como fallback | R$ 50-500/mês (por uso) |

**Custo total estimado: R$ 100-800/mês** (dependendo do volume de uso da API de LLM).

### 1.2 Provedores Recomendados

| Provedor | Tipo | Vantagem | Preço Inicial |
|---|---|---|---|
| **Hetzner** | VPS (Europa) | Melhor custo-benefício | €4,51/mês (2vCPU/4GB) |
| **DigitalOcean** | VPS (Global) | Simplicidade, App Platform | US$ 6/mês |
| **AWS Lightsail** | VPS (Brasil) | Datacenter em São Paulo | US$ 5/mês |
| **Vultr** | VPS (Brasil) | Datacenter em São Paulo | US$ 6/mês |
| **Railway** | PaaS | Deploy automático do Git | US$ 5/mês |
| **PlanetScale** | MySQL Serverless | Free tier generoso | R$ 0 (hobby) |
| **Cloudflare R2** | S3 Storage | 10GB grátis, sem egress fees | R$ 0 (free tier) |

> **Nota importante:** Se optar por um provedor com datacenter no Brasil (AWS São Paulo, Vultr São Paulo), a latência para usuários brasileiros será significativamente menor.

---

## 2. Configuração do Google OAuth

### 2.1 Criar Projeto no Google Cloud Console

Acesse [console.cloud.google.com](https://console.cloud.google.com) e siga os passos:

1. Crie um novo projeto chamado "debuga-ai"
2. Vá em **APIs & Services > Credentials**
3. Clique em **Create Credentials > OAuth 2.0 Client ID**
4. Selecione **Web application**
5. Configure:
   - **Name:** debuga.ai Production
   - **Authorized JavaScript origins:** `https://debuga.ai`
   - **Authorized redirect URIs:** `https://debuga.ai/api/auth/callback/google`
6. Anote o **Client ID** e **Client Secret**

### 2.2 Configurar Tela de Consentimento

Em **APIs & Services > OAuth consent screen**:

1. Selecione **External** (para qualquer conta Google)
2. Preencha:
   - **App name:** debuga.ai
   - **User support email:** seu email
   - **App logo:** logo do debuga.ai
   - **App domain:** debuga.ai
   - **Privacy policy:** `https://debuga.ai/privacy`
   - **Terms of service:** `https://debuga.ai/terms`
3. Scopes: adicione `email` e `profile`
4. Publique o app (sai do modo "Testing" para "Production")

### 2.3 Variáveis de Ambiente

```env
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=https://debuga.ai/api/auth/callback/google
SESSION_SECRET=uma-string-aleatoria-de-64-caracteres
```

---

## 3. Modificações no Código

### 3.1 Instalar Dependências

```bash
pnpm add passport passport-google-oauth20 express-session
pnpm add -D @types/passport @types/passport-google-oauth20 @types/express-session
```

### 3.2 Criar Módulo de Autenticação Google

Crie o arquivo `server/auth/google.ts`:

```typescript
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export function configureGoogleAuth() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const db = await getDb();
          if (!db) return done(new Error("Database unavailable"));

          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const googleId = profile.id;

          // Buscar usuário existente pelo Google ID ou email
          let [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.openId, `google_${googleId}`))
            .limit(1);

          if (!existingUser && email) {
            [existingUser] = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);
          }

          if (existingUser) {
            // Atualizar último login
            await db
              .update(users)
              .set({ lastSignedIn: new Date(), name: name || existingUser.name })
              .where(eq(users.id, existingUser.id));
            return done(null, existingUser);
          }

          // Criar novo usuário
          const [newUser] = await db
            .insert(users)
            .values({
              openId: `google_${googleId}`,
              email: email || "",
              name: name || "Usuário",
              loginMethod: "google",
              role: "user",
            })
            .$returningId();

          const [created] = await db
            .select()
            .from(users)
            .where(eq(users.id, newUser.id))
            .limit(1);

          return done(null, created);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const db = await getDb();
      if (!db) return done(new Error("Database unavailable"));
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
}
```

### 3.3 Criar Rotas de Autenticação

Crie o arquivo `server/auth/routes.ts`:

```typescript
import { Router } from "express";
import passport from "passport";

const authRouter = Router();

// Redirecionar para Google
authRouter.get(
  "/api/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Callback do Google
authRouter.get(
  "/api/auth/callback/google",
  passport.authenticate("google", {
    failureRedirect: "/login?error=auth_failed",
  }),
  (req, res) => {
    // Redirecionar para o chat após login bem-sucedido
    res.redirect("/chat");
  }
);

// Logout
authRouter.post("/api/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

// Status do usuário atual
authRouter.get("/api/auth/me", (req, res) => {
  res.json(req.user || null);
});

export { authRouter };
```

### 3.4 Criar Tela de Login Personalizada

Crie o arquivo `client/src/pages/Login.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center space-y-4">
          {/* Seu logo aqui */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              debuga<span className="text-green-500">.ai</span>
            </span>
          </div>
          <CardTitle className="text-xl text-foreground">
            Acesse sua conta
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Entre com sua conta Google para continuar
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 
                       border border-gray-300 font-medium"
            size="lg"
          >
            {isLoading ? (
              <span className="animate-spin mr-2">⟳</span>
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continuar com Google
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Ao continuar, você concorda com nossos{" "}
              <a href="/terms" className="text-green-500 hover:underline">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="/privacy" className="text-green-500 hover:underline">
                Política de Privacidade
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.5 Registrar no Express (index.ts)

Adicione ao arquivo principal do servidor:

```typescript
import session from "express-session";
import passport from "passport";
import { configureGoogleAuth } from "./auth/google";
import { authRouter } from "./auth/routes";

// Sessão (ANTES das rotas)
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    },
  })
);

// Passport
configureGoogleAuth();
app.use(passport.initialize());
app.use(passport.session());

// Rotas de auth
app.use(authRouter);
```

---

## 4. Deploy na Infraestrutura Própria

### 4.1 Opção A: VPS com Docker (Recomendado)

Crie o `Dockerfile`:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
```

Crie o `docker-compose.yml`:

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: debuga_ai
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  caddy_data:
```

Crie o `Caddyfile` (HTTPS automático com Let's Encrypt):

```
debuga.ai {
    reverse_proxy app:3000
}
```

Deploy:

```bash
# No servidor VPS
git clone https://github.com/seu-usuario/debuga-ai.git
cd debuga-ai
cp .env.example .env
# Editar .env com suas credenciais
docker compose up -d
```

### 4.2 Opção B: Railway (PaaS — Mais Simples)

1. Conecte o repositório Git ao [Railway](https://railway.app)
2. Adicione as variáveis de ambiente no dashboard
3. Railway detecta automaticamente o Node.js e faz deploy
4. Adicione um domínio customizado (debuga.ai)

### 4.3 Configuração de DNS

No painel do seu registrador de domínio, configure:

```
Tipo    Nome    Valor                   TTL
A       @       IP_DO_SEU_SERVIDOR      300
CNAME   www     debuga.ai               300
```

---

## 5. Substituição da API de LLM

### 5.1 Opções de Provedor de LLM

| Provedor | Modelo | Preço (input/output por 1M tokens) | Latência |
|---|---|---|---|
| **Google** | Gemini 2.5 Flash | US$ 0.15 / US$ 0.60 | Baixa |
| **OpenAI** | GPT-4o-mini | US$ 0.15 / US$ 0.60 | Média |
| **OpenAI** | GPT-4o | US$ 2.50 / US$ 10.00 | Média |
| **Anthropic** | Claude 3.5 Sonnet | US$ 3.00 / US$ 15.00 | Média |
| **Groq** | Llama 3.3 70B | US$ 0.59 / US$ 0.79 | Muito baixa |
| **DeepSeek** | DeepSeek V3 | US$ 0.27 / US$ 1.10 | Média |

> **Recomendação:** Comece com **Google Gemini 2.5 Flash** pelo melhor custo-benefício. Use **GPT-4o** como fallback para consultas complexas. **Nenhum desses requer GPU própria** — são APIs pagas por uso.

### 5.2 Modificar o Módulo LLM

Substitua `server/_core/llm.ts` por uma chamada direta à API do provedor escolhido:

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai",
});

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  tool_choice?: string;
}) {
  return client.chat.completions.create({
    model: process.env.LLM_MODEL || "gemini-2.5-flash",
    messages: params.messages as any,
    tools: params.tools,
    tool_choice: params.tool_choice as any,
    stream: false,
  });
}
```

---

## 6. Checklist de Migração

| Etapa | Ação | Status |
|---|---|---|
| 1 | Provisionar VPS ou PaaS | [ ] |
| 2 | Configurar banco MySQL | [ ] |
| 3 | Configurar S3 (Cloudflare R2) | [ ] |
| 4 | Criar projeto Google Cloud + OAuth | [ ] |
| 5 | Configurar tela de consentimento Google | [ ] |
| 6 | Substituir módulo de autenticação | [ ] |
| 7 | Criar tela de login personalizada | [ ] |
| 8 | Substituir módulo LLM | [ ] |
| 9 | Configurar variáveis de ambiente | [ ] |
| 10 | Deploy com Docker ou PaaS | [ ] |
| 11 | Configurar DNS do domínio | [ ] |
| 12 | Testar fluxo completo (login → chat → pagamento) | [ ] |
| 13 | Migrar dados do banco Manus (export/import) | [ ] |
| 14 | Configurar Stripe live keys | [ ] |
| 15 | Monitoramento (UptimeRobot, logs) | [ ] |

---

## 7. Custos Comparativos

| Item | Manus Hosting | Hosting Próprio (VPS) | Hosting Próprio (PaaS) |
|---|---|---|---|
| Servidor | Incluído | R$ 50-150/mês | R$ 25-100/mês |
| Banco de dados | Incluído | R$ 0-50/mês | R$ 0-50/mês |
| Storage S3 | Incluído | R$ 0-20/mês | R$ 0-20/mês |
| SSL | Incluído | R$ 0 (Let's Encrypt) | Incluído |
| API de LLM | Incluído | R$ 50-500/mês | R$ 50-500/mês |
| Domínio | Incluído (.manus.space) | R$ 40-80/ano | R$ 40-80/ano |
| Login customizado | Não | Sim | Sim |
| Controle total | Não | Sim | Parcial |
| **Total mensal** | **Incluído no Manus** | **R$ 100-800** | **R$ 75-670** |

> **Conclusão:** O Manus hosting é ideal para desenvolvimento e MVP. A migração para hosting próprio faz sentido quando você precisa de controle total sobre autenticação, domínio e customização da marca — e o custo é acessível (sem GPUs necessárias).

---

*Documento técnico — Sperry Tecnologia © 2026*
