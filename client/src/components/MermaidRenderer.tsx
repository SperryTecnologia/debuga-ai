import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import mermaid from "mermaid";
import jsPDF from "jspdf";
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Move,
  Download,
  Copy,
  Check,
  X,
  FileImage,
  FileText,
  FileCode,
  Expand,
} from "lucide-react";

// Initialize mermaid with debuga.ai dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  darkMode: true,
  securityLevel: "loose",
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  themeVariables: {
    primaryColor: "#166534",
    primaryTextColor: "#f0fdf4",
    primaryBorderColor: "#22c55e",
    lineColor: "#22c55e",
    secondaryColor: "#0f172a",
    tertiaryColor: "#1e293b",
    background: "#0a0a0a",
    mainBkg: "#0f172a",
    secondBkg: "#1e293b",
    nodeBorder: "#22c55e",
    clusterBkg: "#0f172a80",
    clusterBorder: "#22c55e40",
    titleColor: "#22c55e",
    edgeLabelBackground: "#0a0a0a",
    nodeTextColor: "#f0fdf4",
    actorTextColor: "#f0fdf4",
    actorBorder: "#22c55e",
    signalColor: "#22c55e",
    labelBoxBkgColor: "#0f172a",
    labelBoxBorderColor: "#22c55e",
    labelTextColor: "#f0fdf4",
    loopTextColor: "#f0fdf4",
    noteBkgColor: "#1e293b",
    noteTextColor: "#f0fdf4",
    noteBorderColor: "#22c55e40",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    nodeSpacing: 50,
    rankSpacing: 60,
    padding: 15,
    useMaxWidth: false, // Let SVG use its natural size for better scaling
  },
});

interface MermaidRendererProps {
  code: string;
  title?: string;
}

/** Extract the natural width/height from the rendered SVG string */
function getSvgDimensions(svgStr: string): { width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgStr, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return { width: 800, height: 600 };

  // Try viewBox first
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  // Fallback to width/height attributes
  const w = parseFloat(svg.getAttribute("width") || "800");
  const h = parseFloat(svg.getAttribute("height") || "600");
  return { width: w || 800, height: h || 600 };
}

/**
 * Sanitize Mermaid code to prevent common syntax errors from LLM output.
 * - Remove invisible/zero-width characters
 * - Normalize line endings
 * - Fix common LLM formatting issues
 * - Remove HTML entities that break parsing
 */
function sanitizeMermaidCode(raw: string): string {
  let code = raw
    // Remove zero-width characters
    .replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, "")
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove leading/trailing whitespace per line but preserve indentation
    .replace(/^[ \t]+$/gm, "")
    // Remove HTML entities that LLMs sometimes inject
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Fix double-escaped newlines from JSON
    .replace(/\\n/g, "\n")
    // Remove markdown bold/italic inside node labels (common LLM mistake)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Remove emoji that can break mermaid parsing
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/gu, "")
    // Fix unbalanced quotes in node labels (common LLM mistake)
    .replace(/\["([^"\]]*?)\]/g, '["$1"]')
    // Remove trailing semicolons that break some diagram types
    .replace(/;\s*$/gm, "")
    // Trim
    .trim();

  // If the code starts with ```mermaid or ```, strip it
  if (code.startsWith("```mermaid")) {
    code = code.replace(/^```mermaid\s*\n?/, "").replace(/\n?```\s*$/, "");
  } else if (code.startsWith("```")) {
    code = code.replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Fix common LLM issues with graph direction
  // e.g., "graph TD;" should be "graph TD"
  code = code.replace(/^(graph\s+(?:TD|TB|BT|LR|RL|))\s*;/gm, "$1");
  // Fix "flowchart TD;" → "flowchart TD"
  code = code.replace(/^(flowchart\s+(?:TD|TB|BT|LR|RL|))\s*;/gm, "$1");

  return code;
}

