import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield } from "lucide-react";

export default function AdminAudit() {
  const { data, isLoading } = trpc.admin.listAuditLogs.useQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro de ações administrativas ({data?.total ?? 0} eventos)
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !data?.logs?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Nenhum evento de auditoria</p>
                    <p className="text-xs text-muted-foreground mt-1">Ações administrativas serão registradas aqui</p>
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.action.includes("delete") ? "destructive" : log.action.includes("create") ? "default" : "secondary"} className="text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.entityType}{log.entityId ? ` #${log.entityId}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">#{log.userId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.ipAddress || "—"}</TableCell>
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
