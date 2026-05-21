import { useMemo, lazy, Suspense, useState, useCallback } from "react";
import { Streamdown } from "streamdown";
import type { MermaidConfig } from "mermaid";
import { ImageOff, Loader2 } from "lucide-react";

const MermaidRenderer = lazy(() => import("./MermaidRenderer"));
const DocumentRenderer = lazy(() => import("./DocumentRenderer"));
const NetworkDiagramRenderer = lazy(() => import("./NetworkDiagramRenderer"));
import { parseDiagramSpec, type DiagramSpec } from "./NetworkDiagramRenderer";

interface MessageWithMermaidProps {
  content: string;
  mermaidConfig: MermaidConfig;
  isAnimating?: boolean;
}

interface ContentPart {
  type: "text" | "mermaid" | "document" | "diagram-spec";
  content: string;
  title?: string;
  diagramSpec?: DiagramSpec;
}

/**
 * Custom image component that shows a fallback when image fails to load
 */
function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [hasError, setHasError] = useState(false);
  const handleError = useCallback(() => setHasError(true), []);

  if (hasError) {
    return (
      <div className="my-3 rounded-xl border border-border bg-card/50 p-6 flex flex-col items-center gap-3 max-w-sm">
        <ImageOff className="w-10 h-10 text-muted-foreground/50" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Imagem indisponível</p>
          <p className="text-xs text-muted-foreground/60 mt-1">A URL da imagem expirou. Gere novamente para obter uma nova.</p>
        </div>
      </div>
    );
  }

  return (
    <img
      {...props}
      onError={handleError}
      className="rounded-lg max-w-full max-h-96 border border-border shadow-lg my-3 cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => props.src && window.open(props.src, '_blank')}
      loading="lazy"
    />
  );
}

/**
 * Splits message content into text, mermaid blocks, document-studio blocks, and diagram-spec.
 * Uses a robust parser that detects diagram-spec in multiple formats.
 */
