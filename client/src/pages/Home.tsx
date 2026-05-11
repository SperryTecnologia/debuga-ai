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
  visible: { transition: { staggerChildren: 0.12 } },
};

const FEATURES = [
  {
    icon: Bot,
    title: "Agente Autonomo com Sandbox",
    desc: "Diferente de chatbots comuns, o debuga.ai executa tarefas de forma autonoma em um ambiente isolado: navega em sites, roda scripts e analisa resultados em tempo real.",
    highlight: true,
  },
  {
    icon: Globe,
    title: "Navegacao Web Autonoma",
    desc: "O agente acessa URLs, extrai conteudo de paginas, analisa meta tags, SEO e links. Peca para ele 'ler' qualquer site e reportar o que encontrou.",
    highlight: true,
  },
  {
    icon: Code2,
    title: "Sandbox de Codigo",
    desc: "Execute scripts Python e Bash em ambiente seguro e isolado. Ideal para automacao, analise de dados, calculos e validacao de configuracoes.",
    highlight: true,
  },
  {
    icon: Scan,
    title: "Port Scan & Auditoria",
    desc: "Escaneie portas abertas, verifique certificados SSL, analise headers HTTP e consulte WHOIS — tudo automaticamente pelo agente.",
  },
  {
    icon: Shield,
    title: "Seguranca da Informacao",
    desc: "Analise de vulnerabilidades, hardening de servidores, resposta a incidentes e compliance com ISO 27001 e NIST.",
  },
  {
    icon: Server,
    title: "Infraestrutura de TI",
    desc: "Diagnostico e resolucao de problemas em servidores, storage, virtualizacao e ambientes cloud (AWS, Azure, GCP).",
  },
  {
    icon: Terminal,
    title: "DevOps & Automacao",
    desc: "CI/CD, containers, Kubernetes, Ansible, Terraform. Scripts prontos para uso em Python, Bash e PowerShell.",
  },
  {
    icon: Wifi,
    title: "Redes & Telecom",
    desc: "Troubleshooting de rede, analise de trafego, configuracao de firewalls, VPNs e infraestrutura de telecomunicacoes.",
  },
  {
    icon: Lock,
    title: "SIEM & Monitoramento",
    desc: "Integracao com Zabbix, Wazuh, Prometheus e Grafana para analise inteligente de alertas e metricas.",
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
              Integracoes
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
                <span className="text-primary terminal-glow">autonomo</span>{" "}
                de IA para{" "}
                <span className="text-primary terminal-glow">TI</span> e{" "}
                <span className="text-primary terminal-glow">Seguranca</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-lg text-muted-foreground leading-relaxed max-w-lg"
              >
                O primeiro agente de IA com sandbox que navega em sites, executa codigo,
                escaneia portas e audita sua infraestrutura de forma autonoma.
                Nao e um chatbot — e um especialista de TI que age.
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
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Sem cartao
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
                  <p className="text-sm font-mono text-primary font-semibold">IA + Suporte Humano</p>
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
              Mais que um chatbot. Um agente que age.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              Sandbox isolada, navegacao web autonoma, execucao de codigo e ferramentas
              de seguranca integradas. Tudo o que sua equipe de TI precisa em um unico agente.
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
              {"// INTEGRACOES"}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Conecte suas ferramentas
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
              O debuga.ai se integra com as principais ferramentas de monitoramento,
              seguranca e gestao de infraestrutura do mercado.
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
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card/30 hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
              >
                <item.icon className="w-8 h-8 text-primary/70" />
                <span className="text-sm font-mono text-muted-foreground">{item.name}</span>
              </motion.div>
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
              src={LOGO_ICON}
              alt="debuga.ai"
              className="w-24 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(0,255,65,0.3)]"
            />
            <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para transformar sua TI?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Comece a usar o debuga.ai hoje e tenha um especialista de TI
              com inteligencia artificial disponivel 24 horas por dia.
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
                Agente autonomo de IA para infraestrutura de TI, seguranca da informacao e telecomunicacoes.
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
                <a href="#integrations" className="text-sm text-muted-foreground hover:text-primary transition-colors">Integracoes</a>
                <a href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Planos</a>
              </div>
            </div>

            {/* Open Source & Docs */}
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Documentacao</p>
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
