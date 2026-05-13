import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Shield,
  Server,
  Terminal,
  Wifi,
  Zap,
  Lock,
  Bot,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Globe,
  Cpu,
  Network,
  Scan,
  Code2,
  Eye,
  Github,
  FileText,
  ExternalLink,
  Headset,
  Rocket,
  Building2,
  Briefcase,
  Database,
  Palette,
  BookOpen,
  Cog,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import HeroAnimation from "@/components/HeroAnimation";

const LOGO_FULL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga_logo_full-Sz8NVLnwpPYSyjyTTd3PJT.webp";
const HERO_3D =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga_hero_3d-fhFhio2TpgpshMBLNXCSmE.webp";
const LOGO_ICON =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga-logo-v2-A2P25ZnkFwTU2RkRjz85nk.webp";
const AVATAR_AGENT = LOGO_ICON;

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  {
    icon: Bot,
    title: "IA com Contexto Técnico Especializado",
    desc: "O debuga.ai foi desenhado para atuar em cenários de infraestrutura, segurança, redes, servidores, DNS, SSL, DevOps, documentação técnica e análise de evidências — não é uma IA genérica.",
    highlight: true,
  },
  {
    icon: Eye,
    title: "Base Orientada por Experiência Humana",
    desc: "A plataforma incorpora padrões de resposta, fluxos de diagnóstico e boas práticas inspiradas na atuação técnica da Sperry Tecnologia em ambientes corporativos.",
    highlight: true,
  },
  {
    icon: Headset,
    title: "Suporte Humano Sênior",
    desc: "Nos planos Pro e Enterprise, demandas específicas podem ser direcionadas para triagem humana via WhatsApp, conforme elegibilidade, contrato e escopo.",
    highlight: true,
  },
  {
    icon: FileText,
    title: "Documentação e Evidências",
    desc: "Gere análises, relatórios, propostas, checklists e documentação técnica em formatos estruturados para uso profissional imediato.",
    highlight: true,
  },
  {
    icon: Rocket,
    title: "Roadmap Enterprise",
    desc: "A evolução do debuga.ai prevê laboratório próprio, autenticação independente, PostgreSQL, GPU local e inferência híbrida cloud/local para cenários Enterprise.",
    highlight: true,
  },
  {
    icon: Globe,
    title: "Navegação Web Autônoma",
    desc: "O agente acessa URLs, extrai conteúdo de páginas, analisa meta tags e links. Peça para ele ler qualquer site e reportar o que encontrou.",
  },
  {
    icon: Code2,
    title: "Sandbox de Código",
    desc: "Execute scripts Python e Bash em ambiente seguro e isolado. Ideal para automação, análise de dados e validação de configurações.",
  },
  {
    icon: Scan,
    title: "Port Scan & Auditoria",
    desc: "Escaneie portas abertas, verifique certificados SSL, analise headers HTTP e consulte WHOIS — tudo automaticamente pelo agente.",
  },
  {
    icon: Shield,
    title: "Segurança da Informação",
    desc: "Análise de vulnerabilidades, hardening de servidores, resposta a incidentes e compliance com ISO 27001 e NIST.",
  },
  {
    icon: Server,
    title: "Infraestrutura de TI",
    desc: "Diagnóstico e resolução de problemas em servidores, storage, virtualização e ambientes cloud (AWS, Azure, GCP).",
  },
  {
    icon: Terminal,
    title: "DevOps & Automação",
    desc: "CI/CD, containers, Kubernetes, Ansible, Terraform. Scripts prontos para uso em Python, Bash e PowerShell.",
  },
  {
    icon: Wifi,
    title: "Redes & Telecom",
    desc: "Troubleshooting de rede, análise de tráfego, configuração de firewalls, VPNs e infraestrutura de telecomunicações.",
  },
  {
    icon: Lock,
    title: "SIEM & Monitoramento",
    desc: "Conectores planejados para Zabbix, Wazuh, Prometheus e Grafana — análise inteligente de alertas e métricas (em breve).",
  },
];

