import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import {
  Maximize2,
  Minimize2,
  Copy,
  Download,
  FileImage,
  FileText,
  FileCode,
  Check,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Initialize mermaid with dark theme aligned to debuga.ai
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  darkMode: true,
  themeVariables: {
    primaryColor: "#052e16",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#22c55e",
    lineColor: "#22c55e",
    secondaryColor: "#1e293b",
    tertiaryColor: "#0f172a",
    background: "#0a0a0a",
    mainBkg: "#0f172a",
    nodeBorder: "#22c55e",
    clusterBkg: "#0f172a",
    clusterBorder: "#334155",
    titleColor: "#22c55e",
    edgeLabelBackground: "#1e293b",
    nodeTextColor: "#ffffff",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    padding: 15,
    nodeSpacing: 50,
    rankSpacing: 60,
  },
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 12,
});

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rendering, setRendering] = useState(true);
  const idRef = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

  // Render mermaid diagram
  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      setRendering(true);
      setError(null);
      try {
        const { svg } = await mermaid.render(idRef.current, code.trim());
        if (!cancelled) {
          setSvgContent(svg);
          setRendering(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError("Não foi possível renderizar o diagrama.");
          setRendering(false);
        }
        // Clean up mermaid error element
        const errorEl = document.getElementById(`d${idRef.current}`);
        if (errorEl) errorEl.remove();
      }
    };
    renderDiagram();
    return () => { cancelled = true; };
  }, [code]);

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [code]);

  // Download SVG
  const handleDownloadSVG = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    downloadBlob(blob, "diagrama-debuga.svg");
  }, [svgContent]);

  // Download PNG
  const handleDownloadPNG = useCallback(async () => {
    if (!svgContent) return;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const scale = 3; // High-res export
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, "diagrama-debuga.png");
        }, "image/png");
      };
      img.src = url;
    } catch { /* ignore */ }
  }, [svgContent]);

  // Download PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!svgContent) return;
    try {
      const { jsPDF } = await import("jspdf");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const scale = 3;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const imgData = canvas.toDataURL("image/png");
        const orientation = img.width > img.height ? "landscape" : "portrait";
        const pdf = new jsPDF({ orientation, unit: "px", format: [img.width, img.height] });
        pdf.addImage(imgData, "PNG", 0, 0, img.width, img.height);
        pdf.save("diagrama-debuga.pdf");
      };
      img.src = url;
    } catch { /* ignore */ }
  }, [svgContent]);

  // Download .mmd source
  const handleDownloadMMD = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    downloadBlob(blob, "diagrama-debuga.mmd");
  }, [code]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 3)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.5)), []);

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  if (error) {
    return (
      <div className={cn("my-4 rounded-xl border border-border bg-card p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <FileCode className="w-4 h-4" />
          <span>Diagrama Mermaid</span>
        </div>
        <pre className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground overflow-x-auto font-mono whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    );
  }

  const diagramContent = (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        transition: "transform 0.2s ease",
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0a]/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FileImage className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-foreground font-mono">
              Diagrama — debuga.ai
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ControlButton onClick={zoomOut} title="Reduzir">
              <ZoomOut className="w-3.5 h-3.5" />
            </ControlButton>
            <span className="text-xs text-muted-foreground font-mono px-2">
              {Math.round(zoom * 100)}%
            </span>
            <ControlButton onClick={zoomIn} title="Ampliar">
              <ZoomIn className="w-3.5 h-3.5" />
            </ControlButton>
            <div className="w-px h-4 bg-border mx-1" />
            <ControlButton onClick={handleCopy} title="Copiar código">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </ControlButton>
            <ControlButton onClick={handleDownloadSVG} title="Baixar SVG">
              <Download className="w-3.5 h-3.5" />
            </ControlButton>
            <ControlButton onClick={handleDownloadPNG} title="Baixar PNG">
              <FileImage className="w-3.5 h-3.5" />
            </ControlButton>
            <ControlButton onClick={handleDownloadPDF} title="Baixar PDF">
              <FileText className="w-3.5 h-3.5" />
            </ControlButton>
            <ControlButton onClick={handleDownloadMMD} title="Baixar .mmd">
              <FileCode className="w-3.5 h-3.5" />
            </ControlButton>
            <div className="w-px h-4 bg-border mx-1" />
            <ControlButton onClick={toggleFullscreen} title="Fechar">
              <X className="w-4 h-4" />
            </ControlButton>
          </div>
        </div>
        {/* Diagram area */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
          {diagramContent}
        </div>
      </div>
    );
  }

  // Normal inline view
  return (
    <div className={cn(
      "my-4 rounded-xl border border-emerald-900/50 bg-[#0a0a0a] overflow-hidden shadow-lg shadow-emerald-950/20",
      className
    )}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-900/30 bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <FileImage className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-300 font-mono tracking-wide">
            DIAGRAMA TÉCNICO
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-mono">
            debuga.ai
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <ControlButton onClick={zoomOut} title="Reduzir" small>
            <ZoomOut className="w-3 h-3" />
          </ControlButton>
          <span className="text-[10px] text-muted-foreground font-mono px-1">
            {Math.round(zoom * 100)}%
          </span>
          <ControlButton onClick={zoomIn} title="Ampliar" small>
            <ZoomIn className="w-3 h-3" />
          </ControlButton>
          <div className="w-px h-3 bg-border mx-1" />
          <ControlButton onClick={handleCopy} title="Copiar código" small>
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </ControlButton>
          <ControlButton onClick={handleDownloadSVG} title="SVG" small>
            <Download className="w-3 h-3" />
          </ControlButton>
          <ControlButton onClick={handleDownloadPNG} title="PNG" small>
            <FileImage className="w-3 h-3" />
          </ControlButton>
          <ControlButton onClick={handleDownloadPDF} title="PDF" small>
            <FileText className="w-3 h-3" />
          </ControlButton>
          <ControlButton onClick={handleDownloadMMD} title=".mmd" small>
            <FileCode className="w-3 h-3" />
          </ControlButton>
          <div className="w-px h-3 bg-border mx-1" />
          <ControlButton onClick={toggleFullscreen} title="Tela cheia" small>
            <Maximize2 className="w-3 h-3" />
          </ControlButton>
        </div>
      </div>

      {/* Diagram container */}
      <div className="p-4 md:p-6 overflow-auto max-h-[600px] min-h-[200px] flex items-center justify-center">
        {rendering ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-xs">Renderizando diagrama...</span>
          </div>
        ) : (
          diagramContent
        )}
      </div>
    </div>
  );
}

// Small control button component
function ControlButton({
  onClick,
  title,
  children,
  small,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50",
        small ? "w-6 h-6" : "w-7 h-7"
      )}
    >
      {children}
    </button>
  );
}

// Helper to download a blob
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
