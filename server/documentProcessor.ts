/**
 * documentProcessor.ts
 * Extracts text content from uploaded documents for LLM analysis.
 * Supports: TXT, MD, LOG, CONF, JSON, CSV, YAML, YML, XML, SQL, PDF, DOCX
 * 
 * Security: Never executes files. Never opens macros. Treats all content as text.
 */

import pdfParse from "pdf-parse-new";
import mammoth from "mammoth";

// ── Constants ──

/** Maximum characters to extract from a single document */
const MAX_EXTRACT_CHARS = 50_000;

/** Maximum file size in bytes (20MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** MIME types that can be read directly as UTF-8 text */
const TEXT_MIMES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/xml",
  "text/html",
  "text/x-log",
  "text/x-yaml",
  "text/x-sql",
  "text/x-conf",
  "text/x-python",
  "text/x-shellscript",
  "text/x-sh",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/x-sh",
  "application/x-python",
  "application/sql",
  "application/x-sql",
  "application/javascript",
]);

/** File extensions that are always treated as text, regardless of MIME */
const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".log", ".conf", ".cfg", ".ini",
  ".json", ".csv", ".tsv", ".yaml", ".yml", ".xml", ".sql",
  ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
  ".py", ".js", ".ts", ".jsx", ".tsx", ".css", ".html", ".htm",
  ".env", ".gitignore", ".dockerfile", ".toml", ".properties",
  ".nginx", ".apache", ".htaccess", ".editorconfig",
]);

/** MIME types for PDF */
const PDF_MIMES = new Set([
  "application/pdf",
]);

/** MIME types for DOCX */
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

// ── Types ──

export interface DocumentResult {
  success: boolean;
  text: string | null;
  truncated: boolean;
  originalLength: number;
  extractedLength: number;
  method: "text" | "pdf" | "docx" | "unsupported";
  error?: string;
}

export interface ProcessOptions {
  maxChars?: number;
  filename: string;
  mimeType: string;
}

// ── Helpers ──

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function isTextFile(mime: string, filename: string): boolean {
  return TEXT_MIMES.has(mime) || TEXT_EXTENSIONS.has(getExtension(filename));
}

function isPdf(mime: string, filename: string): boolean {
  return PDF_MIMES.has(mime) || getExtension(filename) === ".pdf";
}

function isDocx(mime: string, filename: string): boolean {
  return DOCX_MIMES.has(mime) || getExtension(filename) === ".docx" || getExtension(filename) === ".doc";
}

function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  // Truncate at last newline before maxChars to avoid cutting mid-line
  const cutPoint = text.lastIndexOf("\n", maxChars);
  const finalCut = cutPoint > maxChars * 0.8 ? cutPoint : maxChars;
  return {
    text: text.slice(0, finalCut) + "\n\n[... conteúdo truncado — documento muito longo ...]",
    truncated: true,
  };
}

// ── Extractors ──

async function extractText(buffer: Buffer, maxChars: number): Promise<DocumentResult> {
  const raw = buffer.toString("utf-8");
  const { text, truncated } = truncateText(raw, maxChars);
  return {
    success: true,
    text,
    truncated,
    originalLength: raw.length,
    extractedLength: text.length,
    method: "text",
  };
}

async function extractPdf(buffer: Buffer, maxChars: number): Promise<DocumentResult> {
  try {
    const result = await pdfParse(buffer);
    const raw = result.text || "";
    if (!raw.trim()) {
      return {
        success: false,
        text: null,
        truncated: false,
        originalLength: 0,
        extractedLength: 0,
        method: "pdf",
        error: "PDF sem texto selecionável. Pode ser um PDF escaneado (imagem). Tente enviar como imagem ou use um PDF com texto.",
      };
    }
    const { text, truncated } = truncateText(raw, maxChars);
    return {
      success: true,
      text,
      truncated,
      originalLength: raw.length,
      extractedLength: text.length,
      method: "pdf",
    };
  } catch (err: any) {
    return {
      success: false,
      text: null,
      truncated: false,
      originalLength: 0,
      extractedLength: 0,
      method: "pdf",
      error: `Falha ao processar PDF: ${err.message || "erro desconhecido"}`,
    };
  }
}

async function extractDocx(buffer: Buffer, maxChars: number): Promise<DocumentResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const raw = result.value || "";
    if (!raw.trim()) {
      return {
        success: false,
        text: null,
        truncated: false,
        originalLength: 0,
        extractedLength: 0,
        method: "docx",
        error: "Documento DOCX vazio ou sem conteúdo de texto extraível.",
      };
    }
    const { text, truncated } = truncateText(raw, maxChars);
    return {
      success: true,
      text,
      truncated,
      originalLength: raw.length,
      extractedLength: text.length,
      method: "docx",
    };
  } catch (err: any) {
    return {
      success: false,
      text: null,
      truncated: false,
      originalLength: 0,
      extractedLength: 0,
      method: "docx",
      error: `Falha ao processar DOCX: ${err.message || "erro desconhecido"}`,
    };
  }
}

// ── Main Processor ──

/**
 * Process a document buffer and extract text content for LLM analysis.
 * Returns extracted text with metadata, or an error message for unsupported types.
 */
export async function processDocument(
  buffer: Buffer,
  options: ProcessOptions
): Promise<DocumentResult> {
  const { filename, mimeType, maxChars = MAX_EXTRACT_CHARS } = options;

  // Size check
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      success: false,
      text: null,
      truncated: false,
      originalLength: buffer.length,
      extractedLength: 0,
      method: "unsupported",
      error: `Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Limite: ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }

  // Route to appropriate extractor
  if (isPdf(mimeType, filename)) {
    return extractPdf(buffer, maxChars);
  }

  if (isDocx(mimeType, filename)) {
    return extractDocx(buffer, maxChars);
  }

  if (isTextFile(mimeType, filename)) {
    return extractText(buffer, maxChars);
  }

  // Unsupported type
  return {
    success: false,
    text: null,
    truncated: false,
    originalLength: buffer.length,
    extractedLength: 0,
    method: "unsupported",
    error: `Tipo de arquivo não suportado (${mimeType}). Envie em PDF, DOCX, TXT, MD, LOG, CONF, JSON, CSV, YAML ou XML.`,
  };
}

/**
 * Check if a file type is supported for document processing.
 */
export function isSupportedDocument(mime: string, filename: string): boolean {
  return isTextFile(mime, filename) || isPdf(mime, filename) || isDocx(mime, filename);
}

/**
 * Get the list of supported file extensions for display purposes.
 */
export function getSupportedExtensions(): string[] {
  return [
    ".txt", ".md", ".log", ".conf", ".json", ".csv",
    ".yaml", ".yml", ".xml", ".sql", ".pdf", ".docx",
  ];
}
