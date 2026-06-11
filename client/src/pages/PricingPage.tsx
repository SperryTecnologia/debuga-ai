import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
  Gift,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBranding, getWhatsAppUrl } from "@/contexts/BrandingContext";

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
  priceMonthly: number; // in BRL (not cents)
  priceYearly: number;  // in BRL (not cents) — total annual
  popular?: boolean;
  cta: string;
  highlight?: boolean;
  isFree?: boolean;
  badge?: string;
}

const PLANS: PlanDisplay[] = [
  {
    id: "free",
    name: "Gratuito",
    description: "Experimente o agente de IA para TI",
    icon: Gift,
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "5 mensagens por dia",
      "3 conversas por mês",
      "Diagnósticos textuais com IA",
      "Sugestões guiadas de TI e segurança",
      "Histórico básico de conversas",
    ],
    cta: "Começar Grátis",
    isFree: true,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Para profissionais de TI que usam IA técnica no dia a dia",
    icon: Zap,
    priceMonthly: 49.90,
    priceYearly: 479.00,
    features: [
      "100 mensagens por dia",
      "30 conversas por mês",
      "Ferramentas: DNS, SSL, HTTP, WHOIS",
      "Navegação autônoma em sites",
      "Geração de scripts (sem execução)",
      "Suporte por email",
      "Upgrade disponível para suporte humano sênior",
    ],
    cta: "Assinar Starter",
  },
  {
    id: "pro",
    name: "Pro",
    description: "IA técnica + triagem humana sênior via WhatsApp para demandas específicas",
    icon: Crown,
    priceMonthly: 149.90,
    priceYearly: 1439.00,
    features: [
      "Mensagens ilimitadas",
      "Conversas ilimitadas",
      "Todas as ferramentas (port scan, execução de código)",
      "Geração de imagens e diagramas",
      "Histórico completo",
      "Suporte prioritário via chat",
      "Triagem humana sênior via WhatsApp (conforme elegibilidade)",
      "Integrações sob configuração (em breve)",
    ],
    popular: true,
    highlight: true,
    cta: "Assinar Pro",
    badge: "MAIS POPULAR",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para empresas que precisam de IA personalizada, integração com processos internos, suporte humano sênior e possibilidade de implantação dedicada.",
    icon: Building2,
    priceMonthly: 499.90,
    priceYearly: 4799.00,
    features: [
      "Tudo do Pro incluído",
      "Personalização de identidade e contexto",
      "Base de conhecimento orientada ao negócio",
      "Treinamento de uso para a equipe",
      "Suporte humano sênior conforme contrato",
      "Arquitetura white label conforme escopo",
      "Implantação dedicada em cloud, on-premise ou híbrida conforme escopo",
      "Avaliação de infraestrutura com GPU dedicada quando aplicável",
      "Personalização de contexto, identidade e base de conhecimento conforme o negócio",
      "Integração com autenticação, banco, storage e provedores de IA",
    ],
    cta: "Falar com Vendas",
  },
];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function getMonthlyFromYearly(yearly: number): number {
  return Math.round((yearly / 12) * 100) / 100;
}

