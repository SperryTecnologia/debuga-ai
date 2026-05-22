/**
 * Image Generation Provider for debuga.ai — Multimodal
 *
 * Supports:
 *   - OpenAI gpt-image-1 / DALL-E 3 / DALL-E 2 (primary)
 *   - Gemini Image (if GEMINI_IMAGE_ENABLED=true)
 *   - Replicate (Flux, SDXL, etc.) as fallback
 *
 * Usage:
 *   const result = await generateImage({ prompt, size, quality });
 *   // result.url → generated image URL
 *   // result.revisedPrompt → revised prompt
 *   // result.cost → estimated cost in USD
 *
 * Environment Variables:
 *   IMAGE_GENERATION_ENABLED=true
 *   OPENAI_IMAGE_ENABLED=true
 *   OPENAI_IMAGE_MODEL=gpt-image-1
 *   GEMINI_IMAGE_ENABLED=false
 *   GEMINI_IMAGE_MODEL=gemini-2.0-flash-exp
 *   REPLICATE_API_TOKEN=
 *   REPLICATE_IMAGE_MODEL=black-forest-labs/flux-schnell
 */

import { ENV } from "./_core/env";
import { storagePut, isStorageConfigured, getPublicUrl } from "./storage";
import crypto from "crypto";

// ══════════════════════════════════════════════════════════════
// Image Persistence — Upload to S3 for permanent URLs
// ══════════════════════════════════════════════════════════════

/**
 * Persist an image to S3 storage.
 * Handles both base64 data URLs and remote URLs (temporary OpenAI URLs).
 * Returns a permanent S3 URL.
 * If S3 is not configured, returns the original URL unchanged.
 */
export interface PersistResult {
  publicUrl: string;
  storageKey: string;
  persisted: boolean;
}

async function persistImageToStorage(imageUrl: string, userId?: number): Promise<PersistResult> {
  // If S3 is not configured, return original URL (not persisted)
  if (!isStorageConfigured()) {
    console.warn("[ImageProvider] S3 not configured, returning raw image URL (may be temporary or data:)");
    return { publicUrl: imageUrl, storageKey: "", persisted: false };
  }

  const fileId = crypto.randomUUID();
  const key = `generated-images/${userId || "anon"}/${fileId}.png`;

  try {
    let buffer: Buffer;

    if (imageUrl.startsWith("data:image/")) {
      // Base64 data URL → extract buffer
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else if (imageUrl.startsWith("http")) {
      // Remote URL (temporary) → download to buffer
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`[ImageProvider] Failed to download image from ${imageUrl}: ${response.status}`);
        return { publicUrl: imageUrl, storageKey: "", persisted: false };
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Unknown format, return as-is
      return { publicUrl: imageUrl, storageKey: "", persisted: false };
    }

    const { key: savedKey } = await storagePut(key, buffer, "image/png");
    const publicUrl = getPublicUrl(savedKey);
    console.log(`[ImageProvider] Image persisted to S3: key=${savedKey}, publicUrl=${publicUrl}`);
    return { publicUrl, storageKey: savedKey, persisted: true };
  } catch (err: any) {
    console.error(`[ImageProvider] Failed to persist image to S3: ${err.message}`);
    // Fallback: return original URL (may expire or be blocked)
    return { publicUrl: imageUrl, storageKey: "", persisted: false };
  }
}

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type ImageSize = "1024x1024" | "1792x1024" | "1024x1792" | "512x512" | "256x256" | "auto";
export type ImageQuality = "low" | "medium" | "high" | "auto";
export type ImageStyle = "vivid" | "natural";

export type ImageGenerationRequest = {
  prompt: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  model?: string;
  userId?: number;
  conversationId?: number;
  negativePrompt?: string;
};

export type ImageGenerationResult = {
  url: string;
  storageKey?: string;
  revisedPrompt?: string;
  model: string;
  size: string;
  quality: string;
  cost: number; // USD
  provider: string;
  generationTimeMs: number;
  metadata?: Record<string, unknown>;
};

export type ImageGenerationError = {
  error: string;
  code: string;
  provider: string;
  retryable: boolean;
};

