import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  CreditCard,
  Zap,
  TrendingUp,
  MessageSquare,
  Clock,
  Crown,
  Shield,
  ArrowUpRight,
  Cpu,
  Activity,
  BarChart3,
  Calendar,
  User,
  Mail,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const LOGO_ICON =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga-logo-v2-A2P25ZnkFwTU2RkRjz85nk.webp";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProgressBar({ used, total, color = "primary" }: { used: number; total: number; color?: string }) {
  const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isWarning = percent > 80;
  const isCritical = percent > 95;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground font-mono">
          {used.toLocaleString("pt-BR")} / {total.toLocaleString("pt-BR")}
        </span>
        <span
          className={cn(
            "font-mono font-bold",
            isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-primary"
          )}
        >
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            isCritical
              ? "bg-gradient-to-r from-red-500 to-red-400"
              : isWarning
              ? "bg-gradient-to-r from-amber-500 to-amber-400"
              : "bg-gradient-to-r from-primary to-emerald-400"
          )}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "rounded-xl border p-5 transition-all",
        accent
          ? "border-primary/30 bg-primary/5"
          : "border-border/50 bg-card/50"
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            accent ? "bg-primary/20" : "bg-muted"
          )}
        >
          <Icon className={cn("w-4 h-4", accent ? "text-primary" : "text-muted-foreground")} />
        </div>
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: creditsData, isLoading: creditsLoading } = trpc.account.credits.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: usageStats, isLoading: statsLoading } = trpc.account.usageStats.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: usageHistory, isLoading: historyLoading } = trpc.account.usageHistory.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );
  const { data: profile } = trpc.account.profile.useQuery(undefined, { enabled: !!user });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl("/account");
    return null;
  }

  const isLoading = creditsLoading || statsLoading;
  const plan = creditsData?.plan;
  const creds = creditsData?.credits;
  const sub = creditsData?.subscription;

  const planBadgeColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    starter: "bg-blue-500/20 text-blue-400",
    pro: "bg-primary/20 text-primary",
    enterprise: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/chat")}
              className="gap-2 font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Chat
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <img src={LOGO_ICON} alt="debuga.ai" className="w-7 h-7 rounded-lg" />
            <span className="font-mono font-bold">
              debuga<span className="text-primary">.ai</span>
            </span>
          </div>
          <div className="w-28" />
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-20 max-w-6xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {/* Header */}
          <motion.div variants={fadeInUp} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{profile?.name || user.name || "Minha Conta"}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile?.email || user.email}</span>
                  {plan && (
                    <span
                      className={cn(
                        "ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase",
                        planBadgeColors[plan.id] || planBadgeColors.free
                      )}
                    >
                      {plan.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Credits Section */}
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-bold">Seus Créditos</h2>
                    </div>
                    {creds?.resetAt && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Renovam em {formatDate(creds.resetAt)}</span>
                      </div>
                    )}
                  </div>

                  <ProgressBar
                    used={creds?.usedCredits || 0}
                    total={creds?.totalCredits || 50}
                  />

                  <div className="grid grid-cols-3 gap-4 mt-5">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-primary">
                        {((creds?.totalCredits || 0) - (creds?.usedCredits || 0)).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                        Disponíveis
                      </p>
                    </div>
                    <div className="text-center border-x border-border/30">
                      <p className="text-2xl font-bold font-mono">
                        {(creds?.usedCredits || 0).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                        Utilizados
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono">
                        {(creds?.totalCredits || 0).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                        Total do Plano
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stats Grid */}
              <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon={MessageSquare}
                  label="Conversas"
                  value={usageStats?.totalConversations || 0}
                  sub="Total criadas"
                />
                <StatCard
                  icon={Activity}
                  label="Mensagens"
                  value={usageStats?.totalMessages || 0}
                  sub="Enviadas e recebidas"
                />
                <StatCard
                  icon={Cpu}
                  label="Tokens Hoje"
                  value={(usageStats?.todayTokens || 0).toLocaleString("pt-BR")}
                  sub="Consumo do dia"
                  accent
                />
                <StatCard
                  icon={BarChart3}
                  label="Tokens Total"
                  value={(usageStats?.totalTokens || 0).toLocaleString("pt-BR")}
                  sub="Desde o início"
                />
              </motion.div>

              {/* Plan & Actions */}
              <motion.div variants={fadeInUp} className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Current Plan */}
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Crown className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Plano Atual</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plano</span>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-mono font-bold",
                          planBadgeColors[plan?.id || "free"]
                        )}
                      >
                        {plan?.name || "Gratuito"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Mensagens/dia</span>
                      <span className="text-sm font-mono font-bold">
                        {plan?.limits.messagesPerDay === 999999
                          ? "Ilimitadas"
                          : plan?.limits.messagesPerDay || 5}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Conversas/mês</span>
                      <span className="text-sm font-mono font-bold">
                        {plan?.limits.conversationsPerMonth === 999999
                          ? "Ilimitadas"
                          : plan?.limits.conversationsPerMonth || 3}
                      </span>
                    </div>

                    {sub && (
                      <>
                        <div className="border-t border-border/30 pt-3 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-emerald-400 font-mono font-bold uppercase">
                                {sub.status === "active" ? "Ativo" : sub.status}
                              </span>
                            </span>
                          </div>
                        </div>
                        {sub.currentPeriodEnd && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Próxima cobrança</span>
                            <span className="text-sm font-mono">
                              {formatDate(sub.currentPeriodEnd)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-5 space-y-2">
                    <Button
                      onClick={() => setLocation("/pricing")}
                      className="w-full gap-2 font-mono"
                      variant={plan?.id === "free" ? "default" : "outline"}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {plan?.id === "free" ? "Fazer Upgrade" : "Trocar Plano"}
                    </Button>
                  </div>
                </div>

                {/* Features */}
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Recursos do Plano</h2>
                  </div>

                  <div className="space-y-2.5">
                    {plan?.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan?.id === "free" && (
                    <div className="mt-5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs text-primary font-mono">
                        Faça upgrade para desbloquear todas as ferramentas do agente autônomo, incluindo sandbox, navegação web e scan de portas.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Usage History */}
              <motion.div variants={fadeInUp}>
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold">Histórico de Uso</h2>
                  </div>

                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : usageHistory && usageHistory.length > 0 ? (
                    <div className="space-y-2">
                      {usageHistory.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {log.description || log.toolName || "Interação com IA"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {formatDate(log.createdAt)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {log.tokensUsed.toLocaleString("pt-BR")} tokens
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum registro de uso ainda
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Comece a usar o debuga.ai para ver seu histórico aqui
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
