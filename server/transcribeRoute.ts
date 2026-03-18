/**
 * Audio Transcription Route
 * Receives an audio URL and returns the transcribed text using Whisper API.
 */

import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { transcribeAudio } from "./_core/voiceTranscription";

export function registerTranscribeRoute(app: Express) {
  app.post("/api/transcribe", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { audioUrl, language, prompt } = req.body;

      if (!audioUrl) {
        res.status(400).json({ error: "Missing audioUrl" });
        return;
      }

      const result = await transcribeAudio({
        audioUrl,
        language: language || "pt",
        prompt: prompt || "Transcreva o audio do usuario em portugues brasileiro",
      });

      // Check if it's an error
      if ("error" in result) {
        console.error("[Transcribe] Error:", result);
        res.status(400).json(result);
        return;
      }

      res.json({
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      });
    } catch (error: any) {
      console.error("[Transcribe] Error:", error);
      res.status(500).json({ error: "Falha na transcricao do audio" });
    }
  });
}
