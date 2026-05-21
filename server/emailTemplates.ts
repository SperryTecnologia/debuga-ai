/**
 * Professional email templates for debuga.ai
 * Dark-themed, branded, responsive HTML email templates.
 */

interface EmailTemplateOptions {
  title: string;
  greeting?: string;
  body: string;
  code?: string;
  footer?: string;
  ctaUrl?: string;
  ctaText?: string;
}

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032143822/JiyqPBx8bCsA9W2jSDpwkK/debuga-logo-v2-A2P25ZnkFwTU2RkRjz85nk.webp";

export function buildEmailTemplate(opts: EmailTemplateOptions): string {
  const { title, greeting, body, code, footer, ctaUrl, ctaText } = opts;

  const codeBlock = code ? `
    <div style="background: #18181b; border: 1px solid #22c55e; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0;">
      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #22c55e; font-family: 'JetBrains Mono', 'Fira Code', monospace;">${code}</span>
    </div>` : "";

  const ctaBlock = ctaUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${ctaUrl}" style="display: inline-block; background: #22c55e; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${ctaText || "Verificar"}</a>
    </div>` : "";

  const footerBlock = footer ? `
    <p style="color: #71717a; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
      ${footer}
    </p>` : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #0f0f12; border: 1px solid #27272a; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #052e16 0%, #0f0f12 100%); padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1a3a1a;">
              <img src="${LOGO_URL}" alt="debuga.ai" width="48" height="48" style="border-radius: 12px; margin-bottom: 12px;" />
              <h1 style="color: #22c55e; font-size: 20px; font-weight: 700; margin: 0; font-family: 'JetBrains Mono', monospace;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              ${greeting ? `<p style="color: #fafafa; font-size: 16px; font-weight: 600; margin: 0 0 16px;">${greeting}</p>` : ""}
              ${body}
              ${codeBlock}
              ${ctaBlock}
              ${footerBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #27272a; text-align: center;">
              <p style="color: #52525b; font-size: 11px; margin: 0; line-height: 1.5;">
                debuga.ai — Agente Aut\u00f4nomo de IA para TI<br/>
                Sperry Tecnologia &bull; Este \u00e9 um e-mail autom\u00e1tico, n\u00e3o responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Verification email template
 */
export function buildVerificationEmailHtml(
  code: string,
  appName: string,
  expiryMinutes: number,
  verifyUrl?: string
): string {
  return buildEmailTemplate({
    title: "Verifica\u00e7\u00e3o de E-mail",
    greeting: "Ol\u00e1!",
    body: `<p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Obrigado por se cadastrar no <strong style="color: #22c55e;">${appName}</strong>.<br/>
      Use o c\u00f3digo abaixo para verificar seu e-mail:
    </p>`,
    code,
    footer: `Este c\u00f3digo expira em <strong>${expiryMinutes} minutos</strong>.<br/>Se voc\u00ea n\u00e3o criou uma conta, ignore este e-mail.`,
    ctaUrl: verifyUrl,
    ctaText: "Verificar E-mail",
  });
}

/**
 * Password reset email template
 */
export function buildPasswordResetEmailHtml(
  code: string,
  appName: string,
  expiryMinutes: number
): string {
  return buildEmailTemplate({
    title: "Redefini\u00e7\u00e3o de Senha",
    greeting: "Ol\u00e1!",
    body: `<p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Recebemos uma solicita\u00e7\u00e3o para redefinir sua senha no <strong style="color: #22c55e;">${appName}</strong>.<br/>
      Use o c\u00f3digo abaixo:
    </p>`,
    code,
    footer: `Este c\u00f3digo expira em <strong>${expiryMinutes} minutos</strong>.<br/>Se voc\u00ea n\u00e3o solicitou esta redefini\u00e7\u00e3o, ignore este e-mail. Sua senha permanecer\u00e1 inalterada.`,
  });
}

/**
 * Welcome email template (sent after verification)
 */
export function buildWelcomeEmailHtml(
  userName: string,
  appName: string
): string {
  return buildEmailTemplate({
    title: "Bem-vindo ao debuga.ai!",
    greeting: `Ol\u00e1, ${userName || "usu\u00e1rio"}!`,
    body: `<p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      Seu e-mail foi verificado com sucesso. Sua conta no <strong style="color: #22c55e;">${appName}</strong> est\u00e1 ativa!
    </p>
    <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      Voc\u00ea agora pode usar o agente aut\u00f4nomo de IA para:
    </p>
    <ul style="color: #a1a1aa; font-size: 14px; line-height: 1.8; padding-left: 20px; margin: 0 0 16px;">
      <li>Diagnosticar problemas de infraestrutura</li>
      <li>Verificar DNS, SSL, HTTP e seguran\u00e7a</li>
      <li>Gerar scripts e documenta\u00e7\u00e3o t\u00e9cnica</li>
      <li>Analisar logs, configura\u00e7\u00f5es e prints</li>
    </ul>`,
    ctaUrl: "https://debuga.ai/chat",
    ctaText: "Acessar o Chat",
    footer: "Dica: voc\u00ea come\u00e7a no plano Gratuito com 5 mensagens/dia. Fa\u00e7a upgrade a qualquer momento.",
  });
}