function getSavingsPercent(monthly: number, yearly: number): number {
  if (monthly === 0) return 0;
  const fullYear = monthly * 12;
  return Math.round(((fullYear - yearly) / fullYear) * 100);
}

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const { appName, logoUrl, supportWhatsapp } = useBranding();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Get user's current plan
  const { data: usageData } = trpc.account.usage.useQuery(undefined, {
    enabled: !!user,
  });
  const currentPlanId = usageData?.planId || "free";

  useEffect(() => {
    if (search.includes("checkout=canceled")) {
      toast.error("Checkout cancelado. Você pode tentar novamente quando quiser.");
    }
  }, [search]);

  const handleSubscribe = async (planId: string) => {
    if (planId === "free") {
      if (!user) {
        window.location.href = getLoginUrl("/chat");
        return;
      }
      setLocation("/chat");
      return;
    }

    if (planId === "enterprise") {
      const enterpriseMsg = `Olá! Tenho interesse no plano Enterprise do ${appName}. Gostaria de saber mais sobre API dedicada com SLA, integrações avançadas (NetBox, CMDB, SSO/SAML/LDAP) e treinamento para minha equipe. Podem me ajudar?`;
      const url = getWhatsAppUrl(supportWhatsapp, enterpriseMsg);
      if (url) window.open(url, "_blank");
      toast.info("Redirecionando para o WhatsApp da equipe comercial...");
      return;
    }

    if (!user) {
      window.location.href = getLoginUrl("/pricing");
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId, interval }),
      });

      const data = await res.json();
      if (res.status === 401) {
        toast.error("Sessão expirada. Redirecionando para login...");
        setTimeout(() => {
          window.location.href = getLoginUrl("/pricing");
        }, 1500);
        return;
      }
      if (res.status === 503 && data.code === "STRIPE_NOT_CONFIGURED") {
        toast.error("Checkout não configurado neste ambiente. Entre em contato com o administrador.");
        return;
      }
      if (data.url) {
        toast.info("Redirecionando para o checkout seguro...");
        window.open(data.url, "_blank");
      } else {
        toast.error(data.error || "Erro ao criar sessão de checkout");
      }
    } catch (err) {
      toast.error("Erro de conex\u00e3o. Verifique sua internet e tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const isFromApp = search.includes("from=app") || !!user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(isFromApp ? "/chat" : "/")}
              className="gap-2 font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              {isFromApp ? "Voltar ao Chat" : "Voltar"}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt={appName} className="w-7 h-7 rounded-lg" />}
            <span className="font-mono font-bold">
              {appName}
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
            {"// PLANOS & PREÇOS"}
          </motion.p>
          <motion.h1 variants={fadeInUp} className="text-3xl md:text-5xl font-bold mb-4">
            Escolha o plano ideal para sua equipe
          </motion.h1>
          <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Todos os planos pagos incluem acesso ao agente autônomo de IA especializado em TI,
            segurança da informação e DevOps. Comece grátis e escale quando precisar.
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
              <span className="absolute -top-2 -right-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                Economize
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Plans Grid */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto"
        >
          {PLANS.map((plan) => {
            const displayPrice = interval === "monthly"
              ? plan.priceMonthly
              : getMonthlyFromYearly(plan.priceYearly);
            const savings = getSavingsPercent(plan.priceMonthly, plan.priceYearly);
            const isCurrentPlan = user && plan.id === currentPlanId;

            return (
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
                {isCurrentPlan ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-mono font-bold whitespace-nowrap">
                    PLANO ATUAL
                  </div>
                ) : plan.badge ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-mono font-bold whitespace-nowrap">
                    {plan.badge}
                  </div>
                ) : null}

                <div className="mb-5">
                  <div className={cn(
                    "w-11 h-11 rounded-lg flex items-center justify-center mb-4",
                    plan.isFree ? "bg-muted" : "bg-primary/10"
                  )}>
                    <plan.icon className={cn(
                      "w-5 h-5",
                      plan.isFree ? "text-muted-foreground" : "text-primary"
                    )} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                </div>

                {/* Price Display */}
                <div className="mb-5">
                  {plan.isFree ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">R$0</span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono">
                          {formatBRL(displayPrice)}
                        </span>
                        <span className="text-muted-foreground text-sm">/mês</span>
                      </div>
                      {interval === "yearly" && savings > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-muted-foreground line-through">
                            {formatBRL(plan.priceMonthly)}/mês
                          </span>
                          <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            -{savings}%
                          </span>
                        </div>
                      )}
                      {interval === "yearly" && (
                        <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono">
                          {formatBRL(plan.priceYearly)} cobrado anualmente
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 mb-5">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className={cn(
                          "w-4 h-4 shrink-0 mt-0.5",
                          plan.isFree ? "text-muted-foreground" : "text-primary"
                        )} />
                        <span className="text-muted-foreground text-xs">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!loadingPlan || !!isCurrentPlan}
                  className={cn(
                    "w-full font-mono gap-2 text-sm",
                    isCurrentPlan
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default"
                      : plan.highlight
                        ? ""
                        : plan.isFree
                          ? "bg-muted text-foreground hover:bg-muted/80 border-0"
                          : "bg-transparent border border-primary/30 text-primary hover:bg-primary/10"
                  )}
                  variant={plan.highlight && !isCurrentPlan ? "default" : "outline"}
                >
                  {loadingPlan === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isCurrentPlan ? "Plano Atual" : plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mt-20 max-w-4xl mx-auto"
        >
          <motion.h2 variants={fadeInUp} className="text-2xl font-bold text-center mb-8">
            Compare os planos
          </motion.h2>
          <motion.div variants={fadeInUp} className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-card/50">
                  <th className="text-left p-4 font-mono text-muted-foreground">Recurso</th>
                  <th className="text-center p-4 font-mono text-muted-foreground">Gratuito</th>
                  <th className="text-center p-4 font-mono text-muted-foreground">Starter</th>
                  <th className="text-center p-4 font-mono text-primary font-bold">Pro</th>
                  <th className="text-center p-4 font-mono text-muted-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="p-4 text-muted-foreground">Mensagens/dia</td>
                  <td className="p-4 text-center font-mono">5</td>
                  <td className="p-4 text-center font-mono">100</td>
                  <td className="p-4 text-center font-mono text-primary">Ilimitado</td>
                  <td className="p-4 text-center font-mono">Ilimitado</td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">Conversas/mês</td>
                  <td className="p-4 text-center font-mono">3</td>
                  <td className="p-4 text-center font-mono">30</td>
                  <td className="p-4 text-center font-mono text-primary">Ilimitado</td>
                  <td className="p-4 text-center font-mono">Ilimitado</td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">Ferramentas de rede (DNS, SSL, HTTP)</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">Port scan e execução de código</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">Geração de imagens/diagramas</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                  <td className="p-4 text-center"><Check className="w-4 h-4 text-primary mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">Integrações customizadas</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-muted-foreground/50 text-xs">Em breve</td>
                  <td className="p-4 text-center text-xs">Sob projeto</td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">SSO / SAML</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-muted-foreground/50">—</td>
                  <td className="p-4 text-center text-xs">Sob projeto</td>
                </tr>
                <tr>
                  <td className="p-4 text-muted-foreground">Suporte</td>
                  <td className="p-4 text-center">—</td>
                  <td className="p-4 text-center">Email</td>
                  <td className="p-4 text-center text-primary">Chat prioritário</td>
                  <td className="p-4 text-center">Gerente dedicado</td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        </motion.div>

        {/* Trust Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mt-16 text-center space-y-4"
        >
          <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground/70 font-mono">
            <span>Pagamento seguro via Stripe</span>
            <span className="text-border">|</span>
            <span>Cartão de crédito e débito</span>
            <span className="text-border">|</span>
            <span>Cancele quando quiser</span>
            <span className="text-border">|</span>
            <span>Dados protegidos</span>
          </motion.div>
          <motion.p variants={fadeInUp} className="text-[11px] text-muted-foreground/50 max-w-lg mx-auto">
            Todos os valores em Reais (BRL). Planos anuais são cobrados em parcela única com desconto.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
