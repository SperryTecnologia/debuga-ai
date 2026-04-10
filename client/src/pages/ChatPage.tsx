import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
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
  Terminal,
  Shield,
  Server,
  Wifi,
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
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

const LOGO_ICON =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga_logo_icon-cikoAtHz7LsHY3sccX7cHD.webp";
const AVATAR_AGENT =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga_agent_avatar-e4oaGrQpDrrqx9i9uqspLn.webp";

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
};

// ── Tool Result Renderers ──
function ToolResultCard({ name, result }: { name: string; result: any }) {
  const display = TOOL_DISPLAY[name] || { icon: Wrench, label: name, color: "text-muted-foreground" };
  const Icon = display.icon;

  if (result?.error) {
    return (
      <div className="my-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("w-4 h-4", display.color)} />
          <span className="font-mono text-xs font-medium text-destructive">{display.label} - Erro</span>
        </div>
        <p className="text-xs text-destructive/80 font-mono">{result.error}</p>
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
        {result.prompt && (
          <p className="text-[10px] text-muted-foreground/60 font-mono italic">Prompt: {result.prompt}</p>
        )}
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

const SUGGESTED_PROMPTS = [
  { icon: Shield, title: "Análise de Segurança", prompt: "Verifique o certificado SSL e os headers de segurança do site google.com" },
  { icon: Server, title: "Diagnóstico de Infra", prompt: "Faça uma consulta DNS completa do domínio github.com e analise os resultados" },
  { icon: Terminal, title: "Script de Automação", prompt: "Crie e execute um script Python que calcule o espaço em disco e uso de memória do sistema" },
  { icon: ImageIcon, title: "Gerar Diagrama", prompt: "Gere uma imagem de um diagrama de arquitetura de rede corporativa com firewall, DMZ e segmentação" },
];

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [toolResults, setToolResults] = useState<ToolResultEvent[]>([]);
  const [activeSteps, setActiveSteps] = useState<StepEvent[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // tRPC queries
  const conversationsQuery = trpc.chat.listConversations.useQuery(undefined, { enabled: !!user });
  const createConversation = trpc.chat.createConversation.useMutation();
  const deleteConversation = trpc.chat.deleteConversation.useMutation();
  const togglePin = trpc.chat.togglePin.useMutation();
  const archiveConv = trpc.chat.archive.useMutation();
  const updateTitle = trpc.chat.updateTitle.useMutation();
  const messagesQuery = trpc.chat.getMessages.useQuery(
    { conversationId: activeConversationId! },
    { enabled: !!activeConversationId }
  );
  const utils = trpc.useUtils();

  // Subscription check
  const subQuery = trpc.subscription.status.useQuery(undefined, { enabled: !!user });
  const hasAccess = !!user || subQuery.data?.isAdmin || subQuery.data?.hasActiveSubscription;

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
    async (id: number) => {
      try {
        await deleteConversation.mutateAsync({ id });
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        utils.chat.listConversations.invalidate();
      } catch (err) {
        console.error("Failed to delete conversation:", err);
      }
    },
    [deleteConversation, activeConversationId, utils]
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
          toast.error("Gravacao muito curta, tente novamente");
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
                toast.success("Audio transcrito com sucesso!");
              } else {
                toast.error("Nao foi possivel transcrever o audio");
              }
            } else {
              // Fallback: add as file attachment
              setUploadedFiles((prev) => [...prev, data.file]);
              toast.info("Audio anexado (transcricao indisponivel)");
            }
          } else {
            toast.error("Falha ao enviar audio");
          }
        } catch {
          toast.error("Erro ao processar audio");
        } finally {
          setIsUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      toast.info("Gravando audio... Clique novamente para parar");
    } catch {
      toast.error("Nao foi possivel acessar o microfone");
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
        } catch {
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

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId, content: messageContent }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) throw new Error("Stream failed");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        const collectedToolResults: ToolResultEvent[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
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
        if (err.name !== "AbortError") {
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
        setIsStreaming(false);
        setStreamingContent("");
        setActiveSteps([]);
        abortControllerRef.current = null;
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
      toast.success("Conversa arquivada");
    } catch (err) {
      console.error("Failed to archive:", err);
      toast.error("Erro ao arquivar conversa");
    }
  }, [archiveConv, activeConversationId, utils]);

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
            <h1 className="text-3xl font-bold terminal-glow font-mono">
              debuga<span className="text-primary">.ai</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Agente autônomo de IA para Infraestrutura, DevOps e Segurança da Informação.
              <br />
              <span className="text-xs opacity-60">Powered by Sperry Tecnologia</span>
            </p>
          </div>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono shadow-lg shadow-primary/20"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Acessar Terminal
          </Button>
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
            <Button variant="ghost" onClick={() => { logout(); window.location.href = "/"; }} className="font-mono text-sm">
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
      {/* Sidebar */}
      <div className={cn(
        "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
        sidebarOpen ? "w-72" : "w-0 overflow-hidden"
      )}>
        <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <img src={LOGO_ICON} alt="debuga.ai" className="w-7 h-7 rounded-lg" />
            <span className="font-mono font-semibold text-sm text-sidebar-foreground">
              debuga<span className="text-primary">.ai</span>
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-3 shrink-0">
          <Button
            onClick={handleNewChat}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-mono text-sm"
            variant="outline"
            disabled={createConversation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
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
                    onClick={() => { setActiveConversationId(conv.id); setStreamingContent(""); setToolResults([]); setActiveSteps([]); }}
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
                    onClick={() => { setActiveConversationId(conv.id); setStreamingContent(""); setToolResults([]); setActiveSteps([]); }}
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
        </ScrollArea>

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
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => (window.location.href = "/pricing")} className="cursor-pointer">
                <Cpu className="mr-2 h-4 w-4" />
                Meus Planos
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
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground">
                {isStreaming ? "Processando..." : "Online"}
              </span>
            </div>
            {activeConversationId && (() => {
              const activeConv = conversations.find((c: any) => c.id === activeConversationId);
              if (!activeConv) return null;
              return (
                <div className="flex items-center gap-2 ml-2 px-2 py-1 rounded-md bg-card/50 border border-border/50">
                  <ConversationIcon title={activeConv.title || ""} />
                  <span className="font-mono text-xs text-foreground/80 truncate max-w-[200px]">{activeConv.title}</span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/50">debuga.ai v3.0</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !activeConversationId ? (
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-4">
                  <img src={AVATAR_AGENT} alt="debuga.ai Agent" className="w-20 h-20 rounded-2xl mx-auto shadow-lg shadow-primary/10" />
                  <div>
                    <h2 className="text-xl font-bold font-mono">
                      Olá! Sou o <span className="terminal-glow text-primary">debuga.ai</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Seu agente autônomo de TI, Segurança e DevOps. Posso executar código, gerar imagens, verificar SSL, DNS e muito mais.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUGGESTED_PROMPTS.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(item.prompt)}
                      disabled={isStreaming}
                      className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium font-mono text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
        <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3 shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono">
                    {f.isImage ? (
                      <img src={f.url} alt={f.filename} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-foreground/80 truncate max-w-[120px]">{f.filename}</span>
                    <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive transition-colors">
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
                placeholder="Cole imagens (Ctrl+V), arraste arquivos, ou descreva seu problema..."
                className="w-full resize-none bg-card border-border rounded-xl pl-12 pr-24 min-h-[52px] max-h-40 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
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
            <div className="flex items-center justify-center gap-3 mt-2">
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
    </div>
  );
}
