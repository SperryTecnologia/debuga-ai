import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getGoogleOAuthUrl } from "@/const";
import TurnstileWidget, { isTurnstileEnabled } from "@/components/TurnstileWidget";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const returnPath = new URLSearchParams(search).get("returnPath") || "/chat";
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Frontend validations for register mode
    if (mode === "register") {
      if (!form.name || form.name.trim().length < 2) {
        toast.error("Nome é obrigatório (mínimo 2 caracteres).");
        return;
      }
      if (form.password.length < 8) {
        toast.error("A senha deve ter pelo menos 8 caracteres.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error("As senhas não coincidem.");
        return;
      }
      if (!form.acceptTerms) {
        toast.error("É necessário aceitar os Termos de Uso e Política de Privacidade.");
        return;
      }
      // Turnstile validation (only if widget is enabled and rendered)
      if (isTurnstileEnabled() && !turnstileToken) {
        toast.error("Complete a verificação de segurança (CAPTCHA).");
        return;
      }
    }

    // Turnstile on login (if enabled)
    if (mode === "login" && isTurnstileEnabled() && !turnstileToken) {
      // Only block login if turnstile is configured for login too
      // The backend checks ENV.turnstileOnLogin — we send the token if available
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/local/login" : "/api/auth/local/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password, turnstileToken: turnstileToken || undefined }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
            acceptTerms: form.acceptTerms,
            turnstileToken: turnstileToken || undefined,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao autenticar");
        return;
      }

      // Refresh auth state
      await refresh();
      toast.success(mode === "login" ? "Login realizado!" : "Conta criada com sucesso!");
      navigate(returnPath);
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = getGoogleOAuthUrl(returnPath);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{mode === "login" ? "Entrar" : "Criar Conta"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Acesse sua conta para continuar"
              : "Crie uma conta para começar a usar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Local Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
            {mode === "register" && (
              <>
                <div>
                  <label className="text-sm font-medium">Confirmar Senha</label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
                  )}
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={form.acceptTerms}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, acceptTerms: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                    Li e aceito os{" "}
                    <a
                      href="/termos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </a>{" "}
                    e a{" "}
                    <a
                      href="/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </a>
                  </label>
                </div>
              </>
            )}

            {/* Turnstile CAPTCHA Widget */}
            {(mode === "register" || isTurnstileEnabled()) && (
              <TurnstileWidget
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken("")}
                onError={() => {
                  setTurnstileToken("");
                  toast.error("Erro na verificação de segurança. Recarregue a página.");
                }}
              />
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar com e-mail" : "Criar Conta"}
            </Button>
          </form>

          <Separator />

          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <p>
                Não tem conta?{" "}
                <button onClick={() => setMode("register")} className="text-primary hover:underline font-medium">
                  Criar conta
                </button>
              </p>
            ) : (
              <p>
                Já tem conta?{" "}
                <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                  Entrar
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
