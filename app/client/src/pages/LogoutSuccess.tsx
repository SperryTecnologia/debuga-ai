import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { LogIn, ArrowLeft, ShieldCheck } from "lucide-react";

const LOGO_ICON =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga-logo-v2-A2P25ZnkFwTU2RkRjz85nk.webp";

export default function LogoutSuccess() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 max-w-md text-center px-6">
        {/* Logo */}
        <img
          src={LOGO_ICON}
          alt="debuga.ai"
          className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20"
        />

        {/* Success indicator */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-mono text-primary">
            Sessão encerrada
          </span>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold font-mono text-foreground">
            Você saiu da sua conta com segurança.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para continuar usando o debuga.ai, entre novamente.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono shadow-lg shadow-primary/20"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrar novamente
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="w-full font-mono text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o site
          </Button>
        </div>

        {/* Footer */}
        <p className="text-[10px] font-mono text-muted-foreground/40">
          Powered by Sperry Tecnologia
        </p>
      </div>
    </div>
  );
}
