import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation, useSearch } from "wouter";
import {
  Check,
  ArrowLeft,
  Zap,
  Crown,
  Building2,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LOGO_ICON =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga_logo_icon-cikoAtHz7LsHY3sccX7cHD.webp";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

interface PlanDisplay {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  features: string[];
  popular?: boolean;
  cta: string;
  highlight?: boolean;
}

const PLANS: PlanDisplay[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Para profissionais de TI que querem comecar a usar IA no dia a dia",
    icon: Zap,
    features: [
      "50 mensagens por dia",
      "10 conversas por mes",
      "Analise de seguranca basica",
      "Scripts de automacao",
      "Suporte por email",
    ],
    cta: "Comecar com Starter",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para equipes de TI que precisam de poder total",
    icon: Crown,
    features: [
      "Mensagens ilimitadas",
      "Conversas ilimitadas",
      "Analise avancada de seguranca",
      "Integracao com Zabbix, Wazuh, Prometheus",
      "Geracao de relatorios",
      "Suporte prioritario",
    ],
    popular: true,
    highlight: true,
    cta: "Assinar Pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para empresas que precisam de controle total e personalizacao",
    icon: Building2,
    features: [
      "Tudo do Pro",
      "API dedicada",
      "Sandbox Docker para scripts",
      "Integracao com NetBox e CMDB",
      "SSO / SAML",
      "SLA garantido",
      "Gerente de conta dedicado",
    ],
    cta: "Falar com Vendas",
  },
];

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (search.includes("checkout=canceled")) {
      toast.error("Checkout cancelado. Voce pode tentar novamente quando quiser.");
    }
  }, [search]);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      window.location.href = getLoginUrl("/pricing");
      return;
    }

    if (planId === "enterprise") {
      toast.info("Entre em contato conosco para o plano Enterprise: contato@sperrytecnologia.com.br");
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });

      const data = await res.json();
      if (data.url) {
        toast.info("Redirecionando para o checkout...");
        window.open(data.url, "_blank");
      } else {
        toast.error("Erro ao criar sessao de checkout");
      }
    } catch (err) {
      toast.error("Erro ao processar pagamento");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="gap-2 font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <img src={LOGO_ICON} alt="debuga.ai" className="w-7 h-7 rounded-lg" />
            <span className="font-mono font-bold">
              debuga<span className="text-primary">.ai</span>
            </span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-20 max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center mb-12"
        >
          <motion.p variants={fadeInUp} className="text-primary font-mono text-sm mb-3">
            {"// PLANOS"}
          </motion.p>
          <motion.h1 variants={fadeInUp} className="text-3xl md:text-5xl font-bold mb-4">
            Escolha o plano ideal para sua equipe
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Todos os planos incluem acesso ao agente autonomo de IA especializado em TI,
            seguranca da informacao e DevOps.
          </motion.p>

          {/* Interval Toggle */}
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-card">
            <button
              onClick={() => setInterval("monthly")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-mono transition-all",
                interval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-mono transition-all relative",
                interval === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
              <span className="absolute -top-2 -right-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">
                -17%
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              variants={fadeInUp}
              className={cn(
                "relative flex flex-col p-6 rounded-2xl border transition-all duration-300",
                plan.highlight
                  ? "border-primary bg-card shadow-lg shadow-primary/10 scale-[1.02]"
                  : "border-border/50 bg-card/50 hover:border-primary/30"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold">
                  MAIS POPULAR
                </div>
              )}

              <div className="mb-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <plan.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="flex-1 mb-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!loadingPlan}
                className={cn(
                  "w-full font-mono gap-2",
                  plan.highlight
                    ? ""
                    : "bg-transparent border border-primary/30 text-primary hover:bg-primary/10"
                )}
                variant={plan.highlight ? "default" : "outline"}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ / Trust */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mt-20 text-center"
        >
          <motion.p variants={fadeInUp} className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Pagamento seguro via Stripe. Aceitamos cartao de credito, PIX e boleto bancario.
            Cancele a qualquer momento sem multa. Teste com o cartao 4242 4242 4242 4242 no modo sandbox.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
