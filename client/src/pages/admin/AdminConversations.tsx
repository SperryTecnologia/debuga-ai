import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Search } from "lucide-react";
import { useState } from "react";

export default function AdminConversations() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.admin.listConversations.useQuery({ search: search || undefined, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Todas as conversas dos usuários ({data?.total ?? 0} total)
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por título ou usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Mensagens</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead>Última atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !data?.conversations?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhuma conversa encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                data.conversations.map((conv: any) => (
                  <TableRow key={conv.id}>
                    <TableCell className="font-medium text-sm max-w-[200px] truncate">{conv.title || "Sem título"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{conv.userName || `#${conv.userId}`}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{conv.messageCount ?? 0}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(conv.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {conv.updatedAt ? new Date(conv.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
