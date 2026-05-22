import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const retryAfter = data.retryAfter || 60;
        toast.error(data.message || `Aguarde ${retryAfter}s antes de tentar novamente.`);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || data.message || "Erro ao processar solicitação.");
        return;
      }

      setSent(true);
      toast.success(data.message || "Se o e-mail estiver cadastrado, você receberá um código.");
    } catch (err) {
      console.error("[ForgotPassword] fetch error:", err);
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Recuperar Senha</CardTitle>
          <CardDescription>
            {sent
              ? "Verifique seu e-mail para o código de recuperação."
              : "Informe seu e-mail para receber um código de redefinição."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar código de recuperação
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Um código de 6 dígitos foi enviado para{" "}
                <span className="font-medium text-foreground">{email}</span>.
                <br />
                Verifique sua caixa de entrada e spam.
              </p>
              <Link href={`/reset-password?email=${encodeURIComponent(email)}`}>
                <Button className="w-full">
                  Tenho o código — Redefinir senha
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-muted-foreground"
              >
                Tentar outro e-mail
              </Button>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
