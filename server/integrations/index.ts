/**
 * debuga.ai - IT Tool Integrations
 *
 * Stubs preparados para futuras integrações com ferramentas de TI.
 * Cada integração será ativada via variáveis de ambiente quando configurada.
 */

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── Zabbix API ──
export async function zabbixQuery(method: string, params: Record<string, unknown>): Promise<ToolResult> {
  const apiUrl = process.env.ZABBIX_API_URL;
  const apiToken = process.env.ZABBIX_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return { success: false, error: "Zabbix não configurado. Configure ZABBIX_API_URL e ZABBIX_API_TOKEN." };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params: { ...params, output: "extend" },
        auth: apiToken,
        id: 1,
      }),
    });
    const data = await response.json();
    return { success: true, data: data.result };
  } catch (error: any) {
    return { success: false, error: `Zabbix error: ${error.message}` };
  }
}

// ── Wazuh API ──
export async function wazuhQuery(endpoint: string): Promise<ToolResult> {
  const apiUrl = process.env.WAZUH_API_URL;
  const apiUser = process.env.WAZUH_API_USER;
  const apiPass = process.env.WAZUH_API_PASSWORD;

  if (!apiUrl || !apiUser || !apiPass) {
    return { success: false, error: "Wazuh não configurado. Configure WAZUH_API_URL, WAZUH_API_USER e WAZUH_API_PASSWORD." };
  }

  try {
    const authHeader = Buffer.from(`${apiUser}:${apiPass}`).toString("base64");
    const response = await fetch(`${apiUrl}${endpoint}`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: `Wazuh error: ${error.message}` };
  }
}

// ── Prometheus API ──
export async function prometheusQuery(query: string, time?: string): Promise<ToolResult> {
  const apiUrl = process.env.PROMETHEUS_API_URL;

  if (!apiUrl) {
    return { success: false, error: "Prometheus não configurado. Configure PROMETHEUS_API_URL." };
  }

  try {
    const params = new URLSearchParams({ query });
    if (time) params.set("time", time);
    const response = await fetch(`${apiUrl}/api/v1/query?${params}`);
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error: any) {
    return { success: false, error: `Prometheus error: ${error.message}` };
  }
}

// ── NetBox API ──
export async function netboxQuery(endpoint: string): Promise<ToolResult> {
  const apiUrl = process.env.NETBOX_API_URL;
  const apiToken = process.env.NETBOX_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return { success: false, error: "NetBox não configurado. Configure NETBOX_API_URL e NETBOX_API_TOKEN." };
  }

  try {
    const response = await fetch(`${apiUrl}/api${endpoint}`, {
      headers: {
        Authorization: `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: `NetBox error: ${error.message}` };
  }
}

/**
 * Registry of available tools for the AI agent.
 * These will be passed as tool definitions to the LLM for tool-use.
 */
export const IT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "zabbix_get_hosts",
      description: "Consultar hosts monitorados no Zabbix com seus status e problemas ativos",
      parameters: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Filtro por nome do host" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "wazuh_get_alerts",
      description: "Consultar alertas de segurança recentes do Wazuh SIEM",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Número máximo de alertas" },
          level: { type: "number", description: "Nível mínimo de severidade (1-15)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "prometheus_query",
      description: "Executar uma query PromQL para consultar métricas de monitoramento",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Query PromQL" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "netbox_get_devices",
      description: "Consultar dispositivos de rede cadastrados no NetBox (DCIM)",
      parameters: {
        type: "object",
        properties: {
          site: { type: "string", description: "Filtrar por site/localidade" },
        },
      },
    },
  },
];
