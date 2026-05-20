import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, ExternalLink, Play, CheckCircle, XCircle, Loader2, Cloud, Server, Wifi, WifiOff, Activity, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type ProviderType = "cloud" | "local";

const PROVIDERS = [
  {
    name: "Google Gemini",
    model: "gemini-2.5-flash",
    type: "cloud" as ProviderType,
    envUrl: "LLM_CLOUD_API_URL",
    envKey: "LLM_CLOUD_API_KEY",
    envModel: "LLM_CLOUD_MODEL",
    docs: "https://ai.google.dev/gemini-api/docs",
    description: "Provider padrão. Rápido e econômico para a maioria dos casos.",
    urlExample: "https://generativelanguage.googleapis.com/v1beta/openai",
    dependencies: ["Internet", "API Key Google"],
    latencyRange: "200-800ms",
  },
  {
    name: "OpenAI",
    model: "gpt-4o-mini",
    type: "cloud" as ProviderType,
    envUrl: "LLM_CLOUD_API_URL",
    envKey: "LLM_CLOUD_API_KEY",
    envModel: "LLM_CLOUD_MODEL",
    docs: "https://platform.openai.com/docs",
    description: "Modelos GPT-4o. Excelente qualidade, custo mais alto.",
    urlExample: "https://api.openai.com/v1",
    dependencies: ["Internet", "API Key OpenAI"],
    latencyRange: "300-1200ms",
  },
  {
    name: "Anthropic (Claude)",
    model: "claude-sonnet-4-20250514",
    type: "cloud" as ProviderType,
    envUrl: "LLM_CLOUD_API_URL",
    envKey: "LLM_CLOUD_API_KEY",
    envModel: "LLM_CLOUD_MODEL",
    docs: "https://docs.anthropic.com",
    description: "Modelos Claude. Ótimo para raciocínio longo e segurança.",
    urlExample: "https://api.anthropic.com/v1 (requer proxy OpenAI-compat)",
    dependencies: ["Internet", "API Key Anthropic", "Proxy OpenAI-compat"],
    latencyRange: "400-1500ms",
  },
  {
    name: "Ollama (GPU Local)",
    model: "qwen2.5-coder:7b",
    type: "local" as ProviderType,
    envUrl: "LOCAL_LLM_BASE_URL",
    envKey: "—",
    envModel: "LOCAL_LLM_MODEL",
    docs: "https://ollama.ai",
    description: "Inferência local via GPU. Sem custo por token, latência variável.",
    urlExample: "http://ollama:11434",
    dependencies: ["GPU NVIDIA", "Docker + nvidia-runtime", "VRAM 8GB+"],
    latencyRange: "500-5000ms",
  },
  {
    name: "OpenRouter",
    model: "vários",
    type: "cloud" as ProviderType,
    envUrl: "LLM_CLOUD_API_URL",
    envKey: "LLM_CLOUD_API_KEY",
    envModel: "LLM_CLOUD_MODEL",
    docs: "https://openrouter.ai/docs",
    description: "Gateway para múltiplos modelos. Pay-per-use unificado.",
    urlExample: "https://openrouter.ai/api/v1",
    dependencies: ["Internet", "API Key OpenRouter"],
    latencyRange: "300-2000ms",
  },
];

