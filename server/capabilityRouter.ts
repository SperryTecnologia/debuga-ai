/**
 * Capability Router for debuga.ai — Multimodal Provider Matrix
 *
 * Routes requests to the optimal provider based on:
 *   - Task type (from intent classifier)
 *   - Configurable provider order per capability (.env)
 *   - Provider capabilities matrix
 *   - Cost optimization rules
 *   - Availability and fallback logic
 *
 * Environment Variables for Provider Order:
 *   TEXT_PROVIDER_ORDER=local_gpu,gemini,openai,anthropic,openrouter
 *   CODE_PROVIDER_ORDER=local_gpu,anthropic,openai,openrouter
 *   IMAGE_PROVIDER_ORDER=openai_image,gemini_image,replicate
 *   VIDEO_PROVIDER_ORDER=veo,replicate,runway
 *   VISION_PROVIDER_ORDER=gemini,openai,anthropic
 *   DIAGRAM_PROVIDER_ORDER=gemini,openai,anthropic,openrouter
 *   DOCUMENT_PROVIDER_ORDER=gemini,openai,anthropic
 *   INFRA_PROVIDER_ORDER=local_gpu,gemini,openai,anthropic,openrouter
 */

import { ENV, resolveLLMProvider, resolveFallbackProvider, type LLMProviderConfig } from "./_core/env";
import { type TaskType, getCapabilityRequirements } from "./intentClassifier";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type ProviderCapability = {
  textGeneration: number;       // 0-5
  codeGeneration: number;       // 0-5
  imageGeneration: number;      // 0-5 (0 = not supported)
  imageAnalysis: number;        // 0-5 (0 = not supported)
  videoGeneration: number;      // 0-5 (0 = not supported)
  diagramGeneration: number;    // 0-5
  documentAnalysis: number;     // 0-5
  audioTranscription: number;   // 0-5 (0 = not supported)
  infraSupport: number;         // 0-5
  reasoning: number;            // 0-5
  toolUse: number;              // 0-5
  contextWindow: number;        // tokens
  costPer1kTokens: number;      // USD estimate
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsToolCalls: boolean;
};

export type RoutingDecision = {
  provider: LLMProviderConfig;
  reason: string;
  estimatedCost: number;        // USD estimate for this request
  capability: string;           // which capability was matched
  capabilityScore: number;      // 0-5 score for this capability
  isOptimal: boolean;           // true if this is the best provider for this task
  alternativeProvider?: LLMProviderConfig | null; // fallback if primary fails
};

// ══════════════════════════════════════════════════════════════
// Provider Capability Matrix
// ══════════════════════════════════════════════════════════════

