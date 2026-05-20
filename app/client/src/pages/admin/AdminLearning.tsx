import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";

export default function AdminLearning() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | undefined>("pending");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOrigin, setNewOrigin] = useState<"manual" | "documentation" | "import">("manual");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.admin.listLearningSuggestions.useQuery({ status: statusFilter, limit: 100 });
  
  const approveMutation = trpc.admin.approveLearningSuggestion.useMutation({
    onSuccess: () => { toast.success("Sugestão aprovada e adicionada à base de conhecimento"); utils.admin.listLearningSuggestions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  
  const rejectMutation = trpc.admin.rejectLearningSuggestion.useMutation({
    onSuccess: () => { toast.success("Sugestão rejeitada"); utils.admin.listLearningSuggestions.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = trpc.admin.createLearningSuggestion.useMutation({
    onSuccess: () => {
      toast.success("Sugestão criada com sucesso");
      utils.admin.listLearningSuggestions.invalidate();
      setShowCreateForm(false);
      setNewTitle("");
      setNewContent("");
      setNewCategory("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }
    createMutation.mutate({
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory.trim() || undefined,
      origin: newOrigin,
    });
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const originLabels: Record<string, string> = {
    chat: "Chat",
    log: "Log",
    manual: "Manual",
    import: "Importação",
    documentation: "Documentação",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aprendizado</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sugestões de conhecimento para revisão e aprovação. Itens aprovados são adicionados automaticamente à Base de Conhecimento.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
        >
          + Nova Sugestão
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Criar Sugestão Manual</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ex: Como resetar senha do cliente"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: suporte_tecnico"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origem</label>
                <select
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="manual">Manual</option>
                  <option value="documentation">Documentação</option>
                  <option value="import">Importação</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conteúdo *</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Descreva o conhecimento que a IA deve aprender..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
            >
              {createMutation.isPending ? "Criando..." : "Criar Sugestão"}
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {([
          { value: "pending", label: "Pendentes" },
          { value: "approved", label: "Aprovadas" },
          { value: "rejected", label: "Rejeitadas" },
          { value: undefined, label: "Todas" },
        ] as const).map((tab) => (
          <button
            key={tab.label}
            onClick={() => setStatusFilter(tab.value as any)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              statusFilter === tab.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
            {data?.total !== undefined && tab.value === statusFilter && (
              <span className="ml-1.5 text-xs text-gray-500">({data.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Carregando...</div>
      ) : !data?.items?.length ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {statusFilter === "pending"
              ? "Nenhuma sugestão pendente de revisão"
              : statusFilter === "approved"
              ? "Nenhuma sugestão aprovada ainda"
              : statusFilter === "rejected"
              ? "Nenhuma sugestão rejeitada"
              : "Nenhuma sugestão encontrada"}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Sugestões são geradas automaticamente durante conversas ou podem ser criadas manualmente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item: any) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColors[item.status as keyof typeof statusColors]}`}>
                      {item.status === "pending" ? "Pendente" : item.status === "approved" ? "Aprovada" : "Rejeitada"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{item.content}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {item.origin && <span>Origem: {originLabels[item.origin] || item.origin}</span>}
                    {item.category && <span>Categoria: {item.category}</span>}
                    {item.provider && <span>Provider: {item.provider}</span>}
                    <span>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                {item.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveMutation.mutate({ id: item.id })}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                      title="Aprovar e adicionar à Base de Conhecimento"
                    >
                      ✓ Aprovar
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate({ id: item.id })}
                      disabled={rejectMutation.isPending}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                      title="Rejeitar sugestão"
                    >
                      ✗ Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
