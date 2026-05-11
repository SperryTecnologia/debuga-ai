import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import {
  updateUserStripeCustomerId,
  getUserByStripeCustomerId,
  upsertSubscription,
  updateSubscriptionStatus,
  getActiveSubscription,
  updateCreditsPlan,
  getOrCreateCredits,
} from "./db";
import { PLANS, getPlanByPriceId, getPlanByPriceAmount, cachePriceIdToPlan } from "./products";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return _stripe;
}

/**
 * Resolve the planId from a Stripe subscription object.
 * Strategy:
 * 1. Check metadata.plan_id (set during checkout)
 * 2. Check priceId cache (populated by previous webhooks)
 * 3. Fetch price from Stripe API and match by amount+interval
 */
async function resolvePlanFromSubscription(sub: any): Promise<string> {
  // 1. Check subscription metadata
  if (sub.metadata?.plan_id) {
    const plan = PLANS.find(p => p.id === sub.metadata.plan_id);
    if (plan) return plan.id;
  }

  // 2. Get priceId from subscription items
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (!priceId) return "free";

  // 3. Check cache
  const cachedPlan = getPlanByPriceId(priceId);
  if (cachedPlan) return cachedPlan.id;

  // 4. Fetch price details from Stripe and match by amount
  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount || 0;
    const interval = price.recurring?.interval || "month";
    const currency = price.currency || "brl";

    const matchedPlan = getPlanByPriceAmount(amount, interval, currency);
    if (matchedPlan) {
      // Cache for future lookups
      cachePriceIdToPlan(priceId, matchedPlan.id);
      return matchedPlan.id;
    }
  } catch (err) {
    console.error("[Stripe] Failed to fetch price details:", err);
  }

  return "free";
}

/**
 * Extract period end from subscription object (handles different Stripe API versions)
 */
function extractPeriodEnd(sub: any): Date {
  const periodEndRaw = sub.current_period_end
    ?? sub.currentPeriodEnd
    ?? sub.items?.data?.[0]?.current_period_end
    ?? 0;

  let periodEndMs: number;
  if (typeof periodEndRaw === 'number' && periodEndRaw > 1e12) {
    periodEndMs = periodEndRaw; // already in ms
  } else if (typeof periodEndRaw === 'number' && periodEndRaw > 1e9) {
    periodEndMs = periodEndRaw * 1000; // seconds → ms
  } else {
    periodEndMs = Date.now() + 30 * 24 * 60 * 60 * 1000; // fallback: 30 days
  }

  // Sanity check: if it's in the past (more than 1 day), use fallback
  if (periodEndMs < Date.now() - 86400000) {
    periodEndMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
  }

  return new Date(periodEndMs);
}

