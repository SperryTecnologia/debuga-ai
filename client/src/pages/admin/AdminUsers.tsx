import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Shield, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" as "admin" | "user" });

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.listUsers.useQuery({ search: search || undefined, limit: 100 });
  const createMutation = trpc.admin.createUser.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Usuário criado"); setCreateOpen(false); setNewUser({ name: "", email: "", password: "", role: "user" }); },
    onError: (err) => toast.error(err.message),
  });
  const roleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Papel atualizado"); },
    onError: (err) => toast.error(err.message),
  });
  const activeMutation = trpc.admin.updateUserActive.useMutation({
    onSuccess: () => { utils.admin.listUsers.invalidate(); toast.success("Status atualizado"); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.total ?? 0} usuário(s) cadastrado(s)
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Usuário</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !data?.users?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : (
                data.users.map((u: any) => (
                  <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {u.role === "admin" ? "Admin" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "outline" : "destructive"} className="text-xs">
                        {u.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.authProvider || "oauth"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={u.role === "admin" ? "Rebaixar para usuário" : "Promover a admin"}
                          onClick={() => {
                            if (confirm(`${u.role === "admin" ? "Rebaixar" : "Promover"} ${u.name || u.email}?`)) {
                              roleMutation.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" });
                            }
                          }}
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={u.isActive ? "Desativar" : "Ativar"}
                          onClick={() => {
                            if (confirm(`${u.isActive ? "Desativar" : "Ativar"} ${u.name || u.email}?`)) {
                              activeMutation.mutate({ userId: u.id, isActive: !u.isActive });
                            }
                          }}
                        >
                          {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Nome</label><Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nome completo" /></div>
            <div><label className="text-sm font-medium">E-mail</label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@exemplo.com" /></div>
            <div><label className="text-sm font-medium">Senha (mín. 8 caracteres)</label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" /></div>
            <div>
              <label className="text-sm font-medium">Papel</label>
              <Select value={newUser.role} onValueChange={(v: "admin" | "user") => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(newUser)} disabled={createMutation.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
