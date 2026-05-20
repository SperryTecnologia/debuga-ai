import { useState, useCallback } from "react";
import { FileText, Copy, Download, Check, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";

interface DocumentRendererProps {
  content: string;
  isAnimating?: boolean;
}

/**
 * DocumentRenderer - Renders document-studio blocks as professional document cards
 * with copy, download (.md), and download (.html) actions.
 */
export default function DocumentRenderer({ content, isAnimating }: DocumentRendererProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "source">("preview");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    // Extract title from first heading for filename
    const titleMatch = content.match(/^#\s+(.+)/m);
    const filename = titleMatch
      ? titleMatch[1].replace(/[^\w\sÀ-ú-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 50)
      : "documento";
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const handleDownloadHtml = useCallback(() => {
    // Convert markdown to simple HTML
    const htmlContent = generateHtml(content);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const titleMatch = content.match(/^#\s+(.+)/m);
    const filename = titleMatch
      ? titleMatch[1].replace(/[^\w\sÀ-ú-]/g, "").trim().replace(/\s+/g, "-").toLowerCase().slice(0, 50)
      : "documento";
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <div className="my-3 border border-primary/30 rounded-lg overflow-hidden bg-[oklch(0.13_0.01_150)] shadow-lg shadow-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[oklch(0.15_0.02_150)] border-b border-primary/20">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-mono font-medium text-primary">
            Documento Gerado
          </span>
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            Document Studio
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Tab toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] font-mono ${activeTab === "preview" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[10px] font-mono ${activeTab === "source" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("source")}
          >
            <Code2 className="h-3 w-3 mr-1" />
            Fonte
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-h-[600px] overflow-y-auto">
        {activeTab === "preview" ? (
          <div className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-table:text-foreground/90 prose-th:text-foreground prose-th:border-border prose-td:border-border prose-hr:border-border">
            <Streamdown isAnimating={isAnimating}>{content}</Streamdown>
          </div>
        ) : (
          <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-words bg-[oklch(0.08_0.005_240)] p-3 rounded border border-border overflow-x-auto">
            {content}
          </pre>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[oklch(0.12_0.01_150)] border-t border-primary/20">
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          Exportação: .md • .html • PDF/DOCX em breve
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-mono text-foreground/70 hover:text-primary hover:bg-primary/10"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-green-400" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-mono text-foreground/70 hover:text-primary hover:bg-primary/10"
            onClick={handleDownloadMd}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            .md
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-mono text-foreground/70 hover:text-primary hover:bg-primary/10"
            onClick={handleDownloadHtml}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            .html
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Converts markdown content to a standalone HTML document with professional styling.
 */
function generateHtml(markdown: string): string {
  // Extract title
  const titleMatch = markdown.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1] : "Documento";

  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Blockquotes
    .replace(/^>\s*(.+)$/gm, "<blockquote>$1</blockquote>")
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Tables (basic support)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split("|").filter(c => c.trim());
      if (cells.every(c => /^[\s-:]+$/.test(c))) return ""; // separator row
      const tag = "td";
      return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("")}</tr>`;
    })
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // Wrap lists
  html = html.replace(/(<li>.*?<\/li>(\s*<br>)?)+/g, (match) => `<ul>${match.replace(/<br>/g, "")}</ul>`);

  // Wrap tables
  html = html.replace(/(<tr>.*?<\/tr>(\s*<br>)?)+/g, (match) => `<table>${match.replace(/<br>/g, "")}</table>`);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.7;
      color: #1a1a2e;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 40px;
      background: #ffffff;
    }
    h1 { font-size: 2em; margin: 0 0 0.5em; color: #0d1117; border-bottom: 2px solid #16a34a; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; margin: 1.5em 0 0.5em; color: #1a1a2e; }
    h3 { font-size: 1.2em; margin: 1.2em 0 0.4em; color: #2d2d44; }
    h4 { font-size: 1em; margin: 1em 0 0.3em; color: #3d3d5c; }
    p { margin: 0.8em 0; }
    strong { color: #0d1117; }
    blockquote {
      border-left: 4px solid #16a34a;
      padding: 0.8em 1.2em;
      margin: 1em 0;
      background: #f0fdf4;
      border-radius: 0 4px 4px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 0.6em 1em;
      text-align: left;
    }
    th { background: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    ul, ol { margin: 0.8em 0; padding-left: 2em; }
    li { margin: 0.3em 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    .footer {
      margin-top: 3em;
      padding-top: 1em;
      border-top: 1px solid #e5e7eb;
      font-size: 0.85em;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      h1 { font-size: 1.6em; }
    }
  </style>
</head>
<body>
  <p>${html}</p>
  <div class="footer">
    Documento gerado por debuga.ai &mdash; Sperry Tecnologia<br>
    <small>Este documento deve ser revisado antes do uso oficial.</small>
  </div>
</body>
</html>`;
}
