import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  LogOut,
  LogIn,
  Terminal,
  Shield,
  Server,
  Wifi,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Check,
  X,
  MoreHorizontal,
  Bug,
  Database,
  Cloud,
  Lock,
  FileCode,
  Network,
  Cpu,
  HardDrive,
  Globe,
  Flame,
  AlertTriangle,
  Key,
  Container,
  Image as ImageIcon,
  Code2,
  Search,
  ShieldCheck,
  Activity,
  Wrench,
  Paperclip,
  Upload,
  FileText,
  XCircle,
  Mic,
  MicOff,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  User,
  Crown,
  BarChart3,
  ArrowUpCircle,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const LOGO_ICON =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga-logo-v2-A2P25ZnkFwTU2RkRjz85nk.webp";
const AVATAR_AGENT = LOGO_ICON;

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  attachments?: UploadedFile[];
};

type UploadedFile = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  textContent?: string | null;
  isImage?: boolean;
};

// Tool result types from SSE
type ToolResultEvent = {
  toolCallId: string;
  name: string;
  result: any;
};

type StepEvent = {
  step: string;
  content: string;
  tools?: string[];
};

// ── Topic Detection & Icon Mapping ──
interface TopicConfig {
  icon: LucideIcon;
  color: string;
  keywords: string[];
}

const TOPIC_MAP: TopicConfig[] = [
  { icon: Shield, color: "text-emerald-400", keywords: ["seguranca", "segurança", "security", "firewall", "waf", "ids", "ips", "siem", "wazuh", "hardening", "pentest", "vulnerabilidade", "cve", "nist", "iso 27001", "compliance", "auditoria"] },
  { icon: Bug, color: "text-red-400", keywords: ["bug", "erro", "error", "debug", "crash", "exception", "traceback", "stack trace", "falha", "fix"] },
  { icon: Network, color: "text-blue-400", keywords: ["rede", "network", "tcp", "udp", "dns", "dhcp", "vlan", "switch", "router", "roteador", "latencia", "latência", "ping", "traceroute", "vpn", "subnet", "ip"] },
  { icon: Wifi, color: "text-cyan-400", keywords: ["wifi", "wireless", "telecom", "telecomunicacao", "telecomunicação", "5g", "4g", "lte", "fibra", "óptica", "optica", "antena", "radiofrequencia"] },
  { icon: Server, color: "text-orange-400", keywords: ["servidor", "server", "linux", "windows server", "apache", "nginx", "iis", "cpu", "memoria", "memória", "ram", "uptime", "reboot"] },
  { icon: Database, color: "text-violet-400", keywords: ["banco de dados", "database", "mysql", "postgres", "mongodb", "redis", "sql", "query", "backup", "restore", "replicacao", "replicação"] },
  { icon: Cloud, color: "text-sky-400", keywords: ["cloud", "nuvem", "aws", "azure", "gcp", "s3", "ec2", "lambda", "terraform", "cloudformation", "iaas", "paas", "saas"] },
  { icon: Container, color: "text-blue-300", keywords: ["docker", "container", "kubernetes", "k8s", "pod", "helm", "compose", "swarm", "registry", "imagem"] },
  { icon: Terminal, color: "text-green-400", keywords: ["script", "bash", "shell", "powershell", "automacao", "automação", "cron", "ansible", "puppet", "chef", "ci/cd", "pipeline", "jenkins", "github actions"] },
  { icon: Lock, color: "text-yellow-400", keywords: ["senha", "password", "autenticacao", "autenticação", "oauth", "jwt", "ssl", "tls", "certificado", "https", "criptografia", "encryption", "mfa", "2fa"] },
  { icon: Cpu, color: "text-pink-400", keywords: ["monitoramento", "monitoring", "zabbix", "prometheus", "grafana", "nagios", "alerta", "metrica", "métrica", "dashboard", "observabilidade"] },
  { icon: HardDrive, color: "text-amber-400", keywords: ["disco", "disk", "storage", "raid", "nas", "san", "lvm", "partição", "particao", "filesystem", "ext4", "ntfs", "zfs"] },
  { icon: FileCode, color: "text-teal-400", keywords: ["codigo", "código", "code", "python", "javascript", "java", "api", "rest", "json", "yaml", "xml", "git", "deploy"] },
  { icon: Globe, color: "text-indigo-400", keywords: ["web", "site", "dominio", "domínio", "http", "proxy", "load balancer", "cdn", "cache", "wordpress"] },
  { icon: Flame, color: "text-red-500", keywords: ["incidente", "incident", "emergencia", "emergência", "urgente", "critico", "crítico", "downtime", "outage", "indisponivel"] },
  { icon: AlertTriangle, color: "text-yellow-500", keywords: ["alerta", "warning", "aviso", "atencao", "atenção", "problema", "issue", "troubleshoot"] },
  { icon: Key, color: "text-amber-300", keywords: ["acesso", "permissao", "permissão", "rbac", "iam", "ldap", "active directory", "ad", "grupo", "usuario", "usuário"] },
];

function detectTopicFromTitle(title: string): TopicConfig {
  const normalized = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const topic of TOPIC_MAP) {
    for (const kw of topic.keywords) {
      const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalized.includes(normalizedKw)) return topic;
    }
  }
  return { icon: MessageSquare, color: "text-muted-foreground", keywords: [] };
}

function ConversationIcon({ title, className }: { title: string; className?: string }) {
  const topic = detectTopicFromTitle(title);
  const Icon = topic.icon;
  return <Icon className={cn("w-4 h-4 shrink-0", topic.color, className)} />;
}

// ── Tool name to icon/label mapping ──
const TOOL_DISPLAY: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  generate_image: { icon: ImageIcon, label: "Gerando Imagem", color: "text-purple-400" },
  execute_code: { icon: Code2, label: "Executando Código", color: "text-green-400" },
  dns_lookup: { icon: Search, label: "Consulta DNS", color: "text-blue-400" },
  ssl_check: { icon: ShieldCheck, label: "Verificação SSL", color: "text-yellow-400" },
  http_check: { icon: Activity, label: "Verificação HTTP", color: "text-cyan-400" },
  whois_lookup: { icon: Globe, label: "Consulta WHOIS", color: "text-indigo-400" },
  web_fetch: { icon: Globe, label: "Navegando em Site", color: "text-emerald-400" },
  port_scan: { icon: Network, label: "Scan de Portas", color: "text-orange-400" },
};

