/**
 * Video Generation Provider for debuga.ai — Async Multimodal
 *
 * Supports:
 *   - Google Veo (primary)
 *   - Replicate (fallback)
 *   - Runway Gen-3 (fallback)
 *
 * Video generation is ASYNCHRONOUS:
 *   1. User requests video → job created with status "pending"
 *   2. Job is submitted to provider → status "processing"
 *   3. Provider completes → status "completed" with resultUrl
 *   4. If error → status "failed" with error message
 *
 * Environment Variables:
 *   VIDEO_GENERATION_ENABLED=true
 *   VIDEO_PROVIDER_PRIMARY=veo
 *   VIDEO_PROVIDER_FALLBACK=replicate
 *   VEO_API_KEY=
 *   VEO_API_URL=https://generativelanguage.googleapis.com/v1beta
 *   VEO_MODEL=veo-3.1
 *   REPLICATE_API_TOKEN=
 *   REPLICATE_VIDEO_MODEL=minimax/video-01
 *   RUNWAY_API_KEY=
 */

import { ENV } from "./_core/env";
import { storagePut, isStorageConfigured, getPublicUrl } from "./storage";
import crypto from "crypto";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type VideoJobStatus = "pending" | "processing" | "completed" | "failed";

export type VideoGenerationRequest = {
  prompt: string;
  duration?: number; // seconds (5-60)
  aspectRatio?: "16:9" | "9:16" | "1:1";
  style?: string;
  referenceImageUrl?: string;
  userId: number;
  conversationId?: number;
};

export type VideoJobResult = {
  jobId: string;
  status: VideoJobStatus;
  provider: string;
  model: string;
  prompt: string;
  estimatedDuration?: number; // seconds to complete
  resultUrl?: string;
  thumbnailUrl?: string;
  cost: number;
  error?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
};

export type VideoGenerationError = {
  error: string;
  code: string;
  provider: string;
  retryable: boolean;
};

// ══════════════════════════════════════════════════════════════
// Provider Configuration
// ══════════════════════════════════════════════════════════════

type VideoProviderConfig = {
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
};

function getVideoProviders(): VideoProviderConfig[] {
  const providers: VideoProviderConfig[] = [];

  if (process.env.VIDEO_GENERATION_ENABLED !== "true") return providers;

  const primary = process.env.VIDEO_PROVIDER_PRIMARY || "veo";
  const fallback = process.env.VIDEO_PROVIDER_FALLBACK || "replicate";

  // Add primary first
  const addProvider = (name: string) => {
    switch (name) {
      case "veo":
        if (process.env.VEO_API_KEY || ENV.geminiApiKey) {
          providers.push({
            name: "veo",
            apiUrl: process.env.VEO_API_URL || "https://generativelanguage.googleapis.com/v1beta",
            apiKey: process.env.VEO_API_KEY || ENV.geminiApiKey,
            model: process.env.VEO_MODEL || "veo-3.1",
          });
        }
        break;
      case "replicate":
        if (process.env.REPLICATE_API_TOKEN) {
          providers.push({
            name: "replicate",
            apiUrl: "https://api.replicate.com/v1",
            apiKey: process.env.REPLICATE_API_TOKEN,
            model: process.env.REPLICATE_VIDEO_MODEL || "minimax/video-01",
          });
        }
        break;
      case "runway":
        if (process.env.RUNWAY_API_KEY) {
          providers.push({
            name: "runway",
            apiUrl: "https://api.dev.runwayml.com/v1",
            apiKey: process.env.RUNWAY_API_KEY,
            model: "gen3a_turbo",
          });
        }
        break;
    }
  };

  addProvider(primary);
  if (fallback !== primary) addProvider(fallback);

  return providers;
}

// ══════════════════════════════════════════════════════════════
// Video Generation — Veo (Google)
// ══════════════════════════════════════════════════════════════

