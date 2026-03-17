/**
 * File Upload Route
 * Handles file uploads from the chat interface.
 * Files are stored in S3 and their content is extracted for LLM analysis.
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "text/markdown",
  "text/xml",
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/pdf",
  "application/x-sh",
  "application/x-python",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/octet-stream", // generic binary
];

function isTextMime(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/x-yaml" ||
    mime === "application/x-sh" ||
    mime === "application/x-python"
  );
}

export function registerUploadRoute(app: Express) {
  app.post("/api/upload", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { filename, content, mimeType } = req.body;

      if (!filename || !content) {
        res.status(400).json({ error: "Missing filename or content" });
        return;
      }

      // content is base64 encoded from the frontend
      const buffer = Buffer.from(content, "base64");

      if (buffer.length > MAX_FILE_SIZE) {
        res.status(413).json({ error: "Arquivo muito grande. Máximo: 10MB" });
        return;
      }

      const mime = mimeType || "application/octet-stream";

      // Upload to S3
      const fileKey = `uploads/${user.id}/${nanoid()}-${filename}`;
      const { url } = await storagePut(fileKey, buffer, mime);

      // Extract text content for LLM context
      let textContent: string | null = null;
      if (isTextMime(mime)) {
        textContent = buffer.toString("utf-8").slice(0, 50000); // Limit to 50K chars
      }

      // For images, we'll pass the URL to the LLM via vision
      const isImage = mime.startsWith("image/");

      res.json({
        success: true,
        file: {
          url,
          filename,
          mimeType: mime,
          size: buffer.length,
          textContent,
          isImage,
        },
      });
    } catch (error: any) {
      console.error("[Upload] Error:", error);
      res.status(500).json({ error: "Falha no upload do arquivo" });
    }
  });
}
