import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Bot,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Globe,
  Database,
  FileText,
  ExternalLink,
  Building2,
  Palette,
  BookOpen,
  Cog,
  Github,
  Server,
  Terminal,
  Briefcase,
  Brain,
  Layers,
  Search,
  MessageSquare,
  BarChart3,
  Shield,
  Workflow,
  Plug,
  HardDrive,
  Activity,
  Stethoscope,
  Scale,
  Factory,
  Headphones,
  GraduationCap,
  CircleDot,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import HeroAnimation from "@/components/HeroAnimation";
import { useBranding, getWhatsAppUrl } from "@/contexts/BrandingContext";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const CAPABILITIES = [
  {
    icon: Brain,
    title: "Aprendizado Contínuo",
    desc: "A plataforma aprende continuamente com os documentos, processos e dados da sua empresa — quanto mais opera, mais inteligente se torna.",
    highlight: true,
  },
  {
    icon: Search,
    title: "Consulta Contextualizada",
    desc: "Respostas baseadas no conhecimento real da sua operação. Não são respostas genéricas — são respostas que entendem o seu contexto.",
    highlight: true,
  },
  {
    icon: Workflow,
    title: "Automação Inteligente",
    desc: "Execute diagnósticos, gere relatórios, valide configurações e automatize tarefas operacionais com inteligência contextual.",
    highlight: true,
  },
  {
    icon: MessageSquare,
    title: "Interface Conversacional",
    desc: "Interaja com todo o conhecimento da sua empresa através de uma interface simples e intuitiva, acessível para qualquer equipe.",
    highlight: true,
  },
  {
    icon: Layers,
    title: "Múltiplas Fontes de Conhecimento",
    desc: "Conecte documentos, APIs, bancos de dados, logs e sistemas corporativos em uma única base de inteligência operacional.",
  },
  {
    icon: BarChart3,
    title: "Geração de Relatórios",
    desc: "Produza análises, documentação técnica, checklists e evidências estruturadas a partir do conhecimento acumulado.",
  },
  {
    icon: Globe,
    title: "Navegação e Pesquisa Autônoma",
    desc: "O agente acessa URLs, extrai informações de páginas web e integra dados externos ao contexto da sua operação.",
  },
  {
    icon: Shield,
    title: "Segurança e Compliance",
    desc: "Dados isolados por empresa, criptografia em trânsito e em repouso, controle de acesso granular e auditoria completa.",
  },
];

const KNOWLEDGE_SOURCES = [
  {
    icon: FileText,
    title: "Documentos",
    desc: "PDFs, manuais, políticas, procedimentos, wikis e qualquer documentação da empresa.",
    status: "Disponível" as const,
  },
  {
    icon: Plug,
    title: "APIs e Sistemas",
    desc: "APIs REST, sistemas corporativos, ERPs, CRMs e ferramentas de gestão.",
    status: "Em desenvolvimento" as const,
  },
  {
    icon: Database,
    title: "Bancos de Dados",
    desc: "Bases SQL, data warehouses, relatórios históricos e dados estruturados.",
    status: "Em desenvolvimento" as const,
  },
  {
    icon: Activity,
    title: "Logs e Monitoramento",
    desc: "Logs de aplicação, métricas de infraestrutura, alertas e eventos operacionais.",
    status: "Planejado" as const,
  },
];

const USE_CASES = [
  {
    icon: Server,
    title: "Infraestrutura e TI",
    desc: "Diagnósticos, troubleshooting, automação de servidores, redes e ambientes cloud.",
  },
  {
    icon: Shield,
    title: "Segurança da Informação",
    desc: "Análise de vulnerabilidades, compliance, resposta a incidentes e hardening.",
  },
  {
    icon: Stethoscope,
    title: "Saúde e Regulatório",
    desc: "Consulta a protocolos, normas regulatórias, documentação clínica e compliance.",
  },
  {
    icon: Scale,
    title: "Jurídico e Compliance",
    desc: "Pesquisa em legislação, contratos, políticas internas e normas setoriais.",
  },
  {
    icon: Factory,
    title: "Indústria e Operações",
    desc: "Manuais técnicos, procedimentos operacionais, gestão de ativos e manutenção.",
  },
  {
    icon: Headphones,
    title: "Atendimento e Suporte",
    desc: "Base de conhecimento para equipes de suporte, FAQ inteligente e triagem automatizada.",
  },
];

