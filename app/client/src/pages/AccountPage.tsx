import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Key,
  LogOut,
  Loader2,
  Lock,
  CheckCircle,
  AlertTriangle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function AccountPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const { data: profile, isLoading: profileLoading } = trpc.account.profile.useQuery(undefined, { enabled: !!user });

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPassword: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  // Email verification state
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Phone verification state
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    window.location.href = getLoginUrl("/account");
    return null;
  }

  const authProvider = profile?.authProvider || "google";
  const isLocalAuth = authProvider === "local";
  const emailVerified = profile?.emailVerified ?? (authProvider === "google");
  const phoneVerified = profile?.phoneVerified ?? false;

  async function handleResendVerification() {
    setResendingEmail(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao reenviar código.");
        return;
      }
      toast.success("Código de verificação reenviado! Verifique seu e-mail.");
      setEmailCooldown(120);
      const interval = setInterval(() => {
        setEmailCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setResendingEmail(false);
    }
  }

  async function handleSendPhoneOtp() {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      toast.error("Informe um número de telefone válido.");
      return;
    }
    setSendingPhoneOtp(true);
    try {
      const res = await fetch("/api/auth/send-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao enviar código.");
        return;
      }
      toast.success("Código enviado para seu telefone!");
      setPhoneSent(true);
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSendingPhoneOtp(false);
    }
  }

  async function handleVerifyPhone() {
    if (!phoneCode || phoneCode.length !== 6) {
      toast.error("Informe o código de 6 dígitos.");
      return;
    }
    setVerifyingPhone(true);
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: phoneCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Código inválido.");
        return;
      }
      toast.success("Telefone verificado com sucesso!");
      setShowPhoneForm(false);
      setPhoneCode("");
      await refresh();
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setVerifyingPhone(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/local/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao alterar senha.");
        return;
      }
      toast.success("Senha alterada com sucesso!");
      setShowPasswordForm(false);
      setPasswordForm({ current: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/local/logout", { method: "POST", credentials: "include" });
      await refresh();
      setLocation("/");
      toast.success("Sessão encerrada.");
    } catch (err) {
      toast.error("Erro ao sair.");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/chat")}
              className="gap-2 font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Chat
            </Button>
          </div>
          <h1 className="font-mono font-bold text-lg">Minha Conta</h1>
          <div className="w-28" />
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-20 max-w-4xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          {profileLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Email Verification Warning */}
              {isLocalAuth && !emailVerified && (
                <motion.div variants={fadeInUp} className="mb-6">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-amber-400 mb-1">E-mail não verificado</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Verifique seu e-mail para ter acesso completo ao sistema. Um código foi enviado para{" "}
                          <span className="font-medium text-foreground">{profile?.email || user.email}</span>.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                          disabled={resendingEmail || emailCooldown > 0}
                          className="font-mono text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          {resendingEmail ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-2" />
                          )}
                          {emailCooldown > 0 ? `Reenviar em ${emailCooldown}s` : "Reenviar código"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Profile Info */}
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{profile?.name || user.name || "Usuário"}</h2>
                      <p className="text-sm text-muted-foreground">{profile?.email || user.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Nome</span>
                      </div>
                      <span className="text-sm font-medium">{profile?.name || user.name || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">E-mail</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{profile?.email || user.email || "—"}</span>
                        {emailVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Telefone</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{profile?.phone || "Não informado"}</span>
                        {profile?.phone && (
                          phoneVerified ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-border/30">
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tipo de conta</span>
                      </div>
                      <span className={cn(
                        "text-xs font-mono px-2 py-0.5 rounded-full",
                        user.role === "admin" ? "bg-amber-500/20 text-amber-400" : "bg-muted text-muted-foreground"
                      )}>
                        {user.role === "admin" ? "Admin" : "Usuário"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Autenticação</span>
                      </div>
                      <span className="text-sm font-medium capitalize">
                        {authProvider === "local" ? "E-mail / Senha" : "Google OAuth"}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Phone Verification (if phone not verified) */}
              {isLocalAuth && !phoneVerified && (
                <motion.div variants={fadeInUp} className="mb-8">
                  <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Verificar Telefone</h2>
                      </div>
                      {!showPhoneForm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPhoneForm(true)}
                          className="font-mono text-xs"
                        >
                          Verificar
                        </Button>
                      )}
                    </div>

                    {showPhoneForm ? (
                      <div className="space-y-4">
                        {!phoneSent ? (
                          <>
                            <div>
                              <label className="text-sm font-medium">Número de telefone (com DDD)</label>
                              <Input
                                type="tel"
                                placeholder="+55 (11) 99999-9999"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleSendPhoneOtp} disabled={sendingPhoneOtp} className="font-mono">
                                {sendingPhoneOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Enviar código
                              </Button>
                              <Button variant="ghost" onClick={() => setShowPhoneForm(false)}>
                                Cancelar
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="text-sm font-medium">Código de verificação (6 dígitos)</label>
                              <Input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={phoneCode}
                                onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ""))}
                                className="font-mono text-center text-lg tracking-widest"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleVerifyPhone} disabled={verifyingPhone} className="font-mono">
                                {verifyingPhone ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Verificar
                              </Button>
                              <Button variant="ghost" onClick={() => { setPhoneSent(false); setPhoneCode(""); }}>
                                Reenviar
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Adicione e verifique seu número de telefone para maior segurança.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Change Password (only for local auth) */}
              {isLocalAuth && (
                <motion.div variants={fadeInUp} className="mb-8">
                  <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Alterar Senha</h2>
                      </div>
                      {!showPasswordForm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasswordForm(true)}
                          className="font-mono text-xs"
                        >
                          Alterar
                        </Button>
                      )}
                    </div>

                    {showPasswordForm ? (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Senha atual</label>
                          <Input
                            type="password"
                            value={passwordForm.current}
                            onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Nova senha</label>
                          <Input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            required
                            minLength={8}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Mínimo 8 caracteres, com letra maiúscula, minúscula e número.
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Confirmar nova senha</label>
                          <Input
                            type="password"
                            value={passwordForm.confirm}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={changingPassword} className="font-mono">
                            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordForm({ current: "", newPassword: "", confirm: "" });
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sua senha pode ser alterada a qualquer momento.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Logout */}
              <motion.div variants={fadeInUp}>
                <div className="rounded-2xl border border-border/50 bg-card/30 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LogOut className="w-5 h-5 text-red-400" />
                      <div>
                        <h2 className="text-lg font-bold">Encerrar Sessão</h2>
                        <p className="text-sm text-muted-foreground">Sair da sua conta neste dispositivo</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleLogout}
                      className="font-mono text-red-400 border-red-400/30 hover:bg-red-400/10"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
