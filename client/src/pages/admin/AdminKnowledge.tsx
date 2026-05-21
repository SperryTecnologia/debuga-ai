import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen, Search } from "lucide-react";
import { toast } from "sonner";

type KnowledgeForm = {
  title: string;
  content: string;
  category: string;
  tags: string;
  isActive: boolean;
};

const emptyForm: KnowledgeForm = { title: "", content: "", category: "", tags: "", isActive: true };

export default function AdminKnowledge() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KnowledgeForm>(emptyForm);
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: items, isLoading } = trpc.admin.listKnowledge.useQuery({ search: search || undefined });
  const createMutation = trpc.admin.createKnowledgeItem.useMutation({
    onSuccess: () => { utils.admin.listKnowledge.invalidate(); toast.success("Item criado"); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.admin.updateKnowledgeItem.useMutation({
    onSuccess: () => { utils.admin.listKnowledge.invalidate(); toast.success("Item atualizado"); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.deleteKnowledgeItem.useMutation({
    onSuccess: () => { utils.admin.listKnowledge.invalidate(); toast.success("Item removido"); },
    onError: (err) => toast.error(err.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: any) {
    setEditingId(item.id);
    setForm({ title: item.title, content: item.content, category: item.category || "", tags: item.tags || "", isActive: item.isActive ?? true });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) { toast.error("Título e conteúdo são obrigatórios"); return; }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground text-sm mt-1">Informações que a IA usa como referência nas respostas</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Item</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar na base de conhecimento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>)}</div>
      ) : !items?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum item na base de conhecimento</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione informações que a IA deve usar como referência</p>
            <Button onClick={openCreate} className="mt-4" size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar Primeiro Item</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <Card key={item.id} className={!item.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{item.title}</span>
                      {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                      {!item.isActive && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                    {item.tags && <div className="mt-1 flex gap-1 flex-wrap">{item.tags.split(",").map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t.trim()}</Badge>)}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Remover este item?")) deleteMutation.mutate({ id: item.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Título</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Horário de funcionamento" /></div>
            <div><label className="text-sm font-medium">Categoria (opcional)</label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: empresa, produto, suporte" /></div>
            <div><label className="text-sm font-medium">Conteúdo</label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Informação que a IA deve saber..." rows={8} /></div>
            <div><label className="text-sm font-medium">Tags (separadas por vírgula)</label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Ex: horário, contato, endereço" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /><label className="text-sm">Ativo</label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
