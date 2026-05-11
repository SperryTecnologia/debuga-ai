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

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return _stripe;
}

export function registerStripeRoutes(app: Express) {
  // ── Webhook (must be registered with raw body) ──
  app.post(
    "/api/stripe/webhook",
    // Raw body is already configured in index.ts before json parser
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

            if (userId && customerId) {
              await updateUserStripeCustomerId(parseInt(userId), customerId);
            }

            // If it's a subscription checkout, upsert subscription and update credits
            if (session.mode === "subscription" && session.subscription) {
              const stripe = getStripe();
              const sub = await stripe.subscriptions.retrieve(session.subscription as string);
              if (userId) {
                const uid = parseInt(userId);
                // Stripe API v2025 may return current_period_end in different formats
                const periodEndRaw = (sub as any).current_period_end;
                const periodEndMs = periodEndRaw && periodEndRaw > 0
                  ? periodEndRaw * 1000
                  : Date.now() + 30 * 24 * 60 * 60 * 1000; // fallback: 30 days from now
                await upsertSubscription({
                  userId: uid,
                  stripeSubscriptionId: sub.id,
                  stripePriceId: sub.items.data[0]?.price.id || "",
                  status: sub.status,
                  currentPeriodEnd: new Date(periodEndMs),
                  cancelAtPeriodEnd: (sub as any).cancel_at_period_end ? 1 : 0,
                });

                // Update user's credits based on the purchased plan
                if (planId) {
                  await getOrCreateCredits(uid, planId);
                  await updateCreditsPlan(uid, planId);
                  console.log(`[Stripe Webhook] Credits updated for user ${uid} to plan: ${planId}`);
                }
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            const user = await getUserByStripeCustomerId(customerId);

            if (user) {
              const updPeriodEndRaw = sub.current_period_end;
              const updPeriodEndMs = updPeriodEndRaw && updPeriodEndRaw > 0
                ? updPeriodEndRaw * 1000
                : Date.now() + 30 * 24 * 60 * 60 * 1000;
              await upsertSubscription({
                userId: user.id,
                stripeSubscriptionId: sub.id,
                stripePriceId: sub.items?.data?.[0]?.price?.id || "",
                status: sub.status,
                currentPeriodEnd: new Date(updPeriodEndMs),
                cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
              });

              // If subscription was canceled/expired, downgrade to free
              if (sub.status === "canceled" || sub.status === "unpaid") {
                await updateCreditsPlan(user.id, "free");
                console.log(`[Stripe Webhook] User ${user.id} downgraded to free (status: ${sub.status})`);
              }
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

          case "invoice.payment_failed": {
            const invoice = event.data.object as any;
            if (invoice.subscription) {
              await updateSubscriptionStatus(invoice.subscription as string, "past_due");
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

      const stripe = getStripe();

      // Find or create the product and price
      const { PLANS } = await import("./products");
      const plan = PLANS.find((p) => p.id === planId);
      if (!plan) {
        res.status(400).json({ error: "Invalid plan" });
        return;
      }

      const amount = interval === "yearly" ? plan.stripe.priceYearly : plan.stripe.priceMonthly;
      const recurringInterval = interval === "yearly" ? "year" : "month";

      // Create checkout session with inline price
      const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        customer_email: user.email || undefined,
        client_reference_id: user.id.toString(),
        metadata: {
          user_id: user.id.toString(),
          customer_email: user.email || "",
          customer_name: user.name || "",
          plan_id: planId,
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
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[Stripe] Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ── Customer Portal ──
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
        return_url: `${origin}/chat`,
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
