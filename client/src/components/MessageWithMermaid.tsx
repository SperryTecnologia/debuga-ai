import { useMemo, lazy, Suspense } from "react";
import { Streamdown } from "streamdown";
import type { MermaidConfig } from "mermaid";

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

  // If no special blocks, render normally with Streamdown
  const hasSpecial = parts.some((p) => p.type === "mermaid" || p.type === "document");
  if (!hasSpecial) {
    return (
      <Streamdown mermaidConfig={mermaidConfig} isAnimating={isAnimating}>
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
            <Streamdown key={i} mermaidConfig={mermaidConfig} isAnimating={isAnimating}>
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
