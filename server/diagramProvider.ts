/**
 * Diagram Generation Provider for debuga.ai
 *
 * Generates professional diagrams using Mermaid syntax.
 * The LLM generates the Mermaid code, and this module handles:
 *   - Validation of Mermaid syntax
 *   - Rendering to SVG/PNG via mermaid-js
 *   - Export to draw.io XML (optional)
 *   - Asset storage and metadata
 *
 * Supported diagram types:
 *   - network_diagram: Network topology (switches, routers, VLANs, firewalls)
 *   - architecture_diagram: Software/cloud architecture (microservices, AWS, K8s)
 *   - flowchart_diagram: Process flows, sequence diagrams, state machines
 *
 * The LLM is prompted to generate Mermaid code. This module:
 *   1. Extracts Mermaid code from LLM response
 *   2. Validates syntax
 *   3. Returns structured response with code + render URL
 */

import { type TaskType } from "./intentClassifier";
import { storagePut, isStorageConfigured, getPublicUrl } from "./storage";
import crypto from "crypto";
import { deflate } from "zlib";
import { promisify } from "util";

const deflateAsync = promisify(deflate);

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type DiagramType = "network_diagram" | "architecture_diagram" | "flowchart_diagram";

export type DiagramResult = {
  mermaidCode: string;
  diagramType: DiagramType;
  title: string;
  renderUrl?: string; // SVG/PNG URL if rendered
  drawioXml?: string; // draw.io XML export
  metadata: {
    nodeCount: number;
    edgeCount: number;
    subgraphCount: number;
    diagramKind: string; // graph, flowchart, sequenceDiagram, etc.
  };
};

export type DiagramError = {
  error: string;
  code: string;
  syntaxErrors?: string[];
};

// ══════════════════════════════════════════════════════════════
// Mermaid Code Extraction
// ══════════════════════════════════════════════════════════════

/**
 * Extract Mermaid code blocks from LLM response text.
 */
export function extractMermaidCode(text: string): string | null {
  // Try to find ```mermaid ... ``` block
  const mermaidBlockRegex = /```mermaid\s*\n([\s\S]*?)```/;
  const match = text.match(mermaidBlockRegex);
  if (match) return match[1].trim();

  // Try to find standalone mermaid-like content (starts with graph, flowchart, sequenceDiagram, etc.)
  const mermaidStartRegex = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|mindmap|timeline|sankey|xychart|block)/m;
  const startMatch = text.match(mermaidStartRegex);
  if (startMatch) {
    // Extract from the keyword to the end of the code-like section
    const startIndex = text.indexOf(startMatch[0]);
    const remaining = text.slice(startIndex);
    // Find end: next ``` or double newline followed by non-diagram text
    const endMatch = remaining.match(/\n\n(?![A-Z]|[\s|]|subgraph|end|style|class|linkStyle)/);
    if (endMatch) {
      return remaining.slice(0, endMatch.index).trim();
    }
    return remaining.trim();
  }

  return null;
}

// ══════════════════════════════════════════════════════════════
// Mermaid Validation
// ══════════════════════════════════════════════════════════════

/**
 * Basic validation of Mermaid syntax.
 * Checks for common issues without full parsing.
 */
export function validateMermaidSyntax(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push("Código Mermaid vazio");
    return { valid: false, errors };
  }

  // Check for valid diagram type declaration
  const validStarts = [
    "graph", "flowchart", "sequenceDiagram", "classDiagram",
    "stateDiagram", "erDiagram", "gantt", "pie", "gitGraph",
    "mindmap", "timeline", "sankey", "xychart", "block",
  ];

  const firstLine = code.trim().split("\n")[0].trim();
  const hasValidStart = validStarts.some(s => firstLine.startsWith(s));
  if (!hasValidStart) {
    errors.push(`Diagrama deve começar com um tipo válido (${validStarts.slice(0, 5).join(", ")}...)`);
  }

  // Check for unbalanced subgraphs
  const subgraphCount = (code.match(/\bsubgraph\b/g) || []).length;
  const endCount = (code.match(/^\s*end\s*$/gm) || []).length;
  if (subgraphCount > endCount) {
    errors.push(`${subgraphCount - endCount} subgraph(s) sem 'end' correspondente`);
  }

  // Check for empty node definitions
  if (/\[\s*\]/.test(code)) {
    errors.push("Nó com label vazio detectado");
  }

  return { valid: errors.length === 0, errors };
}

// ══════════════════════════════════════════════════════════════
// Metadata Extraction
// ══════════════════════════════════════════════════════════════

/**
 * Extract metadata from Mermaid code for analytics.
 */
