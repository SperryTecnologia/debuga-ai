import { useMemo, lazy, Suspense, useState, useCallback, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import type { MermaidConfig } from "mermaid";
import { ImageOff, Loader2, X, Download, ZoomIn, RefreshCw } from "lucide-react";
import DiagramErrorBoundary from "./DiagramErrorBoundary";

const MermaidRenderer = lazy(() => import("./MermaidRenderer"));
const DocumentRenderer = lazy(() => import("./DocumentRenderer"));
const NetworkDiagramRenderer = lazy(() => import("./NetworkDiagramRenderer"));
import { parseDiagramSpec, type DiagramSpec } from "./NetworkDiagramRenderer";

interface MessageWithMermaidProps {
  content: string;
  mermaidConfig: MermaidConfig;
  isAnimating?: boolean;
  onRegenerate?: () => void;
}

interface ContentPart {
  type: "text" | "mermaid" | "document" | "diagram-spec";
  content: string;
  title?: string;
  diagramSpec?: DiagramSpec;
}

/**
 * Lightbox modal for viewing images full-screen
 */
function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>
      <a
        href={src}
        download
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-16 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Download"
      >
        <Download className="w-6 h-6" />
      </a>
      <img
        src={src}
        alt={alt || "Imagem gerada"}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [hasError, setHasError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const handleError = useCallback(() => setHasError(true), []);
  const handleClose = useCallback(() => setLightboxOpen(false), []);

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
    <>
      <div className="relative group my-3 inline-block">
        <img
          {...props}
          onError={handleError}
          className="rounded-lg max-w-full max-h-96 border border-border shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setLightboxOpen(true)}
          loading="lazy"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-1.5 rounded-full bg-black/50 text-white">
            <ZoomIn className="w-4 h-4" />
          </div>
        </div>
      </div>
      {lightboxOpen && props.src && (
        <ImageLightbox src={props.src} alt={props.alt} onClose={handleClose} />
      )}
    </>
  );
}

/**
 * Fallback component shown when diagram parsing fails.
 * Never shows raw JSON to the user.
 */
function DiagramParseFailedCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="my-4 rounded-xl border border-slate-700/50 bg-[#0a0f1a] p-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200">
            Diagrama em processamento
          </p>
          <p className="text-xs text-slate-400 mt-1">
            O diagrama foi gerado mas não pôde ser renderizado corretamente. Isso pode ocorrer quando a resposta é muito longa.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/30 rounded-md hover:bg-green-500/20 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar renderizar novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Placeholder shown during streaming while diagram JSON is being generated.
 * After 60 seconds, shows a timeout message with a regenerate action.
 */
