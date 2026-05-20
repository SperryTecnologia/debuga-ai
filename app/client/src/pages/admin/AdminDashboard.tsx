import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, MessagesSquare, Cpu, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  const statCards = [
    { label: "Total de Usuários", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Conversas", value: stats?.totalConversations ?? 0, icon: MessageSquare, color: "text-green-500" },
    { label: "Mensagens", value: stats?.totalMessages ?? 0, icon: MessagesSquare, color: "text-purple-500" },
    { label: "Chamadas LLM", value: stats?.totalProviderCalls ?? 0, icon: Cpu, color: "text-orange-500" },
    { label: "Usuários Ativos (7d)", value: stats?.activeUsers7d ?? 0, icon: Activity, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumo da plataforma debuga.ai
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{card.value.toLocaleString("pt-BR")}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Início Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Configure a <strong>identidade visual</strong> em White Label</p>
            <p>2. Adicione <strong>instruções</strong> para personalizar o comportamento da IA</p>
            <p>3. Cadastre itens na <strong>Base de Conhecimento</strong> para respostas contextuais</p>
            <p>4. Monitore os <strong>Logs IA</strong> para acompanhar uso e custos</p>
            <p>5. Gerencie <strong>Usuários</strong> e controle acessos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Servidor</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Banco de Dados</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Conectado
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provider LLM</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Ativo
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
