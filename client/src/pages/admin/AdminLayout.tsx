import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard,
  Palette,
  Brain,
  BookOpen,
  Cpu,
  ScrollText,
  MessageSquare,
  Users,
  Shield,
  LogOut,
  ChevronLeft,
  Menu,
  GraduationCap,
  Layers,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_ITEMS = [
  { path: "/admin", label: "Visão Geral", icon: LayoutDashboard },
  { path: "/admin/white-label", label: "White Label", icon: Palette },
  { path: "/admin/instructions", label: "Instruções IA", icon: Brain },
  { path: "/admin/knowledge", label: "Base de Conhecimento", icon: BookOpen },
  { path: "/admin/providers", label: "Modelos / Providers", icon: Cpu },
  { path: "/admin/logs", label: "Logs IA", icon: ScrollText },
  { path: "/admin/conversations", label: "Conversas", icon: MessageSquare },
  { path: "/admin/users", label: "Usuários", icon: Users },
  { path: "/admin/learning", label: "Aprendizado", icon: GraduationCap },
  { path: "/admin/capabilities", label: "Capacidades", icon: Layers },
  { path: "/admin/assets", label: "Assets Gerados", icon: ImageIcon },
  { path: "/admin/audit", label: "Auditoria", icon: Shield },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground" />
          <h1 className="text-2xl font-bold">Acesso Restrito</h1>
          <p className="text-muted-foreground">Você não tem permissão para acessar o painel administrativo.</p>
          <Link href="/chat">
            <Button variant="outline">Voltar ao Chat</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-200 border-r border-border bg-card flex flex-col`}
      >
        {/* Header */}
        <div className="h-14 flex items-center px-4 border-b border-border gap-2">
          {sidebarOpen && (
            <span className="font-semibold text-sm truncate flex-1">Painel Admin</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2 space-y-1">
          <Link href="/chat">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <LogOut className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Voltar ao Chat</span>}
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