const FAQ_ITEMS = [
  {
    q: "O debuga.ai substitui minha equipe?",
    a: "Não. O debuga.ai potencializa sua equipe, tornando o conhecimento da empresa acessível instantaneamente. Sua equipe toma decisões melhores e mais rápidas.",
  },
  {
    q: "Como a plataforma aprende com minha operação?",
    a: "Você conecta suas fontes de conhecimento — documentos, APIs, bancos de dados e sistemas. A plataforma processa, organiza e mantém esse conhecimento atualizado continuamente.",
  },
  {
    q: "Funciona com sistemas que já uso (ERP, CRM, monitoramento)?",
    a: "Sim. A arquitetura de fontes de conhecimento permite conectar qualquer sistema que exponha dados via API, banco de dados ou exportação de documentos.",
  },
  {
    q: "Posso usar com minha própria marca?",
    a: "Sim. No modelo Enterprise, você possui sua própria plataforma com identidade visual, domínio, base de conhecimento e infraestrutura dedicada.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Cada empresa possui um ambiente isolado. Os dados são criptografados em trânsito e em repouso, com controle de acesso granular e auditoria completa.",
  },
  {
    q: "Posso implantar em infraestrutura própria?",
    a: "Sim. O modelo Enterprise suporta implantação em cloud dedicada, on-premise ou ambiente híbrido, conforme os requisitos de segurança e compliance da sua empresa.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { appName, companyName, logoUrl, supportWhatsapp, githubUrl } = useBranding();

  const handleGetStarted = () => {
    if (user) {
      setLocation("/chat");
    } else {
      window.location.href = getLoginUrl("/chat");
    }
  };

  const handleGoToChat = () => {
    setLocation("/chat");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt={appName} className="w-8 h-8 rounded-lg" />}
            <div className="flex flex-col">
              <span className="font-mono font-bold text-lg leading-tight">
                {appName}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/60 tracking-wider uppercase hidden sm:block">
                Operational Intelligence Platform
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              Como Funciona
            </a>
            <a href="#features" className="hover:text-primary transition-colors">
              Recursos
            </a>
            <a href="#use-cases" className="hover:text-primary transition-colors">
              Casos de Uso
            </a>
            <a href="#enterprise" className="hover:text-primary transition-colors">
              Enterprise
            </a>
          </div>
          <div className="flex items-center gap-3">
            {loading ? null : user ? (
              <Button onClick={handleGoToChat} className="gap-2 font-mono">
                <Terminal className="w-4 h-4" />
                Abrir Plataforma
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => (window.location.href = getLoginUrl())}
                  className="font-mono text-sm"
                >
                  Entrar
                </Button>
                <Button onClick={handleGetStarted} className="gap-2 font-mono">
                  Começar Grátis <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            <div className="space-y-8">
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              >
                Seu conhecimento corporativo já existe.{" "}
                <span className="text-primary terminal-glow">
                  O debuga.ai faz ele trabalhar para você.
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground leading-relaxed max-w-lg"
              >
                Conecte documentos, APIs, bancos de dados e sistemas corporativos.
                O debuga.ai aprende continuamente com suas fontes e entrega respostas
                contextualizadas para toda a equipe.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="gap-2 font-mono text-base px-8 h-12"
                >
                  Começar Gratuitamente <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="gap-2 font-mono text-base px-8 h-12 border-primary/30 hover:bg-primary/5"
                >
                  Ver Como Funciona
                </Button>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> Aprendizado contínuo
                </span>
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Múltiplas fontes de dados
                </span>
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> White Label disponível
                </span>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 text-sm text-muted-foreground/70">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Teste gratuito
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Sem cartão
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Cancele quando quiser
                </span>
              </motion.div>
            </div>

            <motion.div
              variants={fadeInUp}
              className="relative hidden lg:block"
            >
              <HeroAnimation />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/2 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// COMO FUNCIONA"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Três passos para inteligência operacional
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              A IA que aprende como sua empresa trabalha.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                step: "01",
                icon: Plug,
                title: "Conecte",
                desc: "Conecte suas fontes de conhecimento: documentos, APIs, bancos de dados, logs e sistemas corporativos.",
              },
              {
                step: "02",
                icon: Brain,
                title: "Aprenda",
                desc: "A plataforma processa, organiza e aprende continuamente com os dados da sua operação.",
              },
              {
                step: "03",
                icon: MessageSquare,
                title: "Consulte",
                desc: "Sua equipe consulta o conhecimento da empresa e recebe respostas contextualizadas instantaneamente.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="relative p-8 rounded-xl border border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 text-center group"
              >
                <span className="absolute top-4 right-4 text-5xl font-bold text-primary/10 font-mono">
                  {item.step}
                </span>
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/30 transition-colors">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Knowledge Sources Section */}
      <section id="knowledge-sources" className="py-20 md:py-32">
        {/* Anchor compatibility */}
        <span id="integrations" className="invisible absolute" />
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// FONTES DE CONHECIMENTO"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              O que o debuga.ai aprende?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              A plataforma se conecta às fontes de conhecimento da sua empresa e transforma
              dados dispersos em inteligência operacional unificada.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {KNOWLEDGE_SOURCES.map((source, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="relative p-6 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300 group text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <source.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{source.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{source.desc}</p>
                <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  source.status === "Disponível" ? "bg-primary/10 text-primary" :
                  source.status === "Em desenvolvimento" ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-muted text-muted-foreground"
                }`}>{source.status}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features/Capabilities Section */}
      <section id="features" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/2 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// RECURSOS"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Mais que um chatbot. Uma plataforma de inteligência operacional.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Capacidades projetadas para transformar o conhecimento da sua empresa
              em decisões mais rápidas e operações mais eficientes.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {CAPABILITIES.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className={cn(
                  "group p-6 rounded-xl border transition-all duration-300",
                  f.highlight
                    ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 ring-1 ring-primary/10"
                    : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors",
                  f.highlight ? "bg-primary/20 group-hover:bg-primary/30" : "bg-primary/10 group-hover:bg-primary/20"
                )}>
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// CASOS DE USO"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Inteligência operacional para qualquer setor
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Toda operação baseada em conhecimento pode ser potencializada pelo debuga.ai.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {USE_CASES.map((uc, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="p-6 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <uc.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-2">{uc.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{uc.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Plans Section (maturity-based, no prices) */}
      <section id="plans" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/2 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// EVOLUÇÃO"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Evolua conforme sua operação cresce
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Cada plano representa um nível de maturidade em inteligência operacional.
              Comece simples e escale conforme a necessidade.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                name: "Starter",
                tagline: "Aprenda com seus documentos.",
                icon: GraduationCap,
                features: [
                  "Upload e processamento de documentos",
                  "Consulta inteligente à base de conhecimento",
                  "Histórico de conversas",
                  "Interface conversacional completa",
                  "Geração de relatórios básicos",
                ],
              },
              {
                name: "Professional",
                tagline: "Conecte sua operação.",
                icon: Workflow,
                popular: true,
                features: [
                  "Tudo do Starter incluído",
                  "Fontes de conhecimento avançadas (APIs, bancos, logs)",
                  "Ferramentas de diagnóstico e automação",
                  "Navegação web autônoma",
                  "Execução de código em ambiente seguro",
                  "Suporte prioritário",
                ],
              },
              {
                name: "Enterprise",
                tagline: "Construa sua plataforma de inteligência operacional.",
                icon: Building2,
                features: [
                  "Tudo do Professional incluído",
                  "White Label com sua marca e domínio",
                  "Infraestrutura dedicada (cloud ou on-premise)",
                  "Fontes de conhecimento ilimitadas",
                  "Treinamento e acompanhamento técnico",
                  "Modelo consultivo sob medida",
                ],
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className={cn(
                  "relative p-8 rounded-xl border transition-all duration-300",
                  plan.popular
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/50 bg-card/30 hover:border-primary/30"
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider border border-primary/20">
                    Mais Popular
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <plan.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-primary font-medium mb-6">{plan.tagline}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full font-mono"
                  onClick={() => {
                    if (plan.name === "Enterprise") {
                      const url = getWhatsAppUrl(supportWhatsapp, `Olá! Tenho interesse no ${appName} Enterprise. Gostaria de entender como a plataforma pode ser adaptada para minha empresa.`);
                      if (url) window.open(url, "_blank");
                    } else {
                      handleGetStarted();
                    }
                  }}
                >
                  {plan.name === "Enterprise" ? "Falar com a Equipe" : "Começar Gratuitamente"}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* White Label / Enterprise Section */}
      <section id="enterprise" className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3 text-center">
              {"// ENTERPRISE"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold text-center mb-4">
              Sua própria plataforma de inteligência operacional
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground text-center max-w-3xl mx-auto mb-14 leading-relaxed">
              O modelo Enterprise não é apenas uma funcionalidade — é uma plataforma completa
              com a identidade da sua empresa, operando no seu domínio, com sua base de conhecimento
              e sua infraestrutura.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14"
            >
              {[
                {
                  icon: Palette,
                  title: "Sua marca, sua identidade",
                  desc: "Nome, logo, cores, tom de resposta e toda a experiência visual personalizada para sua empresa.",
                },
                {
                  icon: Globe,
                  title: "Seu domínio",
                  desc: "Opere em seu próprio domínio com certificado SSL. Seus colaboradores acessam a plataforma como um produto interno.",
                },
                {
                  icon: BookOpen,
                  title: "Sua base de conhecimento",
                  desc: "Documentos, processos, políticas e dados exclusivos da sua operação, organizados e sempre atualizados.",
                },
                {
                  icon: Plug,
                  title: "Suas fontes de conhecimento",
                  desc: "Conecte quantas fontes precisar: APIs, bancos de dados, logs, sistemas corporativos e ferramentas de gestão.",
                },
                {
                  icon: HardDrive,
                  title: "Sua infraestrutura",
                  desc: "Cloud dedicada, on-premise ou ambiente híbrido. A escolha é da sua empresa, conforme requisitos de segurança e compliance.",
                },
                {
                  icon: Briefcase,
                  title: "Modelo consultivo",
                  desc: "Cada projeto Enterprise é dimensionado sob medida. Treinamento, acompanhamento técnico e evolução contínua.",
                },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="relative p-6 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <card.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{card.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center">
              <Button
                size="lg"
                onClick={() => {
                  const url = getWhatsAppUrl(supportWhatsapp, `Olá! Tenho interesse no ${appName} Enterprise. Gostaria de entender como a plataforma pode ser adaptada para minha empresa.`);
                  if (url) window.open(url, "_blank");
                }}
                className="gap-2 font-mono text-base px-8 h-12"
              >
                Falar com a Equipe Comercial <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground/60 mt-3">
                Sem compromisso. Entenda como a plataforma pode ser adaptada para sua operação.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// FAQ"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Perguntas Frequentes
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="space-y-4"
          >
            {FAQ_ITEMS.map((item, i) => (
              <motion.details
                key={i}
                variants={fadeInUp}
                className="group p-6 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 transition-all duration-300"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-semibold text-sm pr-4">{item.q}</span>
                  <CircleDot className="w-4 h-4 text-primary shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/30">
                  {item.a}
                </p>
              </motion.details>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.img
              variants={fadeInUp}
              src={logoUrl}
              alt={appName}
              className="w-24 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(0,255,65,0.3)]"
            />
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Sua operação ensina. O debuga.ai aprende.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Comece gratuitamente e descubra como o conhecimento da sua empresa
              pode se transformar em inteligência operacional.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="gap-2 font-mono text-base px-8 h-12"
              >
                Começar Gratuitamente <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {logoUrl && <img src={logoUrl} alt={appName} className="w-6 h-6 rounded" />}
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-semibold">{appName}</span>
                  <span className="text-[8px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                    Operational Intelligence Platform
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A IA que aprende como sua empresa trabalha. Transforme documentos, APIs, bancos de dados e sistemas em inteligência operacional.
              </p>
              <a
                href="https://www.sperrytecnologia.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                Desenvolvido por {companyName} <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Plataforma</p>
              <div className="flex flex-col gap-2">
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">Como Funciona</a>
                <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Recursos</a>
                <a href="#use-cases" className="text-sm text-muted-foreground hover:text-primary transition-colors">Casos de Uso</a>
                <a href="#enterprise" className="text-sm text-muted-foreground hover:text-primary transition-colors">Enterprise</a>
                <a href="#faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</a>
              </div>
            </div>

            {/* Documentação */}
            {githubUrl && (
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Documentação</p>
              <div className="flex flex-col gap-2">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <Github className="w-4 h-4" /> GitHub
                </a>
                <a
                  href={`${githubUrl}/blob/main/docs/WHITEPAPER_PTBR.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Whitepaper
                </a>
                <a
                  href={`${githubUrl}/blob/main/docs/ARCHITECTURE_PTBR.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Arquitetura
                </a>
                <a
                  href={`${githubUrl}/blob/main/docs/WHITE_LABEL_OVERVIEW.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Enterprise
                </a>
              </div>
            </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/30 pt-6 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
