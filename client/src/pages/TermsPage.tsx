import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  const [appTitle, setAppTitle] = useState("debuga.ai");
  const [companyName, setCompanyName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
    // Try to get settings from the API, fallback to env vars
    const title = import.meta.env.VITE_APP_TITLE || "debuga.ai";
    setAppTitle(title);

    fetch("/api/trpc/settings.getPublic")
      .then((r) => r.json())
      .then((data) => {
        if (data?.result?.data) {
          const s = data.result.data;
          if (s.legalCompanyName) setCompanyName(s.legalCompanyName);
          if (s.supportEmail) setSupportEmail(s.supportEmail);
        }
      })
      .catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-4xl py-12 px-4">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">
          Última atualização: {today}
        </p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar a plataforma <strong>{appTitle}</strong>
              {companyName && <>, operada por <strong>{companyName}</strong></>},
              você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos,
              não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O {appTitle} é uma plataforma de inteligência artificial conversacional que oferece
              assistência automatizada por meio de agentes de IA. O serviço pode incluir, mas não se limita a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Chat com agentes de IA para suporte e automação</li>
              <li>Análise de dados e documentos</li>
              <li>Geração de conteúdo assistida por IA</li>
              <li>Integrações com ferramentas de terceiros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar o serviço, você deve criar uma conta fornecendo informações verdadeiras e completas.
              Você é responsável por:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Manter a confidencialidade de suas credenciais de acesso</li>
              <li>Todas as atividades realizadas em sua conta</li>
              <li>Notificar imediatamente sobre qualquer uso não autorizado</li>
              <li>Manter seus dados cadastrais atualizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao utilizar o {appTitle}, você concorda em NÃO:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Utilizar o serviço para fins ilegais ou não autorizados</li>
              <li>Tentar acessar sistemas ou dados sem autorização</li>
              <li>Enviar conteúdo malicioso, ofensivo ou que viole direitos de terceiros</li>
              <li>Realizar engenharia reversa ou tentar extrair o código-fonte</li>
              <li>Usar bots, scrapers ou ferramentas automatizadas sem autorização</li>
              <li>Compartilhar sua conta com terceiros</li>
              <li>Sobrecarregar intencionalmente a infraestrutura do serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo, design, código e funcionalidades do {appTitle} são de propriedade
              {companyName ? ` da ${companyName}` : " do operador da plataforma"} ou de seus licenciadores.
              O conteúdo gerado pela IA em resposta às suas solicitações pode ser utilizado por você,
              mas não garantimos exclusividade ou originalidade das respostas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O {appTitle} é fornecido "como está" (as is). Não garantimos que:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>As respostas da IA sejam sempre precisas, completas ou atualizadas</li>
              <li>O serviço estará disponível de forma ininterrupta</li>
              <li>O serviço atenderá todas as suas necessidades específicas</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Em nenhuma hipótese seremos responsáveis por danos indiretos, incidentais ou consequenciais
              decorrentes do uso do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Planos e Pagamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O {appTitle} pode oferecer planos gratuitos e pagos. Para planos pagos:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Os pagamentos são processados por meio do Stripe</li>
              <li>A cobrança é recorrente conforme o ciclo do plano escolhido</li>
              <li>Você pode cancelar a qualquer momento, com efeito no próximo ciclo</li>
              <li>Não há reembolso proporcional por cancelamento antecipado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Suspensão e Encerramento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de suspender ou encerrar sua conta, sem aviso prévio, caso:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Você viole estes Termos de Uso</li>
              <li>Seu uso represente risco à segurança da plataforma</li>
              <li>Seja detectada atividade fraudulenta</li>
              <li>Haja inadimplência em planos pagos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar estes Termos de Uso periodicamente. Alterações significativas serão
              comunicadas por e-mail ou notificação na plataforma. O uso continuado após as alterações
              constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Legislação Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil.
              Qualquer disputa será submetida ao foro da comarca da sede
              {companyName ? ` da ${companyName}` : " do operador"}, com exclusão de qualquer outro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes Termos de Uso, entre em contato:
            </p>
            {supportEmail && (
              <p className="text-muted-foreground mt-2">
                E-mail: <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
              </p>
            )}
            {companyName && (
              <p className="text-muted-foreground mt-1">
                {companyName}
              </p>
            )}
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {companyName || appTitle}. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