export function registerStripeRoutes(app: Express) {
  // ── Webhook (must be registered with raw body) ──
  app.post(
    "/api/stripe/webhook",
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        console.error("[Stripe Webhook] Missing signature or webhook secret");
        res.status(400).json({ error: "Missing signature" });
        return;
      }

      let event: Stripe.Event;
      try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        res.status(400).json({ error: "Invalid signature" });
        return;
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Received: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.user_id;
            const planId = session.metadata?.plan_id;
            const customerId = session.customer as string;

            if (!userId) {
              console.error("[Stripe Webhook] checkout.session.completed: missing user_id in metadata");
              break;
            }

            const uid = parseInt(userId);

            // Save Stripe customer ID
            if (customerId) {
              await updateUserStripeCustomerId(uid, customerId);
            }

            // Handle subscription checkout
            if (session.mode === "subscription" && session.subscription) {
              const stripe = getStripe();
              const sub = await stripe.subscriptions.retrieve(session.subscription as string);
              const periodEnd = extractPeriodEnd(sub);

              // Cache the priceId → planId mapping for future webhooks
              const priceId = sub.items.data[0]?.price.id;
              if (priceId && planId) {
                cachePriceIdToPlan(priceId, planId);
              }

              await upsertSubscription({
                userId: uid,
                stripeSubscriptionId: sub.id,
                stripePriceId: priceId || "",
                status: sub.status,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd: (sub as any).cancel_at_period_end ? 1 : 0,
              });

              // Update user's plan
              const resolvedPlanId = planId || await resolvePlanFromSubscription(sub);
              await getOrCreateCredits(uid, resolvedPlanId);
              await updateCreditsPlan(uid, resolvedPlanId);
              console.log(`[Stripe Webhook] User ${uid} upgraded to plan: ${resolvedPlanId}`);
            }
            break;
          }

          case "customer.subscription.created": {
            // Redundancy: also handle subscription creation
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            const user = await getUserByStripeCustomerId(customerId);

            if (user) {
              const periodEnd = extractPeriodEnd(sub);
              const priceId = sub.items?.data?.[0]?.price?.id || "";
              const resolvedPlanId = await resolvePlanFromSubscription(sub);

              await upsertSubscription({
                userId: user.id,
                stripeSubscriptionId: sub.id,
                stripePriceId: priceId,
                status: sub.status,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
              });

              if (resolvedPlanId !== "free") {
                await getOrCreateCredits(user.id, resolvedPlanId);
                await updateCreditsPlan(user.id, resolvedPlanId);
                console.log(`[Stripe Webhook] subscription.created: User ${user.id} → plan ${resolvedPlanId}`);
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            const user = await getUserByStripeCustomerId(customerId);

            if (user) {
              const periodEnd = extractPeriodEnd(sub);
              const priceId = sub.items?.data?.[0]?.price?.id || "";

              await upsertSubscription({
                userId: user.id,
                stripeSubscriptionId: sub.id,
                stripePriceId: priceId,
                status: sub.status,
                currentPeriodEnd: periodEnd,
                cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
              });

              // Determine the new plan
              if (sub.status === "active" || sub.status === "trialing") {
                const resolvedPlanId = await resolvePlanFromSubscription(sub);
                if (resolvedPlanId !== "free") {
                  await getOrCreateCredits(user.id, resolvedPlanId);
                  await updateCreditsPlan(user.id, resolvedPlanId);
                  console.log(`[Stripe Webhook] subscription.updated: User ${user.id} → plan ${resolvedPlanId}`);
                }
              } else if (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired") {
                // Downgrade to free
                await updateCreditsPlan(user.id, "free");
                console.log(`[Stripe Webhook] User ${user.id} downgraded to free (status: ${sub.status})`);
              }
              // past_due: keep current plan but mark subscription status
            }
            break;
          }

          case "customer.subscription.deleted": {
            const sub = event.data.object as Stripe.Subscription;
            await updateSubscriptionStatus(sub.id, "canceled");

            // Downgrade user to free plan
            const deletedCustomerId = sub.customer as string;
            const deletedUser = await getUserByStripeCustomerId(deletedCustomerId);
            if (deletedUser) {
              await updateCreditsPlan(deletedUser.id, "free");
              console.log(`[Stripe Webhook] User ${deletedUser.id} downgraded to free (subscription deleted)`);
            }
            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as any;
            // Confirm subscription is active after successful payment (renewal)
            if (invoice.subscription) {
              const stripe = getStripe();
              const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
              const customerId = sub.customer as string;
              const user = await getUserByStripeCustomerId(customerId);

              if (user) {
                const periodEnd = extractPeriodEnd(sub);
                const priceId = sub.items.data[0]?.price.id || "";

                await upsertSubscription({
                  userId: user.id,
                  stripeSubscriptionId: sub.id,
                  stripePriceId: priceId,
                  status: "active",
                  currentPeriodEnd: periodEnd,
                  cancelAtPeriodEnd: (sub as any).cancel_at_period_end ? 1 : 0,
                });

                const resolvedPlanId = await resolvePlanFromSubscription(sub);
                if (resolvedPlanId !== "free") {
                  await updateCreditsPlan(user.id, resolvedPlanId);
                  console.log(`[Stripe Webhook] invoice.payment_succeeded: User ${user.id} renewed plan ${resolvedPlanId}`);
                }
              }
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as any;
            if (invoice.subscription) {
              await updateSubscriptionStatus(invoice.subscription as string, "past_due");
              console.log(`[Stripe Webhook] invoice.payment_failed: subscription ${invoice.subscription} marked past_due`);
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
        }
      } catch (err) {
        console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
      }

      res.json({ received: true });
    }
  );

  // ── Create Checkout Session ──
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { planId, interval } = req.body; // interval: 'monthly' | 'yearly'

      if (!planId || !interval) {
        res.status(400).json({ error: "Missing planId or interval" });
        return;
      }

      // Validate planId — only allow starter and pro
      if (planId !== "starter" && planId !== "pro") {
        res.status(400).json({ error: "Invalid plan. Only 'starter' and 'pro' are available for checkout." });
        return;
      }

      if (interval !== "monthly" && interval !== "yearly") {
        res.status(400).json({ error: "Invalid interval. Use 'monthly' or 'yearly'." });
        return;
      }

      const stripe = getStripe();

      // Find the plan — price is determined by backend, not frontend
      const plan = PLANS.find((p) => p.id === planId);
      if (!plan) {
        res.status(400).json({ error: "Invalid plan" });
        return;
      }

      const amount = interval === "yearly" ? plan.stripe.priceYearly : plan.stripe.priceMonthly;
      const recurringInterval = interval === "yearly" ? "year" : "month";

      // Determine origin for redirect URLs
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "";

      // Check if user already has a Stripe customer ID
      let customerId: string | undefined;
      if (user.stripeCustomerId) {
        customerId = user.stripeCustomerId;
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        client_reference_id: user.id.toString(),
        metadata: {
          user_id: user.id.toString(),
          customer_email: user.email || "",
          customer_name: user.name || "",
          plan_id: planId,
        },
        subscription_data: {
          metadata: {
            user_id: user.id.toString(),
            plan_id: planId,
          },
        },
        line_items: [
          {
            price_data: {
              currency: plan.stripe.currency,
              product_data: {
                name: `debuga.ai ${plan.name}`,
                description: plan.description,
              },
              unit_amount: amount,
              recurring: {
                interval: recurringInterval,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/chat?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=canceled`,
      };

      // If user already has a customer, use it; otherwise set email
      if (customerId) {
        sessionParams.customer = customerId;
      } else {
        sessionParams.customer_email = user.email || undefined;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Stripe] Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ── Customer Portal (for managing subscription: upgrade, downgrade, cancel) ──
  app.post("/api/stripe/portal", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!user.stripeCustomerId) {
        res.status(400).json({ error: "No subscription found" });
        return;
      }

      const stripe = getStripe();
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "";

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/account`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Stripe] Portal error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // ── Get current subscription status ──
  app.get("/api/stripe/subscription", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const sub = await getActiveSubscription(user.id);
      res.json({ subscription: sub });
    } catch (error: any) {
      console.error("[Stripe] Subscription check error:", error);
      res.status(500).json({ error: "Failed to check subscription" });
    }
  });
}
