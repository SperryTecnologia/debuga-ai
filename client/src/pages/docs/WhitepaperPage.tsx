import { ArrowLeft, Brain, Target, Shield, Zap, Server, Users, Building2, Globe, Lock, TrendingUp, Mail, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function WhitepaperPage() {
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
              <p className="font-mono text-xs text-terminal uppercase tracking-wider">Whitepaper</p>
              <h1 className="text-lg font-semibold">debuga.ai</h1>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/docs/architecture" className="text-muted-foreground hover:text-foreground transition-colors">Arquitetura</Link>
            <Link href="/docs/white-label-enterprise" className="text-muted-foreground hover:text-foreground transition-colors">White Label</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Title Section */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terminal/10 border border-terminal/20">
            <Brain className="w-4 h-4 text-terminal" />
            <span className="font-mono text-xs text-terminal">v2.0 — Maio 2025</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            IA Operacional White Label para Infraestrutura, Segurança e Automação
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Plataforma de inteligência artificial projetada para operações técnicas reais — 
            infraestrutura, segurança, DevOps, telecomunicações e suporte — com governança, 
            auditoria e controle total. Desenvolvida pela Sperry Tecnologia.
          </p>
        </section>

        {/* 1. Resumo Executivo */}
        <Section icon={<Target className="w-5 h-5" />} title="1. Resumo Executivo">
          <p>
            O debuga.ai é uma plataforma de IA operacional desenvolvida pela Sperry Tecnologia para resolver 
            um problema concreto: equipes técnicas precisam de assistência inteligente que entenda seu contexto, 
            respeite políticas de segurança e se integre ao fluxo de trabalho existente — sem depender de 
            ferramentas genéricas que não compreendem infraestrutura, redes ou compliance.
          </p>
          <p>
            A plataforma combina modelos de linguagem de última geração com base de conhecimento proprietária, 
            automação de tarefas, geração multimodal e suporte humano sênior — tudo em uma arquitetura que pode 
            ser implantada como serviço próprio (white label) para qualquer organização que precise de IA 
            especializada em operações técnicas.
          </p>
          <Callout>
            O debuga.ai não é um chatbot genérico. É uma plataforma de IA operacional com governança, 
            auditoria, controle de custos e especialização técnica — pronta para ambientes regulados.
          </Callout>
        </Section>

        {/* 2. Problema de Mercado */}
        <Section icon={<Shield className="w-5 h-5" />} title="2. O Problema do Mercado">
          <p>
            Ferramentas de IA genéricas (ChatGPT, Gemini, Claude) são poderosas para uso pessoal, mas 
            apresentam limitações críticas para operações empresariais técnicas:
          </p>
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <ProblemCard title="Sem contexto operacional" description="Não conhecem a topologia de rede, políticas internas, runbooks ou histórico de incidentes da organização." />
            <ProblemCard title="Sem governança" description="Dados sensíveis enviados para APIs externas sem controle, auditoria ou conformidade com LGPD/ISO 27001." />
            <ProblemCard title="Sem integração" description="Não se conectam a ferramentas de monitoramento, ticketing, CMDB ou automação existentes." />
            <ProblemCard title="Sem especialização" description="Respostas genéricas que não refletem as melhores práticas de infraestrutura, segurança ou telecom." />
          </div>
          <p>
            O resultado é que equipes técnicas usam IA de forma fragmentada, sem padronização, sem auditoria 
            e sem retorno mensurável para a organização.
          </p>
        </Section>

        {/* 3. Por que chatbots genéricos não resolvem */}
        <Section icon={<Zap className="w-5 h-5" />} title="3. Por Que Chatbots Genéricos Não Resolvem">
          <p>
            Chatbots corporativos tradicionais (Intercom, Zendesk AI, Drift) foram projetados para atendimento 
            ao cliente — não para operações técnicas. Eles falham em cenários como:
          </p>
          <ul className="space-y-3 my-4">
            <li className="flex items-start gap-3">
              <span className="text-destructive mt-1">✗</span>
              <span>Análise de logs de firewall com correlação de eventos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-destructive mt-1">✗</span>
              <span>Troubleshooting de roteamento BGP com múltiplos ASNs</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-destructive mt-1">✗</span>
              <span>Geração de playbooks Ansible para hardening de servidores</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-destructive mt-1">✗</span>
              <span>Diagnóstico de latência em enlaces MPLS com QoS</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-destructive mt-1">✗</span>
              <span>Geração de diagramas de rede e topologias a partir de descrições</span>
            </li>
          </ul>
          <p>
            O debuga.ai foi projetado desde o início para esses cenários — com modelos treinados para 
            infraestrutura, prompts especializados e capacidade de executar ações reais no ambiente do cliente.
          </p>
        </Section>

        {/* 4. O que é a debuga.ai */}
        <Section icon={<Brain className="w-5 h-5" />} title="4. O Que É a debuga.ai">
          <p>
            A debuga.ai é uma plataforma SaaS/on-premise de IA operacional que oferece:
          </p>
          <div className="grid md:grid-cols-3 gap-4 my-6">
            <FeatureCard icon="🧠" title="Agente Autônomo" description="IA que entende contexto técnico, executa tarefas multi-etapa e aprende com feedback." />
            <FeatureCard icon="🔒" title="Governança Total" description="Logs completos, auditoria, controle de custos por plano e conformidade regulatória." />
            <FeatureCard icon="🏢" title="White Label" description="Implante com sua marca, domínio, cores e base de conhecimento em qualquer organização." />
            <FeatureCard icon="🖥️" title="GPU Local" description="Inferência on-premise com Ollama + NVIDIA GPU, sem enviar dados para cloud." />
            <FeatureCard icon="☁️" title="Fallback Cloud" description="Roteamento inteligente entre modelos locais e cloud (OpenAI, Anthropic, Gemini)." />
            <FeatureCard icon="🎨" title="Multimodal" description="Geração de imagens, diagramas, vídeos e áudio integrada ao fluxo de trabalho." />
          </div>
        </Section>

        {/* 5. Proposta de Valor */}
        <Section icon={<TrendingUp className="w-5 h-5" />} title="5. Proposta de Valor">
          <p>
            A debuga.ai entrega valor mensurável em três dimensões:
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Dimensão</th>
                  <th className="text-left p-3 font-medium">Benefício</th>
                  <th className="text-left p-3 font-medium">Métrica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3">Produtividade</td><td className="p-3">Resolução mais rápida de incidentes</td><td className="p-3 font-mono text-terminal">-40% MTTR</td></tr>
                <tr><td className="p-3">Custo</td><td className="p-3">Menos escalonamentos para N3/especialistas</td><td className="p-3 font-mono text-terminal">-60% escalonamentos</td></tr>
                <tr><td className="p-3">Qualidade</td><td className="p-3">Padronização de procedimentos e documentação</td><td className="p-3 font-mono text-terminal">+80% conformidade</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 6. Diferenciais */}
        <Section icon={<Zap className="w-5 h-5" />} title="6. Diferenciais Competitivos">
          <div className="grid md:grid-cols-2 gap-6 my-6">
            <DifferentialCard title="IA Especializada" items={["Infraestrutura, segurança, DevOps, telecom", "Prompts otimizados por domínio", "Base de conhecimento técnica"]} />
            <DifferentialCard title="Orquestração Híbrida" items={["GPU local (Ollama + NVIDIA)", "Fallback automático para cloud", "Roteamento inteligente por custo/latência"]} />
            <DifferentialCard title="Governança Enterprise" items={["Logs completos de todas as interações", "Auditoria por usuário e sessão", "Controle de custos por plano"]} />
            <DifferentialCard title="Suporte Humano Sênior" items={["Escalonamento automático para especialistas", "Engenheiros com 15+ anos de experiência", "SLA garantido por contrato"]} />
            <DifferentialCard title="Geração Multimodal" items={["Imagens, diagramas, vídeos, áudio", "Persistência em storage dedicado", "Integração com chat e admin"]} />
            <DifferentialCard title="White Label Completo" items={["Marca, domínio, cores, login", "Base de conhecimento própria", "Provedores IA independentes"]} />
          </div>
        </Section>

        {/* Diagrama 1: Visão Geral da Solução */}
        <Section icon={<Server className="w-5 h-5" />} title="Visão Geral da Solução">
          <MermaidDiagram chart={`graph TD
    subgraph Cliente["Organização Cliente"]
        User["Usuário Final"]
        Admin["Administrador"]
    end
    
    subgraph Platform["Plataforma debuga.ai"]
        Chat["Chat IA Autônomo"]
        KB["Base de Conhecimento"]
        Multi["Geração Multimodal"]
        Audit["Logs & Auditoria"]
        Billing["Billing & Planos"]
    end
    
    subgraph Infra["Infraestrutura"]
        GPU["GPU Local (Ollama)"]
        Cloud["Cloud LLM (OpenAI/Anthropic/Gemini)"]
        Storage["Storage S3/MinIO"]
        DB["PostgreSQL"]
    end
    
    User --> Chat
    Admin --> Audit
    Admin --> KB
    Chat --> GPU
    Chat --> Cloud
    Chat --> Multi
    Multi --> Storage
    Chat --> DB
    Billing --> DB`} />
        </Section>

        {/* 7. Casos de Uso */}
        <Section icon={<Users className="w-5 h-5" />} title="7. Casos de Uso">
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <UseCaseCard segment="Consultorias de TI" description="IA como extensão da equipe técnica, atendendo múltiplos clientes com base de conhecimento segmentada." example="Consultoria com 50 clientes usa debuga.ai para N1/N2 automatizado, escalonando apenas casos complexos." />
            <UseCaseCard segment="Provedores / MSPs" description="NOC automatizado com análise de alarmes, correlação de eventos e geração de RFOs." example="ISP com 10k clientes reduz MTTR de 45min para 12min com análise automatizada de logs." />
            <UseCaseCard segment="Cartórios" description="Suporte técnico interno para sistemas de registro, certificação digital e infraestrutura." example="Cartório com 3 unidades centraliza suporte de TI em IA com base de conhecimento dos sistemas." />
            <UseCaseCard segment="Prefeituras" description="Atendimento técnico para infraestrutura de TI municipal com soberania de dados." example="Prefeitura implanta on-premise com GPU local, garantindo que dados não saiam do datacenter." />
            <UseCaseCard segment="Empresas com Suporte Interno" description="Help desk inteligente que resolve chamados de infraestrutura sem escalonamento." example="Empresa com 500 colaboradores automatiza 70% dos chamados de TI com IA especializada." />
            <UseCaseCard segment="NOC / SOC" description="Análise de segurança, correlação de eventos SIEM e resposta automatizada a incidentes." example="SOC usa debuga.ai para triagem de alertas, reduzindo falsos positivos em 80%." />
          </div>
        </Section>

        {/* Diagrama 2: Fluxo de Valor */}
        <Section icon={<TrendingUp className="w-5 h-5" />} title="Fluxo de Valor do Atendimento com IA">
          <MermaidDiagram chart={`flowchart LR
    subgraph Input["Entrada"]
        Ticket["Chamado/Incidente"]
        Chat2["Chat Direto"]
        Alert["Alerta Monitoramento"]
    end
    
    subgraph AI["Processamento IA"]
        Classify["Classificação"]
        Context["Contexto + KB"]
        Resolve["Resolução Autônoma"]
        Escalate["Escalonamento"]
    end
    
    subgraph Output["Resultado"]
        Auto["Resolução Automática"]
        Doc["Documentação Gerada"]
        Human["Especialista Humano"]
        Learn["Aprendizado"]
    end
    
    Ticket --> Classify
    Chat2 --> Classify
    Alert --> Classify
    Classify --> Context
    Context --> Resolve
    Resolve -->|Resolvido| Auto
    Resolve -->|Complexo| Escalate
    Auto --> Doc
    Escalate --> Human
    Doc --> Learn
    Human --> Learn`} />
        </Section>

        {/* 8. Modelo Comercial */}
        <Section icon={<Building2 className="w-5 h-5" />} title="8. Modelo Comercial">
          <p>
            O debuga.ai opera com modelo de assinatura mensal, com planos escaláveis conforme o uso:
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Plano</th>
                  <th className="text-left p-3 font-medium">Público-alvo</th>
                  <th className="text-left p-3 font-medium">Inclui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3 font-medium">Starter</td><td className="p-3">Profissionais individuais</td><td className="p-3">Chat IA, base de conhecimento básica, suporte por email</td></tr>
                <tr><td className="p-3 font-medium">Pro</td><td className="p-3">Equipes técnicas</td><td className="p-3">Tudo do Starter + multimodal, prioridade, histórico expandido</td></tr>
                <tr><td className="p-3 font-medium">Enterprise</td><td className="p-3">Organizações</td><td className="p-3">White label, GPU dedicada, SLA, suporte humano sênior</td></tr>
              </tbody>
            </table>
          </div>
          <Callout>
            Modelo white label disponível para revendedores, consultorias e MSPs que desejam oferecer 
            IA operacional com sua própria marca.
          </Callout>
        </Section>

        {/* 9. Modelo White Label */}
        <Section icon={<Globe className="w-5 h-5" />} title="9. Modelo White Label">
          <p>
            O modelo white label permite que qualquer organização implante o debuga.ai com identidade 
            visual própria, domínio dedicado e controle total sobre dados e configurações. 
            A personalização abrange:
          </p>
          <div className="grid md:grid-cols-3 gap-3 my-6 text-sm">
            {["Domínio próprio", "Logo e cores", "Nome do agente", "Base de conhecimento", "Provedores IA", "Storage dedicado", "Planos e preços", "Integrações", "Login/OAuth"].map((item) => (
              <div key={item} className="flex items-center gap-2 p-2 rounded bg-muted/20 border border-border/30">
                <span className="text-terminal">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p>
            <Link href="/docs/white-label-enterprise" className="text-terminal hover:underline inline-flex items-center gap-1">
              Ver documentação completa do White Label Enterprise <ChevronRight className="w-4 h-4" />
            </Link>
          </p>
        </Section>

        {/* 10. Segurança e Governança */}
        <Section icon={<Lock className="w-5 h-5" />} title="10. Segurança e Governança">
          <p>
            A plataforma foi projetada com segurança como requisito fundamental, não como camada adicional:
          </p>
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <SecurityCard title="Dados em Repouso" items={["PostgreSQL com conexões SSL/TLS", "Storage S3 com criptografia AES-256", "Backups automáticos com retenção configurável"]} />
            <SecurityCard title="Dados em Trânsito" items={["HTTPS obrigatório (TLS 1.3)", "Cloudflare WAF + DDoS protection", "Headers de segurança (CSP, HSTS, X-Frame)"]} />
            <SecurityCard title="Autenticação" items={["OAuth 2.0 (Google)", "Autenticação local com bcrypt", "Cloudflare Turnstile (anti-bot)", "JWT com rotação de chaves"]} />
            <SecurityCard title="Auditoria" items={["Log de todas as interações com IA", "Registro de ações administrativas", "Controle de custos por usuário/plano", "Exportação de relatórios"]} />
          </div>
          <Callout>
            Para implantações on-premise, todos os dados permanecem dentro da infraestrutura do cliente. 
            Nenhum dado é enviado para servidores externos quando GPU local está configurada.
          </Callout>
        </Section>

        {/* 11. Roadmap */}
        <Section icon={<TrendingUp className="w-5 h-5" />} title="11. Roadmap">
          <div className="space-y-3 my-6">
            <RoadmapItem phase="Q1 2025" title="Fundação" status="done" items={["Plataforma core", "Chat IA", "Auth/Billing", "Admin panel", "Multimodal básico"]} />
            <RoadmapItem phase="Q2 2025" title="Especialização" status="current" items={["GPU local (Ollama)", "Base de conhecimento", "White label", "Geração de diagramas", "Logs avançados"]} />
            <RoadmapItem phase="Q3 2025" title="Enterprise" status="planned" items={["API pública", "Integrações (Zabbix, PRTG, Grafana)", "Multi-tenant", "SSO/SAML", "Marketplace de skills"]} />
            <RoadmapItem phase="Q4 2025" title="Escala" status="planned" items={["Gateway LLM dedicado", "vLLM para alta concorrência", "Mobile app", "Agentes especializados", "Certificações (ISO, SOC2)"]} />
          </div>
        </Section>

        {/* 12. CTA Comercial */}
        <section className="rounded-xl border border-terminal/30 bg-terminal/5 p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold">Pronto para transformar suas operações com IA?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Entre em contato com a Sperry Tecnologia para uma demonstração personalizada, 
            proposta comercial ou implantação white label.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="mailto:contato@sperry.dev.br" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-terminal text-background font-medium hover:bg-terminal/90 transition-colors">
              <Mail className="w-4 h-4" />
              contato@sperry.dev.br
            </a>
            <a href="https://debuga.ai" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <Globe className="w-4 h-4" />
              Acessar plataforma
            </a>
          </div>
        </section>

        {/* Navigation */}
        <nav className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/40">
          <Link href="/docs/architecture" className="flex-1 p-4 rounded-lg border border-border/40 hover:border-terminal/40 hover:bg-terminal/5 transition-all group">
            <p className="text-xs font-mono text-muted-foreground mb-1">Próximo</p>
            <p className="font-medium group-hover:text-terminal transition-colors">Arquitetura Técnica →</p>
          </Link>
          <Link href="/docs/white-label-enterprise" className="flex-1 p-4 rounded-lg border border-border/40 hover:border-terminal/40 hover:bg-terminal/5 transition-all group">
            <p className="text-xs font-mono text-muted-foreground mb-1">Relacionado</p>
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

function ProblemCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
      <h4 className="font-medium text-sm text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10 hover:border-terminal/30 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function DifferentialCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
      <h4 className="font-medium text-sm text-terminal mb-3">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-terminal mt-0.5">▸</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SecurityCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-terminal" />
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className="text-terminal">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UseCaseCard({ segment, description, example }: { segment: string; description: string; example: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
      <h4 className="font-medium text-sm text-foreground mb-2">{segment}</h4>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <div className="text-xs bg-background/50 rounded p-2 border border-border/30 italic text-muted-foreground/80">
        "{example}"
      </div>
    </div>
  );
}

function MermaidDiagram({ chart }: { chart: string }) {
  return (
    <div className="my-6 p-4 rounded-lg border border-border/40 bg-muted/10 overflow-x-auto">
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">{chart}</pre>
      <p className="text-[10px] text-muted-foreground/50 mt-2 font-mono">Diagrama Mermaid — renderização visual disponível em ferramentas compatíveis</p>
    </div>
  );
}

function RoadmapItem({ phase, title, status, items }: { phase: string; title: string; status: "done" | "current" | "planned"; items: string[] }) {
  const statusColors = {
    done: "border-terminal/40 bg-terminal/5",
    current: "border-yellow-500/40 bg-yellow-500/5",
    planned: "border-border/40 bg-muted/10",
  };
  const statusLabels = { done: "Concluído", current: "Em andamento", planned: "Planejado" };
  const statusBadge = {
    done: "bg-terminal/20 text-terminal",
    current: "bg-yellow-500/20 text-yellow-400",
    planned: "bg-muted text-muted-foreground",
  };

  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{phase}</span>
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${statusBadge[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className={status === "done" ? "text-terminal" : "text-muted-foreground"}>
              {status === "done" ? "✓" : "○"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
