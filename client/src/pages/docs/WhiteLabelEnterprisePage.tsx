import { ArrowLeft, Building2, Shield, Palette, Server, Globe, Users, CheckCircle2, Zap, Lock, Layers } from "lucide-react";
import { Link } from "wouter";

export default function WhiteLabelEnterprisePage() {
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
              <p className="font-mono text-xs text-terminal uppercase tracking-wider">Enterprise</p>
              <h1 className="text-lg font-semibold">debuga.ai</h1>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            <Link href="/docs/whitepaper" className="text-muted-foreground hover:text-foreground transition-colors">Whitepaper</Link>
            <Link href="/docs/architecture" className="text-muted-foreground hover:text-foreground transition-colors">Arquitetura</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Hero */}
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terminal/10 border border-terminal/20">
            <Building2 className="w-4 h-4 text-terminal" />
            <span className="font-mono text-xs text-terminal">White Label Enterprise</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            Sua Própria IA Corporativa.<br />
            <span className="text-terminal">Sua Marca. Seu Controle.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
            Implante uma plataforma de inteligência artificial completa com a identidade visual 
            da sua empresa, em infraestrutura dedicada, com total soberania sobre dados e modelos.
            Sem dependência de terceiros. Sem vendor lock-in.
          </p>
        </section>

        {/* O que é White Label */}
        <Section icon={<Layers className="w-5 h-5" />} title="O que é o Modelo White Label">
          <p>
            O modelo white label do debuga.ai permite que organizações implantem a plataforma completa 
            de IA como se fosse um produto próprio. A interface, domínio, logotipo, paleta de cores e 
            comunicações são totalmente personalizados para a identidade visual do cliente.
          </p>
          <p>
            Diferente de soluções SaaS compartilhadas, cada implantação white label opera em 
            infraestrutura isolada — garantindo que dados corporativos nunca sejam compartilhados, 
            processados ou acessíveis por terceiros.
          </p>
          <Callout>
            O cliente final interage com a plataforma como se fosse um produto desenvolvido internamente 
            pela organização. A tecnologia debuga.ai opera de forma transparente nos bastidores.
          </Callout>
        </Section>

        {/* Personalização */}
        <Section icon={<Palette className="w-5 h-5" />} title="Personalização Completa">
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <FeatureCard 
              title="Identidade Visual" 
              items={[
                "Logotipo e favicon customizados",
                "Paleta de cores corporativa",
                "Tipografia personalizada",
                "Splash screen e loading states",
                "Tema claro/escuro com cores da marca"
              ]} 
            />
            <FeatureCard 
              title="Domínio e Comunicação" 
              items={[
                "Domínio próprio (ia.suaempresa.com.br)",
                "Certificado SSL dedicado",
                "E-mails transacionais com remetente próprio",
                "Termos de uso e política de privacidade",
                "Mensagens e prompts personalizados"
              ]} 
            />
            <FeatureCard 
              title="Funcionalidades" 
              items={[
                "Módulos habilitados por licença",
                "Limites de uso configuráveis",
                "Integrações específicas do cliente",
                "Knowledge base corporativa (RAG)",
                "Workflows e automações customizadas"
              ]} 
            />
            <FeatureCard 
              title="Administração" 
              items={[
                "Painel administrativo completo",
                "Gestão de usuários e permissões (RBAC)",
                "Dashboard de uso e métricas",
                "Logs de auditoria completos",
                "Configuração de modelos e providers"
              ]} 
            />
          </div>
        </Section>

        {/* Modelos de Implantação */}
        <Section icon={<Server className="w-5 h-5" />} title="Modelos de Implantação">
          <p>
            Oferecemos três modelos de implantação para atender diferentes requisitos de 
            segurança, compliance e orçamento:
          </p>
          <div className="grid gap-6 my-6">
            <DeploymentOption 
              title="Cloud Dedicada"
              badge="Mais Popular"
              description="Instância exclusiva em cloud gerenciada pela Sperry Tecnologia. O cliente tem acesso administrativo completo sem se preocupar com infraestrutura."
              features={[
                "VM dedicada (não compartilhada)",
                "GPU opcional para inferência local",
                "Backups automáticos diários",
                "Monitoramento 24/7",
                "SLA de disponibilidade",
                "Atualizações gerenciadas"
              ]}
              ideal="Empresas que querem IA própria sem equipe de infraestrutura"
            />
            <DeploymentOption 
              title="On-Premise"
              badge="Máxima Segurança"
              description="Implantação no datacenter ou rede interna do cliente. Dados nunca saem do perímetro corporativo. Ideal para setores regulados."
              features={[
                "Instalação em hardware do cliente",
                "Operação 100% offline (air-gapped)",
                "GPU local para inferência privada",
                "Integração com Active Directory/LDAP",
                "Compliance LGPD/GDPR nativo",
                "Treinamento da equipe de TI"
              ]}
              ideal="Bancos, saúde, governo, defesa, jurídico"
            />
            <DeploymentOption 
              title="Híbrido"
              badge="Flexível"
              description="Combina processamento local para dados sensíveis com cloud para tarefas que exigem modelos frontier (GPT-4, Claude)."
              features={[
                "Dados sensíveis processados localmente",
                "Modelos cloud para tarefas genéricas",
                "Roteamento inteligente por classificação",
                "Fallback automático entre providers",
                "Controle granular por tipo de dado",
                "Otimização de custo vs. performance"
              ]}
              ideal="Empresas com requisitos mistos de privacidade e capacidade"
            />
          </div>
        </Section>

        {/* Segurança */}
        <Section icon={<Shield className="w-5 h-5" />} title="Segurança e Compliance">
          <p>
            Cada implantação white label herda a arquitetura de segurança em camadas do debuga.ai, 
            com controles adicionais específicos para ambientes corporativos:
          </p>
          <div className="overflow-x-auto my-6">
            <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-3 font-medium">Controle</th>
                  <th className="text-left p-3 font-medium">Implementação</th>
                  <th className="text-left p-3 font-medium">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr><td className="p-3">Isolamento de dados</td><td className="p-3 text-muted-foreground">Banco de dados dedicado por cliente</td><td className="p-3 font-mono text-xs">LGPD Art. 46</td></tr>
                <tr><td className="p-3">Criptografia</td><td className="p-3 text-muted-foreground">TLS 1.3 em trânsito + AES-256 em repouso</td><td className="p-3 font-mono text-xs">ISO 27001</td></tr>
                <tr><td className="p-3">Autenticação</td><td className="p-3 text-muted-foreground">OAuth 2.0, SAML, LDAP, MFA</td><td className="p-3 font-mono text-xs">SOC 2 Type II</td></tr>
                <tr><td className="p-3">Auditoria</td><td className="p-3 text-muted-foreground">Logs imutáveis de todas as interações</td><td className="p-3 font-mono text-xs">LGPD Art. 37</td></tr>
                <tr><td className="p-3">Backup</td><td className="p-3 text-muted-foreground">Backup incremental + retenção configurável</td><td className="p-3 font-mono text-xs">ISO 22301</td></tr>
                <tr><td className="p-3">Soberania</td><td className="p-3 text-muted-foreground">Dados processados em território nacional</td><td className="p-3 font-mono text-xs">LGPD Art. 33</td></tr>
              </tbody>
            </table>
          </div>
          <Callout>
            Para implantações on-premise, é possível operar em modo completamente offline 
            (air-gapped), onde nenhum dado — incluindo telemetria — sai da rede interna.
          </Callout>
        </Section>

        {/* Casos de Uso */}
        <Section icon={<Users className="w-5 h-5" />} title="Casos de Uso por Setor">
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <UseCaseCard 
              sector="Escritórios de Advocacia" 
              description="Análise de contratos, pesquisa jurisprudencial, geração de petições e pareceres com base em knowledge base proprietária."
            />
            <UseCaseCard 
              sector="Saúde e Hospitais" 
              description="Suporte a diagnósticos, análise de exames, transcrição de consultas e geração de laudos — com dados 100% isolados."
            />
            <UseCaseCard 
              sector="Instituições Financeiras" 
              description="Análise de risco, compliance automatizado, atendimento inteligente e geração de relatórios regulatórios."
            />
            <UseCaseCard 
              sector="Indústria e Manufatura" 
              description="Manutenção preditiva, análise de documentação técnica, suporte a operadores e automação de processos."
            />
            <UseCaseCard 
              sector="Educação e Treinamento" 
              description="Tutoria personalizada, geração de conteúdo didático, avaliação automatizada e assistente de pesquisa."
            />
            <UseCaseCard 
              sector="Governo e Setor Público" 
              description="Atendimento ao cidadão, análise de documentos públicos, automação de processos administrativos — em infraestrutura soberana."
            />
          </div>
        </Section>

        {/* Diferencial */}
        <Section icon={<Zap className="w-5 h-5" />} title="Diferenciais Competitivos">
          <div className="grid gap-3 my-6">
            <DifferentialItem 
              title="Sem Vendor Lock-in" 
              description="A plataforma suporta múltiplos providers de IA. Se um provider aumentar preços ou descontinuar um modelo, basta trocar a configuração — sem alterar código."
            />
            <DifferentialItem 
              title="Custo Previsível" 
              description="Com inferência local via GPU, o custo por interação tende a zero após o investimento inicial em hardware. Sem surpresas na fatura mensal."
            />
            <DifferentialItem 
              title="Atualização Contínua" 
              description="Novos modelos e funcionalidades são integrados à plataforma conforme são lançados pelo mercado. O cliente recebe atualizações sem esforço de migração."
            />
            <DifferentialItem 
              title="Suporte Técnico Especializado" 
              description="Equipe brasileira com expertise em IA, infraestrutura e segurança. Suporte em português com SLA definido em contrato."
            />
            <DifferentialItem 
              title="Time-to-Market Reduzido" 
              description="Implantação completa em semanas, não meses. A plataforma está pronta — basta personalizar e configurar para o contexto do cliente."
            />
          </div>
        </Section>

        {/* Processo */}
        <Section icon={<Globe className="w-5 h-5" />} title="Processo de Implantação">
          <div className="grid gap-4 my-6">
            <ProcessStep number={1} title="Discovery e Escopo" description="Levantamento de requisitos, definição de modelo de implantação, mapeamento de integrações e cronograma." duration="1-2 semanas" />
            <ProcessStep number={2} title="Personalização" description="Aplicação da identidade visual, configuração de domínio, ajuste de funcionalidades e integração com sistemas existentes." duration="2-3 semanas" />
            <ProcessStep number={3} title="Implantação" description="Deploy em infraestrutura definida, configuração de segurança, testes de carga e validação de compliance." duration="1-2 semanas" />
            <ProcessStep number={4} title="Treinamento e Go-Live" description="Capacitação de administradores e usuários-chave, documentação operacional e entrada em produção." duration="1 semana" />
            <ProcessStep number={5} title="Operação e Evolução" description="Monitoramento contínuo, atualizações de segurança, novos modelos e funcionalidades sob demanda." duration="Contínuo" />
          </div>
        </Section>

        {/* Soberania de Dados */}
        <Section icon={<Lock className="w-5 h-5" />} title="Soberania de Dados e LGPD">
          <p>
            A Lei Geral de Proteção de Dados (LGPD) exige que organizações mantenham controle 
            sobre o processamento de dados pessoais. O modelo white label do debuga.ai foi 
            projetado para atender integralmente esses requisitos:
          </p>
          <div className="grid md:grid-cols-2 gap-4 my-6">
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-medium text-sm text-terminal mb-3">Garantias Técnicas</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Dados processados exclusivamente em território brasileiro</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Nenhum dado enviado para treinamento de modelos externos</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Logs de auditoria para exercício de direitos do titular</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Exclusão completa de dados sob demanda</span></li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
              <h4 className="font-medium text-sm text-terminal mb-3">Documentação Fornecida</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>RIPD (Relatório de Impacto à Proteção de Dados)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Mapeamento de fluxo de dados</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Política de retenção e descarte</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-terminal shrink-0 mt-0.5" /><span>Termos de uso e política de privacidade template</span></li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Diagrama */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-terminal/10 text-terminal"><Layers className="w-5 h-5" /></div>
            <h3 className="text-xl font-bold">Diagrama: Instância White Label</h3>
          </div>
          <div className="pl-0 md:pl-12">
            <div className="my-6 p-4 rounded-lg border border-border/40 bg-muted/10 overflow-x-auto">
              <p className="text-xs font-mono text-terminal/80 mb-3">Arquitetura de uma instância isolada</p>
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed">{`
┌─────────────────────────────────────────────────────────────────────┐
│                    INSTÂNCIA WHITE LABEL                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │  Domínio     │     │  Branding    │     │  Knowledge Base  │    │
│  │  Próprio     │     │  Logo/Cores  │     │  Docs/Runbooks   │    │
│  │  TLS dedicado│     │  Textos      │     │  Procedimentos   │    │
│  └──────┬───────┘     └──────┬───────┘     └────────┬─────────┘    │
│         │                    │                      │               │
│         └────────────────────┼──────────────────────┘               │
│                              │                                      │
│                    ┌─────────▼─────────┐                            │
│                    │  ORQUESTRADOR IA  │                            │
│                    │  Intent + Router  │                            │
│                    └─────────┬─────────┘                            │
│                              │                                      │
│              ┌───────────────┼───────────────┐                      │
│              │               │               │                      │
│    ┌─────────▼───┐  ┌───────▼───┐  ┌───────▼───────┐              │
│    │  GPU Local  │  │  Cloud    │  │  Multimodal   │              │
│    │  (opcional) │  │  Fallback │  │  Providers    │              │
│    └─────────────┘  └───────────┘  └───────────────┘              │
│                              │                                      │
│                    ┌─────────▼─────────┐                            │
│                    │  PostgreSQL       │                            │
│                    │  (isolado)        │                            │
│                    └──────────────────┘                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘`}</pre>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="p-8 rounded-xl border border-terminal/30 bg-gradient-to-br from-terminal/5 to-transparent">
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold mb-3">Pronto para sua própria IA corporativa?</h3>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Entre em contato para uma demonstração personalizada. Apresentamos a plataforma 
              funcionando com a identidade visual da sua empresa em uma sessão de 30 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href="mailto:contato@sperry.dev.br?subject=White Label Enterprise - Demonstração" 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-terminal text-background font-medium hover:bg-terminal/90 transition-colors"
              >
                Solicitar Demonstração
              </a>
              <a 
                href="https://wa.me/5548991610953?text=Olá, gostaria de saber mais sobre o modelo White Label do debuga.ai" 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-terminal/40 text-terminal font-medium hover:bg-terminal/10 transition-colors"
              >
                WhatsApp Comercial
              </a>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border/40">
          <Link href="/docs/architecture" className="flex-1 p-4 rounded-lg border border-border/40 hover:border-terminal/40 hover:bg-terminal/5 transition-all group">
            <p className="text-xs font-mono text-muted-foreground mb-1">Anterior</p>
            <p className="font-medium group-hover:text-terminal transition-colors">← Arquitetura Técnica</p>
          </Link>
          <Link href="/docs/whitepaper" className="flex-1 p-4 rounded-lg border border-border/40 hover:border-terminal/40 hover:bg-terminal/5 transition-all group">
            <p className="text-xs font-mono text-muted-foreground mb-1">Voltar ao início</p>
            <p className="font-medium group-hover:text-terminal transition-colors">Whitepaper →</p>
          </Link>
        </nav>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>Desenvolvido por <a href="https://www.sperrytecnologia.com.br" target="_blank" rel="noopener noreferrer" className="text-terminal hover:underline">Sperry Tecnologia</a></p>
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

function FeatureCard({ title, items }: { title: string; items: string[] }) {
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

function DeploymentOption({ title, badge, description, features, ideal }: { title: string; badge: string; description: string; features: string[]; ideal: string }) {
  return (
    <div className="p-6 rounded-xl border border-border/40 bg-muted/5 hover:border-terminal/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <h4 className="text-lg font-bold">{title}</h4>
        <span className="text-xs px-2 py-0.5 rounded-full bg-terminal/20 text-terminal font-mono">{badge}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-terminal shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-terminal font-medium">Ideal para: {ideal}</p>
    </div>
  );
}

function UseCaseCard({ sector, description }: { sector: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
      <h4 className="font-medium text-sm text-foreground mb-2">{sector}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function ProcessStep({ number, title, description, duration }: { number: number; title: string; description: string; duration: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 rounded-full bg-terminal/20 text-terminal flex items-center justify-center font-mono text-sm font-bold shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="font-medium text-foreground">{title}</h4>
          <span className="text-xs font-mono text-muted-foreground">{duration}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DifferentialItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/40 bg-muted/10">
      <h4 className="font-medium text-sm text-terminal mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
