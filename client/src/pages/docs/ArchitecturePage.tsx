import { ArrowLeft, Server, Cpu, Database, Globe, Shield, Layers, Network, HardDrive, Cloud, Workflow, GitBranch } from "lucide-react";
import { Link } from "wouter";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="font-mono text-xs text-terminal uppercase tracking-wider">Arquitetura</p>
              <h1 className="text-lg font-semibold">debuga.ai</h1>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/docs/whitepaper" className="text-muted-foreground hover:text-foreground transition-colors">Whitepaper</Link>
            <Link href="/docs/white-label-enterprise" className="text-muted-foreground hover:text-foreground transition-colors">White Label</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Title */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terminal/10 border border-terminal/20">
            <Server className="w-4 h-4 text-terminal" />
            <span className="font-mono text-xs text-terminal">Documentação Técnica v2.0</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Arquitetura Técnica da Plataforma
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Visão detalhada da arquitetura de software, infraestrutura, orquestração de modelos e 
            fluxos de dados do debuga.ai — projetada para alta disponibilidade, segurança e 
            escalabilidade horizontal.
          </p>
        </section>

        {/* 1. Visão Geral */}
        <Section icon={<Layers className="w-5 h-5" />} title="1. Visão Geral da Arquitetura">
          <p>
            O debuga.ai segue uma arquitetura de camadas (layered architecture) com separação clara entre 
            frontend, backend, orquestração de IA e infraestrutura. Cada camada pode ser escalada 
            independentemente e substituída sem afetar as demais.
          </p>
          <Diagram title="Diagrama 1: Arquitetura em Camadas">{`
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                            │
│  React 19 SPA · TypeScript · Tailwind CSS 4 · PWA · Service Worker │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                    CAMADA DE ACESSO                                   │
│  Cloudflare (WAF + CDN + Turnstile) → Nginx (SSL + Rate Limit)     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                    CAMADA DE APLICAÇÃO                                │
│  Express.js · tRPC · JWT Auth · OAuth 2.0 · Stripe Billing · SSE   │
└──────┬──────────────┬──────────────┬──────────────┬─────────────────┘
       │              │              │              │
┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐ ┌────▼──────────┐
│  LLM Router │ │ RAG/KB   │ │ Multimodal │ │ Notifications │
│  Ollama     │ │ Engine   │ │ Engine     │ │ Email/Webhook │
│  Cloud APIs │ │ Embeddings│ │ Image/Audio│ │               │
└──────┬──────┘ └────┬─────┘ └─────┬──────┘ └───────────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼────────────────────────────────┐
│                    CAMADA DE DADOS                                    │
│  PostgreSQL 16 · S3/MinIO Storage · Cache Layer                     │
└─────────────────────────────────────────────────────────────────────┘`}</Diagram>
        </Section>

        {/* 2. Stack Tecnológica */}
        <Section icon={<Cpu className="w-5 h-5" />} title="2. Stack Tecnológica">
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Camada</th>
                  <th className="text-left p-3 font-medium">Tecnologia</th>
                  <th className="text-left p-3 font-medium">Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3 font-mono text-xs">Frontend</td><td className="p-3">React 19 + TypeScript + Tailwind CSS 4</td><td className="p-3 text-muted-foreground">Performance, type-safety, design system consistente</td></tr>
                <tr><td className="p-3 font-mono text-xs">Backend</td><td className="p-3">Node.js 20 + Express + tRPC + TypeScript</td><td className="p-3 text-muted-foreground">Ecossistema unificado, streaming nativo, async I/O</td></tr>
                <tr><td className="p-3 font-mono text-xs">Banco de Dados</td><td className="p-3">PostgreSQL 16 + Drizzle ORM</td><td className="p-3 text-muted-foreground">ACID, JSONB, full-text search, type-safe queries</td></tr>
                <tr><td className="p-3 font-mono text-xs">Storage</td><td className="p-3">S3-compatible (MinIO / AWS S3)</td><td className="p-3 text-muted-foreground">Objetos multimodais, backups, assets estáticos</td></tr>
                <tr><td className="p-3 font-mono text-xs">IA Local</td><td className="p-3">Ollama + NVIDIA CUDA 12.4</td><td className="p-3 text-muted-foreground">Inferência on-premise, soberania de dados</td></tr>
                <tr><td className="p-3 font-mono text-xs">IA Cloud</td><td className="p-3">OpenAI, Anthropic, Google Gemini, OpenRouter</td><td className="p-3 text-muted-foreground">Fallback, modelos frontier, custo otimizado</td></tr>
                <tr><td className="p-3 font-mono text-xs">Proxy/CDN</td><td className="p-3">Cloudflare + Nginx</td><td className="p-3 text-muted-foreground">WAF, DDoS, SSL termination, caching</td></tr>
                <tr><td className="p-3 font-mono text-xs">Container</td><td className="p-3">Docker + Docker Compose</td><td className="p-3 text-muted-foreground">Reprodutibilidade, isolamento, deploy simplificado</td></tr>
                <tr><td className="p-3 font-mono text-xs">Pagamentos</td><td className="p-3">Stripe (Checkout + Webhooks)</td><td className="p-3 text-muted-foreground">Assinaturas recorrentes, compliance PCI-DSS</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 3. Orquestração de LLM */}
        <Section icon={<Network className="w-5 h-5" />} title="3. Orquestração de Modelos LLM">
          <p>
            O debuga.ai implementa um sistema de roteamento inteligente que seleciona o modelo mais 
            adequado para cada requisição, considerando custo, latência, disponibilidade e capacidade 
            do modelo. O roteamento suporta prioridade local (GPU) com fallback automático para cloud.
          </p>
          <Diagram title="Diagrama 2: Roteamento de Modelos LLM">{`
                         ┌──────────────────────┐
                         │  Requisição Usuário   │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  LOCAL_LLM_PRIORITY?  │
                         └──┬──────────┬────┬───┘
                            │          │    │
                   ┌────────▼──┐   ┌───▼──┐ │
                   │  "first"  │   │"last"│ │  ┌────────┐
                   └────┬──────┘   └──┬───┘ └──▶ "only" │
                        │             │         └───┬────┘
              ┌─────────▼─────────┐   │             │
              │ Tentar GPU Local  │   │    ┌────────▼────────┐
              │ (Ollama)          │   │    │ APENAS GPU Local │
              └──┬──────────┬─────┘   │    └──┬──────────┬───┘
                 │OK        │Falha    │       │OK        │Falha
                 │          │         │       │          │
    ┌────────────▼┐  ┌──────▼──────┐  │  ┌───▼──┐  ┌───▼───┐
    │  Response   │  │ Cloud API   │  │  │ Resp │  │ ERRO  │
    │  (stream)   │  │ (fallback)  │  │  └──────┘  └───────┘
    └─────────────┘  └─────────────┘  │
                                      │
                         ┌────────────▼────────────┐
                         │  Tentar Cloud Provider  │
                         └──┬──────────────┬───────┘
                            │OK            │Falha
                   ┌────────▼┐    ┌────────▼────────┐
                   │ Response│    │ Fallback: Local  │
                   └─────────┘    └─────────────────┘`}</Diagram>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Provider</th>
                  <th className="text-left p-3 font-medium">Modelos</th>
                  <th className="text-left p-3 font-medium">Uso Primário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3 font-mono text-xs">Ollama (Local)</td><td className="p-3">Qwen 2.5, DeepSeek, Llama 3</td><td className="p-3 text-muted-foreground">Inferência privada, baixa latência, sem custo por token</td></tr>
                <tr><td className="p-3 font-mono text-xs">OpenAI</td><td className="p-3">GPT-4o, GPT-4o-mini</td><td className="p-3 text-muted-foreground">Raciocínio complexo, code generation</td></tr>
                <tr><td className="p-3 font-mono text-xs">Anthropic</td><td className="p-3">Claude 3.5 Sonnet, Claude 3 Haiku</td><td className="p-3 text-muted-foreground">Análise longa, documentação técnica</td></tr>
                <tr><td className="p-3 font-mono text-xs">Google</td><td className="p-3">Gemini 2.0 Flash, Gemini Pro</td><td className="p-3 text-muted-foreground">Multimodal, custo otimizado</td></tr>
                <tr><td className="p-3 font-mono text-xs">OpenRouter</td><td className="p-3">Múltiplos (routing dinâmico)</td><td className="p-3 text-muted-foreground">Fallback universal, modelos experimentais</td></tr>
              </tbody>
            </table>
          </div>
          <Callout>
            A seleção de modelo é transparente para o usuário final. O administrador configura a 
            estratégia de roteamento via variáveis de ambiente, sem necessidade de alterar código.
          </Callout>
        </Section>

        {/* 4. Infraestrutura de GPU */}
        <Section icon={<HardDrive className="w-5 h-5" />} title="4. Infraestrutura de GPU Local">
          <p>
            Para organizações que exigem soberania de dados ou desejam eliminar custos recorrentes de API, 
            o debuga.ai suporta inferência local com GPU NVIDIA via Ollama. A arquitetura permite 
            operação completamente offline (air-gapped) ou híbrida com fallback cloud.
          </p>
          <Diagram title="Diagrama 3: Infraestrutura GPU On-Premise">{`
┌─────────────────────────────────────────────────────────────┐
│                    VM DE PRODUÇÃO                             │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Nginx   │───▶│  App :3000   │───▶│  Ollama :11434   │  │
│  │  :443    │    │  (Node.js)   │    │  (GPU Inference) │  │
│  └──────────┘    └──────┬───────┘    └────────┬─────────┘  │
│                         │                     │             │
│                  ┌──────▼───────┐    ┌────────▼─────────┐  │
│                  │ PostgreSQL   │    │  NVIDIA GPU      │  │
│                  │ :5432        │    │  CUDA 12.4       │  │
│                  └──────────────┘    │  16GB+ VRAM      │  │
│                                      └──────────────────┘  │
│                         │                                   │
│                  ┌──────▼───────┐                           │
│                  │ MinIO/S3     │                           │
│                  │ Storage      │                           │
│                  └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐ (opcional / fallback)
              │  Cloud LLM APIs    │
              │  Stripe · SMTP     │
              └────────────────────┘`}</Diagram>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Componente</th>
                  <th className="text-left p-3 font-medium">Requisito Mínimo</th>
                  <th className="text-left p-3 font-medium">Recomendado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3">GPU</td><td className="p-3">NVIDIA 8GB VRAM (RTX 3060)</td><td className="p-3 text-terminal">16GB+ VRAM (RTX 4070 / A4000)</td></tr>
                <tr><td className="p-3">Driver NVIDIA</td><td className="p-3">525.60+</td><td className="p-3 text-terminal">550+</td></tr>
                <tr><td className="p-3">CUDA</td><td className="p-3">12.0+</td><td className="p-3 text-terminal">12.4+</td></tr>
                <tr><td className="p-3">RAM</td><td className="p-3">16GB</td><td className="p-3 text-terminal">32GB+</td></tr>
                <tr><td className="p-3">Disco</td><td className="p-3">50GB livre</td><td className="p-3 text-terminal">SSD NVMe 100GB+</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 5. Fluxo de Autenticação */}
        <Section icon={<Shield className="w-5 h-5" />} title="5. Fluxo de Autenticação e Sessão">
          <p>
            O sistema de autenticação suporta múltiplos métodos (OAuth 2.0 Google, autenticação local 
            com bcrypt, Cloudflare Turnstile anti-bot) com sessões JWT stateless e cookies seguros.
          </p>
          <Diagram title="Diagrama 4: Fluxo de Autenticação OAuth 2.0">{`
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│ Usuário  │                    │ debuga.ai│                    │  Google  │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  1. Clica "Entrar com Google" │                               │
     │──────────────────────────────▶│                               │
     │                               │  2. Redirect para Google      │
     │                               │──────────────────────────────▶│
     │  3. Consent screen            │                               │
     │◀──────────────────────────────────────────────────────────────│
     │                               │                               │
     │  4. Autoriza                  │                               │
     │──────────────────────────────────────────────────────────────▶│
     │                               │                               │
     │                               │  5. Callback com code         │
     │                               │◀─────────────────────────────│
     │                               │                               │
     │                               │  6. Troca code por token      │
     │                               │──────────────────────────────▶│
     │                               │  7. Retorna access_token      │
     │                               │◀─────────────────────────────│
     │                               │                               │
     │                               │  8. Busca userinfo            │
     │                               │──────────────────────────────▶│
     │                               │  9. Retorna perfil            │
     │                               │◀─────────────────────────────│
     │                               │                               │
     │                               │  10. Upsert user (PostgreSQL) │
     │                               │  11. Gera JWT (24h)           │
     │                               │  12. Set-Cookie (httpOnly)    │
     │  13. Redirect 302 → /chat     │                               │
     │◀──────────────────────────────│                               │
     │                               │                               │
     │  14. GET /api/auth/me (cookie)│                               │
     │──────────────────────────────▶│                               │
     │  15. Retorna perfil           │                               │
     │◀──────────────────────────────│                               │`}</Diagram>
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-medium text-sm text-terminal mb-3">Atributos do Cookie</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground font-mono">
                <li>httpOnly: true</li>
                <li>secure: true (produção HTTPS)</li>
                <li>sameSite: lax</li>
                <li>domain: .debuga.ai</li>
                <li>path: /</li>
                <li>maxAge: 365 dias</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-medium text-sm text-terminal mb-3">JWT Payload</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground font-mono">
                <li>sub: user.openId</li>
                <li>name: user.name</li>
                <li>email: user.email</li>
                <li>role: admin | user</li>
                <li>iat: timestamp (issued at)</li>
                <li>exp: iat + 24h</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 6. Streaming */}
        <Section icon={<Workflow className="w-5 h-5" />} title="6. Streaming e Comunicação Real-time">
          <p>
            As respostas da IA são transmitidas em tempo real via Server-Sent Events (SSE), permitindo 
            que o usuário veja a resposta sendo construída token a token. O sistema suporta 
            reconexão automática e buffering inteligente.
          </p>
          <Diagram title="Diagrama 5: Fluxo de Streaming SSE">{`
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Frontend │     │   Backend    │     │  LLM Router  │     │    Modelo    │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                   │                    │                    │
     │ POST /api/stream  │                    │                    │
     │──────────────────▶│                    │                    │
     │                   │ Valida auth+quota  │                    │
     │                   │ Seleciona modelo   │                    │
     │                   │───────────────────▶│                    │
     │                   │                    │ Envia prompt       │
     │                   │                    │───────────────────▶│
     │                   │                    │                    │
     │                   │                    │ Token 1            │
     │                   │                    │◀───────────────────│
     │ SSE: data chunk 1 │                    │                    │
     │◀──────────────────│◀───────────────────│                    │
     │ (renderiza)       │                    │ Token 2            │
     │                   │                    │◀───────────────────│
     │ SSE: data chunk 2 │                    │                    │
     │◀──────────────────│◀───────────────────│                    │
     │ (renderiza)       │                    │                    │
     │        ...        │        ...         │       ...          │
     │                   │                    │ [DONE]             │
     │                   │                    │◀───────────────────│
     │ SSE: [DONE]       │                    │                    │
     │◀──────────────────│ Salva msg+métricas │                    │
     │ (finaliza)        │                    │                    │`}</Diagram>
        </Section>

        {/* 7. Segurança em Camadas */}
        <Section icon={<Shield className="w-5 h-5" />} title="7. Segurança em Camadas">
          <Diagram title="Diagrama 6: Camadas de Segurança">{`
┌─────────────────────────────────────────────────────────────────────┐
│  BORDA (Cloudflare)                                                  │
│  WAF Rules · DDoS Protection · Bot Management · SSL/TLS 1.3        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  REDE (Nginx)                                                        │
│  Rate Limiting · CSP · HSTS · X-Frame-Options · Reverse Proxy       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  APLICAÇÃO (Express)                                                 │
│  JWT Validation · RBAC (admin/user) · Input Sanitization · Turnstile│
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│  DADOS                                                               │
│  Encryption at Rest · bcrypt (passwords) · Audit Logging · Backups  │
└─────────────────────────────────────────────────────────────────────┘`}</Diagram>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Camada</th>
                  <th className="text-left p-3 font-medium">Controle</th>
                  <th className="text-left p-3 font-medium">Implementação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3">Borda</td><td className="p-3">WAF + Anti-DDoS</td><td className="p-3 text-muted-foreground">Cloudflare (regras customizadas por rota)</td></tr>
                <tr><td className="p-3">Transporte</td><td className="p-3">TLS 1.3 + HSTS</td><td className="p-3 text-muted-foreground">Let's Encrypt + Cloudflare Origin Certificate</td></tr>
                <tr><td className="p-3">Aplicação</td><td className="p-3">JWT + RBAC + Turnstile</td><td className="p-3 text-muted-foreground">Middleware Express + Cloudflare Turnstile</td></tr>
                <tr><td className="p-3">Dados</td><td className="p-3">Criptografia + Backups</td><td className="p-3 text-muted-foreground">PostgreSQL SSL + S3 AES-256 + pg_dump cron</td></tr>
                <tr><td className="p-3">Auditoria</td><td className="p-3">Logs completos</td><td className="p-3 text-muted-foreground">Registro de todas as interações e ações admin</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 8. Geração Multimodal */}
        <Section icon={<Cloud className="w-5 h-5" />} title="8. Geração Multimodal">
          <p>
            Além de texto, o debuga.ai gera e processa conteúdo multimodal: imagens, diagramas de rede, 
            áudio (text-to-speech) e vídeos. Todos os assets são persistidos em storage S3-compatible 
            com metadados no PostgreSQL.
          </p>
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <CapabilityCard title="Geração de Imagens" items={["Diagramas de rede e topologias", "Fluxogramas e arquiteturas", "Ilustrações técnicas", "Edição e variações"]} />
            <CapabilityCard title="Áudio e Voz" items={["Text-to-speech (TTS)", "Speech-to-text (STT)", "Transcrição de reuniões", "Narração de documentação"]} />
            <CapabilityCard title="Vídeo" items={["Geração de vídeos curtos", "Tutoriais animados", "Demonstrações técnicas", "Exportação em múltiplos formatos"]} />
            <CapabilityCard title="Documentos" items={["Geração de PDFs", "Relatórios formatados", "Apresentações", "Diagramas Mermaid"]} />
          </div>
        </Section>

        {/* 9. Deploy e Operações */}
        <Section icon={<GitBranch className="w-5 h-5" />} title="9. Deploy e Operações">
          <p>
            O deploy é containerizado com Docker Compose, permitindo reprodutibilidade total e 
            rollback instantâneo. O ciclo de vida inclui ambientes de homologação e produção 
            com pipelines de validação automatizados.
          </p>
          <div className="grid md:grid-cols-3 gap-4 my-6">
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-mono text-xs text-terminal mb-2">Containers</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>debuga-app (Node.js 20)</li>
                <li>debuga-nginx (Reverse Proxy)</li>
                <li>debuga-postgres (Database)</li>
                <li>debuga-ollama (GPU Inference)</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-mono text-xs text-terminal mb-2">Volumes Persistentes</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>/data/debuga/postgres</li>
                <li>/data/debuga/ollama/models</li>
                <li>/data/debuga/storage</li>
                <li>/etc/letsencrypt</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-mono text-xs text-terminal mb-2">Operações</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Health checks (HTTP + DB)</li>
                <li>Log rotation automático</li>
                <li>Backup PostgreSQL (cron)</li>
                <li>SSL renewal (certbot)</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 10. Escalabilidade */}
        <Section icon={<Globe className="w-5 h-5" />} title="10. Escalabilidade e Evolução">
          <p>
            A arquitetura foi projetada para escalar horizontalmente conforme a demanda cresce. 
            Os componentes de pesquisa (vLLM Engine, LLM Gateway) estão em desenvolvimento para 
            cenários de alta concorrência e multi-tenancy enterprise.
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Cenário</th>
                  <th className="text-left p-3 font-medium">Solução</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3">1-10 usuários</td><td className="p-3">Single VM + Docker Compose</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-terminal/20 text-terminal font-mono">Produção</span></td></tr>
                <tr><td className="p-3">10-50 usuários</td><td className="p-3">VM dedicada + GPU + Read replicas</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-mono">Em teste</span></td></tr>
                <tr><td className="p-3">50+ usuários</td><td className="p-3">vLLM + Gateway + Load Balancer</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">Pesquisa</span></td></tr>
                <tr><td className="p-3">Multi-tenant</td><td className="p-3">Instâncias isoladas por cliente</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">Planejado</span></td></tr>
              </tbody>
            </table>
          </div>
          <Callout>
            Os repositórios de pesquisa (debuga-vllm-engine, debuga-llm-gateway) documentam as 
            arquiteturas de próxima geração para cenários de alta escala. Consulte a documentação 
            completa em <a href="https://github.com/SperryTecnologia" className="text-terminal hover:underline">github.com/SperryTecnologia</a>.
          </Callout>
        </Section>

        {/* Navigation */}
        <nav className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/40">
          <Link href="/docs/whitepaper" className="flex-1 p-4 rounded-lg border border-border/40 hover:border-terminal/40 hover:bg-terminal/5 transition-all group">
            <p className="text-xs font-mono text-muted-foreground mb-1">Anterior</p>
            <p className="font-medium group-hover:text-terminal transition-colors">← Whitepaper</p>
          </Link>
          <Link href="/docs/white-label-enterprise" className="flex-1 p-4 rounded-lg border border-border/40 hover:border-terminal/40 hover:bg-terminal/5 transition-all group">
            <p className="text-xs font-mono text-muted-foreground mb-1">Próximo</p>
            <p className="font-medium group-hover:text-terminal transition-colors">White Label Enterprise →</p>
          </Link>
        </nav>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; 2025 Sperry Tecnologia. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/SperryTecnologia" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="mailto:contato@sperry.dev.br" className="hover:text-foreground transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Subcomponents ─── */

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-terminal/10 text-terminal">{icon}</div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <div className="space-y-4 text-muted-foreground leading-relaxed pl-0 md:pl-12">
        {children}
      </div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-terminal/60 bg-terminal/5 rounded-r-lg p-4 text-sm text-foreground/90">
      {children}
    </div>
  );
}

function Diagram({ title, children }: { title: string; children: string }) {
  return (
    <div className="my-6 p-4 rounded-lg border border-border/40 bg-muted/10 overflow-x-auto">
      <p className="text-xs font-mono text-terminal/80 mb-3">{title}</p>
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed">{children}</pre>
    </div>
  );
}

function CapabilityCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
      <h4 className="font-medium text-sm text-foreground mb-3">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-terminal">▸</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
