/**
 * Capability Limits & Cost Safety for debuga.ai
 *
 * Implements:
 *   1. Per-plan capability limits (which features each plan can access)
 *   2. Per-capability usage quotas (daily/monthly limits per task type)
 *   3. Cost safety circuit breaker (prevent runaway costs)
 *   4. Rate limiting per capability type
 *
 * Environment Variables:
 *   COST_DAILY_LIMIT_USD=10.00
 *   COST_MONTHLY_LIMIT_USD=200.00
 *   COST_ALERT_THRESHOLD_PERCENT=80
 *   IMAGE_DAILY_LIMIT=50
 *   VIDEO_DAILY_LIMIT=10
 *   DIAGRAM_DAILY_LIMIT=100
 */

import { type TaskType } from "./intentClassifier";

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export type PlanCapabilities = {
  allowedTaskTypes: TaskType[];
  maxMessagesPerDay: number;
  maxImagesPerDay: number;
  maxVideosPerDay: number;
  maxDiagramsPerDay: number;
  maxTokensPerMessage: number;
  maxContextTokens: number;
  dailyCostLimitUsd: number;
  monthlyCostLimitUsd: number;
  allowedProviders: string[];
  allowedModels: string[];
  features: {
    knowledgeReuse: boolean;
    capabilityRouting: boolean;
    imageGeneration: boolean;
    videoGeneration: boolean;
    diagramGeneration: boolean;
    documentAnalysis: boolean;
    audioTranscription: boolean;
    webResearch: boolean;
    learning: boolean;
    customInstructions: boolean;
    prioritySupport: boolean;
  };
};

export type UsageCheckResult = {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  used?: number;
  suggestedUpgrade?: string;
};

// ══════════════════════════════════════════════════════════════
// Plan Definitions
// ══════════════════════════════════════════════════════════════

const ALL_TASK_TYPES: TaskType[] = [
  "chat_text", "infrastructure_support", "code_generation",
  "image_generation", "image_editing", "video_generation",
  "network_diagram", "architecture_diagram", "flowchart_diagram",
  "document_analysis", "image_analysis", "audio_transcription",
  "web_research",
];

