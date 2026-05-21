import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading, refresh } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendInFlight = useRef(false); // Anti-double-click guard

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  // Redirect if already verified
  useEffect(() => {
    if (user && user.emailVerified) {
      navigate("/chat");
    }
    if (user && user.authProvider === "google") {
      navigate("/chat");
    }
  }, [user, navigate]);

  // Cooldown countdown timer
  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    // Clear any existing interval
    if (cooldownInterval.current) {
      clearInterval(cooldownInterval.current);
    }
    cooldownInterval.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current);
    };
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error("Digite o código de 6 dígitos.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }
      if (!res.ok) {
        toast.error(data.message || data.error || "Código inválido ou expirado.");
        return;
      }
      setVerified(true);
      toast.success("E-mail verificado com sucesso!");
      await refresh();
      setTimeout(() => navigate("/chat"), 1500);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    // Anti-double-click: if already in flight, ignore
    if (resendInFlight.current || resending || cooldown > 0) return;
    resendInFlight.current = true;
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();

      if (res.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }

      if (res.status === 429) {
        // Rate limited — respect retryAfter from server
        const retryAfter = data.retryAfter || 60;
        const message = data.message || "Aguarde alguns segundos antes de solicitar um novo código.";
        toast.error(message);
        startCooldown(retryAfter);
        return;
      }

      if (!res.ok) {
        toast.error(data.message || data.error || "Não foi possível reenviar. Tente novamente.");
        return;
      }

      toast.success("Código reenviado! Verifique seu e-mail.");
      startCooldown(60); // 60 seconds cooldown after successful send
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setResending(false);
      resendInFlight.current = false;
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">E-mail verificado com sucesso!</h2>
            <p className="text-muted-foreground">
              Sua conta está pronta. Você será redirecionado ao chat em instantes...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um código de 6 dígitos para{" "}
            <span className="font-medium text-foreground">{user?.email || "seu e-mail"}</span>.
            <br />
            Verifique sua caixa de entrada e spam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Código de verificação</label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-[0.3em] font-mono"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={verifying || code.length !== 6}
            >
              {verifying ? "Verificando..." : "Confirmar código"}
            </Button>
          </form>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${resending ? "animate-spin" : ""}`} />
              {cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : resending
                  ? "Enviando..."
                  : "Reenviar código"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/account")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Minha conta
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            O código expira em 30 minutos. Se não recebeu, verifique a pasta de spam
            ou clique em &quot;Reenviar código&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
