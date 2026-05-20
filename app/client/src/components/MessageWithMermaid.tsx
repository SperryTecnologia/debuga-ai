import { useMemo, lazy, Suspense, useState, useCallback } from "react";
import { Streamdown } from "streamdown";
import type { MermaidConfig } from "mermaid";
import { ImageOff } from "lucide-react";

const MermaidRenderer = lazy(() => import("./MermaidRenderer"));
const DocumentRenderer = lazy(() => import("./DocumentRenderer"));

interface MessageWithMermaidProps {
  content: string;
  mermaidConfig: MermaidConfig;
  isAnimating?: boolean;
}

interface ContentPart {
  type: "text" | "mermaid" | "document";
  content: string;
  title?: string;
}

/**
 * Custom image component that shows a fallback when image fails to load
 * (e.g., expired temporary URLs from OpenAI when S3 was not configured)
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
 * Splits message content into text, mermaid blocks, and document-studio blocks.
 * Renders text with Streamdown, mermaid blocks with MermaidRenderer,
 * and document-studio blocks with DocumentRenderer.
 */
export default function MessageWithMermaid({
  content,
  mermaidConfig,
  isAnimating = false,
}: MessageWithMermaidProps) {
  const parts = useMemo(() => splitContent(content), [content]);

  // Custom image component with error fallback
  const imageComponents = useMemo(() => ({
    img: ImageWithFallback,
  }), []);

  // If no special blocks, render normally with Streamdown
  const hasSpecial = parts.some((p) => p.type === "mermaid" || p.type === "document");
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

/**
 * Parse content to extract mermaid code blocks, document-studio blocks, and surrounding text.
 * Also tries to extract a title from the text preceding a mermaid block.
 */
function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  // Match both mermaid and document-studio code blocks
  const blockRegex = /```(mermaid|document-studio)\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const blockType = match[1] as "mermaid" | "document-studio";
    const blockContent = match[2].trim();

    // Text before this block
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push({ type: "text", content: textBefore });
    }

    if (blockType === "mermaid") {
      // Extract title from preceding text (look for ## or **title**)
      let title: string | undefined;
      const lines = textBefore.trim().split("\n");
      for (let j = lines.length - 1; j >= 0; j--) {
        const line = lines[j].trim();
        const headingMatch = line.match(/^#{1,3}\s+(.+)/);
        const boldMatch = line.match(/^\*\*(.+?)\*\*/);
        if (headingMatch) {
          title = headingMatch[1];
          break;
        }
        if (boldMatch) {
          title = boldMatch[1];
          break;
        }
        if (line && !line.startsWith("-") && !line.startsWith("*")) break;
      }

      parts.push({
        type: "mermaid",
        content: blockContent,
        title: title || "Diagrama de Infraestrutura",
      });
    } else {
      // document-studio block
      parts.push({
        type: "document",
        content: blockContent,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last block
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    parts.push({ type: "text", content: remaining });
  }

  return parts;
}