export default function MermaidRenderer({ code: rawCode, title }: MermaidRendererProps) {
  const code = useMemo(() => sanitizeMermaidCode(rawCode), [rawCode]);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalAreaRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Get SVG natural dimensions
  const svgDims = useMemo(() => getSvgDimensions(svgContent), [svgContent]);

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
        setRenderError(null);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setRenderError("Não foi possível renderizar o diagrama. Tente novamente.");
      }
    };
    if (code.trim()) {
      renderDiagram();
    }
  }, [code]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate fit-to-width zoom when opening fullscreen
  useEffect(() => {
    if (isFullscreen && svgContent) {
      // Wait for modal to render
      requestAnimationFrame(() => {
        const area = modalAreaRef.current;
        if (!area) return;

        const areaW = area.clientWidth - 64; // padding
        const areaH = area.clientHeight - 64;
        const { width: svgW, height: svgH } = svgDims;

        // Calculate zoom to fit width, clamped between 0.5 and 2.0
        const fitW = areaW / svgW;
        const fitH = areaH / svgH;
        // Use the smaller of the two to ensure it fits, but prefer width
        const fitZoom = Math.min(fitW, fitH);
        // Clamp: minimum 0.5 (never microscopic), maximum 2.0
        const initialZoom = Math.max(0.5, Math.min(2.0, fitZoom));

        setZoom(initialZoom);
        setPan({ x: 0, y: 0 });
      });
    }
  }, [isFullscreen, svgContent, svgDims]);

  // Escape key to close fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.25));
  }, []);

  // Fit to width: calculate zoom so SVG width fills the viewport
  const handleFitToWidth = useCallback(() => {
    const area = modalAreaRef.current;
    if (!area) return;
    const areaW = area.clientWidth - 64;
    const fitZoom = areaW / svgDims.width;
    setZoom(Math.max(0.5, Math.min(3.0, fitZoom)));
    setPan({ x: 0, y: 0 });
  }, [svgDims]);

  // Fit to screen: fit both dimensions
  const handleFitToScreen = useCallback(() => {
    const area = modalAreaRef.current;
    if (!area) return;
    const areaW = area.clientWidth - 64;
    const areaH = area.clientHeight - 64;
    const fitZoom = Math.min(areaW / svgDims.width, areaH / svgDims.height);
    setZoom(Math.max(0.5, Math.min(3.0, fitZoom)));
    setPan({ x: 0, y: 0 });
  }, [svgDims]);

  // Reset to 100%
  const handleReset100 = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isFullscreen) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [isFullscreen, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && isFullscreen) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    },
    [isPanning, isFullscreen, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isFullscreen) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setZoom((z) => Math.max(0.25, Math.min(5, z + delta)));
      }
    },
    [isFullscreen]
  );

  // Touch support for mobile pan
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isFullscreen && e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
      }
    },
    [isFullscreen, pan]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isFullscreen && touchStartRef.current && e.touches.length === 1) {
        const touch = e.touches[0];
        setPan({
          x: touch.clientX - touchStartRef.current.x,
          y: touch.clientY - touchStartRef.current.y,
        });
      }
    },
    [isFullscreen]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
  }, []);

  // Copy mermaid code
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  // Get clean SVG for export — tightly cropped, no wasted space
  const getCleanSvg = useCallback((): string => {
    if (!svgContent) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return svgContent;

    // Set explicit background
    svg.style.backgroundColor = "#0a0a0a";

    // Ensure viewBox is set with tight bounds
    if (!svg.getAttribute("viewBox")) {
      const w = svg.getAttribute("width") || String(svgDims.width);
      const h = svg.getAttribute("height") || String(svgDims.height);
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }

    return new XMLSerializer().serializeToString(svg);
  }, [svgContent, svgDims]);

  // Export as SVG
  const exportSvg = useCallback(() => {
    const svg = getCleanSvg();
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "diagrama-debuga"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [getCleanSvg, title]);

  // Helper: render SVG to canvas without tainting (data URL approach)
  const svgToCanvas = useCallback(
    async (svgStr: string): Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null> => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return null;

      const { width, height } = getSvgDimensions(svgStr);

      // Set explicit dimensions
      svgEl.setAttribute("width", String(width));
      svgEl.setAttribute("height", String(height));

      // Remove external references that cause tainted canvas
      svgEl.querySelectorAll("image").forEach((img) => img.remove());

      const serialized = new XMLSerializer().serializeToString(svgEl);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

      // 3x scale for high-res export
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Dark background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({ canvas, width, height });
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    },
    []
  );

  // Export as PNG
  const exportPng = useCallback(async () => {
    const svg = getCleanSvg();
    if (!svg) return;

    const result = await svgToCanvas(svg);
    if (!result) {
      setShowExportMenu(false);
      return;
    }

    result.canvas.toBlob(
      (b) => {
        if (b) {
          const downloadUrl = URL.createObjectURL(b);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `${title || "diagrama-debuga"}.png`;
          a.click();
          URL.revokeObjectURL(downloadUrl);
        }
        setShowExportMenu(false);
      },
      "image/png",
      1.0
    );
  }, [getCleanSvg, title, svgToCanvas]);

  // Export as PDF
  const exportPdf = useCallback(async () => {
    const svg = getCleanSvg();
    if (!svg) return;

    const result = await svgToCanvas(svg);
    if (!result) {
      setShowExportMenu(false);
      return;
    }

    const { canvas, width, height } = result;
    const imgData = canvas.toDataURL("image/png", 1.0);

    // Add padding around diagram
    const pad = 60;
    const orientation = width > height ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [width + pad * 2, height + pad + 100], // extra top for title
    });

    // Dark background
    pdf.setFillColor(10, 10, 10);
    pdf.rect(0, 0, width + pad * 2, height + pad + 100, "F");

    // Title
    pdf.setTextColor(34, 197, 94);
    pdf.setFontSize(16);
    pdf.text(title || "Diagrama de Infraestrutura", pad, 35);

    // Subtitle
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(10);
    pdf.text(`debuga.ai — Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pad, 52);

    // Diagram — tight to the content, no wasted space
    pdf.addImage(imgData, "PNG", pad, 70, width, height);

    pdf.save(`${title || "diagrama-debuga"}.pdf`);
    setShowExportMenu(false);
  }, [getCleanSvg, title, svgToCanvas]);

  // Export .mmd source
  const exportMmd = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "diagrama-debuga"}.mmd`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [code, title]);

  // Error state
  if (renderError) {
    return (
      <div className="my-4 rounded-xl border border-yellow-500/30 bg-[#0f172a] p-5">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <FileCode className="h-4 w-4" />
          <span className="text-sm font-medium">Diagrama não pôde ser renderizado</span>
        </div>
        <p className="text-sm text-slate-400">
          A sintaxe do diagrama contém erros. Copie o código e peça para o agente corrigir, ou tente novamente.
        </p>
        <div className="mt-3 rounded-lg bg-[#0a0a0a] border border-slate-700 p-3 overflow-x-auto max-h-48">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{code}</pre>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => { setRenderError(null); setSvgContent(""); }}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Tentar novamente
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copiado!" : "Copiar código"}
          </button>
        </div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="my-4 rounded-xl border border-slate-700/50 bg-[#0a0a0a] p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Renderizando diagrama...</span>
        </div>
      </div>
    );
  }

  // Inline preview — use the SVG at natural size, scrollable
  const inlinePreview = (
    <div className="my-4 group" ref={containerRef}>
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-slate-700/50 bg-[#0f172a] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs font-mono text-slate-400 ml-2">
            {title || "Diagrama de Infraestrutura"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Copiar código Mermaid"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
              title="Exportar diagrama"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-slate-700 bg-[#0f172a] shadow-xl shadow-black/50 overflow-hidden">
                <button
                  onClick={exportPng}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-green-500/10 hover:text-green-400 transition-colors"
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Baixar PNG (3x)
                </button>
                <button
                  onClick={exportSvg}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-green-500/10 hover:text-green-400 transition-colors"
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Baixar SVG
                </button>
                <button
                  onClick={exportPdf}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-300 hover:bg-green-500/10 hover:text-green-400 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Baixar PDF
                </button>
                <div className="border-t border-slate-700/50" />
                <button
                  onClick={exportMmd}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-500 hover:bg-slate-700/30 hover:text-slate-400 transition-colors"
                >
                  <FileCode className="h-3.5 w-3.5" />
                  Código fonte (.mmd)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Tela cheia"
          >
            <Expand className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Diagram preview — scrollable, shows diagram at readable size */}
      <div
        className="rounded-b-xl border border-slate-700/50 bg-[#0a0a0a] overflow-auto cursor-pointer hover:border-green-500/30 transition-colors"
        onClick={() => setIsFullscreen(true)}
        style={{ maxHeight: "500px" }}
      >
        <div
          className="mermaid-diagram-preview p-4"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            minHeight: "200px",
            minWidth: "fit-content",
          }}
        />
      </div>
    </div>
  );

  // Fullscreen modal
  const fullscreenModal = isFullscreen ? (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0a]/98 backdrop-blur-sm"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Modal header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-[#0f172a]/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-sm font-mono text-green-400">
            {title || "Diagrama de Infraestrutura"}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            debuga.ai
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="rounded-md p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Diminuir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500 font-mono min-w-[3.5rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded-md p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-slate-700 mx-0.5" />

          <button
            onClick={handleReset100}
            className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all font-mono"
            title="Zoom 100%"
          >
            100%
          </button>
          <button
            onClick={handleFitToWidth}
            className="rounded-md p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Ajustar à largura"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="rounded-md p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Ajustar à tela"
          >
            <Minimize2 className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-slate-700 mx-0.5" />

          {/* Export buttons */}
          <button
            onClick={exportPng}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Baixar PNG"
          >
            <FileImage className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PNG</span>
          </button>
          <button
            onClick={exportSvg}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Baixar SVG"
          >
            <FileImage className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">SVG</span>
          </button>
          <button
            onClick={exportPdf}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Baixar PDF"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <div className="w-px h-5 bg-slate-700 mx-0.5" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Copiar código"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <div className="w-px h-5 bg-slate-700 mx-0.5" />

          <button
            onClick={() => setIsFullscreen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-all"
            title="Fechar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Diagram area — the SVG is rendered at its natural size * zoom */}
      <div
        ref={modalAreaRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: isPanning ? "none" : "transform 0.15s ease-out",
          }}
        >
          <div
            className="mermaid-diagram-fullscreen"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.2s ease-out",
              padding: "32px",
            }}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-4 border-t border-slate-700/50 bg-[#0f172a]/90 px-4 py-2 backdrop-blur-sm">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Move className="h-3 w-3" /> Arrastar para mover
        </span>
        <span className="text-xs text-slate-500">Scroll para zoom</span>
        <span className="text-xs text-slate-500">Esc para fechar</span>
      </div>
    </div>
  ) : null;

  return (
    <>
      {inlinePreview}
      {fullscreenModal}
    </>
  );
}