// ══════════════════════════════════════════════════════════════
// Cost Estimation
// ══════════════════════════════════════════════════════════════

const IMAGE_COSTS: Record<string, Record<string, number>> = {
  "gpt-image-1": {
    "low_1024x1024": 0.011,
    "medium_1024x1024": 0.042,
    "high_1024x1024": 0.167,
    "low_1792x1024": 0.022,
    "medium_1792x1024": 0.063,
    "high_1792x1024": 0.25,
    "auto_auto": 0.042,
  },
  "dall-e-3": {
    "standard_1024x1024": 0.04,
    "standard_1792x1024": 0.08,
    "standard_1024x1792": 0.08,
    "hd_1024x1024": 0.08,
    "hd_1792x1024": 0.12,
    "hd_1024x1792": 0.12,
  },
  "dall-e-2": {
    "standard_1024x1024": 0.02,
    "standard_512x512": 0.018,
    "standard_256x256": 0.016,
  },
  replicate: {
    default: 0.003,
  },
  gemini: {
    default: 0.02,
  },
};

function estimateImageCost(model: string, size: string, quality: string): number {
  const modelCosts = IMAGE_COSTS[model];
  if (!modelCosts) return 0.04; // default estimate

  const key = `${quality}_${size}`;
  return modelCosts[key] ?? modelCosts.default ?? 0.04;
}

// ══════════════════════════════════════════════════════════════
// Provider Configuration
// ══════════════════════════════════════════════════════════════

type ImageProviderConfig = {
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
};

function getImageProviders(): ImageProviderConfig[] {
  const providers: ImageProviderConfig[] = [];

  // Priority 1: OpenAI Image (gpt-image-1 / DALL-E)
  if (process.env.OPENAI_IMAGE_ENABLED === "true" || process.env.IMAGE_GENERATION_ENABLED === "true") {
    const apiUrl = process.env.IMAGE_API_URL || ENV.openaiApiUrl || "";
    const apiKey = process.env.IMAGE_API_KEY || ENV.openaiApiKey || "";
    if (apiUrl && apiKey) {
      providers.push({
        name: "openai_image",
        apiUrl: apiUrl.replace(/\/v1\/?$/, "") + "/v1",
        apiKey,
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
      });
    }
  }

  // Priority 2: Gemini Image
  if (process.env.GEMINI_IMAGE_ENABLED === "true") {
    if (ENV.geminiApiUrl && ENV.geminiApiKey) {
      providers.push({
        name: "gemini_image",
        apiUrl: ENV.geminiApiUrl,
        apiKey: ENV.geminiApiKey,
        model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-exp",
      });
    }
  }

  // Priority 3: Replicate
  if (process.env.REPLICATE_API_TOKEN) {
    providers.push({
      name: "replicate",
      apiUrl: "https://api.replicate.com/v1",
      apiKey: process.env.REPLICATE_API_TOKEN,
      model: process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell",
    });
  }

  return providers;
}

// ══════════════════════════════════════════════════════════════
// OpenAI Image Generation (gpt-image-1 / DALL-E)
// ══════════════════════════════════════════════════════════════