const PROVIDER_CAPABILITIES: Record<string, ProviderCapability> = {
  gemini: {
    textGeneration: 5,
    codeGeneration: 4,
    imageGeneration: 3, // Gemini 2.x can generate images
    imageAnalysis: 5,
    videoGeneration: 0,
    diagramGeneration: 5,
    documentAnalysis: 5,
    audioTranscription: 3,
    infraSupport: 4,
    reasoning: 5,
    toolUse: 5,
    contextWindow: 1000000,
    costPer1kTokens: 0.00035,
    supportsVision: true,
    supportsStreaming: true,
    supportsToolCalls: true,
  },
  openai: {
    textGeneration: 5,
    codeGeneration: 5,
    imageGeneration: 5, // DALL-E / gpt-image-1
    imageAnalysis: 5,
    videoGeneration: 0,
    diagramGeneration: 5,
    documentAnalysis: 5,
    audioTranscription: 5, // Whisper
    infraSupport: 5,
    reasoning: 5,
    toolUse: 5,
    contextWindow: 128000,
    costPer1kTokens: 0.00015,
    supportsVision: true,
    supportsStreaming: true,
    supportsToolCalls: true,
  },
  anthropic: {
    textGeneration: 5,
    codeGeneration: 5,
    imageGeneration: 0,
    imageAnalysis: 5,
    videoGeneration: 0,
    diagramGeneration: 5,
    documentAnalysis: 5,
    audioTranscription: 0,
    infraSupport: 5,
    reasoning: 5,
    toolUse: 4,
    contextWindow: 200000,
    costPer1kTokens: 0.0003,
    supportsVision: true,
    supportsStreaming: true,
    supportsToolCalls: true,
  },
  openrouter: {
    textGeneration: 5,
    codeGeneration: 5,
    imageGeneration: 4,
    imageAnalysis: 4,
    videoGeneration: 0,
    diagramGeneration: 4,
    documentAnalysis: 4,
    audioTranscription: 0,
    infraSupport: 4,
    reasoning: 5,
    toolUse: 4,
    contextWindow: 128000,
    costPer1kTokens: 0.0002,
    supportsVision: true,
    supportsStreaming: true,
    supportsToolCalls: true,
  },
  cloud: {
    textGeneration: 4,
    codeGeneration: 4,
    imageGeneration: 0,
    imageAnalysis: 4,
    videoGeneration: 0,
    diagramGeneration: 4,
    documentAnalysis: 4,
    audioTranscription: 0,
    infraSupport: 4,
    reasoning: 4,
    toolUse: 4,
    contextWindow: 128000,
    costPer1kTokens: 0.0005,
    supportsVision: true,
    supportsStreaming: true,
    supportsToolCalls: true,
  },
  forge: {
    textGeneration: 4,
    codeGeneration: 4,
    imageGeneration: 0,
    imageAnalysis: 4,
    videoGeneration: 0,
    diagramGeneration: 4,
    documentAnalysis: 4,
    audioTranscription: 0,
    infraSupport: 4,
    reasoning: 4,
    toolUse: 4,
    contextWindow: 128000,
    costPer1kTokens: 0.0005,
    supportsVision: true,
    supportsStreaming: true,
    supportsToolCalls: true,
  },
  local_gpu: {
    textGeneration: 3,
    codeGeneration: 3,
    imageGeneration: 0,
    imageAnalysis: 2,
    videoGeneration: 0,
    diagramGeneration: 3,
    documentAnalysis: 2,
    audioTranscription: 0,
    infraSupport: 3,
    reasoning: 2,
    toolUse: 2,
    contextWindow: 32768,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: true,
    supportsToolCalls: false,
  },
  ollama: {
    textGeneration: 3,
    codeGeneration: 3,
    imageGeneration: 0,
    imageAnalysis: 2,
    videoGeneration: 0,
    diagramGeneration: 3,
    documentAnalysis: 2,
    audioTranscription: 0,
    infraSupport: 3,
    reasoning: 2,
    toolUse: 2,
    contextWindow: 32768,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: true,
    supportsToolCalls: false,
  },
  // Specialized providers (non-LLM)
  openai_image: {
    textGeneration: 0,
    codeGeneration: 0,
    imageGeneration: 5,
    imageAnalysis: 0,
    videoGeneration: 0,
    diagramGeneration: 0,
    documentAnalysis: 0,
    audioTranscription: 0,
    infraSupport: 0,
    reasoning: 0,
    toolUse: 0,
    contextWindow: 0,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: false,
    supportsToolCalls: false,
  },
  gemini_image: {
    textGeneration: 0,
    codeGeneration: 0,
    imageGeneration: 4,
    imageAnalysis: 0,
    videoGeneration: 0,
    diagramGeneration: 0,
    documentAnalysis: 0,
    audioTranscription: 0,
    infraSupport: 0,
    reasoning: 0,
    toolUse: 0,
    contextWindow: 0,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: false,
    supportsToolCalls: false,
  },
  replicate: {
    textGeneration: 0,
    codeGeneration: 0,
    imageGeneration: 4,
    imageAnalysis: 0,
    videoGeneration: 4,
    diagramGeneration: 0,
    documentAnalysis: 0,
    audioTranscription: 0,
    infraSupport: 0,
    reasoning: 0,
    toolUse: 0,
    contextWindow: 0,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: false,
    supportsToolCalls: false,
  },
  veo: {
    textGeneration: 0,
    codeGeneration: 0,
    imageGeneration: 0,
    imageAnalysis: 0,
    videoGeneration: 5,
    diagramGeneration: 0,
    documentAnalysis: 0,
    audioTranscription: 0,
    infraSupport: 0,
    reasoning: 0,
    toolUse: 0,
    contextWindow: 0,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: false,
    supportsToolCalls: false,
  },
  runway: {
    textGeneration: 0,
    codeGeneration: 0,
    imageGeneration: 0,
    imageAnalysis: 0,
    videoGeneration: 4,
    diagramGeneration: 0,
    documentAnalysis: 0,
    audioTranscription: 0,
    infraSupport: 0,
    reasoning: 0,
    toolUse: 0,
    contextWindow: 0,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: false,
    supportsToolCalls: false,
  },
  mermaid: {
    textGeneration: 0,
    codeGeneration: 0,
    imageGeneration: 0,
    imageAnalysis: 0,
    videoGeneration: 0,
    diagramGeneration: 5,
    documentAnalysis: 0,
    audioTranscription: 0,
    infraSupport: 0,
    reasoning: 0,
    toolUse: 0,
    contextWindow: 0,
    costPer1kTokens: 0,
    supportsVision: false,
    supportsStreaming: false,
    supportsToolCalls: false,
  },
};