const PLAN_CAPABILITIES: Record<string, PlanCapabilities> = {
  free: {
    allowedTaskTypes: ["chat_text", "infrastructure_support", "code_generation", "flowchart_diagram"],
    maxMessagesPerDay: 20,
    maxImagesPerDay: 0,
    maxVideosPerDay: 0,
    maxDiagramsPerDay: 5,
    maxTokensPerMessage: 4096,
    maxContextTokens: 16384,
    dailyCostLimitUsd: 0.50,
    monthlyCostLimitUsd: 5.00,
    allowedProviders: ["local_gpu", "forge", "cloud"],
    allowedModels: [],
    features: {
      knowledgeReuse: true,
      capabilityRouting: false,
      imageGeneration: false,
      videoGeneration: false,
      diagramGeneration: true,
      documentAnalysis: false,
      audioTranscription: false,
      webResearch: false,
      learning: false,
      customInstructions: false,
      prioritySupport: false,
    },
  },
  starter: {
    allowedTaskTypes: [
      "chat_text", "infrastructure_support", "code_generation",
      "image_generation", "network_diagram", "architecture_diagram",
      "flowchart_diagram", "document_analysis", "image_analysis",
    ],
    maxMessagesPerDay: 100,
    maxImagesPerDay: 10,
    maxVideosPerDay: 0,
    maxDiagramsPerDay: 30,
    maxTokensPerMessage: 8192,
    maxContextTokens: 32768,
    dailyCostLimitUsd: 3.00,
    monthlyCostLimitUsd: 50.00,
    allowedProviders: ["local_gpu", "gemini", "openai", "forge", "cloud"],
    allowedModels: [],
    features: {
      knowledgeReuse: true,
      capabilityRouting: true,
      imageGeneration: true,
      videoGeneration: false,
      diagramGeneration: true,
      documentAnalysis: true,
      audioTranscription: false,
      webResearch: false,
      learning: true,
      customInstructions: true,
      prioritySupport: false,
    },
  },
  professional: {
    allowedTaskTypes: ALL_TASK_TYPES,
    maxMessagesPerDay: 500,
    maxImagesPerDay: 50,
    maxVideosPerDay: 5,
    maxDiagramsPerDay: 100,
    maxTokensPerMessage: 16384,
    maxContextTokens: 128000,
    dailyCostLimitUsd: 10.00,
    monthlyCostLimitUsd: 200.00,
    allowedProviders: ["local_gpu", "gemini", "openai", "anthropic", "openrouter", "forge", "cloud", "replicate"],
    allowedModels: [],
    features: {
      knowledgeReuse: true,
      capabilityRouting: true,
      imageGeneration: true,
      videoGeneration: true,
      diagramGeneration: true,
      documentAnalysis: true,
      audioTranscription: true,
      webResearch: true,
      learning: true,
      customInstructions: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    allowedTaskTypes: ALL_TASK_TYPES,
    maxMessagesPerDay: 5000,
    maxImagesPerDay: 500,
    maxVideosPerDay: 50,
    maxDiagramsPerDay: 1000,
    maxTokensPerMessage: 32768,
    maxContextTokens: 200000,
    dailyCostLimitUsd: parseFloat(process.env.COST_DAILY_LIMIT_USD || "100"),
    monthlyCostLimitUsd: parseFloat(process.env.COST_MONTHLY_LIMIT_USD || "2000"),
    allowedProviders: ["local_gpu", "gemini", "openai", "anthropic", "openrouter", "forge", "cloud", "replicate", "veo", "runway"],
    allowedModels: [],
    features: {
      knowledgeReuse: true,
      capabilityRouting: true,
      imageGeneration: true,
      videoGeneration: true,
      diagramGeneration: true,
      documentAnalysis: true,
      audioTranscription: true,
      webResearch: true,
      learning: true,
      customInstructions: true,
      prioritySupport: true,
    },
  },
};

// ══════════════════════════════════════════════════════════════
// In-Memory Usage Tracking
// ══════════════════════════════════════════════════════════════

type DailyUsage = {
  messages: number;
  images: number;
  videos: number;
  diagrams: number;
  costUsd: number;
  date: string; // YYYY-MM-DD
};

const userDailyUsage: Record<number, DailyUsage> = {};

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getUserUsage(userId: number): DailyUsage {
  const today = getTodayKey();
  const usage = userDailyUsage[userId];
  if (!usage || usage.date !== today) {
    userDailyUsage[userId] = { messages: 0, images: 0, videos: 0, diagrams: 0, costUsd: 0, date: today };
  }
  return userDailyUsage[userId];
}

// ══════════════════════════════════════════════════════════════
// Capability Check Functions
// ══════════════════════════════════════════════════════════════

/**
 * Get plan capabilities for a user's plan.
 */
export function getPlanCapabilities(planId: string): PlanCapabilities {
  return PLAN_CAPABILITIES[planId] || PLAN_CAPABILITIES.free;
}

/**
 * Check if a task type is allowed for a user's plan.
 */
export function checkCapabilityAccess(
  userId: number,
  planId: string,
  taskType: TaskType
): UsageCheckResult {
  const plan = getPlanCapabilities(planId);

  // Check if task type is allowed
  if (!plan.allowedTaskTypes.includes(taskType)) {
    return {
      allowed: false,
      reason: `O tipo de tarefa "${taskType}" não está disponível no seu plano atual (${planId}).`,
      suggestedUpgrade: getSuggestedUpgrade(planId, taskType),
    };
  }

  // Check feature flags
  const featureCheck = checkFeatureFlag(plan, taskType);
  if (!featureCheck.allowed) return featureCheck;

  // Check daily usage limits
  const usage = getUserUsage(userId);

  switch (taskType) {
    case "image_generation":
    case "image_editing":
      if (usage.images >= plan.maxImagesPerDay) {
        return {
          allowed: false,
          reason: `Limite diário de imagens atingido (${plan.maxImagesPerDay}/dia).`,
          remaining: 0,
          limit: plan.maxImagesPerDay,
          used: usage.images,
          suggestedUpgrade: getSuggestedUpgrade(planId, taskType),
        };
      }
      return { allowed: true, remaining: plan.maxImagesPerDay - usage.images, limit: plan.maxImagesPerDay, used: usage.images };

    case "video_generation":
      if (usage.videos >= plan.maxVideosPerDay) {
        return {
          allowed: false,
          reason: `Limite diário de vídeos atingido (${plan.maxVideosPerDay}/dia).`,
          remaining: 0,
          limit: plan.maxVideosPerDay,
          used: usage.videos,
          suggestedUpgrade: getSuggestedUpgrade(planId, taskType),
        };
      }
      return { allowed: true, remaining: plan.maxVideosPerDay - usage.videos, limit: plan.maxVideosPerDay, used: usage.videos };

    case "network_diagram":
    case "architecture_diagram":
    case "flowchart_diagram":
      if (usage.diagrams >= plan.maxDiagramsPerDay) {
        return {
          allowed: false,
          reason: `Limite diário de diagramas atingido (${plan.maxDiagramsPerDay}/dia).`,
          remaining: 0,
          limit: plan.maxDiagramsPerDay,
          used: usage.diagrams,
          suggestedUpgrade: getSuggestedUpgrade(planId, taskType),
        };
      }
      return { allowed: true, remaining: plan.maxDiagramsPerDay - usage.diagrams, limit: plan.maxDiagramsPerDay, used: usage.diagrams };

    default:
      if (usage.messages >= plan.maxMessagesPerDay) {
        return {
          allowed: false,
          reason: `Limite diário de mensagens atingido (${plan.maxMessagesPerDay}/dia).`,
          remaining: 0,
          limit: plan.maxMessagesPerDay,
          used: usage.messages,
          suggestedUpgrade: getSuggestedUpgrade(planId, taskType),
        };
      }
      return { allowed: true, remaining: plan.maxMessagesPerDay - usage.messages, limit: plan.maxMessagesPerDay, used: usage.messages };
  }
}

/**
 * Check cost safety limits.
 */
export function checkCostSafety(userId: number, planId: string, estimatedCost: number): UsageCheckResult {
  const plan = getPlanCapabilities(planId);
  const usage = getUserUsage(userId);

  if (usage.costUsd + estimatedCost > plan.dailyCostLimitUsd) {
    return {
      allowed: false,
      reason: `Limite de custo diário atingido ($${plan.dailyCostLimitUsd.toFixed(2)}/dia). Custo acumulado hoje: $${usage.costUsd.toFixed(4)}.`,
      remaining: Math.max(0, plan.dailyCostLimitUsd - usage.costUsd),
      limit: plan.dailyCostLimitUsd,
      used: usage.costUsd,
    };
  }

  return { allowed: true, remaining: plan.dailyCostLimitUsd - usage.costUsd - estimatedCost };
}

/**
 * Record usage after a successful operation.
 */
export function recordUsage(userId: number, taskType: TaskType, cost: number = 0): void {
  const usage = getUserUsage(userId);

  switch (taskType) {
    case "image_generation":
    case "image_editing":
      usage.images++;
      break;
    case "video_generation":
      usage.videos++;
      break;
    case "network_diagram":
    case "architecture_diagram":
    case "flowchart_diagram":
      usage.diagrams++;
      break;
    default:
      usage.messages++;
      break;
  }

  usage.costUsd += cost;
}

/**
 * Get current usage summary for a user.
 */
export function getUserUsageSummary(userId: number, planId: string): {
  plan: string;
  daily: DailyUsage;
  limits: {
    messages: { used: number; limit: number; percent: number };
    images: { used: number; limit: number; percent: number };
    videos: { used: number; limit: number; percent: number };
    diagrams: { used: number; limit: number; percent: number };
    cost: { used: number; limit: number; percent: number };
  };
} {
  const plan = getPlanCapabilities(planId);
  const usage = getUserUsage(userId);

  return {
    plan: planId,
    daily: usage,
    limits: {
      messages: {
        used: usage.messages,
        limit: plan.maxMessagesPerDay,
        percent: plan.maxMessagesPerDay > 0 ? (usage.messages / plan.maxMessagesPerDay) * 100 : 0,
      },
      images: {
        used: usage.images,
        limit: plan.maxImagesPerDay,
        percent: plan.maxImagesPerDay > 0 ? (usage.images / plan.maxImagesPerDay) * 100 : 0,
      },
      videos: {
        used: usage.videos,
        limit: plan.maxVideosPerDay,
        percent: plan.maxVideosPerDay > 0 ? (usage.videos / plan.maxVideosPerDay) * 100 : 0,
      },
      diagrams: {
        used: usage.diagrams,
        limit: plan.maxDiagramsPerDay,
        percent: plan.maxDiagramsPerDay > 0 ? (usage.diagrams / plan.maxDiagramsPerDay) * 100 : 0,
      },
      cost: {
        used: usage.costUsd,
        limit: plan.dailyCostLimitUsd,
        percent: plan.dailyCostLimitUsd > 0 ? (usage.costUsd / plan.dailyCostLimitUsd) * 100 : 0,
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════

function checkFeatureFlag(plan: PlanCapabilities, taskType: TaskType): UsageCheckResult {
  const featureMap: Partial<Record<TaskType, keyof PlanCapabilities["features"]>> = {
    image_generation: "imageGeneration",
    image_editing: "imageGeneration",
    video_generation: "videoGeneration",
    network_diagram: "diagramGeneration",
    architecture_diagram: "diagramGeneration",
    flowchart_diagram: "diagramGeneration",
    document_analysis: "documentAnalysis",
    audio_transcription: "audioTranscription",
    web_research: "webResearch",
  };

  const featureKey = featureMap[taskType];
  if (featureKey && !plan.features[featureKey]) {
    return {
      allowed: false,
      reason: `A funcionalidade "${taskType}" não está habilitada no seu plano.`,
    };
  }

  return { allowed: true };
}

function getSuggestedUpgrade(currentPlan: string, taskType: TaskType): string {
  // Find the cheapest plan that supports this task type
  const planOrder = ["free", "starter", "professional", "enterprise"];
  const currentIndex = planOrder.indexOf(currentPlan);

  for (let i = currentIndex + 1; i < planOrder.length; i++) {
    const plan = PLAN_CAPABILITIES[planOrder[i]];
    if (plan.allowedTaskTypes.includes(taskType)) {
      return planOrder[i];
    }
  }

  return "enterprise";
}

/**
 * Get all available plans with their capabilities (for admin/pricing display).
 */
export function getAllPlans(): Record<string, PlanCapabilities> {
  return { ...PLAN_CAPABILITIES };
}

/**
 * Override plan capabilities at runtime (for custom enterprise plans).
 */
export function setCustomPlanCapabilities(planId: string, capabilities: Partial<PlanCapabilities>): void {
  if (!PLAN_CAPABILITIES[planId]) {
    PLAN_CAPABILITIES[planId] = { ...PLAN_CAPABILITIES.professional, ...capabilities };
  } else {
    Object.assign(PLAN_CAPABILITIES[planId], capabilities);
  }
}