function DiagramStreamingPlaceholder({ onRegenerate }: { onRegenerate?: () => void }) {
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setTimedOut(true), 60000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (timedOut) {
    return (
      <div className="my-4 rounded-xl border border-amber-500/30 bg-[#0a0f1a] p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">
              O diagrama está demorando mais que o esperado.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              A geração pode ter encontrado dificuldades com a complexidade solicitada.
            </p>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/30 rounded-md hover:bg-green-500/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Pedir ao agente para regenerar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border border-slate-700/50 bg-[#0a0f1a] p-8 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-green-500" />
        <span className="text-sm font-mono">Gerando diagrama de rede...</span>
      </div>
    </div>
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
  onRegenerate,
}: MessageWithMermaidProps) {
  const [retryKey, setRetryKey] = useState(0);
  const parts = useMemo(() => splitContent(content, isAnimating), [content, isAnimating, retryKey]);

  const imageComponents = useMemo(() => ({
    img: ImageWithFallback,
  }), []);

  const handleRetry = useCallback(() => {
    setRetryKey((k) => k + 1);
  }, []);

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
          // During streaming with incomplete JSON, show placeholder
          if (isAnimating && !part.diagramSpec) {
            return <DiagramStreamingPlaceholder key={i} onRegenerate={onRegenerate} />;
          }

          if (part.diagramSpec) {
            return (
              <DiagramErrorBoundary key={`${i}-${retryKey}`} fallbackTitle="Erro ao renderizar diagrama de rede">
                <Suspense
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
              </DiagramErrorBoundary>
            );
          }

          // Parsing failed (non-streaming) — show friendly card, NEVER raw JSON
          return <DiagramParseFailedCard key={i} onRetry={handleRetry} />;
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
  if (typeof obj.title !== "string") return false;
  if (!Array.isArray(obj.nodes)) return false;
  if (!Array.isArray(obj.edges)) return false;
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

    // Normalize nodes — ensure all fields are primitives
    const nodes = (obj.nodes || []).map((n: any) => ({
      id: String(n.id || `node_${Math.random().toString(36).slice(2, 8)}`),
      type: String(n.type || "server"),
      label: String(n.label || n.name || n.id || "Node"),
      zone: String(n.zone || n.group || (zones.length > 0 ? zones[0].id : "default")),
      ip: n.ip ? String(n.ip) : n.address ? String(n.address) : undefined,
      details: n.details ? String(n.details) : n.description ? String(n.description) : undefined,
      vlan: n.vlan ? String(n.vlan) : undefined,
      port: n.port ? String(n.port) : undefined,
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
      title: String(obj.title || "Diagrama de Rede"),
      zones,
      nodes,
      edges,
      // Premium metadata
      summary: typeof obj.summary === "string" ? obj.summary : undefined,
      securityNotes: Array.isArray(obj.securityNotes)
        ? obj.securityNotes.filter((s: any) => typeof s === "string").map(String)
        : undefined,
      nextSteps: Array.isArray(obj.nextSteps)
        ? obj.nextSteps.filter((s: any) => typeof s === "string").map(String)
        : undefined,
      businessValue: typeof obj.businessValue === "string" ? obj.businessValue : undefined,
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
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

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
 * Attempt to repair truncated JSON by closing open brackets/braces.
 * This handles cases where the LLM output was cut off mid-JSON.
 */
function repairTruncatedJson(text: string): any | null {
  // Remove trailing incomplete strings (e.g., "label": "some text...)
  let cleaned = text.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, "");
  // Also remove trailing comma
  cleaned = cleaned.replace(/,\s*$/, "");

  // Count open brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }

  // Close open brackets/braces
  let repaired = cleaned;
  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

/**
 * Check if content has diagram markers indicating the LLM is generating a diagram.
 */
function hasDiagramMarkers(content: string): boolean {
  return (
    content.includes('"nodes"') ||
    content.includes('"zones"') ||
    content.includes("diagram-spec") ||
    content.includes('"edges"')
  );
}

/**
 * Check if a diagram-spec code block is complete (has closing ```).
 */
function isDiagramJsonComplete(content: string): boolean {
  // Check if there's a complete ```diagram-spec ... ``` block
  const hasCompleteFence = /```(?:diagram-spec|json)\s*\n[\s\S]*?```/.test(content);
  if (hasCompleteFence) return true;

  // Check if there's an unfenced complete JSON (balanced braces after "nodes")
  const nodesIdx = content.indexOf('"nodes"');
  if (nodesIdx === -1) return false;

  // Find the start of the JSON object
  const firstBrace = content.lastIndexOf("{", nodesIdx);
  if (firstBrace === -1) return false;

  let depth = 0;
  for (let i = firstBrace; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") {
      depth--;
      if (depth === 0) return true;
    }
  }

  return false;
}

/**
 * Robust split content that detects diagram-spec in multiple formats:
 * 1. ```diagram-spec ... ``` (standard fence)
 * 2. ```json ... ``` with DiagramSpec fields
 * 3. Line "diagram-spec" followed by JSON
 * 4. Raw JSON with title/groups/nodes/edges fields
 *
 * During streaming (isAnimating=true), shows placeholder for incomplete diagrams.
 */
function splitContent(content: string, isAnimating = false): ContentPart[] {
  const parts: ContentPart[] = [];

  // During streaming: if content has diagram markers but JSON is incomplete,
  // skip diagram parsing entirely and show a placeholder
  const skipDiagramParsing = isAnimating && hasDiagramMarkers(content) && !isDiagramJsonComplete(content);

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
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
      if (skipDiagramParsing) {
        // During streaming, show placeholder
        parts.push({ type: "diagram-spec", content: blockContent, diagramSpec: undefined });
      } else {
        const spec = parseDiagramSpecRobust(blockContent);
        parts.push({
          type: "diagram-spec",
          content: blockContent,
          diagramSpec: spec || undefined,
        });
      }
      foundDiagramSpec = true;
    } else if (blockType === "json") {
      if (skipDiagramParsing) {
        if (textBefore.trim()) {
          parts.push({ type: "text", content: textBefore });
        }
        parts.push({ type: "text", content: match[0] });
      } else {
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
          if (textBefore.trim()) {
            parts.push({ type: "text", content: textBefore });
          }
          parts.push({ type: "text", content: match[0] });
        }
      }
    } else if (blockType === "mermaid") {
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
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

  // During streaming with incomplete diagram, show placeholder for remaining content with markers
  if (skipDiagramParsing && !foundDiagramSpec && hasDiagramMarkers(remaining)) {
    // Extract text before the JSON starts
    const jsonStart = remaining.indexOf("{");
    if (jsonStart > 0) {
      const textBefore = remaining.slice(0, jsonStart).replace(/```(?:diagram-spec|json)?\s*\n?$/, "").trim();
      if (textBefore) {
        parts.push({ type: "text", content: textBefore });
      }
    }
    parts.push({ type: "diagram-spec", content: "", diagramSpec: undefined });
    return parts;
  }

  // If no diagram-spec was found in fenced blocks, try to detect it in remaining text
  if (!foundDiagramSpec && !skipDiagramParsing && remaining.trim()) {
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
  if (!foundDiagramSpec && !skipDiagramParsing && parts.length === 0) {
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
    if (spec && spec.nodes.length >= 3) {
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
 * Includes JSON repair for truncated content.
 */
function parseDiagramSpecRobust(text: string): DiagramSpec | null {
  try {
    let obj: any;

    // Try direct JSON parse first
    try {
      obj = JSON.parse(text);
    } catch {
      // Try extracting JSON from text
      obj = extractJsonFromText(text);
    }

    // If still null, try repairing truncated JSON
    if (!obj) {
      obj = repairTruncatedJson(text);
    }

    if (!obj) return null;
    if (!looksLikeDiagramSpec(obj)) return null;

    return normalizeDiagramSpec(obj);
  } catch {
    return null;
  }
}