async function generateWithOpenAI(config: ImageProviderConfig, request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const model = request.model || config.model;
  const size = request.size || "1024x1024";
  const quality = request.quality || "auto";
  const style = request.style || "vivid";
  const startTime = Date.now();

  const body: Record<string, unknown> = {
    model,
    prompt: request.prompt,
    n: 1,
    size: size === "auto" ? "1024x1024" : size,
  };

  // Model-specific options
  if (model === "gpt-image-1") {
    body.quality = quality;
    // gpt-image-1 returns b64_json by default
    body.output_format = "png";
  } else if (model === "dall-e-3") {
    body.quality = quality === "high" ? "hd" : "standard";
    body.style = style;
    body.response_format = "url";
  } else {
    // dall-e-2
    body.response_format = "url";
  }

  const response = await fetch(`${config.apiUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `API retornou status ${response.status}`;
    let errorCode = "API_ERROR";
    let retryable = response.status >= 500;

    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error?.message || errorMessage;
      errorCode = parsed.error?.code || errorCode;

      if (errorCode === "content_policy_violation") {
        errorMessage = "O prompt viola as políticas de conteúdo. Tente reformular sem conteúdo explícito, violento ou que viole direitos autorais.";
        retryable = false;
      }
      if (response.status === 429) {
        errorMessage = "Limite de requisições de imagem excedido. Aguarde um momento.";
        retryable = true;
      }
      if (response.status === 402 || errorCode === "billing_hard_limit_reached") {
        errorMessage = "Limite de billing da API de imagens atingido.";
        retryable = false;
      }
    } catch {}

    throw { error: errorMessage, code: errorCode, provider: "openai_image", retryable } as ImageGenerationError;
  }

  const data = await response.json() as {
    data: Array<{
      url?: string;
      b64_json?: string;
      revised_prompt?: string;
    }>;
  };

  const imageData = data.data?.[0];
  if (!imageData?.url && !imageData?.b64_json) {
    throw { error: "Resposta da API não contém imagem.", code: "EMPTY_RESPONSE", provider: "openai_image", retryable: true } as ImageGenerationError;
  }

  // Persist image to S3 for permanent URL
  let rawUrl = imageData.url || "";
  if (!rawUrl && imageData.b64_json) {
    rawUrl = `data:image/png;base64,${imageData.b64_json}`;
  }

  const persisted = await persistImageToStorage(rawUrl, request.userId);

  return {
    url: persisted.publicUrl,
    storageKey: persisted.storageKey,
    revisedPrompt: imageData.revised_prompt,
    model,
    size: size === "auto" ? "1024x1024" : size,
    quality,
    cost: estimateImageCost(model, size === "auto" ? "1024x1024" : size, quality),
    provider: "openai_image",
    generationTimeMs: Date.now() - startTime,
  };
}

// ══════════════════════════════════════════════════════════════
// Replicate Image Generation
// ══════════════════════════════════════════════════════════════

async function generateWithReplicate(config: ImageProviderConfig, request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const startTime = Date.now();

  // Create prediction
  const createResponse = await fetch(`${config.apiUrl}/predictions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      Prefer: "wait", // wait for result synchronously (up to 60s)
    },
    body: JSON.stringify({
      model: config.model,
      input: {
        prompt: request.prompt,
        ...(request.negativePrompt ? { negative_prompt: request.negativePrompt } : {}),
        ...(request.size && request.size !== "auto" ? {
          width: parseInt(request.size.split("x")[0]),
          height: parseInt(request.size.split("x")[1]),
        } : {}),
      },
    }),
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw {
      error: `Replicate API error: ${errorBody}`,
      code: "REPLICATE_ERROR",
      provider: "replicate",
      retryable: createResponse.status >= 500,
    } as ImageGenerationError;
  }

  const prediction = await createResponse.json() as {
    id: string;
    status: string;
    output?: string | string[];
    error?: string;
  };

  if (prediction.status === "failed") {
    throw {
      error: prediction.error || "Replicate prediction failed",
      code: "REPLICATE_FAILED",
      provider: "replicate",
      retryable: true,
    } as ImageGenerationError;
  }

  // If not completed yet, poll (shouldn't happen with Prefer: wait)
  let output = prediction.output;
  if (prediction.status !== "succeeded" && !output) {
    // Poll up to 120 seconds
    const pollUrl = `${config.apiUrl}/predictions/${prediction.id}`;
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(pollUrl, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      const pollData = await pollRes.json() as typeof prediction;
      if (pollData.status === "succeeded") {
        output = pollData.output;
        break;
      }
      if (pollData.status === "failed") {
        throw {
          error: pollData.error || "Replicate prediction failed",
          code: "REPLICATE_FAILED",
          provider: "replicate",
          retryable: false,
        } as ImageGenerationError;
      }
    }
  }

  const rawImageUrl = Array.isArray(output) ? output[0] : output;
  if (!rawImageUrl) {
    throw { error: "Replicate não retornou imagem", code: "EMPTY_RESPONSE", provider: "replicate", retryable: true } as ImageGenerationError;
  }

  // Persist to S3 (Replicate URLs also expire)
  const persisted = await persistImageToStorage(rawImageUrl, request.userId);

  return {
    url: persisted.publicUrl,
    storageKey: persisted.storageKey,
    model: config.model,
    size: request.size || "1024x1024",
    quality: request.quality || "auto",
    cost: estimateImageCost("replicate", "default", "default"),
    provider: "replicate",
    generationTimeMs: Date.now() - startTime,
  };
}

