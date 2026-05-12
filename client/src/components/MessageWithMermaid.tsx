import { useMemo, lazy, Suspense } from "react";
import { Streamdown } from "streamdown";
import type { MermaidConfig } from "mermaid";

const MermaidRenderer = lazy(() => import("./MermaidRenderer"));

interface MessageWithMermaidProps {
  content: string;
  mermaidConfig: MermaidConfig;
  isAnimating?: boolean;
}

interface ContentPart {
  type: "text" | "mermaid";
  content: string;
  title?: string;
}

/**
 * Splits message content into text and mermaid blocks.
 * Renders text with Streamdown and mermaid blocks with MermaidRenderer.
 */
export default function MessageWithMermaid({
  content,
  mermaidConfig,
  isAnimating = false,
}: MessageWithMermaidProps) {
  const parts = useMemo(() => splitContent(content), [content]);

  // If no mermaid blocks, render normally with Streamdown
  const hasMermaid = parts.some((p) => p.type === "mermaid");
  if (!hasMermaid) {
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
 * Parse content to extract mermaid code blocks and surrounding text.
 * Also tries to extract a title from the text preceding a mermaid block.
 */
function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Text before this mermaid block
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push({ type: "text", content: textBefore });
    }

    // Extract title from preceding text (look for ## or **title**)
    let title: string | undefined;
    const lines = textBefore.trim().split("\n");
    for (let j = lines.length - 1; j >= 0; j--) {
      const line = lines[j].trim();
      // Match ## heading or **bold** title
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
      // Stop searching if we hit a non-empty non-title line
      if (line && !line.startsWith("-") && !line.startsWith("*")) break;
    }

    // Mermaid block
    parts.push({
      type: "mermaid",
      content: match[1].trim(),
      title: title || "Diagrama de Infraestrutura",
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last mermaid block
  const remaining = content.slice(lastIndex);
  if (remaining.trim()) {
    parts.push({ type: "text", content: remaining });
  }

  return parts;
}
