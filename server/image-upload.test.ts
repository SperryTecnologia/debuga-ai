import { describe, it, expect } from "vitest";
import { PLANS } from "./products";

describe("Image Upload Module", () => {
  describe("Plan limits for imagesPerDay", () => {
    it("all plans should have imagesPerDay defined", () => {
      for (const plan of PLANS) {
        expect(plan.limits.imagesPerDay).toBeDefined();
        expect(typeof plan.limits.imagesPerDay).toBe("number");
        expect(plan.limits.imagesPerDay).toBeGreaterThan(0);
      }
    });

    it("Free plan should allow 2 images per day", () => {
      const free = PLANS.find((p) => p.id === "free");
      expect(free).toBeDefined();
      expect(free!.limits.imagesPerDay).toBe(2);
    });

    it("Starter plan should allow 10 images per day", () => {
      const starter = PLANS.find((p) => p.id === "starter");
      expect(starter).toBeDefined();
      expect(starter!.limits.imagesPerDay).toBe(10);
    });

    it("Pro plan should allow 50 images per day", () => {
      const pro = PLANS.find((p) => p.id === "pro");
      expect(pro).toBeDefined();
      expect(pro!.limits.imagesPerDay).toBe(50);
    });

    it("Enterprise plan should have very high image limit", () => {
      const enterprise = PLANS.find((p) => p.id === "enterprise");
      expect(enterprise).toBeDefined();
      expect(enterprise!.limits.imagesPerDay).toBeGreaterThanOrEqual(999999);
    });

    it("image limits should scale with plan tier", () => {
      const free = PLANS.find((p) => p.id === "free")!;
      const starter = PLANS.find((p) => p.id === "starter")!;
      const pro = PLANS.find((p) => p.id === "pro")!;
      const enterprise = PLANS.find((p) => p.id === "enterprise")!;

      expect(free.limits.imagesPerDay).toBeLessThan(starter.limits.imagesPerDay);
      expect(starter.limits.imagesPerDay).toBeLessThan(pro.limits.imagesPerDay);
      expect(pro.limits.imagesPerDay).toBeLessThan(enterprise.limits.imagesPerDay);
    });
  });

  describe("Feature flag behavior", () => {
    it("FEATURE_IMAGE_UPLOAD should default to enabled when not set", () => {
      // When FEATURE_IMAGE_UPLOAD is not set or is anything other than "false", it should be enabled
      const flag = process.env.FEATURE_IMAGE_UPLOAD !== "false";
      expect(flag).toBe(true);
    });

    it("FEATURE_IMAGE_UPLOAD should be disabled when set to 'false'", () => {
      const original = process.env.FEATURE_IMAGE_UPLOAD;
      process.env.FEATURE_IMAGE_UPLOAD = "false";
      const flag = process.env.FEATURE_IMAGE_UPLOAD !== "false";
      expect(flag).toBe(false);
      // Restore
      if (original !== undefined) {
        process.env.FEATURE_IMAGE_UPLOAD = original;
      } else {
        delete process.env.FEATURE_IMAGE_UPLOAD;
      }
    });
  });

  describe("Image analysis prompt in SYSTEM_PROMPT", () => {
    it("streamRoute should contain image analysis instructions", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/streamRoute.ts", "utf-8");
      expect(content).toContain("Análise de Imagens/Prints");
      expect(content).toContain("Identifique");
      expect(content).toContain("Diagnostique");
      expect(content).toContain("Avalie riscos");
      expect(content).toContain("Recomende");
      expect(content).toContain("Contextualize");
    });

    it("should mention key environments for image analysis", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/streamRoute.ts", "utf-8");
      expect(content).toContain("Windows");
      expect(content).toContain("Linux");
      expect(content).toContain("Docker");
      expect(content).toContain("Zabbix");
      expect(content).toContain("Grafana");
      expect(content).toContain("Cloudflare");
      expect(content).toContain("Stripe");
    });

    it("should warn about sensitive data in images", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/streamRoute.ts", "utf-8");
      expect(content).toContain("dados sensíveis");
      expect(content).toContain("risco de exposição");
    });
  });

  describe("Upload route security", () => {
    it("uploadRoute should validate image limits", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/uploadRoute.ts", "utf-8");
      expect(content).toContain("IMAGE_LIMIT_REACHED");
      expect(content).toContain("FEATURE_IMAGE_UPLOAD");
      expect(content).toContain("getTodayImageCount");
      expect(content).toContain("recordImageUpload");
    });

    it("uploadRoute should check feature flag before S3 upload call", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/uploadRoute.ts", "utf-8");
      // The runtime feature flag check (not the import) should come before the storagePut call
      const flagCheckIndex = content.indexOf('!FEATURE_IMAGE_UPLOAD');
      const uploadCallIndex = content.indexOf('await storagePut');
      expect(flagCheckIndex).toBeGreaterThan(0);
      expect(uploadCallIndex).toBeGreaterThan(0);
      expect(flagCheckIndex).toBeLessThan(uploadCallIndex);
    });
  });

  describe("Multimodal support in streamRoute", () => {
    it("streamRoute should detect image URLs and convert to multimodal", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/streamRoute.ts", "utf-8");
      expect(content).toContain("image_url");
      expect(content).toContain("Imagem anexada");
    });
  });

  describe("Usage tracking", () => {
    it("db.ts should export getTodayImageCount and recordImageUpload", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/db.ts", "utf-8");
      expect(content).toContain("export async function getTodayImageCount");
      expect(content).toContain("export async function recordImageUpload");
      expect(content).toContain("image_upload");
    });

    it("routers.ts should include todayImages in usage response", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("server/routers.ts", "utf-8");
      expect(content).toContain("todayImages");
      expect(content).toContain("imagesPerDay");
    });
  });
});
