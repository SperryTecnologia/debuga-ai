/**
 * NetworkDiagramRenderer - Premium enterprise network/infrastructure diagram renderer
 * Uses React Flow + ELK layout for professional technical diagrams.
 * Accepts a DiagramSpec JSON and renders nodes with technical icons,
 * grouped by zones (swimlanes), with labeled edges and export capabilities.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Download,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  X,
  FileCode,
  RefreshCw,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════
// DiagramSpec Types
// ══════════════════════════════════════════════════════════════
export interface DiagramSpec {
  type: "network" | "architecture" | "datacenter" | "security";
  title: string;
  zones: DiagramZone[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  // Premium metadata fields
  summary?: string;
  securityNotes?: string[];
  businessValue?: string;
  nextSteps?: string[];
}

export interface DiagramZone {
  id: string;
  label: string;
  color?: string;
}

export interface DiagramNode {
  id: string;
  type: string;
  label: string;
  zone: string;
  ip?: string;
  details?: string;
  vlan?: string;
  port?: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  style?: "solid" | "dashed" | "animated";
}

// ══════════════════════════════════════════════════════════════
// Technical SVG Icons (enterprise style)
// ══════════════════════════════════════════════════════════════
const ICONS: Record<string, (color: string) => React.ReactElement> = {
  cloud: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M6.5 19a4.5 4.5 0 0 1-.42-8.98A7 7 0 0 1 18.42 8 4.5 4.5 0 0 1 18.5 17H6.5Z" />
    </svg>
  ),
  firewall: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M12 2s8 4 8 10-8 10-8 10S4 18 4 12 12 2 12 2Z" />
      <path d="M12 12v6M9 9h6" />
    </svg>
  ),
  switch: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="6" cy="12" r="1.5" fill={c} />
      <circle cx="10" cy="12" r="1.5" fill={c} />
      <circle cx="14" cy="12" r="1.5" fill={c} />
      <circle cx="18" cy="12" r="1.5" fill={c} />
    </svg>
  ),
  router: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
      <path d="M12 7l4 5-4 5-4-5z" fill={c} opacity="0.3" />
    </svg>
  ),
  server: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <rect x="3" y="3" width="18" height="6" rx="1" />
      <rect x="3" y="11" width="18" height="6" rx="1" />
      <circle cx="7" cy="6" r="1" fill={c} />
      <circle cx="7" cy="14" r="1" fill={c} />
      <line x1="11" y1="6" x2="17" y2="6" />
      <line x1="11" y1="14" x2="17" y2="14" />
    </svg>
  ),
  storage: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  ),
  database: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 9c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      <path d="M4 14c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  ),
  user: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  backup: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
      <circle cx="12" cy="14" r="2" />
      <path d="M12 16v2" />
    </svg>
  ),
  ap: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill={c} />
    </svg>
  ),
  phone: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" />
    </svg>
  ),
  monitor: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <rect x="3" y="3" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 15v6" />
    </svg>
  ),
  container: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M22 12l-10-6L2 12l10 6 10-6z" />
      <path d="M2 12v6l10 6 10-6v-6" />
      <path d="M12 12v12" />
    </svg>
  ),
  loadbalancer: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="4" r="2" />
      <circle cx="6" cy="20" r="2" />
      <circle cx="12" cy="20" r="2" />
      <circle cx="18" cy="20" r="2" />
      <path d="M12 6v4M12 10l-6 8M12 10l0 8M12 10l6 8" />
    </svg>
  ),
  camera: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  printer: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M6 9V2h12v7" />
      <rect x="3" y="9" width="18" height="8" rx="1" />
      <path d="M6 17v4h12v-4" />
    </svg>
  ),
  waf: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  cdn: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  cache: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  vpn: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" className="w-6 h-6">
      <rect x="3" y="11" width="18" height="8" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="15" r="1" fill={c} />
    </svg>
  ),
};

function getIcon(type: string, color: string): React.ReactElement {
  const iconFn = ICONS[type.toLowerCase()] || ICONS.server;
  return iconFn(color);
}

// Icon type labels for legend
const ICON_LABELS: Record<string, string> = {
  cloud: "Cloud/Internet",
  firewall: "Firewall",
  switch: "Switch",
  router: "Router",
  server: "Servidor",
  storage: "Storage",
  database: "Banco de Dados",
  user: "Usuário/Estação",
  backup: "Backup",
  ap: "Access Point",
  phone: "Dispositivo Móvel",
  monitor: "Monitoramento",
  container: "Container/VM",
  loadbalancer: "Load Balancer",
  camera: "Câmera/IoT",
  printer: "Impressora",
  waf: "WAF/Shield",
  cdn: "CDN/Global",
  cache: "Cache/Layer",
  vpn: "VPN/Tunnel",
};

// ══════════════════════════════════════════════════════════════
// Zone Colors — Enterprise palette (muted, professional)
// ══════════════════════════════════════════════════════════════
const ZONE_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  wan: { bg: "rgba(56, 189, 248, 0.06)", border: "#38bdf8", text: "#7dd3fc", accent: "#38bdf8" },
  internet: { bg: "rgba(56, 189, 248, 0.06)", border: "#38bdf8", text: "#7dd3fc", accent: "#38bdf8" },
  dmz: { bg: "rgba(251, 146, 60, 0.06)", border: "#fb923c", text: "#fdba74", accent: "#f97316" },
  lan: { bg: "rgba(74, 222, 128, 0.06)", border: "#4ade80", text: "#86efac", accent: "#22c55e" },
  servidores: { bg: "rgba(129, 140, 248, 0.06)", border: "#818cf8", text: "#a5b4fc", accent: "#6366f1" },
  servers: { bg: "rgba(129, 140, 248, 0.06)", border: "#818cf8", text: "#a5b4fc", accent: "#6366f1" },
  storage: { bg: "rgba(192, 132, 252, 0.06)", border: "#c084fc", text: "#d8b4fe", accent: "#a855f7" },
  data: { bg: "rgba(192, 132, 252, 0.06)", border: "#c084fc", text: "#d8b4fe", accent: "#a855f7" },
  dados: { bg: "rgba(192, 132, 252, 0.06)", border: "#c084fc", text: "#d8b4fe", accent: "#a855f7" },
  backup: { bg: "rgba(45, 212, 191, 0.06)", border: "#2dd4bf", text: "#5eead4", accent: "#14b8a6" },
  monitoring: { bg: "rgba(250, 204, 21, 0.06)", border: "#facc15", text: "#fde047", accent: "#eab308" },
  monitoramento: { bg: "rgba(250, 204, 21, 0.06)", border: "#facc15", text: "#fde047", accent: "#eab308" },
  obs: { bg: "rgba(250, 204, 21, 0.06)", border: "#facc15", text: "#fde047", accent: "#eab308" },
  observabilidade: { bg: "rgba(250, 204, 21, 0.06)", border: "#facc15", text: "#fde047", accent: "#eab308" },
  security: { bg: "rgba(244, 63, 94, 0.06)", border: "#f43f5e", text: "#fda4af", accent: "#e11d48" },
  seguranca: { bg: "rgba(244, 63, 94, 0.06)", border: "#f43f5e", text: "#fda4af", accent: "#e11d48" },
  borda: { bg: "rgba(251, 146, 60, 0.06)", border: "#fb923c", text: "#fdba74", accent: "#f97316" },
  cloud: { bg: "rgba(99, 102, 241, 0.06)", border: "#6366f1", text: "#a5b4fc", accent: "#818cf8" },
  usuarios: { bg: "rgba(148, 163, 184, 0.06)", border: "#94a3b8", text: "#cbd5e1", accent: "#64748b" },
  users: { bg: "rgba(148, 163, 184, 0.06)", border: "#94a3b8", text: "#cbd5e1", accent: "#64748b" },
  aplicacao: { bg: "rgba(34, 211, 238, 0.06)", border: "#22d3ee", text: "#67e8f9", accent: "#06b6d4" },
  application: { bg: "rgba(34, 211, 238, 0.06)", border: "#22d3ee", text: "#67e8f9", accent: "#06b6d4" },
};

function getZoneColor(zoneId: string) {
  const key = zoneId.toLowerCase().replace(/[^a-z]/g, "");
  return ZONE_COLORS[key] || { bg: "rgba(100, 116, 139, 0.06)", border: "#64748b", text: "#cbd5e1", accent: "#94a3b8" };
}

// ══════════════════════════════════════════════════════════════
// Custom Node Component — Enterprise style
// ══════════════════════════════════════════════════════════════
interface TechNodeData {
  label: string;
  nodeType: string;
  ip?: string;
  details?: string;
  vlan?: string;
  port?: string;
  zoneColor: string;
  [key: string]: unknown;
}

function TechNode({ data }: { data: TechNodeData }) {
  const color = data.zoneColor || "#22c55e";
  return (
    <div
      className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border bg-[#0c1220]/95 backdrop-blur-sm min-w-[110px] shadow-lg hover:shadow-xl transition-shadow"
      style={{ borderColor: `${color}35` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-600 !w-2 !h-2 !border-0 !-top-1" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-600 !w-2 !h-2 !border-0 !-bottom-1" />
      <Handle type="target" position={Position.Left} className="!bg-slate-600 !w-2 !h-2 !border-0 !-left-1" />
      <Handle type="source" position={Position.Right} className="!bg-slate-600 !w-2 !h-2 !border-0 !-right-1" />
      <div className="flex items-center justify-center w-8 h-8 rounded-md" style={{ backgroundColor: `${color}12` }}>
        {getIcon(data.nodeType, color)}
      </div>
      <span className="text-[9px] font-semibold text-center leading-tight text-slate-200 max-w-[120px] truncate mt-0.5">
        {data.label}
      </span>
      {/* Badges */}
      <div className="flex flex-wrap items-center justify-center gap-0.5 mt-0.5">
        {data.ip && (
          <span className="text-[7px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
            {data.ip}
          </span>
        )}
        {data.vlan && (
          <span className="text-[7px] font-mono text-cyan-400/80 bg-cyan-900/30 px-1.5 py-0.5 rounded border border-cyan-700/30">
            VLAN {data.vlan}
          </span>
        )}
        {data.port && (
          <span className="text-[7px] font-mono text-amber-400/80 bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-700/30">
            :{data.port}
          </span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Zone Group Node — Swimlane style
// ══════════════════════════════════════════════════════════════
interface ZoneGroupData {
  label: string;
  zoneColor: { bg: string; border: string; text: string };
}

function ZoneGroupNode({ data }: { data: ZoneGroupData }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-2 min-w-[200px] min-h-[100px]"
      style={{
        backgroundColor: data.zoneColor.bg,
        borderColor: `${data.zoneColor.border}40`,
      }}
    >
      <div
        className="absolute top-2 left-3 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"
        style={{ color: data.zoneColor.text }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: data.zoneColor.border }} />
        {data.label}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ELK Layout
// ══════════════════════════════════════════════════════════════
async function computeElkLayout(
  _nodes: RFNode[],
  _edges: RFEdge[],
  spec: DiagramSpec
): Promise<{ nodes: RFNode[]; edges: RFEdge[] }> {
  const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
  const elk = new ELK();

  // Group nodes by zone
  const zoneNodes = new Map<string, DiagramNode[]>();
  for (const n of spec.nodes) {
    if (!zoneNodes.has(n.zone)) zoneNodes.set(n.zone, []);
    zoneNodes.get(n.zone)!.push(n);
  }

  // Build ELK graph with zone groups
  const elkChildren: any[] = [];
  const allElkNodes = new Map<string, any>();

  for (const zone of spec.zones) {
    const zoneMembers = zoneNodes.get(zone.id) || [];
    const elkZoneChildren = zoneMembers.map((n) => ({
      id: n.id,
      width: 140,
      height: 90,
    }));
    elkZoneChildren.forEach((c) => allElkNodes.set(c.id, c));

    elkChildren.push({
      id: `zone_${zone.id}`,
      children: elkZoneChildren,
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "RIGHT",
        "elk.spacing.nodeNode": "35",
        "elk.layered.spacing.nodeNodeBetweenLayers": "60",
        "elk.padding": "[top=45,left=25,bottom=25,right=25]",
      },
    });
  }

  // Add nodes not in any zone
  const allZoneIds = new Set(spec.zones.map((z) => z.id));
  for (const n of spec.nodes) {
    if (!allZoneIds.has(n.zone) && !allElkNodes.has(n.id)) {
      elkChildren.push({ id: n.id, width: 140, height: 90 });
      allElkNodes.set(n.id, { id: n.id, width: 140, height: 90 });
    }
  }

  const elkEdges = spec.edges.map((e, i) => ({
    id: `e_${i}`,
    sources: [e.from],
    targets: [e.to],
  }));

  const graph = {
    id: "root",
    children: elkChildren,
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "45",
      "elk.layered.spacing.nodeNodeBetweenLayers": "70",
      "elk.spacing.componentComponent": "50",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
  };

  const layout = await elk.layout(graph);

  // Map positions back to React Flow nodes
  const positionMap = new Map<string, { x: number; y: number }>();
  const zonePositions = new Map<string, { x: number; y: number; width: number; height: number }>();

  function extractPositions(elkNode: any, offsetX = 0, offsetY = 0) {
    const x = (elkNode.x || 0) + offsetX;
    const y = (elkNode.y || 0) + offsetY;

    if (elkNode.id.startsWith("zone_")) {
      zonePositions.set(elkNode.id, {
        x,
        y,
        width: elkNode.width || 300,
        height: elkNode.height || 200,
      });
      if (elkNode.children) {
        for (const child of elkNode.children) {
          extractPositions(child, x, y);
        }
      }
    } else {
      positionMap.set(elkNode.id, { x, y });
    }
  }

  if (layout.children) {
    for (const child of layout.children) {
      extractPositions(child);
    }
  }

  // Build final nodes with zone groups
  const finalNodes: RFNode[] = [];

  // Add zone group nodes
  for (const zone of spec.zones) {
    const pos = zonePositions.get(`zone_${zone.id}`);
    if (pos) {
      const zColor = getZoneColor(zone.id);
      finalNodes.push({
        id: `zone_${zone.id}`,
        type: "zoneGroup",
        position: { x: pos.x, y: pos.y },
        data: { label: zone.label, zoneColor: zColor },
        style: { width: pos.width, height: pos.height },
        draggable: true,
        selectable: false,
        zIndex: -1,
      });
    }
  }

  // Add tech nodes
  for (const n of spec.nodes) {
    const pos = positionMap.get(n.id) || { x: Math.random() * 600, y: Math.random() * 400 };
    const zColor = getZoneColor(n.zone);
    finalNodes.push({
      id: n.id,
      type: "techNode",
      position: pos,
      data: {
        label: n.label,
        nodeType: n.type,
        ip: n.ip,
        details: n.details,
        vlan: n.vlan,
        port: n.port,
        zoneColor: zColor.accent,
      } as TechNodeData,
      parentId: zonePositions.has(`zone_${n.zone}`) ? `zone_${n.zone}` : undefined,
      extent: zonePositions.has(`zone_${n.zone}`) ? "parent" as const : undefined,
    });
  }

  // Build edges with enterprise styling
  const finalEdges: RFEdge[] = spec.edges.map((e, i) => ({
    id: `edge_${i}`,
    source: e.from,
    target: e.to,
    label: e.label || "",
    type: "smoothstep",
    animated: e.style === "animated",
    style: {
      stroke: "#475569",
      strokeWidth: 1.5,
      ...(e.style === "dashed" ? { strokeDasharray: "6 4" } : {}),
    },
    labelStyle: { fill: "#94a3b8", fontSize: 8, fontWeight: 500, fontFamily: "monospace" },
    labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
    labelBgPadding: [4, 3] as [number, number],
    labelBgBorderRadius: 4,
  }));

  return { nodes: finalNodes, edges: finalEdges };
}

// ══════════════════════════════════════════════════════════════
// Fallback Layout (no ELK)
// ══════════════════════════════════════════════════════════════
function computeFallbackLayout(spec: DiagramSpec): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = [];
  const zoneNodes = new Map<string, DiagramNode[]>();

  for (const n of spec.nodes) {
    if (!zoneNodes.has(n.zone)) zoneNodes.set(n.zone, []);
    zoneNodes.get(n.zone)!.push(n);
  }

  let yOffset = 0;
  for (const zone of spec.zones) {
    const members = zoneNodes.get(zone.id) || [];
    const zColor = getZoneColor(zone.id);
    const zoneWidth = Math.max(300, members.length * 170 + 60);
    const zoneHeight = 170;

    nodes.push({
      id: `zone_${zone.id}`,
      type: "zoneGroup",
      position: { x: 20, y: yOffset },
      data: { label: zone.label, zoneColor: zColor },
      style: { width: zoneWidth, height: zoneHeight },
      draggable: true,
      selectable: false,
      zIndex: -1,
    });

    members.forEach((n, i) => {
      nodes.push({
        id: n.id,
        type: "techNode",
        position: { x: 30 + i * 160, y: 50 },
        data: {
          label: n.label,
          nodeType: n.type,
          ip: n.ip,
          details: n.details,
          vlan: n.vlan,
          port: n.port,
          zoneColor: zColor.accent,
        } as TechNodeData,
        parentId: `zone_${zone.id}`,
        extent: "parent" as const,
      });
    });

    yOffset += zoneHeight + 40;
  }

  const edges: RFEdge[] = spec.edges.map((e, i) => ({
    id: `edge_${i}`,
    source: e.from,
    target: e.to,
    label: e.label || "",
    type: "smoothstep",
    animated: e.style === "animated",
    style: { stroke: "#475569", strokeWidth: 1.5 },
    labelStyle: { fill: "#94a3b8", fontSize: 8, fontFamily: "monospace" },
    labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
    labelBgPadding: [4, 3] as [number, number],
    labelBgBorderRadius: 4,
  }));

  return { nodes, edges };
}

