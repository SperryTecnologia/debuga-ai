import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Image, Video, GitBranch, Loader2, Download,
  ExternalLink, Clock, DollarSign, AlertCircle, RefreshCw,
  HardDrive, TrendingUp, CheckCircle2, XCircle, Timer,
  Search, Eye, Copy, ChevronLeft, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * AdminAssets — Premium White Label Media Center
 * Central de mídia gerada pelo orquestrador multimodal.
 * Conecta-se ao tRPC real (admin.listGeneratedAssets).
 */
export default function AdminAssets() {
  const [assetType, setAssetType] = useState<"all" | "image" | "video" | "diagram" | "audio">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "failed" | "processing">("all");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const limit = 20;

  const { data, isLoading, isError, error, refetch } = trpc.admin.listGeneratedAssets.useQuery(
    { limit, offset: page * limit, assetType, status: statusFilter },
    { retry: 1, refetchOnWindowFocus: false }
  );

  const assets = data?.assets || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const backendError = data?.error;

  // Local search filter (client-side on loaded page)
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const q = searchQuery.toLowerCase();
    return assets.filter((a: any) =>
      (a.title || "").toLowerCase().includes(q) ||
      (a.prompt || "").toLowerCase().includes(q) ||
      (a.provider || "").toLowerCase().includes(q) ||
      (a.model || "").toLowerCase().includes(q)
    );
  }, [assets, searchQuery]);

  // Stats from current data
  const stats = useMemo(() => {
    const totalCost = assets.reduce((sum: number, a: any) => sum + (parseFloat(a.estimatedCostUsd) || 0), 0);
    const completed = assets.filter((a: any) => a.status === "completed").length;
    const failed = assets.filter((a: any) => a.status === "failed").length;
    const processing = assets.filter((a: any) => a.status === "processing").length;
    return { totalCost, completed, failed, processing };
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Mídia</h1>
          <p className="text-muted-foreground mt-1">
            Imagens, vídeos e diagramas gerados pelo orquestrador multimodal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {total} asset{total !== 1 ? "s" : ""}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          label="Concluídos"
          value={stats.completed}
          variant="success"
        />
        <StatsCard
          icon={<Timer className="w-4 h-4 text-amber-500" />}
          label="Processando"
          value={stats.processing}
          variant="warning"
        />
        <StatsCard
          icon={<XCircle className="w-4 h-4 text-red-400" />}
          label="Falhas"
          value={stats.failed}
          variant="error"
        />
        <StatsCard
          icon={<DollarSign className="w-4 h-4 text-blue-400" />}
          label="Custo (página)"
          value={`$${stats.totalCost.toFixed(4)}`}
          variant="info"
        />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { value: "all", label: "Todos", icon: HardDrive },
            { value: "image", label: "Imagens", icon: Image },
            { value: "video", label: "Vídeos", icon: Video },
            { value: "diagram", label: "Diagramas", icon: GitBranch },
          ] as const).map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={assetType === value ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => { setAssetType(value); setPage(0); }}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {label}
            </Button>
          ))}

          <div className="border-l border-border mx-1" />

          {([
            { value: "all", label: "Todos" },
            { value: "completed", label: "OK" },
            { value: "failed", label: "Falhas" },
            { value: "processing", label: "Em progresso" },
          ] as const).map(({ value, label }) => (
            <Button
              key={value}
              variant={statusFilter === value ? "secondary" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => { setStatusFilter(value); setPage(0); }}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por prompt, provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Erro ao carregar assets</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error?.message || "Verifique a conexão com o banco de dados."}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Backend warning */}
      {backendError && !isError && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400">{backendError}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando assets...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredAssets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Image className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum asset encontrado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {searchQuery
                ? "Nenhum resultado para a busca atual. Tente termos diferentes."
                : "Quando os usuários solicitarem geração de imagens, vídeos ou diagramas pelo chat, os assets aparecerão aqui."}
            </p>
            {!searchQuery && (
              <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground font-mono space-y-1">
                <div>IMAGE_GENERATION_ENABLED=true</div>
                <div>OPENAI_IMAGE_ENABLED=true</div>
                <div>ENABLE_DIAGRAM_GENERATION=true</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assets Grid */}
      {!isLoading && filteredAssets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset: any) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onPreview={() => setPreviewAsset(asset)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * limit + 1}–{Math.min((page + 1) * limit, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-3">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Stats Card
// ══════════════════════════════════════════════════════════════

function StatsCard({ icon, label, value, variant }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant: "success" | "warning" | "error" | "info";
}) {
  const bgMap = {
    success: "bg-emerald-500/5 border-emerald-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    error: "bg-red-500/5 border-red-500/20",
    info: "bg-blue-500/5 border-blue-500/20",
  };

  return (
    <div className={`rounded-lg border p-3 ${bgMap[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Asset Card
// ══════════════════════════════════════════════════════════════

function AssetCard({ asset, onPreview }: { asset: any; onPreview: () => void }) {
  const isFailed = asset.status === "failed";
  const isProcessing = asset.status === "processing";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const borderClass = isFailed
    ? "border-red-500/30 hover:border-red-500/50"
    : isProcessing
      ? "border-amber-500/30 hover:border-amber-500/50"
      : "hover:border-foreground/20";

  return (
    <Card className={`overflow-hidden transition-all duration-200 group cursor-pointer ${borderClass}`} onClick={onPreview}>
      {/* Preview Area */}
      <div className="aspect-video bg-muted/50 relative overflow-hidden flex items-center justify-center">
        {asset.url && !isFailed && asset.assetType === "image" ? (
          <img
            src={asset.url}
            alt={asset.title || asset.prompt?.slice(0, 50)}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}

        {/* SVG/Diagram inline preview */}
        {asset.url && !isFailed && asset.assetType === "diagram" && asset.url.endsWith(".svg") ? (
          <img
            src={asset.url}
            alt="Diagram"
            className="object-contain w-full h-full p-2 bg-white dark:bg-gray-900"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : null}

        {/* Fallback icon */}
        {(!asset.url || isFailed || (asset.assetType !== "image" && !(asset.assetType === "diagram" && asset.url?.endsWith(".svg")))) && (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {asset.assetType === "image" && <Image className="w-8 h-8" />}
            {asset.assetType === "video" && <Video className="w-8 h-8" />}
            {asset.assetType === "diagram" && <GitBranch className="w-8 h-8" />}
            {asset.assetType === "audio" && <span className="text-3xl">🎵</span>}
            {isProcessing && <span className="text-xs animate-pulse">Processando...</span>}
            {isFailed && <span className="text-xs text-red-400">Falhou</span>}
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Eye className="w-6 h-6 text-white drop-shadow-lg" />
        </div>

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant={isFailed ? "destructive" : isProcessing ? "secondary" : "outline"}
            className={`text-[10px] px-1.5 py-0 ${!isFailed && !isProcessing ? "bg-background/80 backdrop-blur-sm" : ""}`}
          >
            {asset.assetType}
          </Badge>
        </div>

        {isFailed && (
          <Badge variant="destructive" className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
            ERRO
          </Badge>
        )}
        {isProcessing && (
          <Badge className="absolute top-2 right-2 text-[10px] px-1.5 py-0 bg-amber-500 text-white">
            <Loader2 className="w-3 h-3 mr-0.5 animate-spin" />
            EM PROGRESSO
          </Badge>
        )}
      </div>

      {/* Info */}
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium truncate leading-tight">
          {asset.title || asset.prompt?.slice(0, 60) || "Sem título"}
        </p>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(asset.createdAt)}
          </span>
          {asset.generationTimeMs && (
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              {(asset.generationTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          {asset.estimatedCostUsd && parseFloat(asset.estimatedCostUsd) > 0 && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${parseFloat(asset.estimatedCostUsd).toFixed(4)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
            {asset.provider}{asset.model ? `/${asset.model.split("/").pop()?.slice(0, 12)}` : ""}
          </Badge>
          {asset.url && !isFailed && (
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {isFailed && asset.errorMessage && (
          <p className="text-[11px] text-red-400 truncate" title={asset.errorMessage}>
            {asset.errorMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// Preview Modal
// ══════════════════════════════════════════════════════════════

function AssetPreviewModal({ asset, onClose }: { asset: any; onClose: () => void }) {
  const copyUrl = () => {
    if (asset.url) {
      navigator.clipboard.writeText(asset.url);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {asset.title || asset.prompt?.slice(0, 80) || "Asset"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {asset.provider}/{asset.model} — {new Date(asset.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-1 ml-3">
            {asset.url && (
              <>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={copyUrl} title="Copiar URL">
                  <Copy className="w-4 h-4" />
                </Button>
                <a href={asset.url} target="_blank" rel="noopener noreferrer" download>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
                <a href={asset.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Abrir em nova aba">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Preview */}
          {asset.url && asset.status !== "failed" && (
            <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 mb-4 min-h-[200px]">
              {asset.assetType === "image" && (
                <img
                  src={asset.url}
                  alt={asset.title || "Preview"}
                  className="max-w-full max-h-[50vh] object-contain rounded"
                />
              )}
              {asset.assetType === "diagram" && asset.url.endsWith(".svg") && (
                <img
                  src={asset.url}
                  alt="Diagram"
                  className="max-w-full max-h-[50vh] object-contain bg-white dark:bg-gray-900 rounded p-2"
                />
              )}
              {asset.assetType === "video" && (
                <video
                  src={asset.url}
                  controls
                  className="max-w-full max-h-[50vh] rounded"
                />
              )}
              {asset.assetType === "diagram" && !asset.url.endsWith(".svg") && (
                <div className="text-center text-muted-foreground">
                  <GitBranch className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Preview não disponível para este formato</p>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MetaRow label="ID" value={`#${asset.id}`} />
            <MetaRow label="Tipo" value={asset.assetType} />
            <MetaRow label="Status" value={asset.status} />
            <MetaRow label="Provider" value={asset.provider || "—"} />
            <MetaRow label="Modelo" value={asset.model || "—"} />
            <MetaRow label="Custo" value={asset.estimatedCostUsd ? `$${parseFloat(asset.estimatedCostUsd).toFixed(4)}` : "—"} />
            <MetaRow label="Tempo" value={asset.generationTimeMs ? `${(asset.generationTimeMs / 1000).toFixed(2)}s` : "—"} />
            <MetaRow label="Usuário" value={asset.userId ? `#${asset.userId}` : "—"} />
          </div>

          {/* Prompt */}
          {asset.prompt && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Prompt</p>
              <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap break-words max-h-32 overflow-auto">
                {asset.prompt}
              </div>
            </div>
          )}

          {/* Error */}
          {asset.status === "failed" && asset.errorMessage && (
            <div className="mt-4">
              <p className="text-xs font-medium text-red-400 mb-1">Erro</p>
              <div className="bg-red-500/5 border border-red-500/20 rounded-md p-3 text-sm text-red-400 whitespace-pre-wrap break-words">
                {asset.errorMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-xs">{value}</span>
    </div>
  );
}
