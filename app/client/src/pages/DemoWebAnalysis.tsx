/**
 * Demo Web Analysis Page
 * Static page designed to be analyzed by the "Navegar em Site" card.
 * No auth, no JS-heavy logic, no external dependencies.
 * Purely for demonstration of the web_fetch tool capabilities.
 */
export default function DemoWebAnalysis() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Página de demonstração do debuga.ai para análise web automatizada. Contém seções sobre infraestrutura, segurança, DNS, SSL, monitoramento e DevOps."
        />
        <meta name="author" content="debuga.ai - Sperry Tecnologia" />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="debuga.ai Web Analysis Demo" />
        <meta
          property="og:description"
          content="Demonstração de análise web automatizada com agente autônomo de IA para TI e Segurança."
        />
        <meta property="og:type" content="website" />
      </head>
      <body
        style={{
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          backgroundColor: "#0a0a0a",
          color: "#e0e0e0",
          maxWidth: "960px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          lineHeight: 1.7,
        }}
      >
        <header style={{ borderBottom: "1px solid #1a3a1a", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
          <h1 style={{ color: "#22c55e", fontSize: "1.75rem", marginBottom: "0.5rem" }}>
            debuga.ai Web Analysis Demo
          </h1>
          <p style={{ color: "#888", fontSize: "0.9rem" }}>
            Página de demonstração para análise web automatizada por agente autônomo de IA.
          </p>
        </header>

        <main>
          <section id="infraestrutura" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              Infraestrutura
            </h2>
            <p>
              A infraestrutura do debuga.ai utiliza arquitetura distribuída com balanceamento de carga,
              CDN global para entrega de conteúdo estático e servidores de aplicação com auto-scaling.
              O backend é baseado em Node.js com Express e tRPC para comunicação tipada entre cliente e servidor.
            </p>
            <p>
              O banco de dados principal utiliza TiDB (MySQL-compatible) com replicação automática
              e backups incrementais a cada 6 horas. O armazenamento de objetos é feito via S3-compatible storage.
            </p>
          </section>

          <section id="seguranca" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              Segurança
            </h2>
            <p>
              Todas as comunicações são protegidas por TLS 1.3 com certificados gerenciados automaticamente.
              Headers de segurança incluem Content-Security-Policy, X-Frame-Options (DENY),
              Strict-Transport-Security (HSTS) com max-age de 31536000 segundos e includeSubDomains.
            </p>
            <p>
              A autenticação é baseada em OAuth 2.0 com tokens JWT assinados com RS256.
              Sessões expiram após 24 horas de inatividade. Rate limiting é aplicado em todas as rotas da API.
            </p>
          </section>

          <section id="dns" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              DNS
            </h2>
            <p>
              A configuração DNS do debuga.ai inclui registros A apontando para o CDN global,
              registros MX configurados para recebimento de e-mail corporativo,
              registros TXT com SPF, DKIM e DMARC para proteção contra spoofing,
              e registros NS delegados para nameservers com anycast global.
            </p>
            <p>
              O TTL padrão é de 300 segundos para registros A e 3600 segundos para registros MX e TXT,
              permitindo propagação rápida em caso de failover.
            </p>
          </section>

          <section id="ssl" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              SSL/TLS
            </h2>
            <p>
              Certificados SSL são emitidos automaticamente via Let's Encrypt com renovação a cada 60 dias.
              O protocolo mínimo suportado é TLS 1.2, com preferência para TLS 1.3.
              Cipher suites configuradas seguem as recomendações da Mozilla (Modern compatibility).
            </p>
            <p>
              OCSP Stapling está habilitado para reduzir latência na validação de certificados.
              Certificate Transparency (CT) logs são monitorados para detecção de certificados não autorizados.
            </p>
          </section>

          <section id="monitoramento" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              Monitoramento
            </h2>
            <p>
              O monitoramento é feito com Prometheus para métricas de infraestrutura e Grafana para dashboards.
              Alertas são configurados para latência acima de 500ms (P95), taxa de erro acima de 1%,
              uso de CPU acima de 80% e uso de memória acima de 85%.
            </p>
            <p>
              Logs estruturados em JSON são centralizados e indexados para busca em tempo real.
              Health checks são executados a cada 30 segundos em todos os serviços.
            </p>
          </section>

          <section id="devops" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              DevOps
            </h2>
            <p>
              O pipeline CI/CD inclui build, lint, testes unitários, testes de integração e deploy automatizado.
              Deployments são feitos com zero-downtime usando rolling updates.
              Rollback automático é acionado se o health check falhar após deploy.
            </p>
            <p>
              Ambientes de staging e produção são isolados com variáveis de ambiente separadas.
              Feature flags permitem ativação gradual de funcionalidades sem novo deploy.
            </p>
          </section>

          <section id="especificacoes" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              Especificações Técnicas
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
                marginTop: "1rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #22c55e" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#22c55e" }}>Componente</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#22c55e" }}>Tecnologia</th>
                  <th style={{ textAlign: "left", padding: "0.5rem", color: "#22c55e" }}>Versão</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>Runtime</td>
                  <td style={{ padding: "0.5rem" }}>Node.js</td>
                  <td style={{ padding: "0.5rem" }}>22.x LTS</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>Framework</td>
                  <td style={{ padding: "0.5rem" }}>Express + tRPC</td>
                  <td style={{ padding: "0.5rem" }}>4.x / 11.x</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>Frontend</td>
                  <td style={{ padding: "0.5rem" }}>React + Tailwind CSS</td>
                  <td style={{ padding: "0.5rem" }}>19.x / 4.x</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>Banco de Dados</td>
                  <td style={{ padding: "0.5rem" }}>TiDB (MySQL)</td>
                  <td style={{ padding: "0.5rem" }}>8.x</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>LLM Engine</td>
                  <td style={{ padding: "0.5rem" }}>OpenAI-compatible API</td>
                  <td style={{ padding: "0.5rem" }}>GPT-4 class</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>Monitoramento</td>
                  <td style={{ padding: "0.5rem" }}>Prometheus + Grafana</td>
                  <td style={{ padding: "0.5rem" }}>2.x / 10.x</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1a3a1a" }}>
                  <td style={{ padding: "0.5rem" }}>SSL/TLS</td>
                  <td style={{ padding: "0.5rem" }}>Let's Encrypt</td>
                  <td style={{ padding: "0.5rem" }}>ACME v2</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section id="links" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ color: "#22c55e", fontSize: "1.3rem", borderBottom: "1px solid #1a3a1a", paddingBottom: "0.5rem" }}>
              Links Relacionados
            </h2>
            <nav>
              <ul style={{ listStyle: "none", padding: 0 }}>
                <li style={{ marginBottom: "0.5rem" }}>
                  <a href="https://debuga.ai" style={{ color: "#22c55e" }}>
                    debuga.ai — Página Principal
                  </a>
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <a href="https://debuga.ai/chat" style={{ color: "#22c55e" }}>
                    debuga.ai/chat — Agente Autônomo
                  </a>
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <a href="https://github.com/SperryTecnologia" style={{ color: "#22c55e" }}>
                    GitHub — Sperry Tecnologia
                  </a>
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <a href="https://debuga.ai/demo/web-analysis" style={{ color: "#22c55e" }}>
                    Esta página (self-reference)
                  </a>
                </li>
              </ul>
            </nav>
          </section>
        </main>

        <footer
          style={{
            borderTop: "1px solid #1a3a1a",
            paddingTop: "1.5rem",
            marginTop: "2rem",
            color: "#666",
            fontSize: "0.8rem",
            textAlign: "center",
          }}
        >
          <p>
            debuga.ai — Agente Autônomo de IA para TI e Segurança
          </p>
          <p>
            Powered by Sperry Tecnologia &copy; 2025. Todos os dados nesta página são fictícios e destinados exclusivamente à demonstração.
          </p>
        </footer>
      </body>
    </html>
  );
}
