import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Brain, Image, Video, GitBranch, FileText, Mic, Globe,
  CheckCircle, XCircle, Activity, Zap, Server, AlertTriangle,
  Loader2, TrendingUp, Shield, Code, Eye, Cpu, RefreshCw,
  CircleDot, ArrowRight,
} from "lucide-react";

/**
 * AdminCapabilities — Premium White Label Orchestrator Dashboard
 * Visão completa do pipeline multimodal com indicadores visuais profissionais.
 */
export default function AdminCapabilities() {
  const { data, isLoading, refetch } = trpc.admin.getCapabilitiesOverview.useQuery(
    undefined,
    { retry: 1, refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando status do orquestrador...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center">
          <XCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive">Erro ao carregar dados do orquestrador.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const featureFlags = data.featureFlags;
  const activeFlags = Object.values(featureFlags).filter(Boolean).length;
  const totalFlags = Object.keys(featureFlags).length;

  // Count available providers
  const configuredProviders = data.providers.filter((p: any) => p.configured);
  const llmProviders = configuredProviders.filter((p: any) =>
    !["openai_image", "gemini_image", "replicate", "veo", "runway", "mermaid"].includes(p.name)
  );
  const mediaProviders = configuredProviders.filter((p: any) =>
    ["openai_image", "gemini_image", "replicate", "veo", "runway"].includes(p.name)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orquestrador de Capacidades</h1>
          <p className="text-muted-foreground mt-1">
            Pipeline multimodal, providers configurados e status por capacidade.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Shield className="w-4 h-4" />}
          label="Feature Flags"
          value={`${activeFlags}/${totalFlags}`}
          sublabel="ativos"
          color={activeFlags === totalFlags ? "emerald" : activeFlags > 0 ? "amber" : "red"}
        />
        <SummaryCard
          icon={<Cpu className="w-4 h-4" />}
          label="LLM Providers"
          value={llmProviders.length.toString()}
          sublabel="configurados"
          color={llmProviders.length > 0 ? "emerald" : "red"}
        />
        <SummaryCard
          icon={<Image className="w-4 h-4" />}
          label="Media Providers"
          value={mediaProviders.length.toString()}
          sublabel="disponíveis"
          color={mediaProviders.length > 0 ? "emerald" : "amber"}
        />
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Interações"
          value={data.learning.totalInteractions.toString()}
          sublabel="total registrado"
          color="blue"
        />
      </div>

      {/* Feature Flags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Feature Flags do Orquestrador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(featureFlags).map(([key, enabled]) => (
              <div
                key={key}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                  enabled
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-muted/30 border-muted"
                }`}
              >
                {enabled ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-[11px] font-medium leading-tight">
                  {formatFlagName(key)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capabilities Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Matriz de Capacidades
          </CardTitle>
          <CardDescription>Status de roteamento por tipo de tarefa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.capabilities.map((cap: any) => (
              <CapabilityRow key={cap.taskType} cap={cap} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multimodal Providers Detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProviderDetailCard
          title="Geração de Imagens"
          icon={<Image className="w-4 h-4" />}
          info={data.image}
          color="purple"
        />
        <ProviderDetailCard
          title="Geração de Vídeos"
          icon={<Video className="w-4 h-4" />}
          info={data.video}
          color="rose"
        />
        <ProviderDetailCard
          title="Geração de Diagramas"
          icon={<GitBranch className="w-4 h-4" />}
          info={data.diagram}
          color="cyan"
        />
      </div>

      {/* Provider Performance Table */}
      {data.performance && data.performance.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Performance em Tempo Real
            </CardTitle>
            <CardDescription>Métricas desde o último restart do servidor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2.5 font-medium text-xs text-muted-foreground">Provider</th>
                    <th className="pb-2.5 font-medium text-xs text-muted-foreground">Requests</th>
                    <th className="pb-2.5 font-medium text-xs text-muted-foreground">Success Rate</th>
                    <th className="pb-2.5 font-medium text-xs text-muted-foreground">Latência Média</th>
                    <th className="pb-2.5 font-medium text-xs text-muted-foreground">Custo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.performance.map((p: any, i: number) => {
                    const rate = typeof p.successRate === "number" ? p.successRate : 0;
                    return (
                      <tr key={i} className="border-b border-muted/30 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <CircleDot className={`w-3 h-3 ${rate >= 0.95 ? "text-emerald-500" : rate >= 0.8 ? "text-amber-500" : "text-red-400"}`} />
                            <span className="font-medium">{p.provider}</span>
                          </div>
                        </td>
                        <td className="py-2.5 font-mono text-xs">{p.totalRequests}</td>
                        <td className="py-2.5">
                          <SuccessRateBar rate={rate} />
                        </td>
                        <td className="py-2.5 font-mono text-xs">{Math.round(p.avgResponseTimeMs || 0)}ms</td>
                        <td className="py-2.5 font-mono text-xs">${(p.totalCost || 0).toFixed(4)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Aprendizado Operacional
          </CardTitle>
          <CardDescription>Métricas de aprendizado e sugestões de melhoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <LearningMetric label="Total Interações" value={data.learning.totalInteractions} />
            <LearningMetric label="Hoje" value={data.learning.interactionsToday} />
            <LearningMetric label="Pendentes" value={data.learning.pendingSuggestions} highlight={data.learning.pendingSuggestions > 0} />
            <LearningMetric label="Aprovadas" value={data.learning.approvedSuggestions} />
            <LearningMetric
              label="Taxa de Utilidade"
              value={`${(data.learning.helpfulRatio * 100).toFixed(0)}%`}
              highlight={data.learning.helpfulRatio < 0.5}
            />
          </div>
        </CardContent>
      </Card>

      {/* All Providers Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4" />
            Todos os Providers
          </CardTitle>
          <CardDescription>Status de configuração de cada provider no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {data.providers.map((p: any) => (
              <div
                key={p.name}
                className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                  p.configured
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-muted/20 border-muted"
                }`}
              >
                {p.configured ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Reference */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Referência de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground font-mono">
            <div className="space-y-1">
              <p className="text-foreground font-sans font-medium text-xs mb-2">Feature Flags</p>
              <div>ENABLE_CAPABILITY_ROUTING=true|false</div>
              <div>ENABLE_KNOWLEDGE_REUSE=true|false</div>
              <div>IMAGE_GENERATION_ENABLED=true|false</div>
              <div>VIDEO_GENERATION_ENABLED=true|false</div>
              <div>ENABLE_DIAGRAM_GENERATION=true|false</div>
              <div>ENABLE_LEARNING=true|false</div>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-sans font-medium text-xs mb-2">Provider Orders</p>
              <div>TEXT_PROVIDER_ORDER=gemini,openai,anthropic</div>
              <div>CODE_PROVIDER_ORDER=anthropic,openai,gemini</div>
              <div>IMAGE_PROVIDER_ORDER=openai_image,gemini_image</div>
              <div>VIDEO_PROVIDER_ORDER=veo,replicate,runway</div>
              <div>COST_DAILY_LIMIT_USD=10.00</div>
              <div>COST_MONTHLY_LIMIT_USD=200.00</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════

function SummaryCard({ icon, label, value, sublabel, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  color: "emerald" | "amber" | "red" | "blue";
}) {
  const colorMap = {
    emerald: "bg-emerald-500/5 border-emerald-500/20",
    amber: "bg-amber-500/5 border-amber-500/20",
    red: "bg-red-500/5 border-red-500/20",
    blue: "bg-blue-500/5 border-blue-500/20",
  };

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</div>
    </div>
  );
}

function CapabilityRow({ cap }: { cap: any }) {
  const hasProvider = cap.availableProviders && cap.availableProviders.length > 0;
  const bestProvider = cap.bestProvider || (hasProvider ? cap.availableProviders[0] : null);
  const score = cap.bestScore || 0;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      hasProvider ? "bg-background hover:bg-muted/30" : "bg-muted/20 border-dashed"
    }`}>
      <div className="shrink-0">
        {getCapabilityIcon(cap.taskType)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{formatTaskType(cap.taskType)}</span>
          {hasProvider && (
            <ScoreDots score={score} />
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
          {bestProvider ? (
            <>
              <span>{bestProvider}</span>
              {cap.availableProviders.length > 1 && (
                <span className="text-muted-foreground/60">+{cap.availableProviders.length - 1}</span>
              )}
            </>
          ) : (
            <span className="text-amber-500">Não configurado</span>
          )}
        </div>
      </div>
      <div>
        {hasProvider ? (
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        ) : (
          <XCircle className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= score
              ? score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-500" : "bg-red-400"
              : "bg-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

function SuccessRateBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = rate >= 0.95 ? "bg-emerald-500" : rate >= 0.8 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono">{pct}%</span>
    </div>
  );
}

function ProviderDetailCard({ title, icon, info, color }: {
  title: string;
  icon: React.ReactNode;
  info: any;
  color: "purple" | "rose" | "cyan";
}) {
  const borderMap = {
    purple: "border-purple-500/20",
    rose: "border-rose-500/20",
    cyan: "border-cyan-500/20",
  };

  return (
    <Card className={borderMap[color]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {info.available ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {info.available ? "Disponível" : "Não configurado"}
          </span>
        </div>

        {info.providers && info.providers.length > 0 && (
          <div className="space-y-1.5">
            {info.providers.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{p.name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.model}</Badge>
              </div>
            ))}
          </div>
        )}

        {info.supportedTypes && info.supportedTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {info.supportedTypes.map((t: string) => (
              <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LearningMetric({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${highlight ? "text-amber-500" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function getCapabilityIcon(taskType: string) {
  const icons: Record<string, React.ReactNode> = {
    chat_text: <Brain className="w-4 h-4 text-blue-400" />,
    infrastructure_support: <Server className="w-4 h-4 text-orange-400" />,
    code_generation: <Code className="w-4 h-4 text-green-400" />,
    image_generation: <Image className="w-4 h-4 text-purple-400" />,
    image_editing: <Image className="w-4 h-4 text-pink-400" />,
    video_generation: <Video className="w-4 h-4 text-rose-400" />,
    network_diagram: <GitBranch className="w-4 h-4 text-cyan-400" />,
    architecture_diagram: <GitBranch className="w-4 h-4 text-teal-400" />,
    flowchart_diagram: <GitBranch className="w-4 h-4 text-indigo-400" />,
    document_analysis: <FileText className="w-4 h-4 text-amber-400" />,
    image_analysis: <Eye className="w-4 h-4 text-violet-400" />,
    audio_transcription: <Mic className="w-4 h-4 text-emerald-400" />,
    web_research: <Globe className="w-4 h-4 text-sky-400" />,
  };
  return icons[taskType] || <Brain className="w-4 h-4" />;
}

function formatTaskType(taskType: string): string {
  const names: Record<string, string> = {
    chat_text: "Chat / Texto",
    infrastructure_support: "Infraestrutura",
    code_generation: "Geração de Código",
    image_generation: "Gerar Imagem",
    image_editing: "Editar Imagem",
    video_generation: "Gerar Vídeo",
    network_diagram: "Diagrama de Rede",
    architecture_diagram: "Diagrama de Arquitetura",
    flowchart_diagram: "Fluxograma",
    document_analysis: "Análise de Documentos",
    image_analysis: "Análise de Imagens",
    audio_transcription: "Transcrição de Áudio",
    web_research: "Pesquisa Web",
  };
  return names[taskType] || taskType;
}

function formatFlagName(key: string): string {
  const names: Record<string, string> = {
    capabilityRouting: "Roteamento",
    knowledgeReuse: "Knowledge Reuse",
    imageGeneration: "Imagens",
    videoGeneration: "Vídeos",
    learning: "Aprendizado",
  };
  return names[key] || key.replace(/([A-Z])/g, " $1").trim();
}
