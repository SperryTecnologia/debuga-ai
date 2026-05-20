import { describe, it, expect } from "vitest";
import {
  DOCUMENT_STUDIO_BLOCK,
  buildSystemPrompt,
} from "./agentIdentity";

describe("Document Studio - DOCUMENT_STUDIO_BLOCK", () => {
  it("should exist and be a non-empty string", () => {
    expect(typeof DOCUMENT_STUDIO_BLOCK).toBe("string");
    expect(DOCUMENT_STUDIO_BLOCK.length).toBeGreaterThan(100);
  });

  it("should contain the section title", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Geração de Documentos Profissionais");
  });

  it("should explicitly forbid refusing PDF generation", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Não consigo gerar PDFs diretamente");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("NUNCA dizer");
  });

  it("should forbid 'não tenho capacidade de criar documentos'", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Não tenho capacidade de criar documentos");
  });

  it("should forbid 'como modelo de linguagem, não posso exportar'", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Como modelo de linguagem, não posso exportar");
  });

  it("should instruct to always respond positively", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("SEMPRE responder positivamente");
  });

  it("should list supported document types", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Proposta comercial");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Relatório técnico");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Relatório executivo");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Checklist operacional");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Plano de ação");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Minuta de contrato");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Termo de responsabilidade");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Política de segurança");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Laudo técnico");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("SLA / escopo de serviço");
  });

  it("should specify document-studio code block format", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("```document-studio");
  });

  it("should include legal disclaimer for contracts", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Aviso Legal");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("revisado por responsável jurídico");
  });

  it("should instruct to ask for missing info professionally", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("pergunte de forma profissional e consultiva");
  });

  it("should instruct to offer a template when data is missing", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Posso gerar um modelo inicial");
  });

  it("should define quality standards", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Linguagem formal e profissional");
    expect(DOCUMENT_STUDIO_BLOCK).toContain("Estrutura clara com hierarquia de seções");
  });

  it("should mention [CAMPO] placeholder format", () => {
    expect(DOCUMENT_STUDIO_BLOCK).toContain("[CAMPO]");
  });
});

describe("Document Studio - buildSystemPrompt includes Document Studio", () => {
  const testCapabilities = "## Test\n- test";
  const prompt = buildSystemPrompt(testCapabilities);

  it("should include Document Studio block in the full prompt", () => {
    expect(prompt).toContain("Geração de Documentos Profissionais");
  });

  it("should place Document Studio after capabilities and before safety", () => {
    const capIdx = prompt.indexOf("## Test");
    const docIdx = prompt.indexOf("Geração de Documentos Profissionais");
    const safetyIdx = prompt.indexOf("Segurança e Tratamento de Erros");

    expect(capIdx).toBeLessThan(docIdx);
    expect(docIdx).toBeLessThan(safetyIdx);
  });

  it("should contain the full refusal prohibition", () => {
    expect(prompt).toContain("Não consigo gerar PDFs diretamente");
    expect(prompt).toContain("Não é possível gerar arquivos");
  });
});

describe("Document Studio - Content block parsing", () => {
  // Simulates how MessageWithMermaid.tsx parses document-studio blocks
  function parseDocumentBlocks(content: string) {
    const blockRegex = /```document-studio\s*\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  }

  it("should parse a single document-studio block", () => {
    const content = `Aqui está sua proposta:

\`\`\`document-studio
# Proposta Comercial
**Data:** 12/05/2026

## Escopo
Serviços de TI...
\`\`\`

Posso ajustar conforme necessário.`;

    const blocks = parseDocumentBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("# Proposta Comercial");
    expect(blocks[0]).toContain("## Escopo");
  });

  it("should parse multiple document-studio blocks", () => {
    const content = `\`\`\`document-studio
# Doc 1
Content 1
\`\`\`

Texto intermediário.

\`\`\`document-studio
# Doc 2
Content 2
\`\`\``;

    const blocks = parseDocumentBlocks(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain("# Doc 1");
    expect(blocks[1]).toContain("# Doc 2");
  });

  it("should not confuse mermaid blocks with document-studio", () => {
    const content = `\`\`\`mermaid
graph TD
A --> B
\`\`\`

\`\`\`document-studio
# Report
Content
\`\`\``;

    const blocks = parseDocumentBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("# Report");
    expect(blocks[0]).not.toContain("graph TD");
  });

  it("should handle content with no document-studio blocks", () => {
    const content = "Just a normal message without any special blocks.";
    const blocks = parseDocumentBlocks(content);
    expect(blocks).toHaveLength(0);
  });

  it("should handle document with legal disclaimer", () => {
    const content = `\`\`\`document-studio
# Minuta de Contrato

## Cláusula 1
...

> ⚠️ **Aviso Legal:** Este documento foi gerado como minuta e deve ser revisado por responsável jurídico antes do uso.
\`\`\``;

    const blocks = parseDocumentBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("Aviso Legal");
    expect(blocks[0]).toContain("responsável jurídico");
  });
});