// ══════════════════════════════════════════════════════════════
// Configurable Provider Order (from .env)
// ══════════════════════════════════════════════════════════════

function parseProviderOrder(envVar: string, defaultOrder: string[]): string[] {
  const value = process.env[envVar];
  if (!value) return defaultOrder;
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

/**
 * Get the configured provider order for a given capability.
 */
export function getProviderOrder(taskType: TaskType): string[] {
  switch (taskType) {
    case "chat_text":
      return parseProviderOrder("TEXT_PROVIDER_ORDER", ["local_gpu", "gemini", "openai", "anthropic", "openrouter"]);
    case "infrastructure_support":
      return parseProviderOrder("INFRA_PROVIDER_ORDER", ["local_gpu", "gemini", "openai", "anthropic", "openrouter"]);
    case "code_generation":
      return parseProviderOrder("CODE_PROVIDER_ORDER", ["local_gpu", "anthropic", "openai", "gemini", "openrouter"]);
    case "image_generation":
    case "image_editing":
      return parseProviderOrder("IMAGE_PROVIDER_ORDER", ["openai_image", "gemini_image", "replicate"]);
    case "video_generation":
      return parseProviderOrder("VIDEO_PROVIDER_ORDER", ["veo", "replicate", "runway"]);
    case "image_analysis":
      return parseProviderOrder("VISION_PROVIDER_ORDER", ["gemini", "openai", "anthropic"]);
    case "network_diagram":
    case "architecture_diagram":
    case "flowchart_diagram":
      return parseProviderOrder("DIAGRAM_PROVIDER_ORDER", ["gemini", "openai", "anthropic", "openrouter"]);
    case "document_analysis":
      return parseProviderOrder("DOCUMENT_PROVIDER_ORDER", ["gemini", "openai", "anthropic"]);
    case "audio_transcription":
      return parseProviderOrder("AUDIO_PROVIDER_ORDER", ["openai", "gemini"]);
    case "web_research":
      return parseProviderOrder("TEXT_PROVIDER_ORDER", ["gemini", "openai", "anthropic", "openrouter"]);
    default:
      return parseProviderOrder("TEXT_PROVIDER_ORDER", ["local_gpu", "gemini", "openai", "anthropic", "openrouter"]);
  }
}

// ══════════════════════════════════════════════════════════════
// Routing Logic
// ══════════════════════════════════════════════════════════════

function getCapabilityScore(providerName: string, taskType: TaskType): number {
  const caps = PROVIDER_CAPABILITIES[providerName] || PROVIDER_CAPABILITIES.cloud;

  const scoreMap: Record<TaskType, number> = {
    chat_text: caps.textGeneration,
    infrastructure_support: caps.infraSupport,
    code_generation: caps.codeGeneration,
    image_generation: caps.imageGeneration,
    image_editing: caps.imageGeneration,
    video_generation: caps.videoGeneration,
    network_diagram: caps.diagramGeneration,
    architecture_diagram: caps.diagramGeneration,
    flowchart_diagram: caps.diagramGeneration,
    document_analysis: caps.documentAnalysis,
    image_analysis: caps.imageAnalysis,
    audio_transcription: caps.audioTranscription,
    web_research: caps.toolUse,
  };

  return scoreMap[taskType] ?? caps.textGeneration;
}

function canHandleTask(providerName: string, taskType: TaskType): boolean {
  const caps = PROVIDER_CAPABILITIES[providerName] || PROVIDER_CAPABILITIES.cloud;
  const requirements = getCapabilityRequirements(taskType);

  // Check hard requirements
  if (requirements.needsVision && !caps.supportsVision) return false;
  if (requirements.needsToolUse && !caps.supportsToolCalls) return false;
  if (requirements.needsImageGen && caps.imageGeneration === 0) return false;
  if (requirements.needsVideoGen && caps.videoGeneration === 0) return false;

  // Check minimum capability score
  const score = getCapabilityScore(providerName, taskType);
  return score >= 2; // minimum threshold
}

function estimateCost(providerName: string, estimatedTokens: number): number {
  const caps = PROVIDER_CAPABILITIES[providerName] || PROVIDER_CAPABILITIES.cloud;
  return (estimatedTokens / 1000) * caps.costPer1kTokens;
}

/**
 * Check if a provider is configured and available.
 */
function isProviderAvailable(providerName: string): boolean {
  switch (providerName) {
    case "gemini":
      return !!(ENV.geminiApiKey && ENV.geminiApiUrl);
    case "openai":
      return !!(ENV.openaiApiKey && ENV.openaiApiUrl);
    case "anthropic":
      return !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_URL);
    case "openrouter":
      return !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_URL);
    case "cloud":
      return !!(ENV.cloudApiKey && ENV.cloudApiUrl);
    case "forge":
      return !!(ENV.forgeApiKey && ENV.forgeApiUrl);
    case "local_gpu":
    case "ollama":
      return ENV.localLlmEnabled;
    case "openai_image":
      return !!(process.env.OPENAI_IMAGE_ENABLED === "true" && (process.env.IMAGE_API_KEY || ENV.openaiApiKey));
    case "gemini_image":
      return process.env.GEMINI_IMAGE_ENABLED === "true";
    case "replicate":
      return !!process.env.REPLICATE_API_TOKEN;
    case "veo":
      return !!(process.env.VEO_API_KEY && process.env.VIDEO_GENERATION_ENABLED === "true");
    case "runway":
      return !!(process.env.RUNWAY_API_KEY && process.env.VIDEO_GENERATION_ENABLED === "true");
    case "mermaid":
      return true; // always available (LLM generates mermaid code)
    default:
      return false;
  }
}