export function extractDiagramMetadata(code: string): DiagramResult["metadata"] {
  // Detect diagram kind
  const firstLine = code.trim().split("\n")[0].trim();
  let diagramKind = "unknown";
  if (firstLine.startsWith("graph") || firstLine.startsWith("flowchart")) diagramKind = "flowchart";
  else if (firstLine.startsWith("sequenceDiagram")) diagramKind = "sequence";
  else if (firstLine.startsWith("classDiagram")) diagramKind = "class";
  else if (firstLine.startsWith("stateDiagram")) diagramKind = "state";
  else if (firstLine.startsWith("erDiagram")) diagramKind = "er";
  else if (firstLine.startsWith("gantt")) diagramKind = "gantt";
  else if (firstLine.startsWith("pie")) diagramKind = "pie";
  else if (firstLine.startsWith("mindmap")) diagramKind = "mindmap";

  // Count nodes (rough heuristic)
  const nodePatterns = /\b[A-Za-z_][\w]*\s*[\[\({]/g;
  const nodes = code.match(nodePatterns) || [];

  // Count edges
  const edgePatterns = /-->|---|-\.-|==>|-.->|-->/g;
  const edges = code.match(edgePatterns) || [];

  // Count subgraphs
  const subgraphs = (code.match(/\bsubgraph\b/g) || []).length;

  return {
    nodeCount: new Set(nodes.map(n => n.replace(/[\[\({]/, "").trim())).size,
    edgeCount: edges.length,
    subgraphCount: subgraphs,
    diagramKind,
  };
}

// ══════════════════════════════════════════════════════════════
// Draw.io XML Export
// ══════════════════════════════════════════════════════════════

/**
 * Convert Mermaid code to a basic draw.io XML representation.
 * This is a simplified conversion — complex diagrams may need manual adjustment.
 */
export function convertToDrawioXml(mermaidCode: string, title: string): string {
  // Generate a basic draw.io XML wrapper with the mermaid code as a note
  // Full conversion would require a proper parser; this provides a starting point
  const escapedCode = mermaidCode
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="debuga.ai" type="device">
  <diagram id="diagram-1" name="${title}">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="note-1" value="${escapedCode}" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;size=15;fontSize=10;align=left;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="600" height="400" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

// ══════════════════════════════════════════════════════════════
// Prompt Templates for Diagram Generation
// ══════════════════════════════════════════════════════════════

/**
 * Get the system prompt enhancement for diagram generation.
 * This instructs the LLM to generate proper Mermaid code.
 */
export function getDiagramSystemPrompt(diagramType: DiagramType): string {
  const prompts: Record<DiagramType, string> = {
    network_diagram: `Você é um especialista em diagramas de rede e infraestrutura. Gere diagramas usando o formato diagram-spec JSON.

REGRAS OBRIGATÓRIAS:
1. SEMPRE use o bloco \`\`\`diagram-spec para diagramas de rede/infraestrutura
2. O JSON deve seguir o schema DiagramSpec com type, title, zones[], nodes[] e edges[]
3. Cada node deve ter: id, label, type (um dos tipos abaixo), zone (referência ao id da zona), e opcionalmente ip, vlan, port, details
4. Cada edge deve ter: from, to, label (protocolo/porta/velocidade), e opcionalmente style ("solid"|"dashed"|"animated")
5. Use zones para segmentar zonas de segurança (WAN, DMZ, LAN, VLANs)
6. Inclua os campos de metadados premium: summary, securityNotes[], nextSteps[]

TIPOS DE NODES DISPONÍVEIS:
- firewall: Firewalls (pfSense, FortiGate, etc.)
- router: Roteadores
- switch: Switches L2/L3
- server: Servidores físicos/VMs
- storage: Storage/NAS/SAN
- cloud: Serviços cloud (AWS, Azure, GCP)
- database: Bancos de dados
- user: Estações de trabalho/PCs
- printer: Impressoras
- ap: Access Points WiFi
- camera: Câmeras IP/CFTV
- phone: Telefones VoIP
- loadbalancer: Load Balancers
- container: Containers/Docker/K8s
- backup: Servidores de backup
- monitor: Monitoramento (Zabbix, Grafana)
- waf: WAF/Shield
- cdn: CDN/Global
- vpn: VPN/Tunnel
- cache: Cache/Layer (Redis, Varnish)

EXEMPLO DE FORMATO:
\`\`\`diagram-spec
{
  "type": "network",
  "title": "Topologia de Rede - Escritório Central",
  "zones": [
    { "id": "wan", "label": "WAN / Internet" },
    { "id": "dmz", "label": "DMZ" },
    { "id": "lan", "label": "LAN Corporativa" },
    { "id": "dados", "label": "Camada de Dados" }
  ],
  "nodes": [
    { "id": "isp", "label": "ISP Link 200Mbps", "type": "cloud", "zone": "wan" },
    { "id": "fw", "label": "pfSense", "type": "firewall", "zone": "dmz", "ip": "192.168.1.1" },
    { "id": "sw1", "label": "Switch Core L3 48p", "type": "switch", "zone": "lan", "vlan": "10,20,30" },
    { "id": "srv1", "label": "Servidor App", "type": "server", "zone": "lan", "ip": "10.0.10.10" },
    { "id": "nas", "label": "NAS Backup", "type": "storage", "zone": "dados", "ip": "10.0.10.50" },
    { "id": "db1", "label": "PostgreSQL", "type": "database", "zone": "dados", "ip": "10.0.10.20", "port": "5432" }
  ],
  "edges": [
    { "from": "isp", "to": "fw", "label": "WAN 200Mbps", "style": "animated" },
    { "from": "fw", "to": "sw1", "label": "Trunk VLAN 10,20" },
    { "from": "sw1", "to": "srv1", "label": "1Gbps" },
    { "from": "sw1", "to": "nas", "label": "10Gbps iSCSI" },
    { "from": "srv1", "to": "db1", "label": "TCP/5432", "style": "dashed" }
  ],
  "summary": "Topologia de rede do escritório central com firewall pfSense protegendo a DMZ, switch core L3 distribuindo VLANs, e camada de dados isolada com storage NAS e banco PostgreSQL.",
  "securityNotes": [
    "Firewall pfSense com IPS/IDS ativo na interface WAN",
    "Segmentação por VLANs impede tráfego lateral entre departamentos",
    "Backup NAS em VLAN dedicada com acesso restrito"
  ],
  "nextSteps": [
    "Implementar redundância no link WAN com segundo ISP",
    "Adicionar switch de distribuição para expansão de portas",
    "Configurar monitoramento Zabbix para alertas proativos"
  ]
}
\`\`\`

IMPORTANTE:
- Sempre use IDs curtos e descritivos (sem espaços)
- Inclua IPs/subnets nos campos ip quando mencionados
- Cada edge deve ter um label descritivo (protocolo, porta, velocidade)
- Agrupe equipamentos por zona de segurança ou segmento de rede
- O campo "type" do diagrama deve ser "network", "architecture", "datacenter" ou "security"
- SEMPRE inclua summary, securityNotes e nextSteps para agregar valor consultivo
- Use style "animated" para links ativos/críticos e "dashed" para conexões opcionais/backup`,

    architecture_diagram: `Você é um especialista em arquitetura de software. Gere diagramas usando sintaxe Mermaid.

REGRAS OBRIGATÓRIAS:
1. Use \`graph TD\` ou \`graph LR\` para arquitetura
2. Use subgraphs para camadas (Frontend, Backend, Data, Infrastructure)
3. Inclua tecnologias específicas nos labels
4. Mostre protocolos de comunicação nas conexões (REST, gRPC, WebSocket, AMQP)
5. Diferencie bancos de dados, filas, caches e serviços
6. Use formas apropriadas: [(cilindro)] para DB, {{hexágono}} para serviços

EXEMPLO DE FORMATO:
\`\`\`mermaid
graph TD
    subgraph Frontend["🖥️ Frontend"]
        WEB[React SPA<br/>Nginx]
        MOB[Mobile App<br/>React Native]
    end
    subgraph Backend["⚙️ Backend"]
        API[API Gateway<br/>Kong]
        SVC1[Auth Service<br/>Node.js]
        SVC2[Core Service<br/>Go]
    end
    subgraph Data["🗄️ Data Layer"]
        DB[(PostgreSQL<br/>Primary)]
        CACHE[(Redis<br/>Cache)]
        QUEUE[RabbitMQ<br/>Queue]
    end
    WEB -->|REST/HTTPS| API
    MOB -->|REST/HTTPS| API
    API --> SVC1
    API --> SVC2
    SVC2 --> DB
    SVC2 --> CACHE
    SVC2 --> QUEUE
\`\`\``,

    flowchart_diagram: `Você é um especialista em diagramas de processo. Gere diagramas usando sintaxe Mermaid.

REGRAS OBRIGATÓRIAS:
1. Use \`flowchart TD\` ou \`flowchart LR\`
2. Use formas corretas:
   - [retângulo] para processos/ações
   - {losango} para decisões
   - ([estádio]) para início/fim
   - [[subrotina]] para processos externos
3. Inclua condições nas setas de decisão (Sim/Não, True/False)
4. Use cores/estilos para destacar caminhos críticos
5. Numere os passos quando for um processo sequencial

EXEMPLO DE FORMATO:
\`\`\`mermaid
flowchart TD
    START([Início]) --> A[Receber Requisição]
    A --> B{Autenticado?}
    B -->|Sim| C[Processar Request]
    B -->|Não| D[Retornar 401]
    C --> E{Válido?}
    E -->|Sim| F[Executar Ação]
    E -->|Não| G[Retornar 400]
    F --> H[Salvar Log]
    H --> END([Fim])
    D --> END
    G --> END
\`\`\``,
  };

  return prompts[diagramType] || prompts.flowchart_diagram;
}

// ══════════════════════════════════════════════════════════════
// React Flow Export — Convert Mermaid to React Flow nodes/edges
// ══════════════════════════════════════════════════════════════

export type ReactFlowNode = {
  id: string;
  type: string;
  data: { label: string };
  position: { x: number; y: number };
  style?: Record<string, string>;
  parentNode?: string;
};

export type ReactFlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
};

export type ReactFlowDiagram = {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
};

/**
 * Convert Mermaid code to React Flow nodes and edges.
 * Uses basic parsing — handles flowchart/graph syntax.
 */
export function convertToReactFlow(mermaidCode: string): ReactFlowDiagram {
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];
  const nodeMap = new Map<string, ReactFlowNode>();
  const subgraphStack: string[] = [];

  const lines = mermaidCode.split("\n");
  let nodeIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%")) continue;

    // Skip diagram type declaration
    if (/^(graph|flowchart|sequenceDiagram|classDiagram)/.test(trimmed)) continue;

    // Subgraph start
    const subgraphMatch = trimmed.match(/^subgraph\s+(\w+)(?:\["?([^"\]]+)"?\])?/);
    if (subgraphMatch) {
      const id = subgraphMatch[1];
      const label = subgraphMatch[2] || id;
      subgraphStack.push(id);
      if (!nodeMap.has(id)) {
        const node: ReactFlowNode = {
          id,
          type: "group",
          data: { label },
          position: { x: nodeIndex * 250, y: 0 },
          style: { backgroundColor: "rgba(100,100,200,0.1)", border: "1px dashed #666" },
        };
        nodes.push(node);
        nodeMap.set(id, node);
        nodeIndex++;
      }
      continue;
    }

    // Subgraph end
    if (trimmed === "end") {
      subgraphStack.pop();
      continue;
    }

    // Edge: A -->|label| B or A --> B
    const edgeMatch = trimmed.match(/^([\w]+)(?:\[.*?\])?\s*(-->|---|-\.->|==>|---)\s*(?:\|([^|]*)\|)?\s*([\w]+)/);
    if (edgeMatch) {
      const [, sourceId, edgeType, edgeLabel, targetId] = edgeMatch;
      
      // Ensure source node exists
      if (!nodeMap.has(sourceId)) {
        const col = nodeMap.size % 4;
        const row = Math.floor(nodeMap.size / 4);
        const node: ReactFlowNode = {
          id: sourceId,
          type: "default",
          data: { label: sourceId },
          position: { x: col * 200, y: row * 120 },
          ...(subgraphStack.length > 0 ? { parentNode: subgraphStack[subgraphStack.length - 1] } : {}),
        };
        nodes.push(node);
        nodeMap.set(sourceId, node);
      }

      // Ensure target node exists
      if (!nodeMap.has(targetId)) {
        const col = nodeMap.size % 4;
        const row = Math.floor(nodeMap.size / 4);
        const node: ReactFlowNode = {
          id: targetId,
          type: "default",
          data: { label: targetId },
          position: { x: col * 200, y: row * 120 },
          ...(subgraphStack.length > 0 ? { parentNode: subgraphStack[subgraphStack.length - 1] } : {}),
        };
        nodes.push(node);
        nodeMap.set(targetId, node);
      }

      edges.push({
        id: `e-${sourceId}-${targetId}-${edges.length}`,
        source: sourceId,
        target: targetId,
        label: edgeLabel || undefined,
        type: edgeType === "==>" ? "step" : "smoothstep",
        animated: edgeType === "-.->" || edgeType === "-.->",
      });
      continue;
    }

    // Node definition: A[Label] or A([Label]) or A{Label}
    const nodeMatch = trimmed.match(/^([\w]+)\s*([\[\(\{])([^\]\)\}]*)[\]\)\}]/);
    if (nodeMatch) {
      const [, id, bracket, label] = nodeMatch;
      if (!nodeMap.has(id)) {
        const col = nodeMap.size % 4;
        const row = Math.floor(nodeMap.size / 4);
        const nodeType = bracket === "{" ? "input" : bracket === "(" ? "output" : "default";
        const node: ReactFlowNode = {
          id,
          type: nodeType,
          data: { label: label.replace(/<br\/?>|<br>/g, "\n") },
          position: { x: col * 200, y: row * 120 },
          ...(subgraphStack.length > 0 ? { parentNode: subgraphStack[subgraphStack.length - 1] } : {}),
        };
        nodes.push(node);
        nodeMap.set(id, node);
      }
    }
  }

  return { nodes, edges };
}

// ══════════════════════════════════════════════════════════════
// SVG Rendering via Kroki.io
// ══════════════════════════════════════════════════════════════

/**
 * Render Mermaid code to SVG using Kroki.io API.
 * Returns SVG string or null on failure.
 */
export async function renderMermaidToSvg(mermaidCode: string): Promise<string | null> {
  try {
    // Kroki accepts deflated + base64 encoded diagrams
    const compressed = await deflateAsync(Buffer.from(mermaidCode, "utf-8"));
    const encoded = compressed.toString("base64url");

    const krokiUrl = process.env.KROKI_URL || "https://kroki.io";
    const response = await fetch(`${krokiUrl}/mermaid/svg/${encoded}`);

    if (!response.ok) {
      console.error(`[DiagramProvider] Kroki render failed: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (err: any) {
    console.error(`[DiagramProvider] SVG render error: ${err.message}`);
    return null;
  }
}

/**
 * Render diagram to SVG and persist to S3.
 * Returns public URL of the rendered SVG.
 */
export async function renderAndPersistDiagram(
  mermaidCode: string,
  userId?: number,
  title?: string
): Promise<{ svgUrl: string | null; storageKey: string | null }> {
  const svg = await renderMermaidToSvg(mermaidCode);
  if (!svg) return { svgUrl: null, storageKey: null };

  if (!isStorageConfigured()) {
    // Return inline SVG data URL as fallback
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return { svgUrl: dataUrl, storageKey: null };
  }

  try {
    const fileId = crypto.randomUUID();
    const key = `generated-diagrams/${userId || "anon"}/${fileId}.svg`;
    const { key: savedKey } = await storagePut(key, Buffer.from(svg), "image/svg+xml");
    const publicUrl = getPublicUrl(savedKey);
    console.log(`[DiagramProvider] SVG persisted to S3: key=${savedKey}`);
    return { svgUrl: publicUrl, storageKey: savedKey };
  } catch (err: any) {
    console.error(`[DiagramProvider] S3 persist failed: ${err.message}`);
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return { svgUrl: dataUrl, storageKey: null };
  }
}

// ══════════════════════════════════════════════════════════════
// Main Processing Function
// ══════════════════════════════════════════════════════════════

/**
 * Process LLM response to extract and validate diagram.
 */
export function processDiagramResponse(
  llmResponse: string,
  diagramType: DiagramType,
  title?: string
): DiagramResult | DiagramError {
  // Extract Mermaid code
  const mermaidCode = extractMermaidCode(llmResponse);
  if (!mermaidCode) {
    return {
      error: "Não foi possível extrair código Mermaid da resposta.",
      code: "NO_MERMAID_CODE",
    };
  }

  // Validate syntax
  const validation = validateMermaidSyntax(mermaidCode);
  if (!validation.valid) {
    return {
      error: `Código Mermaid com erros de sintaxe: ${validation.errors.join("; ")}`,
      code: "SYNTAX_ERROR",
      syntaxErrors: validation.errors,
    };
  }

  // Extract metadata
  const metadata = extractDiagramMetadata(mermaidCode);

  // Generate draw.io XML
  const drawioXml = convertToDrawioXml(mermaidCode, title || "Diagram");

  return {
    mermaidCode,
    diagramType,
    title: title || `${diagramType} - ${new Date().toISOString().split("T")[0]}`,
    drawioXml,
    metadata,
  };
}

/**
 * Check if diagram generation is available.
 * Always true since it uses the LLM to generate Mermaid code.
 */
export function isDiagramGenerationAvailable(): boolean {
  return true; // Mermaid generation is always available via LLM
}

/**
 * Get diagram provider info for admin display.
 */
export function getDiagramProviderInfo(): {
  available: boolean;
  supportedTypes: DiagramType[];
  renderFormats: string[];
} {
  return {
    available: true,
    supportedTypes: ["network_diagram", "architecture_diagram", "flowchart_diagram"],
    renderFormats: ["mermaid", "svg", "png", "drawio_xml"],
  };
}