// ══════════════════════════════════════════════════════════════
// Legend Component
// ══════════════════════════════════════════════════════════════
function DiagramLegend({ spec }: { spec: DiagramSpec }) {
  const [open, setOpen] = useState(false);
  const usedTypes = useMemo(() => {
    const types = new Set(spec.nodes.map((n) => n.type.toLowerCase()));
    return Array.from(types).filter((t) => ICON_LABELS[t]);
  }, [spec]);

  if (usedTypes.length === 0) return null;

  return (
    <div className="absolute bottom-3 left-3 z-10">
      <button
        onClick={() => setOpen(!open)}
        className="text-[9px] font-mono text-slate-400 bg-[#0f172a]/90 border border-slate-700/50 rounded-md px-2 py-1 hover:text-slate-200 transition-colors backdrop-blur-sm"
      >
        {open ? "Fechar legenda" : "Legenda"}
      </button>
      {open && (
        <div className="mt-1 bg-[#0f172a]/95 border border-slate-700/50 rounded-lg p-2.5 backdrop-blur-sm max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {usedTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="w-4 h-4 flex items-center justify-center">
                  {getIcon(type, "#94a3b8")}
                </div>
                <span className="text-[8px] text-slate-400 font-mono">{ICON_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Metadata Panel (summary, securityNotes, nextSteps)
// ══════════════════════════════════════════════════════════════
function DiagramMetadata({ spec }: { spec: DiagramSpec }) {
  const [expanded, setExpanded] = useState(false);
  const hasMetadata = spec.summary || (spec.securityNotes && spec.securityNotes.length > 0) || (spec.nextSteps && spec.nextSteps.length > 0) || spec.businessValue;

  if (!hasMetadata) return null;

  return (
    <div className="border border-slate-700/50 rounded-lg bg-[#0f172a]/80 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <span className="text-[11px] font-mono font-medium text-slate-300">Resumo Técnico</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {spec.summary && (
            <p className="text-[11px] text-slate-300 leading-relaxed">{spec.summary}</p>
          )}
          {spec.securityNotes && spec.securityNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-mono font-medium text-amber-400">Segurança</span>
              </div>
              <ul className="space-y-1">
                {spec.securityNotes.map((note, i) => (
                  <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500/60 mt-0.5 shrink-0" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {spec.nextSteps && spec.nextSteps.length > 0 && (
            <div>
              <span className="text-[10px] font-mono font-medium text-green-400">Próximos Passos</span>
              <ul className="mt-1 space-y-1">
                {spec.nextSteps.map((step, i) => (
                  <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1.5">
                    <span className="text-green-500/60 font-mono">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {spec.businessValue && (
            <p className="text-[10px] text-slate-400 italic border-l-2 border-primary/30 pl-2">{spec.businessValue}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
const nodeTypes = {
  techNode: TechNode,
  zoneGroup: ZoneGroupNode,
};

function NetworkDiagramInner({ spec }: { spec: DiagramSpec }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([] as RFNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as RFEdge[]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // Compute layout
  useEffect(() => {
    let cancelled = false;
    async function doLayout() {
      try {
        const result = await computeElkLayout([], [], spec);
        if (!cancelled) {
          setNodes(result.nodes);
          setEdges(result.edges);
          setTimeout(() => fitView({ padding: 0.12 }), 150);
        }
      } catch (err) {
        console.warn("[NetworkDiagram] ELK layout failed, using fallback:", err);
        if (!cancelled) {
          const fallback = computeFallbackLayout(spec);
          setNodes(fallback.nodes);
          setEdges(fallback.edges);
          setTimeout(() => fitView({ padding: 0.12 }), 150);
        }
      }
    }
    doLayout();
    return () => { cancelled = true; };
  }, [spec, setNodes, setEdges, fitView]);

  // Copy JSON
  const handleCopyJson = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [spec]);

  // Export PNG
  const handleExportPng = useCallback(async () => {
    setExporting(true);
    try {
      const el = containerRef.current?.querySelector(".react-flow__viewport") as HTMLElement;
      if (!el) return;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        backgroundColor: "#0a0f1a",
        quality: 1,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${spec.title || "diagram"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[NetworkDiagram] PNG export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [spec.title]);

  // Export SVG
  const handleExportSvg = useCallback(() => {
    const viewport = containerRef.current?.querySelector(".react-flow__viewport") as HTMLElement;
    if (!viewport) return;
    const svgData = new XMLSerializer().serializeToString(viewport);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${spec.title || "diagram"}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [spec.title]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => fitView({ padding: 0.08 }), 200);
  }, [fitView]);

  const diagramHeight = isFullscreen ? "h-screen" : "h-[520px]";

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#080d16] flex flex-col">
        {/* Fullscreen header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50 bg-[#0f172a]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-200">{spec.title}</span>
            <span className="text-[9px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
              {spec.nodes.length} nós • {spec.edges.length} conexões • {spec.zones.length} zonas
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleExportPng} disabled={exporting} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="PNG">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button onClick={handleExportSvg} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="SVG">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={handleCopyJson} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="JSON">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={toggleFullscreen} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="Sair">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Fullscreen diagram */}
        <div ref={containerRef} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={3}
            defaultEdgeOptions={{ type: "smoothstep" }}
            proOptions={{ hideAttribution: true }}
            className="!bg-[#080d16]"
          >
            <Background color="#1e293b" gap={24} size={1} />
            <Controls className="!bg-[#0f172a] !border-slate-700 !rounded-lg [&>button]:!bg-[#0f172a] [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700" />
            <MiniMap className="!bg-[#0f172a] !border-slate-700 !rounded-lg" nodeColor="#22c55e" maskColor="rgba(0,0,0,0.7)" />
          </ReactFlow>
          <DiagramLegend spec={spec} />
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-slate-700/40 bg-[#0f172a]/90 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-200">{spec.title}</span>
          <span className="text-[9px] text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded-full font-mono">
            {spec.nodes.length} nós • {spec.edges.length} conexões
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleExportPng} disabled={exporting} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="Exportar PNG">
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleExportSvg} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="Exportar SVG">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopyJson} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="Copiar JSON">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setShowJson(!showJson)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="Ver JSON">
            <FileCode className="w-3.5 h-3.5" />
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors" title="Tela cheia">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div ref={containerRef} className={`relative w-full ${diagramHeight} rounded-b-xl border border-t-0 border-slate-700/40 bg-[#080d16] overflow-hidden`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2.5}
          defaultEdgeOptions={{ type: "smoothstep" }}
          proOptions={{ hideAttribution: true }}
          className="!bg-[#080d16]"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-[#0f172a] !border-slate-700 !rounded-lg [&>button]:!bg-[#0f172a] [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700" />
          <MiniMap className="!bg-[#0f172a] !border-slate-700 !rounded-lg" nodeColor="#22c55e" maskColor="rgba(0,0,0,0.7)" />
        </ReactFlow>
        <DiagramLegend spec={spec} />
      </div>

      {/* JSON panel (hidden by default) */}
      {showJson && (
        <div className="rounded-lg border border-slate-700/40 bg-[#0a0f1a] p-3 max-h-60 overflow-auto">
          <pre className="text-[9px] font-mono text-slate-400 whitespace-pre-wrap">{JSON.stringify(spec, null, 2)}</pre>
        </div>
      )}

      {/* Metadata panel */}
      <DiagramMetadata spec={spec} />

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] text-slate-500 font-mono">
          Arraste para reorganizar • Scroll para zoom • Clique duplo para centralizar
        </span>
        <span className="text-[9px] text-green-500/60 font-mono">
          debuga.ai diagram studio
        </span>
      </div>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function NetworkDiagramRenderer({ spec }: { spec: DiagramSpec }) {
  return (
    <ReactFlowProvider>
      <NetworkDiagramInner spec={spec} />
    </ReactFlowProvider>
  );
}

// ══════════════════════════════════════════════════════════════
// Utility: Parse DiagramSpec from text (kept for backward compat)
// ══════════════════════════════════════════════════════════════
export function parseDiagramSpec(text: string): DiagramSpec | null {
  try {
    const jsonBlockRegex = /```(?:json|diagram-spec)?\s*\n([\s\S]*?)```/;
    const match = text.match(jsonBlockRegex);
    const jsonStr = match ? match[1].trim() : text.trim();

    const parsed = JSON.parse(jsonStr);

    if (!parsed.nodes || !parsed.edges) return null;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;

    // Normalize groups → zones
    if (!parsed.zones || !Array.isArray(parsed.zones)) {
      if (parsed.groups && Array.isArray(parsed.groups)) {
        parsed.zones = parsed.groups.map((g: any) => ({
          id: g.id || g.name || String(g),
          label: g.label || g.name || g.id || String(g),
          color: g.color,
        }));
      } else {
        const zoneIds = new Set(parsed.nodes.map((n: any) => n.zone || n.group).filter(Boolean));
        parsed.zones = Array.from(zoneIds).map((id) => ({ id, label: id }));
      }
    }

    // Normalize node zone field
    parsed.nodes = parsed.nodes.map((n: any) => ({
      ...n,
      zone: n.zone || n.group || (parsed.zones.length > 0 ? parsed.zones[0].id : "default"),
    }));

    // Normalize edge from/to fields
    parsed.edges = parsed.edges.map((e: any) => ({
      ...e,
      from: e.from || e.source,
      to: e.to || e.target,
    }));

    if (!parsed.type) parsed.type = "network";

    return parsed as DiagramSpec;
  } catch {
    return null;
  }
}
