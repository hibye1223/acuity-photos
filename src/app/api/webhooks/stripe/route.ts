import type Stripe from "stripe";
import { env } from "~/env";
import { stripe } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";

/**
 * Subscription state changes (renewals, failed payments, cancellations)
 * happen asynchronously — this handler, not the checkout success page, is
 * the source of truth for a profile's `plan`.
 */
async function setPlanForCustomer(
  customerId: string,
  plan: "free" | "pro",
  subscriptionId: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ plan, stripe_subscription_id: subscriptionId })
    .eq("stripe_customer_id", customerId);
  if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") break;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (customerId && subscriptionId) {
        await setPlanForCustomer(customerId, "pro", subscriptionId);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
      const isActive =
        subscription.status === "active" || subscription.status === "trialing";
      await setPlanForCustomer(
        customerId,
        isActive ? "pro" : "free",
        subscription.id,
      );
      break;
    }
    default:
      break;
  }

  return new Response(null, { status: 200 });
}
