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
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
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
};

// ── Topic Detection & Icon Mapping ──
interface TopicConfig {
  icon: LucideIcon;
  color: string; // tailwind text color
  keywords: string[];
}

const TOPIC_MAP: TopicConfig[] = [
  {
    icon: Shield,
    color: "text-emerald-400",
    keywords: ["seguranca", "segurança", "security", "firewall", "waf", "ids", "ips", "siem", "wazuh", "hardening", "pentest", "vulnerabilidade", "cve", "nist", "iso 27001", "compliance", "auditoria"],
  },
  {
    icon: Bug,
    color: "text-red-400",
    keywords: ["bug", "erro", "error", "debug", "crash", "exception", "traceback", "stack trace", "falha", "fix"],
  },
  {
    icon: Network,
    color: "text-blue-400",
    keywords: ["rede", "network", "tcp", "udp", "dns", "dhcp", "vlan", "switch", "router", "roteador", "latencia", "latência", "ping", "traceroute", "vpn", "subnet", "ip"],
  },
  {
    icon: Wifi,
    color: "text-cyan-400",
    keywords: ["wifi", "wireless", "telecom", "telecomunicacao", "telecomunicação", "5g", "4g", "lte", "fibra", "óptica", "optica", "antena", "radiofrequencia"],
  },
  {
    icon: Server,
    color: "text-orange-400",
    keywords: ["servidor", "server", "linux", "windows server", "apache", "nginx", "iis", "cpu", "memoria", "memória", "ram", "uptime", "reboot"],
  },
  {
    icon: Database,
    color: "text-violet-400",
    keywords: ["banco de dados", "database", "mysql", "postgres", "mongodb", "redis", "sql", "query", "backup", "restore", "replicacao", "replicação"],
  },
  {
    icon: Cloud,
    color: "text-sky-400",
    keywords: ["cloud", "nuvem", "aws", "azure", "gcp", "s3", "ec2", "lambda", "terraform", "cloudformation", "iaas", "paas", "saas"],
  },
  {
    icon: Container,
    color: "text-blue-300",
    keywords: ["docker", "container", "kubernetes", "k8s", "pod", "helm", "compose", "swarm", "registry", "imagem"],
  },
  {
    icon: Terminal,
    color: "text-green-400",
    keywords: ["script", "bash", "shell", "powershell", "automacao", "automação", "cron", "ansible", "puppet", "chef", "ci/cd", "pipeline", "jenkins", "github actions"],
  },
  {
    icon: Lock,
    color: "text-yellow-400",
    keywords: ["senha", "password", "autenticacao", "autenticação", "oauth", "jwt", "ssl", "tls", "certificado", "https", "criptografia", "encryption", "mfa", "2fa"],
  },
  {
    icon: Cpu,
    color: "text-pink-400",
    keywords: ["monitoramento", "monitoring", "zabbix", "prometheus", "grafana", "nagios", "alerta", "metrica", "métrica", "dashboard", "observabilidade"],
  },
  {
    icon: HardDrive,
    color: "text-amber-400",
    keywords: ["disco", "disk", "storage", "raid", "nas", "san", "lvm", "partição", "particao", "filesystem", "ext4", "ntfs", "zfs"],
  },
  {
    icon: FileCode,
    color: "text-teal-400",
    keywords: ["codigo", "código", "code", "python", "javascript", "java", "api", "rest", "json", "yaml", "xml", "git", "deploy"],
  },
  {
    icon: Globe,
    color: "text-indigo-400",
    keywords: ["web", "site", "dominio", "domínio", "http", "proxy", "load balancer", "cdn", "cache", "wordpress"],
  },
  {
    icon: Flame,
    color: "text-red-500",
    keywords: ["incidente", "incident", "emergencia", "emergência", "urgente", "critico", "crítico", "downtime", "outage", "indisponivel"],
  },
  {
    icon: AlertTriangle,
    color: "text-yellow-500",
    keywords: ["alerta", "warning", "aviso", "atencao", "atenção", "problema", "issue", "troubleshoot"],
  },
  {
    icon: Key,
    color: "text-amber-300",
    keywords: ["acesso", "permissao", "permissão", "rbac", "iam", "ldap", "active directory", "ad", "grupo", "usuario", "usuário"],
  },
];

function detectTopicFromTitle(title: string): TopicConfig {
  const normalized = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  for (const topic of TOPIC_MAP) {
    for (const kw of topic.keywords) {
      const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalized.includes(normalizedKw)) {
        return topic;
      }
    }
  }
  
  // Default: generic message icon
  return { icon: MessageSquare, color: "text-muted-foreground", keywords: [] };
}

function ConversationIcon({ title, className }: { title: string; className?: string }) {
  const topic = detectTopicFromTitle(title);
  const Icon = topic.icon;
  return <Icon className={cn("w-4 h-4 shrink-0", topic.color, className)} />;
}

