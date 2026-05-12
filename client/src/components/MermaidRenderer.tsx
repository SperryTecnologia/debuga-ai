import { useCallback, useEffect, useRef, useState } from "react";
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
    useMaxWidth: true,
  },
});

interface MermaidRendererProps {
  code: string;
  title?: string;
}

export default function MermaidRenderer({ code, title }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
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

  // Reset zoom/pan when opening fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

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
    setZoom((z) => Math.min(z + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.25, 0.25));
  }, []);

  const handleFitToScreen = useCallback(() => {
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
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((z) => Math.max(0.25, Math.min(4, z + delta)));
      }
    },
    [isFullscreen]
  );

  // Copy mermaid code
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
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

  // Get clean SVG for export
  const getCleanSvg = useCallback((): string => {
    if (!svgContent) return "";
    // Parse and clean the SVG
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (!svg) return svgContent;

    // Set explicit background
    svg.style.backgroundColor = "#0a0a0a";
    // Ensure viewBox is set
    if (!svg.getAttribute("viewBox")) {
      const width = svg.getAttribute("width") || "800";
      const height = svg.getAttribute("height") || "600";
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    return new XMLSerializer().serializeToString(svg);
  }, [svgContent]);

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

  // Export as PNG
  const exportPng = useCallback(async () => {
    const svg = getCleanSvg();
    if (!svg) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;

    // Get dimensions
    const viewBox = svgEl.getAttribute("viewBox")?.split(" ").map(Number);
    const width = viewBox ? viewBox[2] : parseInt(svgEl.getAttribute("width") || "800");
    const height = viewBox ? viewBox[3] : parseInt(svgEl.getAttribute("height") || "600");

    // Scale up for high quality
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ensure SVG has explicit dimensions for rendering
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));
    const svgStr = new XMLSerializer().serializeToString(svgEl);

    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (b) => {
            if (b) {
              const downloadUrl = URL.createObjectURL(b);
              const a = document.createElement("a");
              a.href = downloadUrl;
              a.download = `${title || "diagrama-debuga"}.png`;
              a.click();
              URL.revokeObjectURL(downloadUrl);
            }
            URL.revokeObjectURL(url);
            setShowExportMenu(false);
            resolve();
          },
          "image/png",
          1.0
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
        resolve();
      };
      img.src = url;
    });
  }, [getCleanSvg, title]);

  // Export as PDF
  const exportPdf = useCallback(async () => {
    const svg = getCleanSvg();
    if (!svg) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return;

    const viewBox = svgEl.getAttribute("viewBox")?.split(" ").map(Number);
    const width = viewBox ? viewBox[2] : parseInt(svgEl.getAttribute("width") || "800");
    const height = viewBox ? viewBox[3] : parseInt(svgEl.getAttribute("height") || "600");

    // Scale for quality
    const scale = 3;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));
    const svgStr = new XMLSerializer().serializeToString(svgEl);

    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return new Promise<void>((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = canvas.toDataURL("image/png", 1.0);

        // PDF in landscape if wider than tall
        const orientation = width > height ? "landscape" : "portrait";
        const pdf = new jsPDF({
          orientation,
          unit: "px",
          format: [width + 80, height + 120],
        });

        // Dark background
        pdf.setFillColor(10, 10, 10);
        pdf.rect(0, 0, width + 80, height + 120, "F");

        // Title
        pdf.setTextColor(34, 197, 94);
        pdf.setFontSize(16);
        pdf.text(title || "Diagrama de Infraestrutura", 40, 35);

        // Subtitle
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(10);
        pdf.text(`debuga.ai — Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 40, 52);

        // Diagram
        pdf.addImage(imgData, "PNG", 40, 70, width, height);

        pdf.save(`${title || "diagrama-debuga"}.pdf`);
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
        resolve();
      };
      img.src = url;
    });
  }, [getCleanSvg, title]);

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

  // Render error fallback
  if (renderError) {
    return (
      <div className="my-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <FileCode className="h-4 w-4" />
          <span className="text-sm font-medium">Diagrama em processamento</span>
        </div>
        <p className="text-sm text-slate-400">
          O diagrama está sendo ajustado para melhor visualização. Você pode copiar o código fonte abaixo.
        </p>
        <div className="mt-3 rounded-lg bg-[#0a0a0a] border border-slate-700 p-3 overflow-x-auto">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{code}</pre>
        </div>
        <button
          onClick={handleCopy}
          className="mt-2 flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado!" : "Copiar código"}
        </button>
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

  // Inline preview
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
                  Baixar PNG
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

      {/* Diagram preview */}
      <div
        className="rounded-b-xl border border-slate-700/50 bg-[#0a0a0a] p-4 overflow-hidden cursor-pointer hover:border-green-500/30 transition-colors"
        onClick={() => setIsFullscreen(true)}
      >
        <div
          className="mermaid-diagram-preview w-full overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ minHeight: "200px" }}
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
          <span className="text-xs text-slate-500 font-mono min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded-md p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitToScreen}
            className="rounded-md p-1.5 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Ajustar à tela"
          >
            <Minimize2 className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-slate-700 mx-1" />

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

          <div className="w-px h-5 bg-slate-700 mx-1" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-slate-700/50 transition-all"
            title="Copiar código"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <div className="w-px h-5 bg-slate-700 mx-1" />

          <button
            onClick={() => setIsFullscreen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-all"
            title="Fechar (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Diagram area */}
      <div
        ref={modalContainerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.2s ease-out",
          }}
        >
          <div
            className="mermaid-diagram-fullscreen p-8"
            dangerouslySetInnerHTML={{ __html: svgContent }}
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