/**
 * Route a request to the optimal provider based on task type and capabilities.
 *
 * Priority logic:
 *   1. Use configured provider order for this capability
 *   2. Filter by availability and capability
 *   3. If LOCAL_LLM_PRIORITY=first and local can handle → use local
 *   4. Fallback to configured fallback provider
 */
export function routeToProvider(taskType: TaskType, estimatedTokens: number = 1000): RoutingDecision | null {
  const primary = resolveLLMProvider();
  const fallback = resolveFallbackProvider();

  if (!primary) {
    return null; // No provider configured at all
  }

  // Special case: LOCAL_LLM_PRIORITY=only
  if (ENV.localLlmEnabled && ENV.localLlmPriority === "only") {
    const localProvider: LLMProviderConfig = {
      name: "local_gpu",
      apiUrl: ENV.localLlmBaseUrl,
      apiKey: "",
      model: ENV.localLlmModel,
    };

    return {
      provider: localProvider,
      reason: `Local GPU exclusivo (priority=only) — sem fallback cloud`,
      estimatedCost: 0,
      capability: taskType,
      capabilityScore: getCapabilityScore("local_gpu", taskType),
      isOptimal: canHandleTask("local_gpu", taskType),
      alternativeProvider: null,
    };
  }

  // For specialized providers (image, video), route directly
  if (taskType === "image_generation" || taskType === "image_editing") {
    return routeImageProvider(taskType, estimatedTokens, primary, fallback);
  }
  if (taskType === "video_generation") {
    return routeVideoProvider(taskType, estimatedTokens, primary, fallback);
  }

  // For LLM-based tasks, use provider order
  const providerOrder = getProviderOrder(taskType);

  // Special case: LOCAL_LLM_PRIORITY=first
  if (ENV.localLlmEnabled && ENV.localLlmPriority === "first" && canHandleTask("local_gpu", taskType)) {
    const localProvider: LLMProviderConfig = {
      name: "local_gpu",
      apiUrl: ENV.localLlmBaseUrl,
      apiKey: "",
      model: ENV.localLlmModel,
    };

    // Find first available cloud alternative
    const altName = providerOrder.find(p => p !== "local_gpu" && isProviderAvailable(p) && canHandleTask(p, taskType));
    const altProvider = altName ? resolveLLMProvider(altName) : primary;

    return {
      provider: localProvider,
      reason: `Local GPU prioritário (priority=first) para ${taskType}`,
      estimatedCost: 0,
      capability: taskType,
      capabilityScore: getCapabilityScore("local_gpu", taskType),
      isOptimal: false,
      alternativeProvider: altProvider,
    };
  }

  // Find best available provider from order
  for (const providerName of providerOrder) {
    if (providerName === "local_gpu" && ENV.localLlmPriority !== "first") continue; // skip local if not priority
    if (!isProviderAvailable(providerName)) continue;
    if (!canHandleTask(providerName, taskType)) continue;

    const resolvedProvider = resolveLLMProvider(providerName);
    if (!resolvedProvider) continue;

    const score = getCapabilityScore(providerName, taskType);
    const cost = estimateCost(providerName, estimatedTokens);

    // Find alternative (next in order)
    const altName = providerOrder.find(p => p !== providerName && isProviderAvailable(p) && canHandleTask(p, taskType));
    const altProvider = altName ? resolveLLMProvider(altName) : fallback;

    return {
      provider: resolvedProvider,
      reason: `Provider ${providerName} selecionado via matrix (score ${score}/5 para ${taskType})`,
      estimatedCost: cost,
      capability: taskType,
      capabilityScore: score,
      isOptimal: score >= 4,
      alternativeProvider: altProvider,
    };
  }

  // Fallback: use primary provider regardless
  return {
    provider: primary,
    reason: `Provider primário (${primary.name}) usado como fallback para ${taskType}`,
    estimatedCost: estimateCost(primary.name, estimatedTokens),
    capability: taskType,
    capabilityScore: getCapabilityScore(primary.name, taskType),
    isOptimal: false,
    alternativeProvider: fallback,
  };
}

