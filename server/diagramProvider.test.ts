import { describe, it, expect } from "vitest";
import {
  extractMermaidCode,
  validateMermaidSyntax,
  extractDiagramMetadata,
  getDiagramSystemPrompt,
  processDiagramResponse,
  isDiagramGenerationAvailable,
  getDiagramProviderInfo,
} from "./diagramProvider";

describe("diagramProvider", () => {
  describe("extractMermaidCode", () => {
    it("should extract mermaid code from fenced block", () => {
      const text = `Here is a diagram:
\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`
That's the diagram.`;
      const result = extractMermaidCode(text);
      expect(result).toBe("graph TD\n    A[Start] --> B[End]");
    });

    it("should extract standalone mermaid content", () => {
      const text = `graph TD
    A[Start] --> B[End]

Some other text here.`;
      const result = extractMermaidCode(text);
      expect(result).toContain("graph TD");
      expect(result).toContain("A[Start] --> B[End]");
    });

    it("should return null for non-mermaid text", () => {
      const text = "This is just regular text without any diagram.";
      const result = extractMermaidCode(text);
      expect(result).toBeNull();
    });
  });

  describe("validateMermaidSyntax", () => {
    it("should validate correct mermaid code", () => {
      const code = `graph TD
    A[Start] --> B[End]`;
      const result = validateMermaidSyntax(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty code", () => {
      const result = validateMermaidSyntax("");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject code without valid diagram type", () => {
      const code = "invalid content here";
      const result = validateMermaidSyntax(code);
      expect(result.valid).toBe(false);
    });

    it("should detect unbalanced subgraphs", () => {
      const code = `graph TD
    subgraph A
        B[Node]
    subgraph C
        D[Node]
    end`;
      const result = validateMermaidSyntax(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("subgraph"))).toBe(true);
    });
  });

  describe("extractDiagramMetadata", () => {
    it("should detect flowchart diagram kind", () => {
      const code = `flowchart TD
    A[Start] --> B[End]`;
      const metadata = extractDiagramMetadata(code);
      expect(metadata.diagramKind).toBe("flowchart");
    });

    it("should detect sequence diagram kind", () => {
      const code = `sequenceDiagram
    Alice->>Bob: Hello`;
      const metadata = extractDiagramMetadata(code);
      expect(metadata.diagramKind).toBe("sequence");
    });

    it("should count subgraphs", () => {
      const code = `graph TD
    subgraph A
        B[Node]
    end
    subgraph C
        D[Node]
    end`;
      const metadata = extractDiagramMetadata(code);
      expect(metadata.subgraphCount).toBe(2);
    });
  });

  describe("getDiagramSystemPrompt", () => {
    it("should return network diagram prompt with new format fields", () => {
      const prompt = getDiagramSystemPrompt("network_diagram");
      expect(prompt).toContain("diagram-spec");
      expect(prompt).toContain("zones");
      expect(prompt).toContain("\"from\"");
      expect(prompt).toContain("\"to\"");
      expect(prompt).toContain("summary");
      expect(prompt).toContain("securityNotes");
      expect(prompt).toContain("nextSteps");
      expect(prompt).toContain("waf");
      expect(prompt).toContain("vpn");
      expect(prompt).toContain("backup");
      expect(prompt).toContain("monitor");
    });

    it("should return architecture diagram prompt", () => {
      const prompt = getDiagramSystemPrompt("architecture_diagram");
      expect(prompt).toContain("mermaid");
      expect(prompt).toContain("arquitetura");
    });

    it("should return flowchart diagram prompt", () => {
      const prompt = getDiagramSystemPrompt("flowchart_diagram");
      expect(prompt).toContain("flowchart");
      expect(prompt).toContain("processo");
    });
  });

  describe("processDiagramResponse", () => {
    it("should process valid mermaid response", () => {
      const response = `Here is the diagram:
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\``;
      const result = processDiagramResponse(response, "flowchart_diagram", "Test Diagram");
      expect("mermaidCode" in result).toBe(true);
      if ("mermaidCode" in result) {
        expect(result.mermaidCode).toContain("graph TD");
        expect(result.title).toBe("Test Diagram");
        expect(result.diagramType).toBe("flowchart_diagram");
        expect(result.metadata.diagramKind).toBe("flowchart");
      }
    });

    it("should return error for text without mermaid code", () => {
      const response = "This is just text without any diagram.";
      const result = processDiagramResponse(response, "network_diagram");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.code).toBe("NO_MERMAID_CODE");
      }
    });
  });

  describe("isDiagramGenerationAvailable", () => {
    it("should always return true", () => {
      expect(isDiagramGenerationAvailable()).toBe(true);
    });
  });

  describe("getDiagramProviderInfo", () => {
    it("should return supported types and formats", () => {
      const info = getDiagramProviderInfo();
      expect(info.available).toBe(true);
      expect(info.supportedTypes).toContain("network_diagram");
      expect(info.supportedTypes).toContain("architecture_diagram");
      expect(info.supportedTypes).toContain("flowchart_diagram");
      expect(info.renderFormats).toContain("mermaid");
      expect(info.renderFormats).toContain("svg");
    });
  });
});
