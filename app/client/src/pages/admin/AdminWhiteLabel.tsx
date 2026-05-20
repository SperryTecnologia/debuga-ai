import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Building2, Palette, Shield, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type WhiteLabelSettings = {
  // Identidade
  app_name: string;
  app_description: string;
  // Legal
  legal_company_name: string;
  legal_cnpj: string;
  // Suporte
  support_email: string;
  support_whatsapp: string;
  // Visual
  primary_color: string;
  logo_url: string;
  favicon_url: string;
  footer_text: string;
  custom_css: string;
  // Legal URLs
  terms_url: string;
  privacy_url: string;
};

const defaults: WhiteLabelSettings = {
  app_name: "debuga.ai",
  app_description: "Agente Autônomo de IA para Análise de Segurança",
  legal_company_name: "",
  legal_cnpj: "",
  support_email: "",
  support_whatsapp: "",
  primary_color: "#10b981",
  logo_url: "",
  favicon_url: "",
  footer_text: "",
  custom_css: "",
  terms_url: "/termos",
  privacy_url: "/privacidade",
};

export default function AdminWhiteLabel() {
  const [form, setForm] = useState<WhiteLabelSettings>(defaults);
  const [dirty, setDirty] = useState(false);

  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery({ group: "white_label" });
  const saveMutation = trpc.admin.saveSettings.useMutation({
    onSuccess: () => { toast.success("Configurações salvas com sucesso"); setDirty(false); },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (settings && settings.length > 0) {
      const loaded: any = { ...defaults };
      for (const s of settings) {
        if (s.key in loaded) loaded[s.key] = s.value;
      }
      setForm(loaded);
    }
  }, [settings]);

  function handleChange(key: keyof WhiteLabelSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const entries = Object.entries(form).map(([key, value]) => ({
      key,
      value,
      group: "white_label",
    }));
    saveMutation.mutate({ settings: entries });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">White Label</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personalize a identidade visual e informações legais da plataforma
          </p>
        </div>
        <Button onClick={handleSave} disabled={!dirty || saveMutation.isPending} size="sm">
          <Save className="h-4 w-4 mr-1" /> Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Identidade
            </CardTitle>
            <CardDescription>Nome e descrição da aplicação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Aplicação</label>
              <Input
                value={form.app_name}
                onChange={(e) => handleChange("app_name", e.target.value)}
                placeholder="debuga.ai"
              />
              <p className="text-xs text-muted-foreground mt-1">Exibido no título do navegador e interface</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={form.app_description}
                onChange={(e) => handleChange("app_description", e.target.value)}
                placeholder="Descrição curta da plataforma"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Texto do Rodapé</label>
              <Input
                value={form.footer_text}
                onChange={(e) => handleChange("footer_text", e.target.value)}
                placeholder="© 2025 Empresa. Todos os direitos reservados."
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados Legais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Dados Legais
            </CardTitle>
            <CardDescription>Informações da empresa para compliance (LGPD)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Razão Social</label>
              <Input
                value={form.legal_company_name}
                onChange={(e) => handleChange("legal_company_name", e.target.value)}
                placeholder="Empresa Ltda."
              />
              <p className="text-xs text-muted-foreground mt-1">Exibido nos Termos de Uso e Política de Privacidade</p>
            </div>
            <div>
              <label className="text-sm font-medium">CNPJ</label>
              <Input
                value={form.legal_cnpj}
                onChange={(e) => handleChange("legal_cnpj", e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL dos Termos de Uso</label>
              <Input
                value={form.terms_url}
                onChange={(e) => handleChange("terms_url", e.target.value)}
                placeholder="/termos"
              />
              <p className="text-xs text-muted-foreground mt-1">Página interna (/termos) ou URL externa</p>
            </div>
            <div>
              <label className="text-sm font-medium">URL da Política de Privacidade</label>
              <Input
                value={form.privacy_url}
                onChange={(e) => handleChange("privacy_url", e.target.value)}
                placeholder="/privacidade"
              />
            </div>
          </CardContent>
        </Card>

        {/* Suporte */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Suporte
            </CardTitle>
            <CardDescription>Canais de contato com o cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-mail de Suporte</label>
              <Input
                type="email"
                value={form.support_email}
                onChange={(e) => handleChange("support_email", e.target.value)}
                placeholder="suporte@empresa.com"
              />
              <p className="text-xs text-muted-foreground mt-1">Usado nas páginas legais e como DPO (LGPD)</p>
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp de Suporte</label>
              <Input
                value={form.support_whatsapp}
                onChange={(e) => handleChange("support_whatsapp", e.target.value)}
                placeholder="+5511999999999"
              />
              <p className="text-xs text-muted-foreground mt-1">Com código do país. Exibido no botão flutuante</p>
            </div>
          </CardContent>
        </Card>

        {/* Visual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Visual
            </CardTitle>
            <CardDescription>Cores, logo e favicon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cor Primária</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => handleChange("primary_color", e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => handleChange("primary_color", e.target.value)}
                  className="flex-1"
                  placeholder="#10b981"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">URL do Logo</label>
              <Input
                value={form.logo_url}
                onChange={(e) => handleChange("logo_url", e.target.value)}
                placeholder="https://..."
              />
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo preview" className="mt-2 h-10 object-contain" />
              )}
            </div>
            <div>
              <label className="text-sm font-medium">URL do Favicon</label>
              <Input
                value={form.favicon_url}
                onChange={(e) => handleChange("favicon_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* CSS Customizado */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> CSS Customizado
            </CardTitle>
            <CardDescription>CSS adicional injetado na aplicação (avançado)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.custom_css}
              onChange={(e) => handleChange("custom_css", e.target.value)}
              placeholder={`:root {\n  --primary: 160 84% 39%;\n}`}
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use com cuidado. CSS inválido pode quebrar a interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