// ══════════════════════════════════════════════════════════════
// Specialized Routing (Image, Video)
// ══════════════════════════════════════════════════════════════

function routeImageProvider(taskType: TaskType, estimatedTokens: number, primary: LLMProviderConfig, fallback: LLMProviderConfig | null): RoutingDecision {
  const order = getProviderOrder(taskType);

  for (const providerName of order) {
    if (!isProviderAvailable(providerName)) continue;

    // For image providers, return a special config
    if (providerName === "openai_image") {
      return {
        provider: {
          name: "openai_image",
          apiUrl: process.env.IMAGE_API_URL || ENV.openaiApiUrl || "https://api.openai.com/v1",
          apiKey: process.env.IMAGE_API_KEY || ENV.openaiApiKey,
          model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        },
        reason: "OpenAI Image (DALL-E/gpt-image-1) — melhor para geração de imagens",
        estimatedCost: 0.04, // standard 1024x1024
        capability: taskType,
        capabilityScore: 5,
        isOptimal: true,
        alternativeProvider: fallback,
      };
    }

    if (providerName === "gemini_image") {
      return {
        provider: {
          name: "gemini_image",
          apiUrl: ENV.geminiApiUrl || "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: ENV.geminiApiKey,
          model: process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-exp",
        },
        reason: "Gemini Image — geração de imagens via Gemini",
        estimatedCost: 0.02,
        capability: taskType,
        capabilityScore: 4,
        isOptimal: false,
        alternativeProvider: fallback,
      };
    }

    if (providerName === "replicate" && process.env.REPLICATE_API_TOKEN) {
      return {
        provider: {
          name: "replicate",
          apiUrl: "https://api.replicate.com/v1",
          apiKey: process.env.REPLICATE_API_TOKEN,
          model: process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-schnell",
        },
        reason: "Replicate — geração de imagens via modelo configurado",
        estimatedCost: 0.003,
        capability: taskType,
        capabilityScore: 4,
        isOptimal: false,
        alternativeProvider: fallback,
      };
    }
  }

  // No image provider available — use primary LLM to describe
  return {
    provider: primary,
    reason: `Nenhum provider de imagem disponível — usando ${primary.name} para descrever`,
    estimatedCost: estimateCost(primary.name, estimatedTokens),
    capability: taskType,
    capabilityScore: 0,
    isOptimal: false,
    alternativeProvider: fallback,
  };
}

