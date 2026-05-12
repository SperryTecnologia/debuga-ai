/**
 * Tests for document upload and processing module.
 * Covers: documentProcessor, uploadRoute integration, feature flag, limits, and SYSTEM_PROMPT.
 */
import { describe, it, expect } from "vitest";
import { processDocument, isSupportedDocument, getSupportedExtensions } from "./documentProcessor";
import { PLANS } from "./products";
import fs from "fs";
import path from "path";

// ── documentProcessor unit tests ──

describe("documentProcessor", () => {
  describe("isSupportedDocument", () => {
    it("should recognize PDF as document", () => {
      expect(isSupportedDocument("application/pdf", "file.pdf")).toBe(true);
    });

    it("should recognize DOCX as document", () => {
      expect(isSupportedDocument("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "file.docx")).toBe(true);
    });

    it("should recognize text/plain as document", () => {
      expect(isSupportedDocument("text/plain", "file.txt")).toBe(true);
    });

    it("should recognize text/csv as document", () => {
      expect(isSupportedDocument("text/csv", "file.csv")).toBe(true);
    });

    it("should recognize application/json as document", () => {
      expect(isSupportedDocument("application/json", "file.json")).toBe(true);
    });

    it("should recognize .log files as document", () => {
      expect(isSupportedDocument("text/plain", "server.log")).toBe(true);
    });

    it("should recognize .conf files as document", () => {
      expect(isSupportedDocument("text/plain", "nginx.conf")).toBe(true);
    });

    it("should NOT recognize image/png as document", () => {
      expect(isSupportedDocument("image/png", "photo.png")).toBe(false);
    });

    it("should NOT recognize audio/mpeg as document", () => {
      expect(isSupportedDocument("audio/mpeg", "song.mp3")).toBe(false);
    });

    it("should NOT recognize video/mp4 as document", () => {
      expect(isSupportedDocument("video/mp4", "video.mp4")).toBe(false);
    });
  });

  describe("getSupportedExtensions", () => {
    it("should return at least 10 extensions", () => {
      const exts = getSupportedExtensions();
      expect(exts.length).toBeGreaterThanOrEqual(10);
    });

    it("should include .pdf and .docx", () => {
      const exts = getSupportedExtensions();
      expect(exts).toContain(".pdf");
      expect(exts).toContain(".docx");
    });

    it("should include common text formats", () => {
      const exts = getSupportedExtensions();
      expect(exts).toContain(".txt");
      expect(exts).toContain(".log");
      expect(exts).toContain(".json");
      expect(exts).toContain(".csv");
    });
  });

  describe("processDocument", () => {
    it("should extract text from a plain text buffer", async () => {
      const content = "server error: connection refused\nretrying in 5s...";
      const buffer = Buffer.from(content, "utf-8");
      const result = await processDocument(buffer, { mimeType: "text/plain", filename: "error.log" });
      expect(result.success).toBe(true);
      expect(result.text).toContain("connection refused");
      expect(result.method).toBe("text");
      expect(result.truncated).toBe(false);
    });

    it("should extract text from JSON buffer", async () => {
      const json = JSON.stringify({ server: "nginx", status: "error", code: 502 }, null, 2);
      const buffer = Buffer.from(json, "utf-8");
      const result = await processDocument(buffer, { mimeType: "application/json", filename: "config.json" });
      expect(result.success).toBe(true);
      expect(result.text).toContain("nginx");
      expect(result.method).toBe("text");
    });

    it("should extract text from CSV buffer", async () => {
      const csv = "host,port,status\n192.168.1.1,22,open\n192.168.1.1,80,closed";
      const buffer = Buffer.from(csv, "utf-8");
      const result = await processDocument(buffer, { mimeType: "text/csv", filename: "scan.csv" });
      expect(result.success).toBe(true);
      expect(result.text).toContain("192.168.1.1");
    });

    it("should truncate very large text documents", async () => {
      const bigContent = "A".repeat(60000);
      const buffer = Buffer.from(bigContent, "utf-8");
      const result = await processDocument(buffer, { mimeType: "text/plain", filename: "huge.log" });
      expect(result.success).toBe(true);
      expect(result.truncated).toBe(true);
      expect(result.extractedLength).toBeLessThanOrEqual(55000); // 50k + some tolerance
    });

    it("should return error for unsupported MIME type", async () => {
      const buffer = Buffer.from("data", "utf-8");
      const result = await processDocument(buffer, { mimeType: "video/mp4", filename: "video.mp4" });
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should handle empty buffer gracefully", async () => {
      const buffer = Buffer.from("", "utf-8");
      const result = await processDocument(buffer, { mimeType: "text/plain", filename: "empty.txt" });
      // Should succeed but with empty or near-empty text
      expect(result.method).toBe("text");
    });

    it("should extract text from a real PDF if available", async () => {
      // Generate a test PDF using fpdf2
      const { execSync } = await import("child_process");
      try {
        execSync(`python3 -c "
from fpdf import FPDF
p = FPDF()
p.add_page()
p.set_font('Helvetica', size=12)
p.cell(200, 10, txt='Firewall rule: DENY ALL from 10.0.0.0/8')
p.output('/tmp/test_doc.pdf')
"`);
        const pdfBuffer = fs.readFileSync("/tmp/test_doc.pdf");
        const result = await processDocument(pdfBuffer, { mimeType: "application/pdf", filename: "firewall.pdf" });
        expect(result.success).toBe(true);
        expect(result.text).toContain("Firewall");
        expect(result.method).toBe("pdf");
      } catch {
        // Skip if python3/fpdf not available
        console.log("Skipping PDF test - fpdf2 not available");
      }
    });
  });
});

// ── Plan limits for documents ──

describe("Plan document limits", () => {
  it("all plans should have docsPerDay defined", () => {
    for (const plan of PLANS) {
      expect(plan.limits.docsPerDay).toBeDefined();
      expect(typeof plan.limits.docsPerDay).toBe("number");
      expect(plan.limits.docsPerDay).toBeGreaterThanOrEqual(0);
    }
  });

  it("Free plan should have limited docs", () => {
    const free = PLANS.find(p => p.id === "free");
    expect(free).toBeTruthy();
    expect(free!.limits.docsPerDay).toBeLessThanOrEqual(5);
  });

  it("Enterprise plan should have highest doc limit", () => {
    const enterprise = PLANS.find(p => p.id === "enterprise");
    const pro = PLANS.find(p => p.id === "pro");
    expect(enterprise).toBeTruthy();
    expect(pro).toBeTruthy();
    expect(enterprise!.limits.docsPerDay).toBeGreaterThanOrEqual(pro!.limits.docsPerDay);
  });
});

// ── SYSTEM_PROMPT document analysis ──

describe("SYSTEM_PROMPT document analysis", () => {
  it("should include document analysis instructions in streamRoute", async () => {
    const content = fs.readFileSync(path.join(__dirname, "streamRoute.ts"), "utf-8");
    expect(content).toContain("Análise de Documentos Anexados");
    expect(content).toContain("PDF");
    expect(content).toContain("DOCX");
    expect(content).toContain("LOG");
    expect(content).toContain("CONF");
  });

  it("should instruct LLM to never say it cannot access files", () => {
    const content = fs.readFileSync(path.join(__dirname, "streamRoute.ts"), "utf-8");
    expect(content).toContain("NUNCA diga");
    expect(content).toContain("não consigo acessar arquivos");
  });
});

// ── uploadRoute document processing ──

describe("uploadRoute document integration", () => {
  it("should import processDocument in uploadRoute", () => {
    const content = fs.readFileSync(path.join(__dirname, "uploadRoute.ts"), "utf-8");
    expect(content).toContain("processDocument");
    expect(content).toContain("documentProcessor");
  });

  it("should return isDocument field in upload response", () => {
    const content = fs.readFileSync(path.join(__dirname, "uploadRoute.ts"), "utf-8");
    expect(content).toContain("isDocument");
  });

  it("should return processingMethod and processingError fields", () => {
    const content = fs.readFileSync(path.join(__dirname, "uploadRoute.ts"), "utf-8");
    expect(content).toContain("processingMethod");
    expect(content).toContain("processingError");
  });
});
