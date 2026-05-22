/**
 * File Upload Route
 * Handles file uploads from the chat interface.
 * Files are stored in S3 and their content is extracted for LLM analysis.
 * Supports: images (vision), text files (UTF-8), PDF, DOCX.
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { getTodayImageCount, recordImageUpload, getTodayDocCount, recordDocUpload, getOrCreateCredits, getActiveSubscription } from "./db";
import { PLANS } from "./products";
import { processDocument, isSupportedDocument } from "./documentProcessor";

// Feature flags
const FEATURE_IMAGE_UPLOAD = process.env.FEATURE_IMAGE_UPLOAD !== "false";
const FEATURE_DOCUMENT_UPLOAD = process.env.FEATURE_DOCUMENT_UPLOAD !== "false";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (documents can be larger than images)

const ALLOWED_MIME_TYPES = [
  // Text
  "text/plain",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "text/markdown",
  "text/xml",
  "text/x-log",
  "text/x-yaml",
  "text/x-sql",
  "text/x-conf",
  // Application text
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/x-sh",
  "application/x-python",
  "application/sql",
  "application/x-sql",
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Audio
  "audio/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  // Fallback
  "application/octet-stream",
];

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
        res.status(413).json({ error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` });
        return;
      }

      const mime = mimeType || "application/octet-stream";
      const isImage = mime.startsWith("image/");
      const isDocument = isSupportedDocument(mime, filename);

      // Feature flag checks
      if (!FEATURE_IMAGE_UPLOAD && isImage) {
        res.status(403).json({ error: "Upload de imagens está temporariamente desativado.", code: "FEATURE_DISABLED" });
        return;
      }

      if (!FEATURE_DOCUMENT_UPLOAD && isDocument && !isImage) {
        res.status(403).json({ error: "Upload de documentos está temporariamente desativado.", code: "FEATURE_DISABLED" });
        return;
      }

      // Image-specific limits
      if (isImage) {
        const isAdmin = user.role === "admin";
        if (!isAdmin) {
          const sub = await getActiveSubscription(user.id);
          let planId = "free";
          if (sub) {
            const creds = await getOrCreateCredits(user.id, "free");
            if (creds && creds.planId !== "free") planId = creds.planId;
            else planId = "starter";
          }
          const plan = PLANS.find(p => p.id === planId) || PLANS[0];
          const todayImages = await getTodayImageCount(user.id);
          if (todayImages >= plan.limits.imagesPerDay) {
            res.status(402).json({
              error: `Você atingiu o limite de ${plan.limits.imagesPerDay} imagens por dia do plano ${plan.name}. Faça upgrade para enviar mais imagens.`,
              code: "IMAGE_LIMIT_REACHED",
              limit: plan.limits.imagesPerDay,
              used: todayImages,
              planId: plan.id,
            });
            return;
          }
        }
      }

      // Document-specific limits
      if (isDocument && !isImage) {
        const isAdmin = user.role === "admin";
        if (!isAdmin) {
          const sub = await getActiveSubscription(user.id);
          let planId = "free";
          if (sub) {
            const creds = await getOrCreateCredits(user.id, "free");
            if (creds && creds.planId !== "free") planId = creds.planId;
            else planId = "starter";
          }
          const plan = PLANS.find(p => p.id === planId) || PLANS[0];
          const todayDocs = await getTodayDocCount(user.id);
          if (todayDocs >= plan.limits.docsPerDay) {
            res.status(402).json({
              error: `Voc\u00ea atingiu o limite de ${plan.limits.docsPerDay} documentos por dia do plano ${plan.name}. Fa\u00e7a upgrade para enviar mais documentos.`,
              code: "DOC_LIMIT_REACHED",
              limit: plan.limits.docsPerDay,
              used: todayDocs,
              planId: plan.id,
            });
            return;
          }
        }
      }

      // Upload to S3
      const fileKey = `uploads/${user.id}/${nanoid()}-${filename}`;
      const { url } = await storagePut(fileKey, buffer, mime);

      // Extract text content using documentProcessor
      let textContent: string | null = null;
      let processingError: string | null = null;
      let processingMethod: string | null = null;
      let truncated = false;

      if (!isImage && isDocument) {
        try {
          const result = await processDocument(buffer, { filename, mimeType: mime });
          if (result.success && result.text) {
            textContent = result.text;
            truncated = result.truncated;
            processingMethod = result.method;
          } else {
            processingError = result.error || "Não foi possível extrair o conteúdo do documento.";
            processingMethod = result.method;
          }
        } catch (err: any) {
          console.error("[Upload] Document processing error:", err);
          processingError = "Erro ao processar documento. Tente enviar em outro formato.";
        }
      }

      // Record usage events
      if (isImage) {
        try {
          await recordImageUpload(user.id, null);
        } catch (err) {
          console.error("[Upload] Failed to record image usage:", err);
        }
      }
      if (isDocument && !isImage) {
        try {
          await recordDocUpload(user.id, null);
        } catch (err) {
          console.error("[Upload] Failed to record doc usage:", err);
        }
      }

      res.json({
        success: true,
        file: {
          url,
          filename,
          mimeType: mime,
          size: buffer.length,
          textContent,
          isImage,
          isDocument: isDocument && !isImage,
          truncated,
          processingMethod,
          processingError,
        },
      });
    } catch (error: any) {
      console.error("[Upload] Error:", error);
      res.status(500).json({ error: "Falha no upload do arquivo" });
    }
  });
}