export default function MessageWithMermaid({
  content,
  mermaidConfig,
  isAnimating = false,
}: MessageWithMermaidProps) {
  const parts = useMemo(() => splitContent(content), [content]);

  const imageComponents = useMemo(() => ({
    img: ImageWithFallback,
  }), []);

  const hasSpecial = parts.some((p) => p.type === "mermaid" || p.type === "document" || p.type === "diagram-spec");
  if (!hasSpecial) {
    return (
      <Streamdown mermaid={{ config: mermaidConfig }} isAnimating={isAnimating} components={imageComponents}>
        {content}
      </Streamdown>
    );
  }

  return (
    <div className="message-with-mermaid">
      {parts.map((part, i) => {
        if (part.type === "mermaid") {
          return (
            <Suspense
              key={i}
              fallback={
                <div className="my-4 rounded-xl border border-slate-700/50 bg-[#0a0a0a] p-8 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Renderizando diagrama...</span>
                  </div>
                </div>
              }
            >
              <MermaidRenderer code={part.content} title={part.title} />
            </Suspense>
          );
        }

        if (part.type === "diagram-spec") {
          if (part.diagramSpec) {
            return (
              <Suspense
                key={i}
                fallback={
                  <div className="my-4 rounded-xl border border-slate-700/50 bg-[#0a0f1a] p-8 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                      <span className="text-sm">Renderizando diagrama de rede...</span>
                    </div>
                  </div>
                }
              >
                <NetworkDiagramRenderer spec={part.diagramSpec} />
              </Suspense>
            );
          }
          // If parsing failed, show as text
          return (
            <Streamdown key={i} mermaid={{ config: mermaidConfig }} isAnimating={isAnimating} components={imageComponents}>
              {part.content}
            </Streamdown>
          );
        }

        if (part.type === "document") {
          return (
            <Suspense
              key={i}
              fallback={
                <div className="my-3 rounded-lg border border-primary/30 bg-[oklch(0.13_0.01_150)] p-8 flex items-center justify-center">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-mono">Preparando documento...</span>
                  </div>
                </div>
              }
            >
              <DocumentRenderer content={part.content} isAnimating={isAnimating} />
            </Suspense>
          );
        }

        // Text part — render with Streamdown
        if (part.content.trim()) {
          return (
            <Streamdown key={i} mermaid={{ config: mermaidConfig }} isAnimating={isAnimating} components={imageComponents}>
              {part.content}
            </Streamdown>
          );
        }
        return null;
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROBUST DIAGRAM-SPEC DETECTION
// ══════════════════════════════════════════════════════════════

/**
 * Checks if a JSON object looks like a DiagramSpec by checking required fields.
 * Supports both "zones" and "groups" as the zone field name.
 */
function looksLikeDiagramSpec(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  // Must have title
  if (typeof obj.title !== "string") return false;
  // Must have nodes array
  if (!Array.isArray(obj.nodes)) return false;
  // Must have edges array
  if (!Array.isArray(obj.edges)) return false;
  // Must have groups OR zones array
  if (!Array.isArray(obj.groups) && !Array.isArray(obj.zones)) return false;
  return true;
}

/**
 * Normalize a diagram spec object: convert "groups" to "zones", ensure type field, etc.
 */
function normalizeDiagramSpec(obj: any): DiagramSpec | null {
  try {
    // Normalize groups → zones
    let zones = obj.zones || obj.groups;
    if (!Array.isArray(zones) || zones.length === 0) {
      // Auto-generate zones from node zone/group fields
      const zoneIds = new Set<string>();
      for (const n of obj.nodes) {
        const z = n.zone || n.group;
        if (z) zoneIds.add(z);
      }
      zones = Array.from(zoneIds).map((id) => ({ id, label: String(id) }));
    }

    // Normalize zone objects
    zones = zones.map((z: any) => ({
      id: z.id || z.name || String(z),
      label: z.label || z.name || z.id || String(z),
      color: z.color,
    }));

    // Normalize nodes
    const nodes = (obj.nodes || []).map((n: any) => ({
      id: n.id || `node_${Math.random().toString(36).slice(2, 8)}`,
      type: n.type || "server",
      label: n.label || n.name || n.id || "Node",
      zone: n.zone || n.group || (zones.length > 0 ? zones[0].id : "default"),
      ip: n.ip || n.address,
      details: n.details || n.description,
    }));

    // Normalize edges
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const edges = (obj.edges || [])
      .map((e: any) => ({
        from: e.from || e.source,
        to: e.to || e.target,
        label: e.label || e.description || "",
        style: e.style || "solid",
      }))
      .filter((e: any) => e.from && e.to && nodeIds.has(e.from) && nodeIds.has(e.to));

    // Determine type
    const type = obj.type || "network";

    const spec: DiagramSpec = {
      type: type as DiagramSpec["type"],
      title: obj.title || "Diagrama de Rede",
      zones,
      nodes,
      edges,
    };

    return spec;
  } catch {
    return null;
  }
}

/**
 * Try to extract the first valid JSON object from text.
 * Handles cases where JSON is embedded in text without proper fencing.
 */
function extractJsonFromText(text: string): any | null {
  // Strategy 1: Find first { and try to parse from there
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

  // Try progressively from the first brace
  let depth = 0;
  let start = firstBrace;
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          // Try next opening brace
          const nextBrace = text.indexOf("{", start + 1);
          if (nextBrace !== -1 && nextBrace < i) {
            start = nextBrace;
            depth = 0;
            i = nextBrace - 1;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Robust split content that detects diagram-spec in multiple formats:
 * 1. ```diagram-spec ... ``` (standard fence)
 * 2. ```json ... ``` with DiagramSpec fields
 * 3. Line "diagram-spec" followed by JSON
 * 4. Raw JSON with title/groups/nodes/edges fields
 */
function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];

  // First pass: extract fenced code blocks (mermaid, document-studio, diagram-spec, json)
  const blockRegex = /```(mermaid|document-studio|diagram-spec|json)\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let foundDiagramSpec = false;

  while ((match = blockRegex.exec(content)) !== null) {
    const blockType = match[1];
    const blockContent = match[2].trim();

    // Text before this block
    const textBefore = content.slice(lastIndex, match.index);

    if (blockType === "diagram-spec") {
      // Direct diagram-spec fence
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
      const spec = parseDiagramSpecRobust(blockContent);
      parts.push({
        type: "diagram-spec",
        content: blockContent,
        diagramSpec: spec || undefined,
      });
      foundDiagramSpec = true;
    } else if (blockType === "json") {
      // Check if this JSON block is actually a diagram spec
      const spec = parseDiagramSpecRobust(blockContent);
      if (spec) {
        if (textBefore.trim()) {
          parts.push({ type: "text", content: textBefore });
        }
        parts.push({
          type: "diagram-spec",
          content: blockContent,
          diagramSpec: spec,
        });
        foundDiagramSpec = true;
      } else {
        // Regular JSON block, treat as text
        if (textBefore.trim()) {
          parts.push({ type: "text", content: textBefore });
        }
        parts.push({ type: "text", content: match[0] });
      }
    } else if (blockType === "mermaid") {
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
      // Extract title from preceding text
      let title: string | undefined;
      const lines = textBefore.trim().split("\n");
      for (let j = lines.length - 1; j >= 0; j--) {
        const line = lines[j].trim();
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        const boldMatch = line.match(/^\*\*(.+?)\*\*/);
        if (headingMatch) { title = headingMatch[1]; break; }
        if (boldMatch) { title = boldMatch[1]; break; }
        if (line && !line.startsWith("-") && !line.startsWith("*")) break;
      }
      parts.push({
        type: "mermaid",
        content: blockContent,
        title: title || "Diagrama de Infraestrutura",
      });
    } else if (blockType === "document-studio") {
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
      parts.push({ type: "document", content: blockContent });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last block
  const remaining = content.slice(lastIndex);

  // If no diagram-spec was found in fenced blocks, try to detect it in remaining text
  if (!foundDiagramSpec && remaining.trim()) {
    const detected = detectUnfencedDiagramSpec(remaining);
    if (detected) {
      if (detected.textBefore.trim()) {
        parts.push({ type: "text", content: detected.textBefore });
      }
      parts.push({
        type: "diagram-spec",
        content: JSON.stringify(detected.spec, null, 2),
        diagramSpec: detected.spec,
      });
      if (detected.textAfter.trim()) {
        parts.push({ type: "text", content: detected.textAfter });
      }
      return parts;
    }
  }

  // Also check the full content if no fenced blocks were found at all
  if (!foundDiagramSpec && parts.length === 0) {
    const detected = detectUnfencedDiagramSpec(content);
    if (detected) {
      if (detected.textBefore.trim()) {
        parts.push({ type: "text", content: detected.textBefore });
      }
      parts.push({
        type: "diagram-spec",
        content: JSON.stringify(detected.spec, null, 2),
        diagramSpec: detected.spec,
      });
      if (detected.textAfter.trim()) {
        parts.push({ type: "text", content: detected.textAfter });
      }
      return parts;
    }
  }

  if (remaining.trim()) {
    parts.push({ type: "text", content: remaining });
  }

  return parts;
}

/**
 * Detect unfenced diagram-spec in text.
 * Handles:
 * - "diagram-spec" label followed by JSON
 * - Raw JSON with DiagramSpec fields
 */
function detectUnfencedDiagramSpec(text: string): { spec: DiagramSpec; textBefore: string; textAfter: string } | null {
  // Strategy 1: Look for "diagram-spec" label followed by JSON
  const labelMatch = text.match(/diagram[-_]?spec\s*[\n:]\s*/i);
  if (labelMatch && labelMatch.index !== undefined) {
    const afterLabel = text.slice(labelMatch.index + labelMatch[0].length);
    const json = extractJsonFromText(afterLabel);
    if (json && looksLikeDiagramSpec(json)) {
      const spec = normalizeDiagramSpec(json);
      if (spec) {
        const textBefore = text.slice(0, labelMatch.index);
        // Find end of JSON in original text
        const jsonStr = JSON.stringify(json);
        const jsonEnd = findJsonEndInText(text, labelMatch.index + labelMatch[0].length);
        const textAfter = jsonEnd !== -1 ? text.slice(jsonEnd) : "";
        return { spec, textBefore, textAfter };
      }
    }
  }

  // Strategy 2: Look for raw JSON with DiagramSpec fields
  const json = extractJsonFromText(text);
  if (json && looksLikeDiagramSpec(json)) {
    const spec = normalizeDiagramSpec(json);
    if (spec && spec.nodes.length >= 3) { // Only render if it has meaningful content
      const firstBrace = text.indexOf("{");
      const textBefore = text.slice(0, firstBrace);
      const jsonEnd = findJsonEndInText(text, firstBrace);
      const textAfter = jsonEnd !== -1 ? text.slice(jsonEnd) : "";
      return { spec, textBefore, textAfter };
    }
  }

  return null;
}

/**
 * Find the end position of a JSON object in text starting from a given position.
 */
function findJsonEndInText(text: string, startFrom: number): number {
  let depth = 0;
  for (let i = startFrom; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Robust parser for DiagramSpec that handles various formats and normalizes the data.
 */
function parseDiagramSpecRobust(text: string): DiagramSpec | null {
  try {
    // Try direct JSON parse first
    let obj: any;
    try {
      obj = JSON.parse(text);
    } catch {
      // Try extracting JSON from text
      obj = extractJsonFromText(text);
    }

    if (!obj) return null;
    if (!looksLikeDiagramSpec(obj)) return null;

    return normalizeDiagramSpec(obj);
  } catch {
    return null;
  }
}