export default function AdminProviders() {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error: string | null;
    endpoint: string | null;
    model: string | null;
    latencyMs: number | null;
    response?: string;
  } | null>(null);

  const [localTestResult, setLocalTestResult] = useState<{
    success: boolean;
    error: string | null;
    endpoint?: string | null;
    model?: string | null;
    latencyMs: number;
    response?: string;
    tokensPerSecond?: number;
  } | null>(null);

  const testMutation = trpc.admin.testProvider.useMutation({
    onSuccess: (data) => setTestResult(data),
    onError: (err) => setTestResult({
      success: false,
      error: err.message,
      endpoint: null,
      model: null,
      latencyMs: null,
    }),
  });

  const testLocalMutation = trpc.admin.testLocal.useMutation({
    onSuccess: (data) => setLocalTestResult(data),
    onError: (err) => setLocalTestResult({
      success: false,
      error: err.message,
      latencyMs: 0,
    }),
  });

  const localHealth = trpc.admin.localHealth.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30s
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Modelos / Providers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configuração de provedores de IA. Altere via variáveis de ambiente no servidor.
        </p>
      </div>

      {/* Local GPU Status Card */}
      {localHealth.data && (
        <Card className={`border-2 ${
          !localHealth.data.enabled
            ? "border-muted"
            : localHealth.data.reachable && !localHealth.data.error
              ? "border-green-500/50 bg-green-500/5"
              : localHealth.data.reachable
                ? "border-amber-500/50 bg-amber-500/5"
                : "border-red-500/50 bg-red-500/5"
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                GPU Local (Ollama)
                {localHealth.data.enabled ? (
                  localHealth.data.reachable && !localHealth.data.error ? (
                    <Badge className="bg-green-600 text-white text-[10px]">ONLINE</Badge>
                  ) : localHealth.data.reachable ? (
                    <Badge className="bg-amber-600 text-white text-[10px]">MODELO AUSENTE</Badge>
                  ) : (
                    <Badge className="bg-red-600 text-white text-[10px]">OFFLINE</Badge>
                  )
                ) : (
                  <Badge variant="secondary" className="text-[10px]">DESATIVADO</Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => localHealth.refetch()}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${localHealth.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <CardDescription>
              {localHealth.data.enabled
                ? `Prioridade: ${localHealth.data.config.priority.toUpperCase()} | Fallback: ${localHealth.data.config.fallbackEnabled ? "Ativo" : "Desativado"} | Timeout: ${localHealth.data.config.timeoutSeconds}s`
                : "Defina ENABLE_LOCAL_INFERENCE=true no .env para ativar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {localHealth.data.enabled && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <div className="text-muted-foreground mb-1">URL</div>
                    <code className="text-[10px] break-all">{localHealth.data.config.baseUrl}</code>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <div className="text-muted-foreground mb-1">Modelo</div>
                    <code className="text-[10px]">{localHealth.data.config.model}</code>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <div className="text-muted-foreground mb-1">Prioridade</div>
                    <Badge variant={localHealth.data.config.priority === "first" ? "default" : "secondary"} className="text-[10px]">
                      {localHealth.data.config.priority === "first" ? "GPU Primeiro" : localHealth.data.config.priority === "only" ? "Apenas GPU" : "GPU Fallback"}
                    </Badge>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <div className="text-muted-foreground mb-1">Modelos Carregados</div>
                    <span className="font-mono">{localHealth.data.models?.length || 0}</span>
                  </div>
                </div>

                {localHealth.data.models && localHealth.data.models.length > 0 && (
                  <div className="text-xs">
                    <span className="text-muted-foreground font-medium">Modelos disponíveis:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {localHealth.data.models.map((m: string) => (
                        <Badge key={m} variant="outline" className="text-[10px] font-mono">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {localHealth.data.error && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-lg p-2.5">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{localHealth.data.error}</span>
                  </div>
                )}

                {/* Test Local GPU */}
                <div className="border-t pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testLocalMutation.mutate()}
                    disabled={testLocalMutation.isPending || !localHealth.data?.reachable}
                  >
                    {testLocalMutation.isPending ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Testando GPU...</>
                    ) : (
                      <><Zap className="h-3.5 w-3.5 mr-1.5" />Testar GPU Local</>
                    )}
                  </Button>

                  {localTestResult && (
                    <div className={`mt-2 rounded-lg border p-3 text-xs space-y-1.5 ${
                      localTestResult.success
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    }`}>
                      <div className="flex items-center gap-2 font-medium">
                        {localTestResult.success ? (
                          <><CheckCircle className="h-3.5 w-3.5 text-green-600" /><span className="text-green-700 dark:text-green-400">GPU respondendo</span></>
                        ) : (
                          <><XCircle className="h-3.5 w-3.5 text-red-600" /><span className="text-red-700 dark:text-red-400">Falha</span></>
                        )}
                      </div>
                      {localTestResult.latencyMs > 0 && (
                        <div className="text-muted-foreground">
                          Latência: <span className="font-mono">{localTestResult.latencyMs}ms</span>
                          {localTestResult.tokensPerSecond ? ` (~${localTestResult.tokensPerSecond} tok/s)` : ""}
                        </div>
                      )}
                      {localTestResult.response && (
                        <div className="text-muted-foreground">Resposta: "{localTestResult.response}"</div>
                      )}
                      {localTestResult.error && (
                        <div className="text-red-600 dark:text-red-400">{localTestResult.error}</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Test Cloud Provider Section */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4" />
            Testar Provider Cloud (API Externa)
          </CardTitle>
          <CardDescription>
            Envia uma mensagem de teste ao provider cloud configurado (LLM_CLOUD_*).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="w-full sm:w-auto"
          >
            {testMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testando...</>
            ) : (
              <><Play className="h-4 w-4 mr-2" />Testar Cloud</>
            )}
          </Button>

          {testResult && (
            <div className={`rounded-lg border p-4 text-sm space-y-2 ${
              testResult.success
                ? "border-green-500/30 bg-green-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {testResult.success ? (
                  <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-green-700 dark:text-green-400">Provider funcionando</span></>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-700 dark:text-red-400">Falha na conexão</span></>
                )}
              </div>
              {testResult.endpoint && (
                <div className="text-muted-foreground text-xs">
                  <span className="font-medium">Endpoint:</span>{" "}
                  <code className="bg-muted px-1 rounded">{testResult.endpoint}</code>
                </div>
              )}
              {testResult.model && (
                <div className="text-muted-foreground text-xs">
                  <span className="font-medium">Modelo:</span>{" "}
                  <Badge variant="secondary">{testResult.model}</Badge>
                </div>
              )}
              {testResult.latencyMs !== null && (
                <div className="text-muted-foreground text-xs">
                  <span className="font-medium">Latência:</span> {testResult.latencyMs}ms
                </div>
              )}
              {testResult.success && testResult.response && (
                <div className="text-muted-foreground text-xs">
                  <span className="font-medium">Resposta:</span> "{testResult.response}"
                </div>
              )}
              {testResult.error && (
                <div className="text-red-600 dark:text-red-400 text-xs">
                  <span className="font-medium">Erro:</span> {testResult.error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Priority Info */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Activity className="h-4 w-4 mt-0.5 text-amber-600" />
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-medium">Como funciona a resolução de provider:</p>
              <ul className="list-disc pl-4 text-xs space-y-0.5">
                <li><code>LOCAL_LLM_PRIORITY=first</code> → GPU local primeiro, fallback para cloud se falhar</li>
                <li><code>LOCAL_LLM_PRIORITY=last</code> → Cloud primeiro, fallback para GPU local se falhar</li>
                <li><code>LOCAL_LLM_PRIORITY=only</code> → Apenas GPU local, sem fallback</li>
              </ul>
              <p className="text-xs mt-2">
                Altere via <code className="bg-muted px-1 rounded">.env</code> e reinicie o container.
                Consulte <code>docs/26-SINGLE-VM-GPU.md</code> para setup completo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards with Dependency Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((p) => (
          <Card key={p.name} className="relative overflow-hidden">
            {/* Type indicator strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              p.type === "cloud" ? "bg-blue-500" : "bg-purple-500"
            }`} />
            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {p.type === "cloud" ? (
                    <Cloud className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Server className="h-4 w-4 text-purple-500" />
                  )}
                  {p.name}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={`text-[10px] ${
                    p.type === "cloud"
                      ? "border-blue-500/50 text-blue-600 dark:text-blue-400"
                      : "border-purple-500/50 text-purple-600 dark:text-purple-400"
                  }`}>
                    {p.type === "cloud" ? (
                      <><Wifi className="h-3 w-3 mr-1" />API Cloud</>
                    ) : (
                      <><WifiOff className="h-3 w-3 mr-1" />Local</>
                    )}
                  </Badge>
                  <a href={p.docs} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {/* Dependencies */}
              <div>
                <span className="text-muted-foreground font-medium text-[11px] uppercase tracking-wide">Dependências</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {p.dependencies.map((dep) => (
                    <Badge key={dep} variant="secondary" className="text-[10px] font-normal">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modelo padrão</span>
                  <Badge variant="secondary">{p.model}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Latência típica</span>
                  <span className="text-muted-foreground font-mono">{p.latencyRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Variável URL</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded">{p.envUrl}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Variável Key</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded">{p.envKey}</code>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