const INTEGRATIONS = [
  { name: "Zabbix", icon: Cpu },
  { name: "Wazuh", icon: Shield },
  { name: "Prometheus", icon: Globe },
  { name: "NetBox", icon: Network },
  { name: "Grafana", icon: Zap },
  { name: "Ansible", icon: Terminal },
];

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

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
            <img src={LOGO_ICON} alt="debuga.ai" className="w-8 h-8 rounded-lg" />
            <span className="font-mono font-bold text-lg">
              debuga<span className="text-primary">.ai</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">
              Recursos
            </a>
            <a href="#integrations" className="hover:text-primary transition-colors">
              Integrações
            </a>
            <a href="#enterprise" className="hover:text-primary transition-colors">
              Enterprise
            </a>
            <a href="/pricing" className="hover:text-primary transition-colors">
              Planos
            </a>
          </div>
          <div className="flex items-center gap-3">
            {loading ? null : user ? (
              <Button onClick={handleGoToChat} className="gap-2 font-mono">
                <Terminal className="w-4 h-4" />
                Abrir Chat
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
                <Button onClick={() => setLocation('/pricing')} className="gap-2 font-mono">
                  Comecar <ArrowRight className="w-4 h-4" />
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
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-mono">
                <Zap className="w-4 h-4" />
                Powered by Sperry Tecnologia
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-6xl font-bold leading-tight"
              >
                Seu agente{" "}
                <span className="text-primary terminal-glow">autônomo</span>{" "}
                de IA para{" "}
                <span className="text-primary terminal-glow">TI</span>,{" "}
                <span className="text-primary terminal-glow">Segurança</span>{" "}
                e{" "}
                <span className="text-primary terminal-glow">Infraestrutura</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground leading-relaxed max-w-lg"
              >
                O debuga.ai combina inteligência artificial, contexto técnico especializado
                e apoio humano sênior para acelerar diagnósticos, gerar documentação e
                orientar decisões em ambientes corporativos.
              </motion.p>

              <motion.p
                variants={fadeInUp}
                className="text-sm text-muted-foreground/80 leading-relaxed max-w-lg"
              >
                Mais que uma IA genérica: uma plataforma orientada para problemas reais
                de infraestrutura, segurança, DevOps e telecomunicações.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => setLocation('/pricing')}
                  className="gap-2 font-mono text-base px-8 h-12"
                >
                  Comecar Agora <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  className="gap-2 font-mono text-base px-8 h-12 border-primary/30 hover:bg-primary/5"
                >
                  Ver Recursos
                </Button>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 text-sm text-muted-foreground">
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
              <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm border border-border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">debuga.ai</p>
                  <p className="text-sm font-mono text-primary font-semibold">IA Técnica + Suporte Humano</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
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
              Mais que um chatbot. Um agente técnico que age.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              IA orientada por contexto técnico especializado, base de conhecimento curada
              e boas práticas de infraestrutura, segurança e DevOps. Tudo em um único agente.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {FEATURES.map((f: any) => (
              <motion.div
                key={f.title}
                variants={fadeInUp}
                className={cn(
                  "group p-6 rounded-xl border transition-all duration-300",
                  f.highlight
                    ? "border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10 ring-1 ring-primary/10"
                    : "border-border/50 bg-card/50 hover:border-primary/30 hover:bg-card"
                )}
              >
                {f.highlight && (
                  <span className="inline-block text-[10px] font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-3 uppercase tracking-wider">Diferencial</span>
                )}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors",
                  f.highlight ? "bg-primary/20 group-hover:bg-primary/30" : "bg-primary/10 group-hover:bg-primary/20"
                )}>
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
              {"// CONECTORES PLANEJADOS"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Integrações em evolução
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Conectores para as principais ferramentas de monitoramento, segurança e gestão de infraestrutura
              estão no roadmap. A evolução prevê liberação gradual para planos avançados e projetos Enterprise.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {INTEGRATIONS.map((item) => (
              <motion.div
                key={item.name}
                variants={fadeInUp}
                className="relative flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
              >
                <span className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary/70 border border-primary/20">
                  Em breve
                </span>
                <item.icon className="w-8 h-8 text-primary/70" />
                <span className="text-sm font-mono text-muted-foreground">{item.name}</span>
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
              White Label e IA sob medida para empresas
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground text-center max-w-3xl mx-auto mb-14 leading-relaxed">
              Além do debuga.ai para TI e segurança, a arquitetura pode ser adaptada para
              empresas que desejam uma IA própria, com identidade visual, base de conhecimento,
              fluxos de atendimento e implantação dedicada.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14"
            >
              {[
                {
                  icon: Palette,
                  title: "IA com a identidade da sua empresa",
                  desc: "Personalize nome, marca, tom de resposta, contexto, fluxos e áreas de atuação.",
                },
                {
                  icon: BookOpen,
                  title: "Base de conhecimento orientada ao negócio",
                  desc: "Organize documentos, perguntas frequentes, processos, políticas internas e instruções específicas para o agente.",
                },
                {
                  icon: Server,
                  title: "Deploy dedicado e ambiente próprio",
                  desc: "Possibilidade de implantação em ambiente homologado, VPS, servidor próprio ou arquitetura híbrida, conforme projeto.",
                },
                {
                  icon: Briefcase,
                  title: "Treinamento e acompanhamento",
                  desc: "Planos Enterprise podem incluir orientação técnica, treinamento de uso, documentação e apoio humano sênior.",
                },
                {
                  icon: Cog,
                  title: "Arquitetura preparada para evolução",
                  desc: "Autenticação própria, banco dedicado, storage compatível com S3, provedores LLM e possibilidade de inferência local experimental em ambientes homologados.",
                },
                {
                  icon: Building2,
                  title: "Modelo consultivo",
                  desc: "Cada projeto Enterprise é dimensionado conforme escopo, integrações, volume e necessidades específicas da empresa.",
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
                  const msg = encodeURIComponent(
                    "Olá! Tenho interesse no debuga.ai White Label / Enterprise. " +
                    "Gostaria de entender como adaptar a plataforma para minha empresa."
                  );
                  window.open(`https://wa.me/555137374357?text=${msg}`, "_blank");
                }}
                className="gap-2 font-mono text-base px-8 h-12"
              >
                Falar com a Equipe Comercial <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground/60 mt-3">
                Sem compromisso. Entenda como o debuga.ai pode ser adaptado para sua operação.
              </p>
            </motion.div>
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
              src={LOGO_ICON}
              alt="debuga.ai"
              className="w-24 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(0,255,65,0.3)]"
            />
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Acelere diagnósticos e decisões na sua TI
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Comece com IA técnica especializada. Escale para triagem humana sênior
              nos planos Pro e Enterprise quando precisar.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Button
                size="lg"
                onClick={() => setLocation('/pricing')}
                className="gap-2 font-mono text-base px-8 h-12"
              >
                Ver Planos <ArrowRight className="w-5 h-5" />
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
                <img src={LOGO_ICON} alt="debuga.ai" className="w-6 h-6 rounded" />
                <span className="font-mono text-sm font-semibold">
                  debuga<span className="text-primary">.ai</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                IA técnica especializada para infraestrutura, segurança da informação, DevOps e telecomunicações. Contexto especializado + suporte humano sênior.
              </p>
              <a
                href="https://www.sperrytecnologia.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                Desenvolvido por Sperry Tecnologia <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Links</p>
              <div className="flex flex-col gap-2">
                <a href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Recursos</a>
                <a href="#integrations" className="text-sm text-muted-foreground hover:text-primary transition-colors">Integrações</a>
                <a href="#enterprise" className="text-sm text-muted-foreground hover:text-primary transition-colors">Enterprise</a>
                <a href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Planos</a>
              </div>
            </div>

            {/* Open Source & Docs */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Documentação</p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://github.com/SperryTecnologia/debuga-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <Github className="w-4 h-4" /> GitHub
                </a>
                <a
                  href="https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/WHITEPAPER_PT-BR.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Whitepaper (PT-BR)
                </a>
                <a
                  href="https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/WHITEPAPER_EN.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Whitepaper (EN)
                </a>
                <a
                  href="https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/WHITE_LABEL_ENTERPRISE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> White Label Enterprise (PT-BR)
                </a>
                <a
                  href="https://github.com/SperryTecnologia/debuga-ai/blob/main/docs/WHITE_LABEL_ENTERPRISE_EN.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> White Label Enterprise (EN)
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Sperry Tecnologia. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/SperryTecnologia/debuga-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