function routeVideoProvider(taskType: TaskType, estimatedTokens: number, primary: LLMProviderConfig, fallback: LLMProviderConfig | null): RoutingDecision {
  const order = getProviderOrder(taskType);

  for (const providerName of order) {
    if (!isProviderAvailable(providerName)) continue;

    if (providerName === "veo") {
      return {
        provider: {
          name: "veo",
          apiUrl: process.env.VEO_API_URL || "https://generativelanguage.googleapis.com/v1beta",
          apiKey: process.env.VEO_API_KEY || ENV.geminiApiKey,
          model: process.env.VEO_MODEL || "veo-3.1",
        },
        reason: "Google Veo — melhor para geração de vídeo",
        estimatedCost: 0.10,
        capability: taskType,
        capabilityScore: 5,
        isOptimal: true,
        alternativeProvider: fallback,
      };
    }

    if (providerName === "replicate" && process.env.REPLICATE_API_TOKEN) {
      return {
        provider: {
          name: "replicate",
          apiUrl: "https://api.replicate.com/v1",
          apiKey: process.env.REPLICATE_API_TOKEN,
          model: process.env.REPLICATE_VIDEO_MODEL || "minimax/video-01",
        },
        reason: "Replicate — geração de vídeo via modelo configurado",
        estimatedCost: 0.05,
        capability: taskType,
        capabilityScore: 4,
        isOptimal: false,
        alternativeProvider: fallback,
      };
    }

    if (providerName === "runway" && process.env.RUNWAY_API_KEY) {
      return {
        provider: {
          name: "runway",
          apiUrl: "https://api.dev.runwayml.com/v1",
          apiKey: process.env.RUNWAY_API_KEY,
          model: "gen3a_turbo",
        },
        reason: "Runway — geração de vídeo Gen-3",
        estimatedCost: 0.05,
        capability: taskType,
        capabilityScore: 4,
        isOptimal: false,
        alternativeProvider: fallback,
      };
    }
  }

  // No video provider available
  return {
    provider: primary,
    reason: `Nenhum provider de vídeo disponível — informando usuário`,
    estimatedCost: estimateCost(primary.name, estimatedTokens),
    capability: taskType,
    capabilityScore: 0,
    isOptimal: false,
    alternativeProvider: fallback,
  };
}

// ══════════════════════════════════════════════════════════════
// Admin/Info Functions
// ══════════════════════════════════════════════════════════════

/**
 * Get provider capabilities for admin display.
 */
export function getProviderCapabilities(providerName: string): ProviderCapability | null {
  return PROVIDER_CAPABILITIES[providerName] || null;
}

/**
 * Get all configured providers with their capabilities and availability.
 */
export function getAllConfiguredProviders(): Array<{
  name: string;
  configured: boolean;
  available: boolean;
  capabilities: ProviderCapability;
}> {
  const providers = [
    "gemini", "openai", "anthropic", "openrouter", "cloud", "forge",
    "local_gpu", "openai_image", "gemini_image", "replicate", "veo", "runway", "mermaid",
  ];

  return providers.map(name => ({
    name,
    configured: isProviderAvailable(name),
    available: isProviderAvailable(name),
    capabilities: PROVIDER_CAPABILITIES[name] || PROVIDER_CAPABILITIES.cloud,
  }));
}

/**
 * Get capabilities summary for a specific task type.
 */
export function getCapabilitySummary(taskType: TaskType): {
  taskType: TaskType;
  providerOrder: string[];
  availableProviders: string[];
  bestProvider: string | null;
  bestScore: number;
} {
  const order = getProviderOrder(taskType);
  const available = order.filter(p => isProviderAvailable(p) && canHandleTask(p, taskType));
  const best = available.length > 0 ? available[0] : null;
  const bestScore = best ? getCapabilityScore(best, taskType) : 0;

  return {
    taskType,
    providerOrder: order,
    availableProviders: available,
    bestProvider: best,
    bestScore,
  };
}

/**
 * Estimate cost for a conversation based on token usage.
 */
export function estimateConversationCost(providerName: string, inputTokens: number, outputTokens: number): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
} {
  const caps = PROVIDER_CAPABILITIES[providerName] || PROVIDER_CAPABILITIES.cloud;
  const inputCost = (inputTokens / 1000) * caps.costPer1kTokens;
  const outputCost = (outputTokens / 1000) * caps.costPer1kTokens * 3;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: "USD",
  };
}