async function submitVeoJob(config: VideoProviderConfig, request: VideoGenerationRequest): Promise<VideoJobResult> {
  const body = {
    model: `models/${config.model}`,
    generateVideoConfig: {
      prompt: request.prompt,
      ...(request.duration ? { durationSeconds: request.duration } : {}),
      ...(request.aspectRatio ? { aspectRatio: request.aspectRatio } : {}),
      ...(request.referenceImageUrl ? { image: { imageUri: request.referenceImageUrl } } : {}),
    },
  };

  const response = await fetch(`${config.apiUrl}/models/${config.model}:generateVideo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw {
      error: `Veo API error (${response.status}): ${errorBody}`,
      code: "VEO_ERROR",
      provider: "veo",
      retryable: response.status >= 500,
    } as VideoGenerationError;
  }

  const data = await response.json() as {
    name: string; // operation name for polling
    metadata?: Record<string, unknown>;
  };

  return {
    jobId: data.name || `veo_${Date.now()}`,
    status: "processing",
    provider: "veo",
    model: config.model,
    prompt: request.prompt,
    estimatedDuration: 120, // ~2 minutes typical
    cost: 0.10,
    metadata: { operationName: data.name },
    createdAt: new Date(),
  };
}

// ══════════════════════════════════════════════════════════════
// Video Generation — Replicate
// ══════════════════════════════════════════════════════════════

async function submitReplicateVideoJob(config: VideoProviderConfig, request: VideoGenerationRequest): Promise<VideoJobResult> {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
  };

  if (request.duration) input.duration = request.duration;
  if (request.referenceImageUrl) input.image = request.referenceImageUrl;

  const response = await fetch(`${config.apiUrl}/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw {
      error: `Replicate API error (${response.status}): ${errorBody}`,
      code: "REPLICATE_ERROR",
      provider: "replicate",
      retryable: response.status >= 500,
    } as VideoGenerationError;
  }

  const prediction = await response.json() as {
    id: string;
    status: string;
    urls?: { get: string };
  };

  return {
    jobId: prediction.id,
    status: "processing",
    provider: "replicate",
    model: config.model,
    prompt: request.prompt,
    estimatedDuration: 180, // ~3 minutes typical
    cost: 0.05,
    metadata: { pollUrl: prediction.urls?.get },
    createdAt: new Date(),
  };
}

// ══════════════════════════════════════════════════════════════
// Video Generation — Runway
// ══════════════════════════════════════════════════════════════

