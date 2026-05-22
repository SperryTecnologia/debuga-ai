/**
 * Admin tRPC routers for debuga.ai.
 * All procedures require admin role.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { hashPassword, validatePassword } from "./localAuth";
import { getAllConfiguredProviders, getCapabilitySummary } from "./capabilityRouter";
import { getLearningStats, getCapabilityUsageStats, getProviderPerformanceStats } from "./learningMemory";
import { isImageGenerationAvailable, getImageProviderInfo } from "./imageProvider";
import { isVideoGenerationAvailable, getVideoProviderInfo } from "./videoProvider";
import { isDiagramGenerationAvailable, getDiagramProviderInfo } from "./diagramProvider";
import { getAllPlans, getUserUsageSummary } from "./capabilityLimits";
import { type TaskType } from "./intentClassifier";
import { generatedAssets } from "../drizzle/schema";
import { desc, eq, sql, and } from "drizzle-orm";

// ── Admin middleware ──
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

// ── Admin Router ──
export const adminRouter = router({
  // ── Dashboard ──
  stats: adminProcedure.query(async () => {
    return db.getAdminStats();
  }),

  // ── App Settings (White Label) ──
  // Key-value format: frontend sends/receives array of {key, value, group}
  getSettings: adminProcedure
    .input(z.object({ group: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const settings = await db.getAppSettings("default");
      if (!settings) return [];

      // Map DB columns to key-value pairs for frontend
      const keyMap: Record<string, string> = {
        app_name: settings.appName || "",
        app_description: settings.landingSubtitle || "",
        legal_company_name: settings.legalCompanyName || "",
        legal_cnpj: (settings.institutionalLinks as any)?.cnpj || "",
        support_email: settings.supportEmail || "",
        support_whatsapp: settings.supportWhatsapp || "",
        primary_color: settings.primaryColor || "#10b981",
        logo_url: settings.logoUrl || "",
        favicon_url: settings.faviconUrl || "",
        footer_text: (settings.institutionalLinks as any)?.footerText || "",
        custom_css: (settings.institutionalLinks as any)?.customCss || "",
        terms_url: settings.termsUrl || "/termos",
        privacy_url: settings.privacyUrl || "/privacidade",
      };

      return Object.entries(keyMap).map(([key, value]) => ({
        key,
        value,
        group: "white_label",
      }));
    }),

  saveSettings: adminProcedure
    .input(z.object({
      settings: z.array(z.object({
        key: z.string(),
        value: z.string(),
        group: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      // Convert key-value array to DB column format
      const kvMap: Record<string, string> = {};
      for (const s of input.settings) {
        kvMap[s.key] = s.value;
      }

      const dbData: Partial<typeof import("../drizzle/schema").appSettings.$inferInsert> = {
        appName: kvMap.app_name || undefined,
        landingSubtitle: kvMap.app_description || undefined,
        legalCompanyName: kvMap.legal_company_name || undefined,
        supportEmail: kvMap.support_email || undefined,
        supportWhatsapp: kvMap.support_whatsapp || undefined,
        primaryColor: kvMap.primary_color || undefined,
        logoUrl: kvMap.logo_url || undefined,
        faviconUrl: kvMap.favicon_url || undefined,
        termsUrl: kvMap.terms_url || undefined,
        privacyUrl: kvMap.privacy_url || undefined,
        institutionalLinks: {
          cnpj: kvMap.legal_cnpj || "",
          footerText: kvMap.footer_text || "",
          customCss: kvMap.custom_css || "",
        },
      };

      const result = await db.upsertAppSettings(dbData);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update_settings",
        entityType: "settings",
        entityId: null,
        metadata: kvMap,
        ipAddress: null,
      });
      return result;
    }),

  // Legacy updateSettings (direct column format, kept for API compatibility)
  updateSettings: adminProcedure
    .input(z.object({
      appName: z.string().max(100).optional(),
      agentName: z.string().max(100).optional(),
      landingTitle: z.string().max(200).optional(),
      landingSubtitle: z.string().optional(),
      primaryColor: z.string().max(20).optional(),
      logoUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
      supportEmail: z.string().email().optional().or(z.literal("")),
      supportWhatsapp: z.string().max(30).optional(),
      welcomeMessage: z.string().optional(),
      niche: z.string().max(100).optional(),
      institutionalLinks: z.any().optional(),
      legalCompanyName: z.string().max(200).optional(),
      termsUrl: z.string().url().optional().or(z.literal("")),
      privacyUrl: z.string().url().optional().or(z.literal("")),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.upsertAppSettings(input);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update_settings",
        entityType: "settings",
        entityId: null,
        metadata: input,
        ipAddress: null,
      });
      return result;
    }),

  // ── AI Instructions ──
  listInstructions: adminProcedure
    .input(z.object({ onlyActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return db.listInstructions("default", input?.onlyActive);
    }),

  getInstruction: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getInstruction(input.id);
    }),

  createInstruction: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      category: z.enum([
        "comportamento", "atendimento", "suporte_tecnico", "vendas",
        "restricoes", "encaminhamento_humano", "seguranca", "cliente_especifico",
      ]),
      isActive: z.boolean().optional(),
      priority: z.number().int().min(0).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createInstruction({
        ...input,
        tenantId: "default",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create_instruction",
        entityType: "instruction",
        entityId: result.id,
        metadata: { title: input.title, category: input.category },
        ipAddress: null,
      });
      return result;
    }),

  updateInstruction: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).optional(),
      category: z.enum([
        "comportamento", "atendimento", "suporte_tecnico", "vendas",
        "restricoes", "encaminhamento_humano", "seguranca", "cliente_especifico",
      ]).optional(),
      isActive: z.boolean().optional(),
      priority: z.number().int().min(0).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateInstruction(id, { ...data, updatedBy: ctx.user.id });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update_instruction",
        entityType: "instruction",
        entityId: id,
        metadata: data,
        ipAddress: null,
      });
      return result;
    }),

  deleteInstruction: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteInstruction(input.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "delete_instruction",
        entityType: "instruction",
        entityId: input.id,
        metadata: null,
        ipAddress: null,
      });
      return { success: true };
    }),

  // ── Knowledge Base ──
  listKnowledge: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      onlyActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.listKnowledge("default", input || {});
    }),

  getKnowledgeItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getKnowledgeItem(input.id);
    }),

  createKnowledgeItem: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      category: z.string().max(100).optional(),
      tags: z.string().optional(),
      isActive: z.boolean().optional(),
      origin: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createKnowledgeItem({
        ...input,
        tenantId: "default",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create_knowledge",
        entityType: "knowledge",
        entityId: result.id,
        metadata: { title: input.title },
        ipAddress: null,
      });
      return result;
    }),

  updateKnowledgeItem: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).optional(),
      category: z.string().max(100).optional(),
      tags: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await db.updateKnowledgeItem(id, { ...data, updatedBy: ctx.user.id });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update_knowledge",
        entityType: "knowledge",
        entityId: id,
        metadata: data,
        ipAddress: null,
      });
      return result;
    }),

  deleteKnowledgeItem: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteKnowledgeItem(input.id);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "delete_knowledge",
        entityType: "knowledge",
        entityId: input.id,
        metadata: null,
        ipAddress: null,
      });
      return { success: true };
    }),

  // ── AI Provider Logs ──
  listProviderLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      userId: z.number().optional(),
      success: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const [logs, total] = await Promise.all([
        db.listProviderLogs(input || {}),
        db.countProviderLogs(input || {}),
      ]);
      return { logs, total };
    }),

  // ── Audit Logs ──
  listAuditLogs: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      userId: z.number().optional(),
      entityType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const [logs, total] = await Promise.all([
        db.listAuditLogs(input || {}),
        db.countAuditLogs(input || {}),
      ]);
      return { logs, total };
    }),

  // ── Users Management ──
  listUsers: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const [usersList, total] = await Promise.all([
        db.listUsers(input || {}),
        db.countUsers(input?.search),
      ]);
      return { users: usersList, total };
    }),

  updateUserRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "user"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar seu próprio papel." });
      }
      await db.updateUserRole(input.userId, input.role);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "update_user_role",
        entityType: "user",
        entityId: input.userId,
        metadata: { newRole: input.role },
        ipAddress: null,
      });
      return { success: true };
    }),

  updateUserActive: adminProcedure
    .input(z.object({
      userId: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível desativar sua própria conta." });
      }
      await db.updateUserActive(input.userId, input.isActive);
      await db.createAuditLog({
        userId: ctx.user.id,
        action: input.isActive ? "activate_user" : "deactivate_user",
        entityType: "user",
        entityId: input.userId,
        metadata: { isActive: input.isActive },
        ipAddress: null,
      });
      return { success: true };
    }),

  createUser: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(["admin", "user"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if email already exists
      const existing = await db.getUserByEmail(input.email.toLowerCase().trim());
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "E-mail já cadastrado." });
      }

      // Validate password
      const validation = validatePassword(input.password);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
      }

      const passwordHash = await hashPassword(input.password);
      const user = await db.createLocalUser({
        email: input.email.toLowerCase().trim(),
        name: input.name,
        passwordHash,
        role: input.role,
      });

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create_user",
        entityType: "user",
        entityId: user.id,
        metadata: { email: input.email, role: input.role || "user" },
        ipAddress: null,
      });

      return { success: true, userId: user.id };
    }),

  // ── Conversations (admin view) ──
  listConversations: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const [convs, total] = await Promise.all([
        db.listAllConversations(input || {}),
        db.countConversations(input?.search),
      ]);
      return { conversations: convs, total };
    }),

  getConversationMessages: adminProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      return db.getMessages(input.conversationId);
    }),

  // ── User Verification (admin force-verify) ──
  verifyUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      type: z.enum(["email", "phone"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const field = input.type === "email" ? "emailVerified" : "phoneVerified";
      await dbConn.update(users).set({ [field]: true, updatedAt: new Date() }).where(eq(users.id, input.userId));

      await db.createAuditLog({
        userId: ctx.user.id,
        action: `admin_verify_${input.type}`,
        entityType: "user",
        entityId: input.userId,
        metadata: { type: input.type },
        ipAddress: null,
      });
      return { success: true };
    }),

  // ── Unlock locked account ──
  unlockUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await dbConn.update(users).set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      }).where(eq(users.id, input.userId));

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "admin_unlock_user",
        entityType: "user",
        entityId: input.userId,
        metadata: null,
        ipAddress: null,
      });
      return { success: true };
    }),

  // ── Admin reset user password ──
  resetUserPassword: adminProcedure
    .input(z.object({
      userId: z.number(),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      const validation = validatePassword(input.newPassword);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db.updateUserPassword(input.userId, passwordHash);

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "admin_reset_password",
        entityType: "user",
        entityId: input.userId,
        metadata: null,
        ipAddress: null,
      });
      return { success: true };
    }),

  // ── Learning Suggestions ──
  listLearningSuggestions: adminProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected"]).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      const [items, total] = await Promise.all([
        db.listLearningSuggestions(input || {}),
        db.countLearningSuggestions(input?.status),
      ]);
      return { items, total };
    }),

  createLearningSuggestion: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      category: z.string().max(100).optional(),
      origin: z.enum(["chat", "log", "manual", "import", "documentation"]).optional(),
      provider: z.string().max(50).optional(),
      sourceConversationId: z.number().optional(),
      sourceMessageId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createLearningSuggestion({
        ...input,
        tenantId: "default",
      });
      await db.createAuditLog({
        userId: ctx.user.id,
        action: "create_learning_suggestion",
        entityType: "learning",
        entityId: result.id,
        metadata: { title: input.title, origin: input.origin },
        ipAddress: null,
      });
      return result;
    }),

  approveLearningSuggestion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const suggestion = await db.getLearningSuggestion(input.id);
      if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Sugestão não encontrada" });
      if (suggestion.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Sugestão já foi revisada" });

      // Create knowledge base item from suggestion
      const kbItem = await db.createKnowledgeItem({
        title: suggestion.title,
        content: suggestion.content,
        category: suggestion.category || undefined,
        origin: suggestion.origin || "chat",
        tenantId: "default",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      });

      // Update suggestion status
      await db.updateLearningSuggestionStatus(input.id, "approved", ctx.user.id, kbItem.id);

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "approve_learning_suggestion",
        entityType: "learning",
        entityId: input.id,
        metadata: { knowledgeItemId: kbItem.id, title: suggestion.title },
        ipAddress: null,
      });
      return { success: true, knowledgeItemId: kbItem.id };
    }),

  rejectLearningSuggestion: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const suggestion = await db.getLearningSuggestion(input.id);
      if (!suggestion) throw new TRPCError({ code: "NOT_FOUND", message: "Sugestão não encontrada" });
      if (suggestion.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Sugestão já foi revisada" });

      await db.updateLearningSuggestionStatus(input.id, "rejected", ctx.user.id);

      await db.createAuditLog({
        userId: ctx.user.id,
        action: "reject_learning_suggestion",
        entityType: "learning",
        entityId: input.id,
        metadata: { title: suggestion.title },
        ipAddress: null,
      });
      return { success: true };
    }),

  // ── Test LLM Provider ──
  testProvider: adminProcedure.mutation(async () => {
    const { resolveLLMProvider } = await import("./_core/env");
    const { resolveChatCompletionsUrl } = await import("./_core/llmUrl");

    const provider = resolveLLMProvider();
    if (!provider || !provider.apiUrl || !provider.apiKey) {
      return {
        success: false,
        error: "Nenhum provider configurado. Defina LLM_CLOUD_API_URL e LLM_CLOUD_API_KEY (ou GEMINI_API_URL + GEMINI_API_KEY) no .env.",
        endpoint: null,
        model: null,
        latencyMs: null,
      };
    }

    const endpoint = resolveChatCompletionsUrl(provider.apiUrl);
    const model = provider.model;
    const start = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(provider.apiKey ? { authorization: `Bearer ${provider.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
          max_tokens: 10,
        }),
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errText.slice(0, 200)}`,
          endpoint,
          model,
          latencyMs,
        };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || "(sem conteúdo)";

      return {
        success: true,
        error: null,
        endpoint,
        model,
        latencyMs,
        response: content.slice(0, 100),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Erro desconhecido",
        endpoint,
        model,
        latencyMs: Date.now() - start,
      };
    }
  }),

  // ── Local GPU Health Check ──
  localHealth: adminProcedure.query(async () => {
    const { ENV } = await import("./_core/env");
    if (!ENV.localLlmEnabled) {
      return {
        enabled: false,
        reachable: false,
        error: "LOCAL_LLM_ENABLED não está ativo no .env",
        models: [] as string[],
        config: {
          baseUrl: ENV.localLlmBaseUrl,
          model: ENV.localLlmModel,
          priority: ENV.localLlmPriority,
          fallbackEnabled: ENV.localLlmFallbackEnabled,
          timeoutSeconds: ENV.localLlmTimeoutSeconds,
        },
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${ENV.localLlmBaseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        return {
          enabled: true,
          reachable: false,
          error: `Ollama retornou HTTP ${resp.status}`,
          models: [] as string[],
          config: {
            baseUrl: ENV.localLlmBaseUrl,
            model: ENV.localLlmModel,
            priority: ENV.localLlmPriority,
            fallbackEnabled: ENV.localLlmFallbackEnabled,
            timeoutSeconds: ENV.localLlmTimeoutSeconds,
          },
        };
      }

      const data = await resp.json() as { models?: { name: string; size?: number; modified_at?: string }[] };
      const models = data.models?.map((m) => m.name) || [];
      const configuredModelLoaded = models.some(m => m.startsWith(ENV.localLlmModel.split(":")[0]));

      return {
        enabled: true,
        reachable: true,
        error: configuredModelLoaded ? null : `Modelo ${ENV.localLlmModel} não encontrado. Modelos disponíveis: ${models.join(", ")}`,
        models,
        configuredModelLoaded,
        config: {
          baseUrl: ENV.localLlmBaseUrl,
          model: ENV.localLlmModel,
          priority: ENV.localLlmPriority,
          fallbackEnabled: ENV.localLlmFallbackEnabled,
          timeoutSeconds: ENV.localLlmTimeoutSeconds,
        },
      };
    } catch (err: any) {
      return {
        enabled: true,
        reachable: false,
        error: err.name === "AbortError" ? "Timeout: Ollama não respondeu em 5s" : (err.message || "Conexão recusada"),
        models: [] as string[],
        config: {
          baseUrl: ENV.localLlmBaseUrl,
          model: ENV.localLlmModel,
          priority: ENV.localLlmPriority,
          fallbackEnabled: ENV.localLlmFallbackEnabled,
          timeoutSeconds: ENV.localLlmTimeoutSeconds,
        },
      };
    }
  }),

  // ── Test Local GPU Provider ──
  // ══════════════════════════════════════════════════════════════
  // Capability Orchestrator Admin Procedures
  // ══════════════════════════════════════════════════════════════

  getCapabilitiesOverview: adminProcedure.query(async () => {
    const { isStorageConfigured } = await import("./storage");
    const providers = getAllConfiguredProviders();
    const imageInfo = getImageProviderInfo();
    const videoInfo = getVideoProviderInfo();
    const diagramInfo = getDiagramProviderInfo();
    const learningStats = await getLearningStats();
    const performanceStats = getProviderPerformanceStats();
    const storageReady = isStorageConfigured();

    const taskTypes: TaskType[] = [
      "chat_text", "infrastructure_support", "code_generation",
      "image_generation", "image_editing", "video_generation",
      "network_diagram", "architecture_diagram", "flowchart_diagram",
      "document_analysis", "image_analysis", "audio_transcription",
      "web_research",
    ];

    const capabilitySummaries = taskTypes.map(tt => getCapabilitySummary(tt));

    return {
      providers,
      capabilities: capabilitySummaries,
      image: imageInfo,
      video: videoInfo,
      diagram: diagramInfo,
      learning: learningStats,
      performance: performanceStats,
      featureFlags: {
        capabilityRouting: process.env.ENABLE_CAPABILITY_ROUTING === "true",
        knowledgeReuse: process.env.ENABLE_KNOWLEDGE_REUSE === "true",
        imageGeneration: process.env.IMAGE_GENERATION_ENABLED === "true",
        videoGeneration: process.env.VIDEO_GENERATION_ENABLED === "true",
        learning: process.env.ENABLE_LEARNING === "true",
      },
      storage: {
        configured: storageReady,
        warning: !storageReady ? "S3/MinIO não configurado. Imagens geradas usarão URLs temporárias que expiram em ~1h." : null,
      },
    };
  }),

  getCapabilityUsage: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      return await getCapabilityUsageStats(input.days);
    }),

  getPlans: adminProcedure.query(() => {
    return getAllPlans();
  }),

  getUserUsage: adminProcedure
    .input(z.object({ userId: z.number(), planId: z.string() }))
    .query(({ input }) => {
      return getUserUsageSummary(input.userId, input.planId);
    }),

  testLocal: adminProcedure.mutation(async () => {
    const { ENV } = await import("./_core/env");
    if (!ENV.localLlmEnabled) {
      return {
        success: false,
        error: "LOCAL_LLM_ENABLED não está ativo no .env",
        latencyMs: 0,
      };
    }

    const start = Date.now();
    const endpoint = `${ENV.localLlmBaseUrl}/v1/chat/completions`;
    const model = ENV.localLlmModel;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ENV.localLlmTimeoutSeconds * 1000);

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Responda em uma frase curta." },
            { role: "user", content: "Diga 'GPU local funcionando' se você está operacional." },
          ],
          max_tokens: 50,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text();
        return {
          success: false,
          error: `HTTP ${resp.status}: ${errText.slice(0, 200)}`,
          endpoint,
          model,
          latencyMs: Date.now() - start,
        };
      }

      const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content || "";
      const latencyMs = Date.now() - start;

      return {
        success: true,
        error: null,
        endpoint,
        model,
        latencyMs,
        response: content.slice(0, 100),
        tokensPerSecond: content.length > 0 ? Math.round((content.length / 4) / (latencyMs / 1000)) : 0,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === "AbortError"
          ? `Timeout após ${ENV.localLlmTimeoutSeconds}s — modelo pode estar carregando`
          : (err?.message || "Erro desconhecido"),
        endpoint,
        model,
        latencyMs: Date.now() - start,
      };
    }
  }),

  // ── Generated Assets ──

  listGeneratedAssets: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      assetType: z.enum(["image", "video", "diagram", "audio", "all"]).default("all"),
      status: z.enum(["completed", "failed", "processing", "all"]).default("all"),
    }).optional())
    .query(async ({ input }) => {
      const { limit = 50, offset = 0, assetType = "all", status = "all" } = input || {};
      try {
        const dbConn = await db.getDb();
        if (!dbConn) return { assets: [], total: 0, error: "Database not connected" };

        const conditions: any[] = [];
        if (assetType !== "all") conditions.push(eq(generatedAssets.assetType, assetType));
        if (status !== "all") conditions.push(eq(generatedAssets.status, status));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [assets, countResult] = await Promise.all([
          dbConn
            .select()
            .from(generatedAssets)
            .where(whereClause)
            .orderBy(desc(generatedAssets.createdAt))
            .limit(limit)
            .offset(offset),
          dbConn
            .select({ count: sql<number>`count(*)::int` })
            .from(generatedAssets)
            .where(whereClause),
        ]);

        return {
          assets,
          total: countResult[0]?.count || 0,
          error: null,
        };
      } catch (err: any) {
        console.error("[Admin] listGeneratedAssets error:", err.message);
        return { assets: [], total: 0, error: err.message };
      }
    }),

  // ── GPU Warmup (keeps model loaded in VRAM) ──
  warmupGpu: adminProcedure.mutation(async () => {
    const { ENV } = await import("./_core/env");
    if (!ENV.localLlmEnabled) {
      return { success: false, error: "GPU local não habilitada", latencyMs: 0 };
    }
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const resp = await fetch(`${ENV.localLlmBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: ENV.localLlmModel,
          messages: [{ role: "user", content: "ping" }],
          stream: false,
          options: { num_predict: 1 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      if (!resp.ok) {
        return { success: false, error: `HTTP ${resp.status}`, latencyMs };
      }
      return { success: true, error: null, latencyMs, message: `Modelo ${ENV.localLlmModel} aquecido em ${latencyMs}ms` };
    } catch (err: any) {
      return {
        success: false,
        error: err.name === "AbortError" ? "Timeout: GPU não respondeu em 10s" : err.message,
        latencyMs: Date.now() - start,
      };
    }
  }),
});
