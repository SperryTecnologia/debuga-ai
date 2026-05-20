import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "comportamento", label: "Comportamento" },
  { value: "atendimento", label: "Atendimento" },
  { value: "suporte_tecnico", label: "Suporte Técnico" },
  { value: "vendas", label: "Vendas" },
  { value: "restricoes", label: "Restrições" },
  { value: "encaminhamento_humano", label: "Encaminhamento Humano" },
  { value: "seguranca", label: "Segurança" },
  { value: "cliente_especifico", label: "Cliente Específico" },
];

type InstructionForm = {
  title: string;
  content: string;
  category: string;
  priority: number;
  isActive: boolean;
};

const emptyForm: InstructionForm = {
  title: "",
  content: "",
  category: "comportamento",
  priority: 50,
  isActive: true,
};

export default function AdminInstructions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<InstructionForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: instructions, isLoading } = trpc.admin.listInstructions.useQuery({});
  const createMutation = trpc.admin.createInstruction.useMutation({
    onSuccess: () => { utils.admin.listInstructions.invalidate(); toast.success("Instrução criada"); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.admin.updateInstruction.useMutation({
    onSuccess: () => { utils.admin.listInstructions.invalidate(); toast.success("Instrução atualizada"); setDialogOpen(false); },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.admin.deleteInstruction.useMutation({
    onSuccess: () => { utils.admin.listInstructions.invalidate(); toast.success("Instrução removida"); },
    onError: (err) => toast.error(err.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(instr: any) {
    setEditingId(instr.id);
    setForm({
      title: instr.title,
      content: instr.content,
      category: instr.category,
      priority: instr.priority ?? 50,
      isActive: instr.isActive ?? true,
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form, category: form.category as any });
    } else {
      createMutation.mutate({ ...form, category: form.category as any });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instruções IA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure o comportamento e personalidade do agente
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Instrução
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : !instructions?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma instrução cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">Crie instruções para personalizar o comportamento da IA</p>
            <Button onClick={openCreate} className="mt-4" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Criar Primeira Instrução
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {instructions.map((instr: any) => (
            <Card key={instr.id} className={!instr.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{instr.title}</span>
                      <Badge variant="outline" className="text-xs">{instr.category}</Badge>
                      {!instr.isActive && <Badge variant="secondary" className="text-xs">Inativa</Badge>}
                      <Badge variant="secondary" className="text-xs">P{instr.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{instr.content}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(instr)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                      if (confirm("Remover esta instrução?")) deleteMutation.mutate({ id: instr.id });
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Instrução" : "Nova Instrução"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Regras de atendimento" />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Conteúdo</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Escreva a instrução que a IA deve seguir..."
                rows={8}
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Prioridade</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <label className="text-sm">Ativa</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