// ── Tool Result Renderers ──
function ToolResultCard({ name, result }: { name: string; result: any }) {
  const display = TOOL_DISPLAY[name] || { icon: Wrench, label: name, color: "text-muted-foreground" };
  const Icon = display.icon;

  if (result?.error) {
    // If this is an internal error that shouldn't be shown to user, don't render anything
    if (result._internalError) {
      return null;
    }
    // Filter out technical details - only show user-friendly message
    let errorMessage = typeof result.error === "string" ? result.error : "Ocorreu um erro inesperado. Tente novamente.";
    // Sanitize: remove any technical terms that might have leaked through
    const technicalPatterns = /web_fetch|dns_lookup|ssl_check|http_check|port_scan|whois_lookup|execute_code|generate_image|schema|tool.?call|JSON|parse|arguments|par\u00e2metros da ferramenta/gi;
    if (technicalPatterns.test(errorMessage)) {
      errorMessage = "N\u00e3o consegui concluir essa verifica\u00e7\u00e3o agora. O alvo pode estar indispon\u00edvel, lento ou bloqueando a consulta. Tente novamente em instantes ou informe outro site.";
    }
    // Don't show _internal field to user - render a subtle, friendly error
    return (
      <div className="my-3 rounded-xl border border-muted-foreground/20 bg-muted/30 p-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Image result
  if (result?.type === "image" && result?.url) {
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium text-foreground">{display.label}</span>
        </div>
        <img
          src={result.url}
          alt={result.prompt || "Imagem gerada"}
          className="rounded-lg max-w-full max-h-96 border border-border shadow-lg"
          loading="lazy"
        />

      </div>
    );
  }

  // Code execution result
  if (result?.type === "code") {
    const isError = result.exitCode !== 0;
    return (
      <div className="my-3 rounded-xl border border-border bg-card overflow-hidden">
        <div className={cn(
          "flex items-center justify-between px-4 py-2 border-b border-border",
          isError ? "bg-destructive/5" : "bg-primary/5"
        )}>
          <div className="flex items-center gap-2">
            <Icon className={cn("w-4 h-4", display.color)} />
            <span className="font-mono text-xs font-medium">{display.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {result.language || "python"}
            </span>
          </div>
          <span className={cn(
            "text-[10px] font-mono px-2 py-0.5 rounded-full",
            isError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {isError ? `exit: ${result.exitCode}` : "sucesso"}
          </span>
        </div>
        {result.code && (
          <div className="border-b border-border">
            <pre className="p-3 text-xs font-mono text-muted-foreground overflow-x-auto max-h-40 bg-[oklch(0.06_0.005_240)]">
              <code>{result.code}</code>
            </pre>
          </div>
        )}
        <pre className={cn(
          "p-3 text-xs font-mono overflow-x-auto max-h-60",
          isError ? "text-destructive/80" : "text-foreground/90"
        )}>
          <code>{result.output}</code>
        </pre>
      </div>
    );
  }

  // DNS result
  if (result?.type === "dns") {
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium">{display.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{result.domain}</span>
        </div>
        <div className="space-y-2">
          {Object.entries(result.records || {}).map(([type, records]: [string, any]) => (
            <div key={type} className="flex gap-3 items-start">
              <span className="font-mono text-[10px] font-bold text-primary w-12 shrink-0 pt-0.5">{type}</span>
              <div className="flex-1">
                {typeof records === "string" ? (
                  <span className="text-xs font-mono text-muted-foreground">{records}</span>
                ) : Array.isArray(records) ? (
                  <div className="space-y-0.5">
                    {records.map((r: any, i: number) => (
                      <div key={i} className="text-xs font-mono text-foreground/80">
                        {typeof r === "string" ? r : typeof r === "object" && r.exchange ? `${r.priority} ${r.exchange}` : JSON.stringify(r)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-foreground/80">{JSON.stringify(records, null, 2)}</pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // SSL result
  if (result?.type === "ssl") {
    const cert = result.certificate || {};
    const isExpired = cert.isExpired;
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium">{display.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{result.hostname}</span>
          {cert.daysUntilExpiry !== undefined && (
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded-full",
              isExpired ? "bg-destructive/10 text-destructive" : cert.daysUntilExpiry < 30 ? "bg-yellow-500/10 text-yellow-500" : "bg-primary/10 text-primary"
            )}>
              {isExpired ? "EXPIRADO" : `${cert.daysUntilExpiry} dias restantes`}
            </span>
          )}
        </div>
        {cert.error ? (
          <p className="text-xs text-destructive/80 font-mono">{cert.error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {cert.subject && <div><span className="text-muted-foreground">Sujeito:</span> <span className="text-foreground/80">{cert.subject.CN || JSON.stringify(cert.subject)}</span></div>}
            {cert.issuer && <div><span className="text-muted-foreground">Emissor:</span> <span className="text-foreground/80">{cert.issuer.O || JSON.stringify(cert.issuer)}</span></div>}
            {cert.validFrom && <div><span className="text-muted-foreground">Válido de:</span> <span className="text-foreground/80">{new Date(cert.validFrom).toLocaleDateString("pt-BR")}</span></div>}
            {cert.validTo && <div><span className="text-muted-foreground">Válido até:</span> <span className="text-foreground/80">{new Date(cert.validTo).toLocaleDateString("pt-BR")}</span></div>}
            {cert.protocol && <div><span className="text-muted-foreground">Protocolo:</span> <span className="text-foreground/80">{cert.protocol}</span></div>}
            {cert.serialNumber && <div><span className="text-muted-foreground">Serial:</span> <span className="text-foreground/80 truncate">{cert.serialNumber.slice(0, 20)}...</span></div>}
          </div>
        )}
      </div>
    );
  }

  // HTTP result
  if (result?.type === "http") {
    const r = result.result || {};
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium">{display.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[200px]">{result.url}</span>
          {r.statusCode && (
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded-full",
              r.statusCode < 400 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            )}>
              {r.statusCode} {r.statusMessage}
            </span>
          )}
        </div>
        {r.error ? (
          <p className="text-xs text-destructive/80 font-mono">{r.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div><span className="text-muted-foreground">Tempo:</span> <span className="text-foreground/80">{r.responseTimeMs}ms</span></div>
              <div><span className="text-muted-foreground">Servidor:</span> <span className="text-foreground/80">{r.server}</span></div>
            </div>
            {r.securityHeaders && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-medium text-muted-foreground">Headers de Segurança:</span>
                <div className="grid grid-cols-1 gap-0.5">
                  {Object.entries(r.securityHeaders).map(([header, value]: [string, any]) => (
                    <div key={header} className="flex items-center gap-2 text-[10px] font-mono">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        value === "Ausente" ? "bg-destructive/60" : "bg-primary/60"
                      )} />
                      <span className="text-muted-foreground">{header}:</span>
                      <span className={cn(value === "Ausente" ? "text-destructive/60" : "text-foreground/70")}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Web Fetch result
  if (result?.type === "web_fetch") {
    const r = result.result || {};
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium">{display.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[250px]">{result.url}</span>
          {r.responseTimeMs && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {r.responseTimeMs}ms
            </span>
          )}
        </div>
        {r.error ? (
          <p className="text-xs text-destructive/80 font-mono">{r.error}</p>
        ) : (
          <div className="space-y-3">
            {r.title && (
              <div className="text-xs font-mono">
                <span className="text-muted-foreground">Título:</span>{" "}
                <span className="text-foreground/90 font-medium">{r.title}</span>
              </div>
            )}
            {r.metaTags && Object.keys(r.metaTags).length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-medium text-muted-foreground">Meta Tags:</span>
                <div className="grid grid-cols-1 gap-0.5">
                  {Object.entries(r.metaTags).slice(0, 8).map(([key, value]: [string, any]) => (
                    <div key={key} className="text-[10px] font-mono">
                      <span className="text-muted-foreground">{key}:</span>{" "}
                      <span className="text-foreground/70 truncate">{String(value).slice(0, 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {r.headings && r.headings.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-medium text-muted-foreground">Títulos da Página:</span>
                <div className="space-y-0.5">
                  {r.headings.slice(0, 10).map((h: string, i: number) => (
                    <div key={i} className="text-[10px] font-mono text-foreground/70">• {h}</div>
                  ))}
                </div>
              </div>
            )}
            {r.textContent && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-medium text-muted-foreground">Conteúdo ({r.textContent.length} chars):</span>
                <pre className="text-[10px] font-mono text-foreground/60 overflow-x-auto max-h-32 whitespace-pre-wrap">
                  {r.textContent.slice(0, 2000)}{r.textContent.length > 2000 ? "..." : ""}
                </pre>
              </div>
            )}
            {r.totalLinks !== undefined && (
              <div className="text-[10px] font-mono text-muted-foreground">
                {r.totalLinks} links encontrados na página
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Port Scan result
  if (result?.type === "port_scan") {
    const r = result.result || {};
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium">{display.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{result.host}</span>
          {r.summary && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {r.summary}
            </span>
          )}
        </div>
        {r.openPorts && r.openPorts.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-medium text-primary">Portas Abertas:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {r.openPorts.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono bg-primary/5 rounded px-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-foreground/90">{p.port}</span>
                  <span className="text-muted-foreground">({p.service})</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {r.filteredPorts && (Array.isArray(r.filteredPorts) ? r.filteredPorts.length > 0 : r.filteredPorts.count > 0) && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-medium text-yellow-400">Portas Filtradas:</span>
            {Array.isArray(r.filteredPorts) ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {r.filteredPorts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono bg-yellow-500/5 rounded px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                    <span className="text-foreground/90">{p.port}</span>
                    <span className="text-muted-foreground">({p.service})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-mono text-yellow-400/70">{r.filteredPorts.count} portas filtradas - {r.filteredPorts.note}</p>
            )}
          </div>
        )}
        {r.closedCount !== undefined && (
          <div className="text-[10px] font-mono text-muted-foreground">
            {r.closedCount} portas fechadas de {r.totalScanned} escaneadas
          </div>
        )}
      </div>
    );
  }

  // WHOIS result
  if (result?.type === "whois") {
    return (
      <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium">{display.label}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{result.domain}</span>
        </div>
        <pre className="text-[10px] font-mono text-foreground/70 overflow-x-auto max-h-48 whitespace-pre-wrap">
          {result.data}
        </pre>
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="my-3 rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", display.color)} />
        <span className="font-mono text-xs font-medium">{display.label}</span>
      </div>
      <pre className="text-xs font-mono text-foreground/70 overflow-x-auto max-h-40">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

// ── Step Indicator ──
function StepIndicator({ step }: { step: StepEvent }) {
  const toolNames = step.tools || [];
  return (
    <div className="my-2 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
        <Loader2 className="w-3 h-3 animate-spin text-primary" />
        <span className="text-[10px] font-mono text-primary/80">{step.content}</span>
        {toolNames.map((t) => {
          const d = TOOL_DISPLAY[t];
          if (!d) return null;
          const TIcon = d.icon;
          return <TIcon key={t} className={cn("w-3 h-3 ml-1", d.color)} />;
        })}
      </div>
    </div>
  );
}

// Cards de exemplo: execução real com alvos seguros, consumo normal do plano.
// Todos os cards são acessíveis a qualquer plano (Free, Starter, Pro).
type SuggestedPrompt = {
  icon: LucideIcon;
  title: string;
  prompt: string;
  description: string;
};

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    icon: Server,
    title: "Diagnóstico DNS",
    prompt: "Faça um diagnóstico DNS completo do domínio github.com. Consulte registros A, MX, TXT e NS separadamente se necessário. Organize os resultados em seções, explique a função de cada tipo de registro e apresente uma conclusão profissional.",
    description: "Consulta DNS completa com registros A, MX, TXT e NS",
  },
  {
    icon: Globe,
    title: "Navegar em Site",
    prompt: "Analise o site https://example.com. Acesse a página, extraia o título, status HTTP, resumo do conteúdo principal, tipo provável de conteúdo, links relevantes se existirem e apresente um resumo profissional. Se possível, informe também observações sobre estrutura HTML, tecnologias aparentes e limitações da análise.",
    description: "Análise completa de página web com status e resumo",
  },
  {
    icon: Shield,
    title: "Auditoria de Segurança",
    prompt: "Faça uma auditoria passiva e segura de https://example.com. Verifique HTTPS/SSL quando aplicável, headers HTTP básicos, DNS público e pontos de atenção visíveis externamente. Não execute scan invasivo. Apresente um checklist profissional com pontos positivos, pontos de atenção e conclusão.",
    description: "Checklist de segurança passiva com SSL, headers e DNS",
  },
  {
    icon: ImageIcon,
    title: "Gerar Diagrama",
    prompt: "Gere um diagrama profissional em alta qualidade de uma arquitetura segura com usuário, firewall, WAF, balanceador, servidor web, aplicação, banco de dados, backup e monitoramento. O visual deve ser moderno, limpo, técnico e adequado para apresentação executiva.",
    description: "Diagrama de arquitetura profissional em alta qualidade",
  },
  {
    icon: Network,
    title: "Scan de Portas",
    prompt: "Faça uma verificação segura e limitada apenas das portas 80 e 443 de example.com. Explique se as portas estão abertas, fechadas ou filtradas, e apresente uma interpretação profissional. Não realizar varredura agressiva.",
    description: "Verificação segura de portas com interpretação técnica",
  },
  {
    icon: Terminal,
    title: "Sandbox de Código",
    prompt: "Execute um script Python seguro usando apenas biblioteca padrão para validar se 192.168.0.1 é um endereço IPv4 válido com ipaddress. Mostre o código, a saída e explique o resultado.",
    description: "Execução segura de código Python com explicação",
  },
];

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [toolResults, setToolResults] = useState<ToolResultEvent[]>([]);
  const [activeSteps, setActiveSteps] = useState<StepEvent[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; message: string; planId: string } | null>(null);
  const [showCardUpgradeCTA, setShowCardUpgradeCTA] = useState(false);
  const lastRequestBlockedRef = useRef(false);
  const ctaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeArchivedSearch, setIncludeArchivedSearch] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const [mobileExamplesOpen, setMobileExamplesOpen] = useState(false);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [streamTimedOut, setStreamTimedOut] = useState(false);

  // tRPC queries
  const conversationsQuery = trpc.chat.listConversations.useQuery(undefined, { enabled: !!user });
  const createConversation = trpc.chat.createConversation.useMutation();
  const deleteConversation = trpc.chat.deleteConversation.useMutation();
  const togglePin = trpc.chat.togglePin.useMutation();
  const archiveConv = trpc.chat.archive.useMutation();
  const unarchiveConv = trpc.chat.unarchive.useMutation();
  const archivedQuery = trpc.chat.listArchived.useQuery(undefined, { enabled: !!user && showArchived });
  const updateTitle = trpc.chat.updateTitle.useMutation();
  const messagesQuery = trpc.chat.getMessages.useQuery(
    { conversationId: activeConversationId! },
    { enabled: !!activeConversationId }
  );
  const utils = trpc.useUtils();

  // Subscription check
  const subQuery = trpc.subscription.status.useQuery(undefined, { enabled: !!user });
  const hasAccess = !!user || subQuery.data?.isAdmin || subQuery.data?.hasActiveSubscription;

  // Usage data for indicator
  const usageQuery = trpc.account.usage.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000, // refresh every 30s
  });

  // Debounce search query (300ms)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.trim().length < 2) {
      setDebouncedSearch("");
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  // Search query
  const searchEnabled = debouncedSearch.length >= 2;
  const searchInput = useMemo(() => ({
    query: debouncedSearch,
    includeArchived: includeArchivedSearch,
    limit: 20,
    offset: 0,
  }), [debouncedSearch, includeArchivedSearch]);
  const searchResults = trpc.chat.search.useQuery(searchInput, {
    enabled: !!user && searchEnabled,
    placeholderData: (prev: any) => prev,
  });

  // Load messages when conversation changes
  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(
        messagesQuery.data.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.createdAt),
        }))
      );
    }
  }, [messagesQuery.data]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, toolResults, activeSteps]);

  // Checkout success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Assinatura ativada com sucesso! Bem-vindo ao debuga.ai.");
      window.history.replaceState({}, "", "/chat");
      subQuery.refetch();
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      const conv = await createConversation.mutateAsync({});
      setActiveConversationId(conv.id);
      setMessages([]);
      setStreamingContent("");
      setToolResults([]);
      setActiveSteps([]);
      utils.chat.listConversations.invalidate();
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [createConversation, utils]);

  const handleDeleteConversation = useCallback(
    (id: number) => {
      setDeleteConfirm({ open: true, id });
    },
    []
  );

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} excede o limite de 10MB`);
        continue;
      }
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, content: base64, mimeType: file.type }),
        });
        if (res.ok) {
          const data = await res.json();
          newFiles.push(data.file);
        } else {
          toast.error(`Falha ao enviar ${file.name}`);
        }
      } catch {
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setIsUploading(false);
  }, []);

  // ── Ctrl+V Paste handler ──
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        handleFileUpload(dt.files);
        toast.success(`${files.length} arquivo(s) colado(s) do clipboard`);
      }
    },
    [handleFileUpload]
  );

  // ── Drag & Drop handlers ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if leaving the chat area entirely
    const rect = chatAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        setIsDragOver(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileUpload(files);
        toast.success(`${files.length} arquivo(s) recebido(s)`);
      }
    },
    [handleFileUpload]
  );

  // ── Audio Recording ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 1000) {
          toast.error("Gravação muito curta, tente novamente");
          return;
        }

        setIsUploading(true);
        try {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(audioBlob);
          });

          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: `audio-${Date.now()}.webm`,
              content: base64,
              mimeType: "audio/webm",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            // Transcribe the audio
            const transcribeRes = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioUrl: data.file.url }),
            });

            if (transcribeRes.ok) {
              const transcription = await transcribeRes.json();
              if (transcription.text) {
                setInput((prev) => prev + (prev ? " " : "") + transcription.text);
                toast.success("Áudio transcrito com sucesso!");
              } else {
                toast.error("Não foi possível transcrever o áudio");
              }
            } else {
              // Fallback: add as file attachment
              setUploadedFiles((prev) => [...prev, data.file]);
              toast.info("Áudio anexado (transcrição indisponível)");
            }
          } else {
            toast.error("Falha ao enviar áudio");
          }
        } catch {
          toast.error("Erro ao processar áudio");
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.info("Gravando áudio... Clique novamente para parar");
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if ((!content.trim() && uploadedFiles.length === 0) || isStreaming) return;

      let convId = activeConversationId;
      if (!convId) {
        try {
          const conv = await createConversation.mutateAsync({});
          convId = conv.id;
          setActiveConversationId(convId);
          utils.chat.listConversations.invalidate();
        } catch (err: any) {
          // Handle monthly conversation limit
          const errMsg = err?.message || err?.data?.message || "";
          if (errMsg.includes("limite") || errMsg.includes("Fa\u00e7a upgrade")) {
            setUpgradeModal({ open: true, message: errMsg, planId: "free" });
          } else {
            toast.error("Erro ao criar conversa. Tente novamente.");
          }
          return;
        }
      }

      // Build message content with file context
      let messageContent = content.trim();
      const currentFiles = [...uploadedFiles];
      if (currentFiles.length > 0) {
        const fileDescriptions = currentFiles.map((f) => {
          if (f.isImage) return `[Imagem anexada: ${f.filename}] URL: ${f.url}`;
          if (f.textContent) return `[Arquivo: ${f.filename}]\n\`\`\`\n${f.textContent.slice(0, 10000)}\n\`\`\``;
          return `[Arquivo anexado: ${f.filename} (${f.mimeType}, ${(f.size / 1024).toFixed(1)}KB)]`;
        }).join("\n\n");
        messageContent = messageContent
          ? `${messageContent}\n\n---\nArquivos anexados:\n${fileDescriptions}`
          : `Analise os seguintes arquivos:\n\n${fileDescriptions}`;
      }

      const userMsg: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: content.trim() || `Enviou ${currentFiles.length} arquivo(s) para análise`,
        createdAt: new Date(),
        attachments: currentFiles.length > 0 ? currentFiles : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setUploadedFiles([]);
      setIsStreaming(true);
      setStreamingContent("");
      setToolResults([]);
      setActiveSteps([]);

      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setStreamTimedOut(false);

        // Stream timeout: 90s max without any data
        const STREAM_TIMEOUT_MS = 90_000;
        let lastDataAt = Date.now();
        streamTimeoutRef.current = setInterval(() => {
          if (Date.now() - lastDataAt > STREAM_TIMEOUT_MS) {
            console.warn("[Stream] Timeout: no data received for 90s, aborting");
            setStreamTimedOut(true);
            controller.abort();
            if (streamTimeoutRef.current) { clearInterval(streamTimeoutRef.current); streamTimeoutRef.current = null; }
          }
        }, 5_000);

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId, content: messageContent }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // Handle 402 (limit reached) with upgrade modal
          if (response.status === 402) {
            lastRequestBlockedRef.current = true;
            if (ctaTimeoutRef.current) { clearTimeout(ctaTimeoutRef.current); ctaTimeoutRef.current = null; }
            setShowCardUpgradeCTA(false);
            try {
              const errData = await response.json();
              const planId = errData.planId || "free";
              const msg = errData.error || "Você atingiu o limite do seu plano.";
              setUpgradeModal({ open: true, message: msg, planId });
              // Remove the user message we optimistically added
              setMessages((prev) => prev.filter(m => m.id !== userMsg.id));
            } catch {
              setUpgradeModal({ open: true, message: "Você atingiu o limite do seu plano. Faça upgrade para continuar.", planId: "free" });
            }
            return;
          }
          if (response.status === 429) {
            lastRequestBlockedRef.current = true;
            if (ctaTimeoutRef.current) { clearTimeout(ctaTimeoutRef.current); ctaTimeoutRef.current = null; }
            setShowCardUpgradeCTA(false);
            toast.error("Muitas mensagens em pouco tempo. Aguarde um momento.");
            setMessages((prev) => prev.filter(m => m.id !== userMsg.id));
            return;
          }
          throw new Error("Stream failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        const collectedToolResults: ToolResultEvent[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          lastDataAt = Date.now(); // Reset timeout on each chunk
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              switch (parsed.type) {
                case "chunk":
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                  break;

                case "step":
                  setActiveSteps((prev) => [...prev, parsed as StepEvent]);
                  break;

                case "tool_start":
                  setActiveSteps((prev) => [
                    ...prev,
                    {
                      step: "tool",
                      content: `Executando ${TOOL_DISPLAY[parsed.name]?.label || parsed.name}...`,
                      tools: [parsed.name],
                    },
                  ]);
                  break;

                case "tool_result":
                  collectedToolResults.push(parsed as ToolResultEvent);
                  setToolResults([...collectedToolResults]);
                  setActiveSteps((prev) => prev.filter((s) => !s.tools?.includes(parsed.name)));
                  break;

                case "title":
                  utils.chat.listConversations.invalidate();
                  break;

                case "done":
                  setActiveSteps([]);
                  break;

                case "error":
                  console.error("Stream error:", parsed.content);
                  break;
              }
            } catch {
              // skip
            }
          }
        }

        if (fullContent) {
          const assistantMsg: ChatMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content: fullContent,
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: any) {
        lastRequestBlockedRef.current = true;
        if (ctaTimeoutRef.current) { clearTimeout(ctaTimeoutRef.current); ctaTimeoutRef.current = null; }
        setShowCardUpgradeCTA(false);
        if (err.name === "AbortError" && streamTimedOut) {
          // Timeout-triggered abort: show friendly message
          const timeoutMsg: ChatMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content: "A análise demorou mais do que o esperado e foi interrompida. Isso pode ocorrer com alvos lentos ou instáveis. Tente novamente ou informe outro endereço.",
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, timeoutMsg]);
          setStreamTimedOut(false);
        } else if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          const errorMsg: ChatMessage = {
            id: Date.now() + 1,
            role: "assistant",
            content: "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.",
            createdAt: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        if (streamTimeoutRef.current) { clearInterval(streamTimeoutRef.current); streamTimeoutRef.current = null; }
        setIsStreaming(false);
        setStreamingContent("");
        setActiveSteps([]);
        abortControllerRef.current = null;
        // Refresh usage indicator after message sent
        utils.account.usage.invalidate();
      }
    },
    [activeConversationId, isStreaming, createConversation, utils, uploadedFiles]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const handleRenameConversation = async (id: number) => {
    if (!editTitleValue.trim()) { setEditingTitle(null); return; }
    try {
      await updateTitle.mutateAsync({ id, title: editTitleValue.trim() });
      utils.chat.listConversations.invalidate();
    } catch (err) {
      console.error("Failed to rename:", err);
    }
    setEditingTitle(null);
  };

  const handleTogglePin = useCallback(async (id: number) => {
    try {
      const result = await togglePin.mutateAsync({ id });
      utils.chat.listConversations.invalidate();
      toast.success(result.isPinned ? "Conversa fixada" : "Conversa desafixada");
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      toast.error("Erro ao fixar conversa");
    }
  }, [togglePin, utils]);

  const handleArchive = useCallback(async (id: number) => {
    try {
      await archiveConv.mutateAsync({ id });
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      utils.chat.listConversations.invalidate();
      utils.chat.listArchived.invalidate();
      toast.success("Conversa arquivada", {
        action: {
          label: "Desfazer",
          onClick: async () => {
            try {
              await unarchiveConv.mutateAsync({ id });
              utils.chat.listConversations.invalidate();
              utils.chat.listArchived.invalidate();
              toast.success("Conversa restaurada");
            } catch {
              toast.error("Erro ao restaurar conversa");
            }
          },
        },
      });
    } catch (err) {
      console.error("Failed to archive:", err);
      toast.error("Erro ao arquivar conversa");
    }
  }, [archiveConv, unarchiveConv, activeConversationId, utils]);

  const handleUnarchive = useCallback(async (id: number) => {
    try {
      await unarchiveConv.mutateAsync({ id });
      utils.chat.listConversations.invalidate();
      utils.chat.listArchived.invalidate();
      toast.success("Conversa restaurada");
    } catch (err) {
      console.error("Failed to unarchive:", err);
      toast.error("Erro ao restaurar conversa");
    }
  }, [unarchiveConv, utils]);

  const handleDeleteWithConfirm = useCallback((id: number) => {
    setDeleteConfirm({ open: true, id });
  }, []);

  const confirmDelete = useCallback(async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    setDeleteConfirm({ open: false, id: null });
    try {
      await deleteConversation.mutateAsync({ id });
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      utils.chat.listConversations.invalidate();
      utils.chat.listArchived.invalidate();
      toast.success("Conversa excluída");
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error("Erro ao excluir conversa");
    }
  }, [deleteConfirm.id, deleteConversation, activeConversationId, utils]);

  // Auth loading
  if (authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO_ICON} alt="debuga.ai" className="w-16 h-16 rounded-xl animate-pulse" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-mono text-sm">Inicializando...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
          <img src={LOGO_ICON} alt="debuga.ai" className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold font-mono text-foreground">
              Entre para acessar o chat
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Faça login para usar o agente autônomo de IA do debuga.ai.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => (window.location.href = getLoginUrl("/chat"))}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono shadow-lg shadow-primary/20"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/")}
              className="w-full font-mono text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar para o site
            </Button>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/40">
            Powered by Sperry Tecnologia
          </p>
        </div>
      </div>
    );
  }

  // Paywall
  if (!subQuery.isLoading && !hasAccess) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
          <img src={LOGO_ICON} alt="debuga.ai" className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold font-mono">Assinatura Necessária</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Para acessar o agente autônomo de IA, você precisa de uma assinatura ativa.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={() => (window.location.href = "/pricing")} size="lg" className="w-full font-mono">
              Ver Planos
            </Button>
            <Button variant="ghost" onClick={() => { logout(); }} className="font-mono text-sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const conversations = conversationsQuery.data || [];

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <div className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
        "fixed md:relative z-50 md:z-auto",
        sidebarOpen ? "w-[85vw] max-w-72 md:w-72" : "w-0 overflow-hidden"
      )}>
        <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <img src={LOGO_ICON} alt="debuga.ai" className="w-7 h-7 rounded-lg" />
            <span className="font-mono font-semibold text-sm text-sidebar-foreground">
              debuga<span className="text-primary">.ai</span>
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 shrink-0 space-y-2">
          <Button
            onClick={handleNewChat}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-mono text-sm"
            variant="outline"
            disabled={createConversation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
          {/* Search field */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sidebar-foreground/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-8 rounded-lg bg-sidebar-accent/30 border border-sidebar-border/50 text-xs font-mono text-sidebar-foreground placeholder:text-sidebar-foreground/30 outline-none focus:border-primary/50 focus:bg-sidebar-accent/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchEnabled && (
            <label className="flex items-center gap-2 px-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeArchivedSearch}
                onChange={(e) => setIncludeArchivedSearch(e.target.checked)}
                className="w-3 h-3 rounded border-sidebar-border accent-primary"
              />
              <span className="text-[10px] font-mono text-sidebar-foreground/40">Incluir arquivadas</span>
            </label>
          )}
        </div>

        <ScrollArea className="flex-1 px-2">
          {/* Search results mode */}
          {searchEnabled ? (
            <div className="space-y-0.5 py-1">
              {searchResults.isLoading && !searchResults.data ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-sidebar-foreground/40" />
                </div>
              ) : searchResults.data && searchResults.data.results.length > 0 ? (
                <>
                  <div className="px-3 pt-1 pb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-sidebar-foreground/40">
                      {searchResults.data.total} resultado{searchResults.data.total !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {searchResults.data.results.map((result: any) => (
                    <div
                      key={`search-${result.conversationId}`}
                      className={cn(
                        "group flex flex-col gap-1 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                        activeConversationId === result.conversationId
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                      onClick={() => {
                        setActiveConversationId(result.conversationId);
                        setStreamingContent("");
                        setToolResults([]);
                        setActiveSteps([]);
                        setSearchQuery("");
                        setDebouncedSearch("");
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <ConversationIcon title={result.title || ""} />
                        <span className="flex-1 truncate font-mono text-xs font-medium">{result.title || "Sem título"}</span>
                        {result.isArchived && (
                          <span className="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                            Arquivada
                          </span>
                        )}
                      </div>
                      {result.snippet && (
                        <p className="text-[10px] font-mono text-sidebar-foreground/40 line-clamp-2 pl-6 leading-relaxed">
                          {result.messageRole === "assistant" ? "IA: " : "Você: "}
                          {result.snippet}
                        </p>
                      )}
                      <span className="text-[9px] font-mono text-sidebar-foreground/25 pl-6">
                        {new Date(result.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Search className="w-5 h-5 text-sidebar-foreground/20 mb-2" />
                  <p className="text-xs font-mono text-sidebar-foreground/40">
                    Nenhuma conversa encontrada para
                  </p>
                  <p className="text-xs font-mono text-primary/60 mt-1 break-all">
                    "{debouncedSearch}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 py-1">
            {/* Pinned section label */}
            {conversations.some((c: any) => c.isPinned) && (
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sidebar-foreground/40 flex items-center gap-1.5">
                  <Pin className="w-2.5 h-2.5" />
                  Fixadas
                </span>
              </div>
            )}
            {conversations.filter((c: any) => c.isPinned).map((conv: any) => (
              <ContextMenu key={conv.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
                      activeConversationId === conv.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    onClick={() => { setActiveConversationId(conv.id); setStreamingContent(""); setToolResults([]); setActiveSteps([]); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  >
                    {conv.isPinned && <Pin className="w-3 h-3 shrink-0 text-primary/60" />}
                    <ConversationIcon title={conv.title || ""} />
                    {editingTitle === conv.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameConversation(conv.id); if (e.key === "Escape") setEditingTitle(null); }}
                          className="flex-1 bg-transparent border-b border-primary/50 outline-none text-sm font-mono"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); handleRenameConversation(conv.id); }} className="p-0.5 hover:text-primary">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingTitle(null); }} className="p-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 truncate font-mono text-xs">{conv.title}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(conv.id); }}>
                              {conv.isPinned ? <PinOff className="w-3 h-3 mr-2" /> : <Pin className="w-3 h-3 mr-2" />}
                              {conv.isPinned ? "Desafixar" : "Fixar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTitle(conv.id); setEditTitleValue(conv.title); }}>
                              <Pencil className="w-3 h-3 mr-2" />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(conv.id); }}>
                              <Archive className="w-3 h-3 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}>
                              <Trash2 className="w-3 h-3 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => handleTogglePin(conv.id)}>
                    {conv.isPinned ? <PinOff className="w-4 h-4 mr-2" /> : <Pin className="w-4 h-4 mr-2" />}
                    {conv.isPinned ? "Desafixar conversa" : "Fixar conversa"}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => { setEditingTitle(conv.id); setEditTitleValue(conv.title); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Renomear
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleArchive(conv.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </ContextMenuItem>
                  <ContextMenuItem variant="destructive" onClick={() => handleDeleteConversation(conv.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            {/* Recent conversations section */}
            {conversations.some((c: any) => c.isPinned) && conversations.some((c: any) => !c.isPinned) && (
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sidebar-foreground/40 flex items-center gap-1.5">
                  <MessageSquare className="w-2.5 h-2.5" />
                  Recentes
                </span>
              </div>
            )}
            {conversations.filter((c: any) => !c.isPinned).map((conv: any) => (
              <ContextMenu key={conv.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
                      activeConversationId === conv.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                    onClick={() => { setActiveConversationId(conv.id); setStreamingContent(""); setToolResults([]); setActiveSteps([]); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  >
                    <ConversationIcon title={conv.title || ""} />
                    {editingTitle === conv.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameConversation(conv.id); if (e.key === "Escape") setEditingTitle(null); }}
                          className="flex-1 bg-transparent border-b border-primary/50 outline-none text-sm font-mono"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); handleRenameConversation(conv.id); }} className="p-0.5 hover:text-primary">
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingTitle(null); }} className="p-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 truncate font-mono text-xs">{conv.title}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePin(conv.id); }}>
                              <Pin className="w-3 h-3 mr-2" />
                              Fixar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTitle(conv.id); setEditTitleValue(conv.title); }}>
                              <Pencil className="w-3 h-3 mr-2" />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(conv.id); }}>
                              <Archive className="w-3 h-3 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}>
                              <Trash2 className="w-3 h-3 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => handleTogglePin(conv.id)}>
                    <Pin className="w-4 h-4 mr-2" />
                    Fixar conversa
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => { setEditingTitle(conv.id); setEditTitleValue(conv.title); }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Renomear
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => handleArchive(conv.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Arquivar
                  </ContextMenuItem>
                  <ContextMenuItem variant="destructive" onClick={() => handleDeleteConversation(conv.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
            </div>
          )}
        </ScrollArea>

        {/* Archived conversations toggle */}
        <div className="px-3 py-2 border-t border-sidebar-border shrink-0">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors font-mono"
          >
            <Archive className="w-3.5 h-3.5" />
            Arquivadas
            {archivedQuery.data && archivedQuery.data.length > 0 && (
              <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                {archivedQuery.data.length}
              </span>
            )}
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showArchived && "rotate-90")} />
          </button>

          {showArchived && (
            <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
              {archivedQuery.isLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sidebar-foreground/40" />
                </div>
              ) : archivedQuery.data && archivedQuery.data.length > 0 ? (
                archivedQuery.data.map((conv: any) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer transition-colors",
                      activeConversationId === conv.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground/70"
                    )}
                    onClick={() => { setActiveConversationId(conv.id); setStreamingContent(""); setToolResults([]); setActiveSteps([]); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  >
                    <Archive className="w-3 h-3 shrink-0 opacity-50" />
                    <span className="flex-1 truncate font-mono">{conv.title || "Sem t\u00edtulo"}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUnarchive(conv.id); }}>
                          <ArchiveRestore className="w-3 h-3 mr-2" />
                          Restaurar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}>
                          <Trash2 className="w-3 h-3 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-sidebar-foreground/30 text-center py-2 font-mono">
                  Nenhuma conversa arquivada
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full rounded-lg px-2 py-2 hover:bg-sidebar-accent/50 transition-colors text-left">
                <Avatar className="h-8 w-8 border border-sidebar-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-mono">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-sidebar-foreground">{user?.name || "Usuário"}</p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email || ""}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => (window.location.href = "/account")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Minha Conta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = "/account")} className="cursor-pointer">
                <BarChart3 className="mr-2 h-4 w-4" />
                Plano e Uso
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = "/pricing?from=app")} className="cursor-pointer">
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Fazer Upgrade
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.open("https://wa.me/555137374357?text=Ol%C3%A1!%20Preciso%20de%20suporte%20com%20o%20debuga.ai", "_blank")} className="cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Suporte WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        ref={chatAreaRef}
        className={cn("flex-1 flex flex-col h-full relative", isDragOver && "ring-2 ring-primary ring-inset")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5">
              <Upload className="w-12 h-12 text-primary animate-bounce" />
              <div className="text-center">
                <p className="font-mono font-semibold text-primary">Solte seus arquivos aqui</p>
                <p className="text-xs text-muted-foreground mt-1">Imagens, logs, configs, scripts, áudios...</p>
              </div>
            </div>
          </div>
        )}
        {/* Top Bar */}
        <div className="h-14 flex items-center justify-between px-3 md:px-4 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarOpen(true)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
                {isStreaming ? "Processando..." : "Online"}
              </span>
            </div>
            {activeConversationId && (() => {
              const activeConv = conversations.find((c: any) => c.id === activeConversationId);
              if (!activeConv) return null;
              return (
                <div className="flex items-center gap-1.5 md:gap-2 ml-1 md:ml-2 px-2 py-1 rounded-md bg-card/50 border border-border/50 min-w-0">
                  <ConversationIcon title={activeConv.title || ""} />
                  <span className="font-mono text-xs text-foreground/80 truncate max-w-[120px] md:max-w-[200px]">{activeConv.title}</span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground/50 hidden sm:inline">debuga.ai v3.0</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !activeConversationId ? (
            <div className="h-full flex flex-col items-center justify-center px-3 md:px-6 overflow-x-hidden">
              <div className="max-w-2xl w-full space-y-6 md:space-y-8">
                <div className="text-center space-y-3 md:space-y-4">
                  <img src={AVATAR_AGENT} alt="debuga.ai Agent" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl mx-auto shadow-lg shadow-primary/10" />
                  <div>
                    <h2 className="text-lg md:text-xl font-bold font-mono">
                      Olá! Sou o <span className="terminal-glow text-primary">debuga.ai</span>
                    </h2>
                    {/* Mobile: cleaner subtitle encouraging typing */}
                    <p className="text-sm text-muted-foreground mt-2 md:hidden">
                      Descreva seu problema ou escolha um exemplo guiado.
                    </p>
                    {/* Desktop: original subtitle */}
                    <p className="text-sm text-muted-foreground mt-2 hidden md:block">
                      Escolha um exemplo abaixo para ver o debuga.ai em ação com consultas reais.
                    </p>
                  </div>
                </div>

                {/* Mobile: accordion toggle for examples */}
                <div className="md:hidden px-1">
                  <button
                    onClick={() => setMobileExamplesOpen(!mobileExamplesOpen)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-accent transition-all font-mono text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", mobileExamplesOpen && "rotate-180")} />
                    {mobileExamplesOpen ? "Ocultar exemplos" : "Ver exemplos guiados"}
                  </button>
                </div>

                {/* Mobile: collapsible compact list */}
                {mobileExamplesOpen && (
                  <div className="flex flex-col gap-2 px-1 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {SUGGESTED_PROMPTS.map((item, i) => {
                      const userPlan = usageQuery.data?.planId || "free";
                      const isPaidPlan = userPlan !== "free";
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            lastRequestBlockedRef.current = false;
                            if (ctaTimeoutRef.current) { clearTimeout(ctaTimeoutRef.current); ctaTimeoutRef.current = null; }
                            setMobileExamplesOpen(false);
                            handleSendMessage(item.prompt);
                            if (!isPaidPlan) {
                              ctaTimeoutRef.current = setTimeout(() => {
                                ctaTimeoutRef.current = null;
                                if (!lastRequestBlockedRef.current && !upgradeModal?.open) {
                                  setShowCardUpgradeCTA(true);
                                }
                              }, 5000);
                            }
                          }}
                          disabled={isStreaming}
                          className="group flex items-center gap-3 py-3 px-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left"
                        >
                          <div className="p-1.5 rounded-md shrink-0 transition-colors bg-primary/10 text-primary group-hover:bg-primary/20">
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium font-mono text-foreground leading-tight">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Desktop: original grid layout (unchanged) */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-3 px-1">
                  {SUGGESTED_PROMPTS.map((item, i) => {
                    const userPlan = usageQuery.data?.planId || "free";
                    const isPaidPlan = userPlan !== "free";

                    return (
                      <button
                        key={i}
                        onClick={() => {
                          lastRequestBlockedRef.current = false;
                          if (ctaTimeoutRef.current) { clearTimeout(ctaTimeoutRef.current); ctaTimeoutRef.current = null; }
                          handleSendMessage(item.prompt);
                          if (!isPaidPlan) {
                            ctaTimeoutRef.current = setTimeout(() => {
                              ctaTimeoutRef.current = null;
                              if (!lastRequestBlockedRef.current && !upgradeModal?.open) {
                                setShowCardUpgradeCTA(true);
                              }
                            }, 5000);
                          }
                        }}
                        disabled={isStreaming}
                        className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left"
                      >
                        <div className="p-2 rounded-lg shrink-0 transition-colors bg-primary/10 text-primary group-hover:bg-primary/20">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium font-mono text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 overflow-x-hidden">
              {messages
                .filter((m) => m.role !== "system")
                .map((msg, idx) => (
                  <div key={msg.id || idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="shrink-0 mt-0.5">
                      {msg.role === "assistant" ? (
                        <Avatar className="h-8 w-8 border border-primary/20">
                          <AvatarImage src={AVATAR_AGENT} alt="Agent" />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-medium text-foreground">
                          {msg.role === "assistant" ? "debuga.ai" : user?.name || "Você"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                          {msg.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none prose-pre:bg-[oklch(0.06_0.005_240)] prose-pre:border prose-pre:border-border prose-code:text-primary prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{msg.content}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {msg.attachments.map((att, ai) => (
                                <div key={ai} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/10 text-xs font-mono">
                                  {att.isImage ? (
                                    <img src={att.url} alt={att.filename} className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(att.url, '_blank')} />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                  )}
                                  <span className="text-foreground/70 truncate max-w-[100px]">{att.filename}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

              {/* Tool results rendered between messages */}
              {toolResults.map((tr, i) => (
                <div key={`tool-${i}`} className="ml-11">
                  <ToolResultCard name={tr.name} result={tr.result} />
                </div>
              ))}

              {/* Active steps */}
              {activeSteps.map((step, i) => (
                <div key={`step-${i}`} className="ml-11">
                  <StepIndicator step={step} />
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3 items-start animate-in fade-in duration-300">
                  <Avatar className="h-8 w-8 border border-primary/20 shrink-0 mt-0.5">
                    <AvatarImage src={AVATAR_AGENT} alt="Agent" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-medium text-foreground">debuga.ai</span>
                      <span className="text-[10px] text-primary/60 font-mono agent-pulse">gerando...</span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none prose-pre:bg-[oklch(0.06_0.005_240)] prose-pre:border prose-pre:border-border prose-code:text-primary prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
                      <Streamdown>{streamingContent}</Streamdown>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isStreaming && !streamingContent && activeSteps.length === 0 && (
                <div className="flex gap-3 items-start animate-in fade-in duration-300">
                  <Avatar className="h-8 w-8 border border-primary/20 shrink-0 mt-0.5">
                    <AvatarImage src={AVATAR_AGENT} alt="Agent" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Analisando...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm px-3 md:px-4 py-2 md:py-3 shrink-0 pb-[env(safe-area-inset-bottom,8px)]">
          <div className="max-w-4xl mx-auto">
            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 overflow-x-hidden">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono max-w-full">
                    {f.isImage ? (
                      <img src={f.url} alt={f.filename} className="w-6 h-6 md:w-8 md:h-8 rounded object-cover shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="text-foreground/80 truncate max-w-[80px] md:max-w-[120px]">{f.filename}</span>
                    <button onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }} className="relative">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.csv,.json,.xml,.yaml,.yml,.log,.conf,.cfg,.ini,.sh,.py,.js,.ts,.html,.css,.md,.pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.webm,.ogg,.m4a"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Descreva seu problema..."
                className="w-full resize-none bg-card border-border rounded-xl pl-11 md:pl-12 pr-20 md:pr-24 min-h-[48px] md:min-h-[52px] max-h-32 md:max-h-40 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                rows={1}
                disabled={isStreaming}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={isStreaming || isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-2 bottom-2 h-9 w-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={isStreaming || isUploading}
                onClick={toggleRecording}
                className={cn(
                  "absolute right-12 bottom-2 h-9 w-9 rounded-lg transition-all",
                  isRecording
                    ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && uploadedFiles.length === 0) || isStreaming}
                className="absolute right-2 bottom-2 h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-30 disabled:shadow-none"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            {/* Usage Indicator */}
            {usageQuery.data && !usageQuery.data.isAdmin && (
              <div className="flex items-center justify-center gap-2 md:gap-4 mt-1.5 md:mt-2 flex-wrap">
                {usageQuery.data.planId === "pro" || usageQuery.data.planId === "enterprise" ? (
                  <span className="text-[9px] md:text-[10px] font-mono text-muted-foreground/50">
                    {usageQuery.data.planId === "pro" ? "Uso ilimitado" : "Limites por contrato"}
                  </span>
                ) : (
                  <>
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-mono",
                      usageQuery.data.todayMessages >= usageQuery.data.limits.messagesPerDay
                        ? "text-red-400/80"
                        : usageQuery.data.todayMessages >= usageQuery.data.limits.messagesPerDay * 0.8
                        ? "text-yellow-400/70"
                        : "text-muted-foreground/50"
                    )}>
                      Msgs: {usageQuery.data.todayMessages}/{usageQuery.data.limits.messagesPerDay}
                    </span>
                    <span className="text-muted-foreground/20">|</span>
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-mono",
                      usageQuery.data.monthConversations >= usageQuery.data.limits.conversationsPerMonth
                        ? "text-red-400/80"
                        : usageQuery.data.monthConversations >= usageQuery.data.limits.conversationsPerMonth * 0.8
                        ? "text-yellow-400/70"
                        : "text-muted-foreground/50"
                    )}>
                      Conv: {usageQuery.data.monthConversations}/{usageQuery.data.limits.conversationsPerMonth}
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="hidden md:flex items-center justify-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
                <Paperclip className="w-3 h-3" /> Ctrl+V / Drag
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
                <Mic className="w-3 h-3" /> Voz
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
                <ImageIcon className="w-3 h-3" /> Vision
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
                <Code2 className="w-3 h-3" /> Código
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
                <ShieldCheck className="w-3 h-3" /> SSL/DNS
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={!!upgradeModal?.open} onOpenChange={(open) => !open && setUpgradeModal(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-5 h-5 text-primary" />
              Limite do plano atingido
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Você atingiu o limite gratuito de uso. Faça upgrade para continuar usando o debuga.ai com mais mensagens, conversas e recursos técnicos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setUpgradeModal(null)} className="font-mono text-sm">
              Fechar
            </Button>
            <Button onClick={() => { setUpgradeModal(null); setLocation("/pricing"); }} className="font-mono text-sm gap-2">
              <Crown className="w-4 h-4" />
              Ver Planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-card CTA - only shows if upgrade modal is NOT open */}
      <Dialog open={showCardUpgradeCTA && !upgradeModal?.open} onOpenChange={setShowCardUpgradeCTA}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              Gostou do resultado?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              Faça upgrade para usar com seus próprios domínios, servidores e scripts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setShowCardUpgradeCTA(false)} className="font-mono text-sm">
              Continuar testando
            </Button>
            <Button onClick={() => { setShowCardUpgradeCTA(false); setLocation("/pricing"); }} className="font-mono text-sm gap-2">
              <Crown className="w-4 h-4" />
              Fazer Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">Excluir conversa</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir esta conversa? Essa ação remove o histórico visual, mas não altera o uso já consumido no plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-sm">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