// ══════════════════════════════════════════════════════════════
// Main Generation Function (with fallback cascade)
// ══════════════════════════════════════════════════════════════

/**
 * Generate an image using the configured provider cascade.
 * Tries providers in order: OpenAI → Gemini → Replicate
 *
 * @throws ImageGenerationError if all providers fail
 */
export async function generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
  const providers = getImageProviders();

  if (providers.length === 0) {
    throw {
      error: "Nenhum provider de geração de imagem configurado. Configure IMAGE_GENERATION_ENABLED=true e OPENAI_IMAGE_ENABLED=true no .env.",
      code: "NO_IMAGE_PROVIDER",
      provider: "none",
      retryable: false,
    } as ImageGenerationError;
  }

  let lastError: ImageGenerationError | null = null;

  for (const provider of providers) {
    try {
      console.log(`[ImageProvider] Tentando ${provider.name} (model: ${provider.model})...`);

      if (provider.name === "openai_image") {
        return await generateWithOpenAI(provider, request);
      }
      if (provider.name === "replicate") {
        return await generateWithReplicate(provider, request);
      }
      if (provider.name === "gemini_image") {
        // Gemini image uses the same OpenAI-compatible API format
        return await generateWithOpenAI(provider, request);
      }

      // Unknown provider type, skip
      continue;
    } catch (err: any) {
      lastError = err as ImageGenerationError;
      console.error(`[ImageProvider] ${provider.name} falhou: ${lastError.error}`);

      // If not retryable, don't try other providers
      if (!lastError.retryable) throw lastError;
    }
  }

  // All providers failed
  throw lastError || {
    error: "Todos os providers de imagem falharam.",
    code: "ALL_PROVIDERS_FAILED",
    provider: "cascade",
    retryable: false,
  } as ImageGenerationError;
}

// ══════════════════════════════════════════════════════════════
// Utility Functions
// ══════════════════════════════════════════════════════════════

/**
 * Check if image generation is available (any provider configured).
 */
export function isImageGenerationAvailable(): boolean {
  return process.env.IMAGE_GENERATION_ENABLED === "true" && getImageProviders().length > 0;
}

/**
 * Get image generation provider info for admin display.
 */
export function getImageProviderInfo(): {
  available: boolean;
  enabled: boolean;
  providers: Array<{ name: string; model: string; available: boolean }>;
} {
  const enabled = process.env.IMAGE_GENERATION_ENABLED === "true";
  const providers = getImageProviders();

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

/**
 * Parse image generation request from user message.
 * Extracts size, quality, style preferences from natural language.
 */
export function parseImageRequest(message: string): Partial<ImageGenerationRequest> {
  const result: Partial<ImageGenerationRequest> = {};

  // Size detection
  if (/\b(landscape|paisagem|horizontal|wide|widescreen)\b/i.test(message)) {
    result.size = "1792x1024";
  } else if (/\b(portrait|retrato|vertical|tall)\b/i.test(message)) {
    result.size = "1024x1792";
  } else if (/\b(square|quadrado|quadrada)\b/i.test(message)) {
    result.size = "1024x1024";
  }

  // Quality detection
  if (/\b(hd|alta qualidade|high quality|detalhad[oa]|detailed|4k|8k)\b/i.test(message)) {
    result.quality = "high";
  } else if (/\b(rápid[oa]|fast|quick|preview|rascunho|draft)\b/i.test(message)) {
    result.quality = "low";
  }

  // Style detection
  if (/\b(realista|realistic|fotográfic[oa]|photographic|natural)\b/i.test(message)) {
    result.style = "natural";
  } else if (/\b(artístic[oa]|artistic|vibrant|vivid|colorid[oa]|colorful)\b/i.test(message)) {
    result.style = "vivid";
  }

  return result;
}
