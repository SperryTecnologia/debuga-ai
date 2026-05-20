/**
 * Tests for the stripAttachmentMetadata utility function.
 * This function is defined in ChatPage.tsx but we test the logic independently here.
 */
import { describe, it, expect } from "vitest";

// Replicate the function logic for testing (same as in ChatPage.tsx)
type ParsedAttachment = {
  filename: string;
  url?: string;
  isImage?: boolean;
  isDocument?: boolean;
  mimeType?: string;
};

function stripAttachmentMetadata(content: string): { displayText: string; parsedAttachments: ParsedAttachment[] } {
  const parsedAttachments: ParsedAttachment[] = [];
  let displayText = content;

  // Pattern 1: "text\n\n---\nArquivos anexados:\n..."
  const separatorIdx = displayText.indexOf("\n\n---\nArquivos anexados:\n");
  if (separatorIdx !== -1) {
    const metaSection = displayText.slice(separatorIdx);
    displayText = displayText.slice(0, separatorIdx).trim();

    // Extract image attachments
    const imgRegex = /\[Imagem anexada: ([^\]]+)\] URL: (https?:\/\/[^\s]+)/g;
    let match;
    while ((match = imgRegex.exec(metaSection)) !== null) {
      parsedAttachments.push({ filename: match[1], url: match[2], isImage: true });
    }

    // Extract document attachments with content
    const docRegex = /\[Arquivo: ([^\]]+)\]/g;
    while ((match = docRegex.exec(metaSection)) !== null) {
      parsedAttachments.push({ filename: match[1], isImage: false, isDocument: true });
    }

    // Extract generic file attachments
    const genericRegex = /\[Arquivo anexado: ([^\(]+)\(([^,]+), ([^)]+)\)\]/g;
    while ((match = genericRegex.exec(metaSection)) !== null) {
      parsedAttachments.push({ filename: match[1].trim(), isImage: false, mimeType: match[2] });
    }
  }

  // Pattern 2: "Analise os seguintes arquivos:\n\n..."
  if (displayText.startsWith("Analise os seguintes arquivos:")) {
    const imgRegex = /\[Imagem anexada: ([^\]]+)\] URL: (https?:\/\/[^\s]+)/g;
    let match;
    while ((match = imgRegex.exec(displayText)) !== null) {
      parsedAttachments.push({ filename: match[1], url: match[2], isImage: true });
    }
    const docRegex = /\[Arquivo: ([^\]]+)\]/g;
    while ((match = docRegex.exec(displayText)) !== null) {
      parsedAttachments.push({ filename: match[1], isImage: false, isDocument: true });
    }
    const genericRegex = /\[Arquivo anexado: ([^\(]+)\(([^,]+), ([^)]+)\)\]/g;
    while ((match = genericRegex.exec(displayText)) !== null) {
      parsedAttachments.push({ filename: match[1].trim(), isImage: false, mimeType: match[2] });
    }
    if (parsedAttachments.length > 0) {
      displayText = `Enviou ${parsedAttachments.length} arquivo(s) para análise`;
    }
  }

  return { displayText: displayText || "Enviou arquivo(s) para análise", parsedAttachments };
}

describe("stripAttachmentMetadata", () => {
  it("should return plain text unchanged when no attachments", () => {
    const result = stripAttachmentMetadata("analise minha rede");
    expect(result.displayText).toBe("analise minha rede");
    expect(result.parsedAttachments).toHaveLength(0);
  });

  it("should strip image metadata from user message with text + image", () => {
    const content = `analise essa imagem\n\n---\nArquivos anexados:\n[Imagem anexada: screenshot.png] URL: https://storage.example.com/uploads/screenshot.png`;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).toBe("analise essa imagem");
    expect(result.parsedAttachments).toHaveLength(1);
    expect(result.parsedAttachments[0]).toEqual({
      filename: "screenshot.png",
      url: "https://storage.example.com/uploads/screenshot.png",
      isImage: true,
    });
  });

  it("should strip document metadata from user message with text + document", () => {
    const content = `analise esse documento\n\n---\nArquivos anexados:\n[Arquivo: relatorio.pdf]\n\`\`\`\nConteúdo extraído do PDF...\n\`\`\``;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).toBe("analise esse documento");
    expect(result.parsedAttachments).toHaveLength(1);
    expect(result.parsedAttachments[0]).toEqual({
      filename: "relatorio.pdf",
      isImage: false,
      isDocument: true,
    });
  });

  it("should strip generic file metadata", () => {
    const content = `veja isso\n\n---\nArquivos anexados:\n[Arquivo anexado: config.yaml (application/yaml, 2.5KB)]`;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).toBe("veja isso");
    expect(result.parsedAttachments).toHaveLength(1);
    expect(result.parsedAttachments[0]).toEqual({
      filename: "config.yaml",
      isImage: false,
      mimeType: "application/yaml",
    });
  });

  it("should handle multiple attachments", () => {
    const content = `analise esses arquivos\n\n---\nArquivos anexados:\n[Imagem anexada: topo.png] URL: https://s3.example.com/topo.png\n\n[Arquivo: log.txt]\n\`\`\`\nERROR: connection refused\n\`\`\``;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).toBe("analise esses arquivos");
    expect(result.parsedAttachments).toHaveLength(2);
    expect(result.parsedAttachments[0].isImage).toBe(true);
    expect(result.parsedAttachments[1].isDocument).toBe(true);
  });

  it("should handle message with only attachments (no user text)", () => {
    const content = `Analise os seguintes arquivos:\n\n[Imagem anexada: error.png] URL: https://s3.example.com/error.png`;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).toBe("Enviou 1 arquivo(s) para análise");
    expect(result.parsedAttachments).toHaveLength(1);
    expect(result.parsedAttachments[0].filename).toBe("error.png");
  });

  it("should not expose URLs in displayText", () => {
    const content = `analise\n\n---\nArquivos anexados:\n[Imagem anexada: test.jpg] URL: https://bucket.s3.amazonaws.com/private/test.jpg`;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).not.toContain("https://");
    expect(result.displayText).not.toContain("s3.amazonaws");
    expect(result.displayText).not.toContain("bucket");
  });

  it("should not expose separator or 'Arquivos anexados' in displayText", () => {
    const content = `teste\n\n---\nArquivos anexados:\n[Arquivo: doc.pdf]\n\`\`\`\ncontent\n\`\`\``;
    const result = stripAttachmentMetadata(content);
    expect(result.displayText).not.toContain("---");
    expect(result.displayText).not.toContain("Arquivos anexados");
    expect(result.displayText).not.toContain("```");
  });
});
