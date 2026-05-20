import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const [appTitle, setAppTitle] = useState("debuga.ai");
  const [companyName, setCompanyName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  useEffect(() => {
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

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">
          Última atualização: {today}
        </p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Política de Privacidade descreve como o <strong>{appTitle}</strong>
              {companyName && <>, operado por <strong>{companyName}</strong></>},
              coleta, utiliza, armazena e protege seus dados pessoais, em conformidade com a
              Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais legislações aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dados Coletados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Coletamos os seguintes dados pessoais:
            </p>

            <h3 className="text-lg font-medium mt-4 mb-2">2.1 Dados fornecidos por você</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Cadastro:</strong> nome, e-mail, telefone (opcional), senha</li>
              <li><strong>Perfil:</strong> foto, preferências de uso</li>
              <li><strong>Comunicações:</strong> mensagens enviadas ao chat e ao suporte</li>
              <li><strong>Pagamento:</strong> dados processados pelo Stripe (não armazenamos dados de cartão)</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">2.2 Dados coletados automaticamente</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Técnicos:</strong> endereço IP, tipo de navegador, sistema operacional</li>
              <li><strong>Uso:</strong> páginas visitadas, funcionalidades utilizadas, horários de acesso</li>
              <li><strong>Cookies:</strong> cookies de sessão para manter seu login ativo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos seus dados para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Prestar e melhorar nossos serviços de IA conversacional</li>
              <li>Autenticar seu acesso e manter a segurança da conta</li>
              <li>Processar pagamentos e gerenciar assinaturas</li>
              <li>Enviar comunicações sobre o serviço (verificação, alertas de segurança)</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Prevenir fraudes e atividades maliciosas</li>
              <li>Gerar estatísticas anônimas de uso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Base Legal (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              O tratamento dos seus dados é fundamentado nas seguintes bases legais:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Execução de contrato</strong> (Art. 7º, V): para prestar o serviço contratado</li>
              <li><strong>Consentimento</strong> (Art. 7º, I): para comunicações de marketing</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX): para segurança e prevenção de fraudes</li>
              <li><strong>Obrigação legal</strong> (Art. 7º, II): para cumprimento de legislação fiscal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados podem ser compartilhados com:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Processadores de pagamento:</strong> Stripe (para transações financeiras)</li>
              <li><strong>Provedores de IA:</strong> Google (Gemini), OpenAI, ou outros configurados pelo administrador — apenas o conteúdo das mensagens é enviado, sem dados pessoais identificáveis</li>
              <li><strong>Provedores de e-mail:</strong> Brevo/SMTP (para e-mails transacionais)</li>
              <li><strong>Cloudflare:</strong> para proteção contra bots (Turnstile)</li>
              <li><strong>Autoridades:</strong> quando exigido por lei ou ordem judicial</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Armazenamento e Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados em servidores seguros com as seguintes medidas:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Criptografia em trânsito (TLS/HTTPS)</li>
              <li>Senhas armazenadas com hash bcrypt (irreversível)</li>
              <li>Acesso restrito por autenticação e autorização</li>
              <li>Logs de auditoria para rastreabilidade</li>
              <li>Backups regulares com retenção limitada</li>
              <li>Rate limiting para prevenção de ataques</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos seus dados pelo tempo necessário para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Conta ativa:</strong> enquanto sua conta existir</li>
              <li><strong>Histórico de conversas:</strong> enquanto a conta estiver ativa</li>
              <li><strong>Dados financeiros:</strong> 5 anos (obrigação fiscal)</li>
              <li><strong>Logs de segurança:</strong> 6 meses</li>
              <li><strong>Após exclusão da conta:</strong> dados anonimizados em até 30 dias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conforme a LGPD, você tem direito a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Confirmação:</strong> saber se tratamos seus dados</li>
              <li><strong>Acesso:</strong> obter cópia dos seus dados pessoais</li>
              <li><strong>Correção:</strong> atualizar dados incompletos ou incorretos</li>
              <li><strong>Anonimização:</strong> solicitar anonimização de dados desnecessários</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
              <li><strong>Eliminação:</strong> solicitar exclusão dos dados (com exceções legais)</li>
              <li><strong>Revogação:</strong> revogar consentimento a qualquer momento</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento em determinadas situações</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Para exercer seus direitos, entre em contato pelo e-mail
              {supportEmail ? (
                <> <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a></>
              ) : (
                <> indicado na seção de contato</>
              )}.
              Responderemos em até 15 dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies estritamente necessários para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong>Sessão:</strong> manter seu login ativo (cookie httpOnly, seguro)</li>
              <li><strong>Preferências:</strong> tema escuro/claro</li>
              <li><strong>Segurança:</strong> token CSRF e Turnstile</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros
              que identifiquem pessoalmente o usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Transferência Internacional</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns de nossos provedores de serviço (como processadores de IA e pagamento) podem
              estar localizados fora do Brasil. Nesses casos, garantimos que a transferência é
              realizada com salvaguardas adequadas, conforme Art. 33 da LGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Menores de Idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O {appTitle} não é destinado a menores de 18 anos. Não coletamos intencionalmente
              dados de menores. Se tomarmos conhecimento de que dados de um menor foram coletados,
              procederemos com a exclusão imediata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta política pode ser atualizada periodicamente. Alterações significativas serão
              comunicadas por e-mail ou notificação na plataforma. Recomendamos revisar esta
              página periodicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contato e Encarregado (DPO)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para questões sobre privacidade e proteção de dados:
            </p>
            {supportEmail && (
              <p className="text-muted-foreground mt-2">
                E-mail do Encarregado (DPO): <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
              </p>
            )}
            {companyName && (
              <p className="text-muted-foreground mt-1">
                Controlador: {companyName}
              </p>
            )}
            <p className="text-muted-foreground mt-2">
              Caso não obtenha resposta satisfatória, você pode apresentar reclamação à
              Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {companyName || appTitle}. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
