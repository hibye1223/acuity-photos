"use server";

import { env } from "~/env";
import { stripe } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
function randomLetters(length: number): string {
  return Array.from(
    { length },
    () => LETTERS[Math.floor(Math.random() * LETTERS.length)],
  ).join("");
}

/**
 * Finds (or creates) the Stripe Customer for the signed-in user and stores
 * it on their profile. Uses the service-role client because
 * stripe_customer_id is revoked from `authenticated` writes (see the
 * add_stripe_customer_fields migration).
 */
async function getOrCreateStripeCustomerId(
  userId: string,
  email: string | undefined,
): Promise<string> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  const { error } = await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  return customer.id;
}

/** Starts a subscription Checkout Session for the Pro plan and returns its URL. */
export async function startProCheckoutAction(): Promise<{ url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to upgrade.");

  const customerId = await getOrCreateStripeCustomerId(user.id, user.email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${env.NEXT_PUBLIC_SITE_URL}/app/settings?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_SITE_URL}/app/settings?checkout=cancelled`,
    integration_identifier: `proupgrade${randomLetters(8)}`,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { url: session.url };
}

/** Opens the Stripe Customer Portal so a Pro user can manage or cancel their subscription. */
export async function openBillingPortalAction(): Promise<{ url: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    throw new Error("No billing account found for this user yet.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${env.NEXT_PUBLIC_SITE_URL}/app/settings`,
  });

  return { url: session.url };
}
