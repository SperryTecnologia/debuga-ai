import { describe, it, expect } from "vitest";
import { getPlanById, getPlanByPriceAmount, cachePriceIdToPlan, getPlanByPriceId } from "./products";

describe("Stripe Products Resolution", () => {
  describe("getPlanById", () => {
    it("returns correct plan for valid IDs", () => {
      expect(getPlanById("free")?.id).toBe("free");
      expect(getPlanById("starter")?.id).toBe("starter");
      expect(getPlanById("pro")?.id).toBe("pro");
      expect(getPlanById("enterprise")?.id).toBe("enterprise");
    });

    it("returns undefined for invalid ID", () => {
      expect(getPlanById("invalid")).toBeUndefined();
    });
  });

  describe("getPlanByPriceAmount", () => {
    it("resolves starter monthly by amount", () => {
      // Starter monthly: R$49.90 = 4990 centavos
      const plan = getPlanByPriceAmount(4990, "month", "brl");
      expect(plan?.id).toBe("starter");
    });

    it("resolves starter yearly by amount", () => {
      // Starter yearly: R$479.00 = 47900 centavos
      const plan = getPlanByPriceAmount(47900, "year", "brl");
      expect(plan?.id).toBe("starter");
    });

    it("resolves pro monthly by amount", () => {
      // Pro monthly: R$149.90 = 14990 centavos
      const plan = getPlanByPriceAmount(14990, "month", "brl");
      expect(plan?.id).toBe("pro");
    });

    it("resolves pro yearly by amount", () => {
      // Pro yearly: R$1439.00 = 143900 centavos
      const plan = getPlanByPriceAmount(143900, "year", "brl");
      expect(plan?.id).toBe("pro");
    });

    it("returns undefined for unknown amount", () => {
      const plan = getPlanByPriceAmount(9999, "month", "brl");
      expect(plan).toBeUndefined();
    });

    it("returns undefined for wrong currency", () => {
      const plan = getPlanByPriceAmount(4990, "month", "usd");
      expect(plan).toBeUndefined();
    });

    it("returns undefined for wrong interval", () => {
      // Starter monthly price with yearly interval should not match
      const plan = getPlanByPriceAmount(4990, "year", "brl");
      expect(plan).toBeUndefined();
    });
  });

  describe("priceId cache", () => {
    it("caches and retrieves priceId to plan mapping", () => {
      cachePriceIdToPlan("price_test_123", "starter");
      const plan = getPlanByPriceId("price_test_123");
      expect(plan?.id).toBe("starter");
    });

    it("returns undefined for uncached priceId", () => {
      const plan = getPlanByPriceId("price_unknown_999");
      expect(plan).toBeUndefined();
    });

    it("overwrites cache with new value", () => {
      cachePriceIdToPlan("price_test_456", "starter");
      cachePriceIdToPlan("price_test_456", "pro");
      const plan = getPlanByPriceId("price_test_456");
      expect(plan?.id).toBe("pro");
    });
  });

  describe("Plan limits consistency", () => {
    it("free plan has correct limits", () => {
      const plan = getPlanById("free");
      expect(plan?.limits.messagesPerDay).toBe(5);
      expect(plan?.limits.conversationsPerMonth).toBe(3);
    });

    it("starter plan has correct limits", () => {
      const plan = getPlanById("starter");
      expect(plan?.limits.messagesPerDay).toBe(100);
      expect(plan?.limits.conversationsPerMonth).toBe(30);
    });

    it("pro plan has unlimited limits", () => {
      const plan = getPlanById("pro");
      expect(plan?.limits.messagesPerDay).toBe(999999);
      expect(plan?.limits.conversationsPerMonth).toBe(999999);
    });

    it("enterprise plan has unlimited limits", () => {
      const plan = getPlanById("enterprise");
      expect(plan?.limits.messagesPerDay).toBe(999999);
      expect(plan?.limits.conversationsPerMonth).toBe(999999);
    });
  });

  describe("Stripe price amounts match plan definitions", () => {
    it("starter stripe prices are consistent with display prices", () => {
      const plan = getPlanById("starter");
      // priceMonthly in cents should be 49.90 * 100 = 4990
      expect(plan?.stripe.priceMonthly).toBe(4990);
      // priceYearly in cents should be 479.00 * 100 = 47900
      expect(plan?.stripe.priceYearly).toBe(47900);
      expect(plan?.stripe.currency).toBe("brl");
    });

    it("pro stripe prices are consistent with display prices", () => {
      const plan = getPlanById("pro");
      // priceMonthly in cents should be 149.90 * 100 = 14990
      expect(plan?.stripe.priceMonthly).toBe(14990);
      // priceYearly in cents should be 1439.00 * 100 = 143900
      expect(plan?.stripe.priceYearly).toBe(143900);
      expect(plan?.stripe.currency).toBe("brl");
    });
  });

  describe("Security: checkout validation", () => {
    it("free plan has zero stripe price", () => {
      const free = getPlanById("free");
      expect(free?.stripe.priceMonthly).toBe(0);
    });

    it("starter and pro have purchasable prices", () => {
      const starter = getPlanById("starter");
      const pro = getPlanById("pro");
      expect(starter?.stripe.priceMonthly).toBeGreaterThan(0);
      expect(pro?.stripe.priceMonthly).toBeGreaterThan(0);
    });

    it("enterprise has reference price but is sold via contact", () => {
      // Enterprise has a reference price but checkout is handled via WhatsApp/sales
      const enterprise = getPlanById("enterprise");
      expect(enterprise?.stripe.priceMonthly).toBeGreaterThan(0);
    });
  });
});