async function submitRunwayJob(config: VideoProviderConfig, request: VideoGenerationRequest): Promise<VideoJobResult> {
  const body: Record<string, unknown> = {
    promptText: request.prompt,
    model: config.model,
    ...(request.duration ? { duration: request.duration } : { duration: 5 }),
    ...(request.referenceImageUrl ? { promptImage: request.referenceImageUrl } : {}),
  };

  const response = await fetch(`${config.apiUrl}/image_to_video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw {
      error: `Runway API error (${response.status}): ${errorBody}`,
      code: "RUNWAY_ERROR",
      provider: "runway",
      retryable: response.status >= 500,
    } as VideoGenerationError;
  }

  const data = await response.json() as { id: string };

  return {
    jobId: data.id,
    status: "processing",
    provider: "runway",
    model: config.model,
    prompt: request.prompt,
    estimatedDuration: 90,
    cost: 0.05,
    metadata: { taskId: data.id },
    createdAt: new Date(),
  };
}

// ══════════════════════════════════════════════════════════════
// Job Status Polling
// ══════════════════════════════════════════════════════════════

/**
 * Check the status of a video generation job.
 */
export async function checkVideoJobStatus(job: VideoJobResult): Promise<VideoJobResult> {
  switch (job.provider) {
    case "veo":
      return await checkVeoJobStatus(job);
    case "replicate":
      return await checkReplicateJobStatus(job);
    case "runway":
      return await checkRunwayJobStatus(job);
    default:
      return { ...job, status: "failed", error: `Unknown provider: ${job.provider}` };
  }
}

async function checkVeoJobStatus(job: VideoJobResult): Promise<VideoJobResult> {
  const operationName = (job.metadata as any)?.operationName;
  if (!operationName) return { ...job, status: "failed", error: "No operation name" };

  const apiKey = process.env.VEO_API_KEY || ENV.geminiApiKey;
  const apiUrl = process.env.VEO_API_URL || "https://generativelanguage.googleapis.com/v1beta";

  const response = await fetch(`${apiUrl}/${operationName}`, {
    headers: { "x-goog-api-key": apiKey },
  });

  if (!response.ok) {
    return { ...job, status: "failed", error: `Poll failed: ${response.status}` };
  }

  const data = await response.json() as {
    done?: boolean;
    response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri: string } }> } };
    error?: { message: string };
  };

  if (data.error) {
    return { ...job, status: "failed", error: data.error.message, completedAt: new Date() };
  }

  if (data.done) {
    const videoUri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    return {
      ...job,
      status: "completed",
      resultUrl: videoUri || undefined,
      completedAt: new Date(),
    };
  }

  return { ...job, status: "processing" };
}

async function checkReplicateJobStatus(job: VideoJobResult): Promise<VideoJobResult> {
  const pollUrl = (job.metadata as any)?.pollUrl;
  if (!pollUrl) return { ...job, status: "failed", error: "No poll URL" };

  const apiKey = process.env.REPLICATE_API_TOKEN;
  const response = await fetch(pollUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return { ...job, status: "failed", error: `Poll failed: ${response.status}` };
  }

  const data = await response.json() as {
    status: string;
    output?: string | string[];
    error?: string;
  };

  if (data.status === "succeeded") {
    const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    return { ...job, status: "completed", resultUrl: videoUrl || undefined, completedAt: new Date() };
  }

  if (data.status === "failed") {
    return { ...job, status: "failed", error: data.error || "Prediction failed", completedAt: new Date() };
  }

  return { ...job, status: "processing" };
}

async function checkRunwayJobStatus(job: VideoJobResult): Promise<VideoJobResult> {
  const taskId = (job.metadata as any)?.taskId;
  if (!taskId) return { ...job, status: "failed", error: "No task ID" };

  const apiKey = process.env.RUNWAY_API_KEY;
  const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
    },
  });

  if (!response.ok) {
    return { ...job, status: "failed", error: `Poll failed: ${response.status}` };
  }

  const data = await response.json() as {
    status: string;
    output?: string[];
    failure?: string;
  };

  if (data.status === "SUCCEEDED") {
    return { ...job, status: "completed", resultUrl: data.output?.[0], completedAt: new Date() };
  }

  if (data.status === "FAILED") {
    return { ...job, status: "failed", error: data.failure || "Task failed", completedAt: new Date() };
  }

  return { ...job, status: "processing" };
}

// ══════════════════════════════════════════════════════════════
// Main Generation Function
// ══════════════════════════════════════════════════════════════

/**
 * Submit a video generation job.
 * Returns immediately with job status "processing".
 * Use checkVideoJobStatus() to poll for completion.
 *
 * @throws VideoGenerationError if submission fails
 */
export async function submitVideoGeneration(request: VideoGenerationRequest): Promise<VideoJobResult> {
  const providers = getVideoProviders();

  if (providers.length === 0) {
    throw {
      error: "Nenhum provider de geração de vídeo configurado. Configure VIDEO_GENERATION_ENABLED=true e VEO_API_KEY ou REPLICATE_API_TOKEN no .env.",
      code: "NO_VIDEO_PROVIDER",
      provider: "none",
      retryable: false,
    } as VideoGenerationError;
  }

  let lastError: VideoGenerationError | null = null;

  for (const provider of providers) {
    try {
      console.log(`[VideoProvider] Submetendo job para ${provider.name} (model: ${provider.model})...`);

      switch (provider.name) {
        case "veo":
          return await submitVeoJob(provider, request);
        case "replicate":
          return await submitReplicateVideoJob(provider, request);
        case "runway":
          return await submitRunwayJob(provider, request);
        default:
          continue;
      }
    } catch (err: any) {
      lastError = err as VideoGenerationError;
      console.error(`[VideoProvider] ${provider.name} falhou: ${lastError.error}`);
      if (!lastError.retryable) throw lastError;
    }
  }

  throw lastError || {
    error: "Todos os providers de vídeo falharam.",
    code: "ALL_PROVIDERS_FAILED",
    provider: "cascade",
    retryable: false,
  } as VideoGenerationError;
}

// ══════════════════════════════════════════════════════════════
// Video Persistence — Download and store completed videos in S3
// ══════════════════════════════════════════════════════════════

/**
 * After a video job completes, download the result and persist to S3.
 * Returns updated job with permanent publicUrl.
 */
export async function persistVideoToStorage(
  job: VideoJobResult,
  userId?: number
): Promise<VideoJobResult> {
  if (job.status !== "completed" || !job.resultUrl) return job;
  if (!isStorageConfigured()) {
    console.warn("[VideoProvider] S3 not configured, video URL may expire");
    return job;
  }

  try {
    const response = await fetch(job.resultUrl);
    if (!response.ok) {
      console.error(`[VideoProvider] Failed to download video: ${response.status}`);
      return job;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileId = crypto.randomUUID();
    const key = `generated-videos/${userId || "anon"}/${fileId}.mp4`;

    const { key: savedKey } = await storagePut(key, buffer, "video/mp4");
    const publicUrl = getPublicUrl(savedKey);

    console.log(`[VideoProvider] Video persisted to S3: key=${savedKey}`);
    return {
      ...job,
      resultUrl: publicUrl,
      metadata: { ...job.metadata, storageKey: savedKey, originalUrl: job.resultUrl },
    };
  } catch (err: any) {
    console.error(`[VideoProvider] Failed to persist video: ${err.message}`);
    return job; // keep original URL
  }
}

// ══════════════════════════════════════════════════════════════
// Utility Functions
// ══════════════════════════════════════════════════════════════

/**
 * Check if video generation is available.
 */
export function isVideoGenerationAvailable(): boolean {
  return process.env.VIDEO_GENERATION_ENABLED === "true" && getVideoProviders().length > 0;
}

/**
 * Get video generation provider info for admin display.
 */
export function getVideoProviderInfo(): {
  available: boolean;
  enabled: boolean;
  providers: Array<{ name: string; model: string; available: boolean }>;
} {
  const enabled = process.env.VIDEO_GENERATION_ENABLED === "true";
  const providers = getVideoProviders();

  return {
    available: providers.length > 0,
    enabled,
    providers: providers.map(p => ({
      name: p.name,
      model: p.model,
      available: true,
    })),
  };
}