const SUGGESTED_PROMPTS = [
  {
    icon: Shield,
    title: "Análise de Segurança",
    prompt: "Faça uma análise de segurança básica para meu servidor Linux. Quais são os primeiros passos de hardening?",
  },
  {
    icon: Server,
    title: "Diagnóstico de Infra",
    prompt: "Meu servidor está com alta utilização de CPU. Como posso diagnosticar e resolver o problema?",
  },
  {
    icon: Terminal,
    title: "Script de Automação",
    prompt: "Crie um script Bash para monitorar uso de disco e enviar alerta quando ultrapassar 80%.",
  },
  {
    icon: Wifi,
    title: "Troubleshooting de Rede",
    prompt: "Como diagnosticar problemas de latência e perda de pacotes em uma rede corporativa?",
  },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // tRPC queries
  const conversationsQuery = trpc.chat.listConversations.useQuery(undefined, {
    enabled: !!user,
  });
  const createConversation = trpc.chat.createConversation.useMutation();
  const deleteConversation = trpc.chat.deleteConversation.useMutation();
  const updateTitle = trpc.chat.updateTitle.useMutation();
  const messagesQuery = trpc.chat.getMessages.useQuery(
    { conversationId: activeConversationId! },
    { enabled: !!activeConversationId }
  );

  const utils = trpc.useUtils();

  // Subscription check - admins bypass
  const subQuery = trpc.subscription.status.useQuery(undefined, { enabled: !!user });
  const hasAccess = subQuery.data?.isAdmin || subQuery.data?.hasActiveSubscription;

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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Checkout success handler
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

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      let convId = activeConversationId;

      // Create conversation if none active
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

      // Add user message optimistically
      const userMsg: ChatMessage = {
        id: Date.now(),
        role: "user",
        content: content.trim(),
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);
      setStreamingContent("");

      // Stream response via SSE
      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            content: content.trim(),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Stream failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

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
              if (parsed.type === "chunk") {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              } else if (parsed.type === "title") {
                utils.chat.listConversations.invalidate();
              } else if (parsed.type === "error") {
                console.error("Stream error:", parsed.content);
              }
            } catch {
              // skip
            }
          }
        }

        // Add assistant message
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
        abortControllerRef.current = null;
      }
    },
    [activeConversationId, isStreaming, createConversation, utils]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const handleRenameConversation = async (id: number) => {
    if (!editTitleValue.trim()) {
      setEditingTitle(null);
      return;
    }
    try {
      await updateTitle.mutateAsync({ id, title: editTitleValue.trim() });
      utils.chat.listConversations.invalidate();
    } catch (err) {
      console.error("Failed to rename:", err);
    }
    setEditingTitle(null);
  };

  // Auth loading state
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

  // Show paywall if no subscription and not admin
  if (!subQuery.isLoading && !hasAccess) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
          <img src={LOGO_ICON} alt="debuga.ai" className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20" />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold font-mono">
              Assinatura Necessaria
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Para acessar o agente autonomo de IA, voce precisa de uma assinatura ativa.
              Escolha o plano ideal para sua equipe.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              onClick={() => window.location.href = "/pricing"}
              size="lg"
              className="w-full font-mono"
            >
              Ver Planos
            </Button>
            <Button
              variant="ghost"
              onClick={() => { logout(); window.location.href = "/"; }}
              className="font-mono text-sm"
            >
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
      <div
        className={cn(
          "h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2">
            <img src={LOGO_ICON} alt="debuga.ai" className="w-7 h-7 rounded-lg" />
            <span className="font-mono font-semibold text-sm text-sidebar-foreground">
              debuga<span className="text-primary">.ai</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* New Chat Button */}
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

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 py-1">
            {conversations.map((conv: any) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
                  activeConversationId === conv.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  setStreamingContent("");
                }}
              >
                <ConversationIcon title={conv.title || ""} />
                {editingTitle === conv.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameConversation(conv.id);
                        if (e.key === "Escape") setEditingTitle(null);
                      }}
                      className="flex-1 bg-transparent border-b border-primary/50 outline-none text-sm font-mono"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameConversation(conv.id);
                      }}
                      className="p-0.5 hover:text-primary"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(null);
                      }}
                      className="p-0.5 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate font-mono text-xs">
                      {conv.title}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-primary transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(conv.id);
                            setEditTitleValue(conv.title);
                          }}
                        >
                          <Pencil className="w-3 h-3 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* User Footer */}
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
                  <p className="text-xs font-medium truncate text-sidebar-foreground">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/50 truncate">
                    {user?.email || ""}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Top Bar */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSidebarOpen(true)}
              >
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
                  <span className="font-mono text-xs text-foreground/80 truncate max-w-[200px]">
                    {activeConv.title}
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground/50">
              debuga.ai v1.0
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !activeConversationId ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-4">
                  <img
                    src={AVATAR_AGENT}
                    alt="debuga.ai Agent"
                    className="w-20 h-20 rounded-2xl mx-auto shadow-lg shadow-primary/10"
                  />
                  <div>
                    <h2 className="text-xl font-bold font-mono">
                      Olá! Sou o{" "}
                      <span className="terminal-glow text-primary">debuga.ai</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      Seu agente autônomo de TI, Segurança e DevOps. Como posso ajudar?
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
                        <p className="text-sm font-medium font-mono text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.prompt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages
                .filter((m) => m.role !== "system")
                .map((msg, idx) => (
                  <div key={msg.id || idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Avatar */}
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

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-medium text-foreground">
                          {msg.role === "assistant" ? "debuga.ai" : user?.name || "Você"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                          {msg.createdAt.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm prose-invert max-w-none prose-pre:bg-[oklch(0.06_0.005_240)] prose-pre:border prose-pre:border-border prose-code:text-primary prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}
                    </div>
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
              {isStreaming && !streamingContent && (
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="relative"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva seu problema ou tarefa de TI..."
                className="w-full resize-none bg-card border-border rounded-xl pr-14 min-h-[52px] max-h-40 font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
                rows={1}
                disabled={isStreaming}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="absolute right-2 bottom-2 h-9 w-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-30 disabled:shadow-none"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2 font-mono">
              debuga.ai pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
