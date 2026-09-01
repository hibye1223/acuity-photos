-- Links a profile to its Stripe Customer/Subscription so the webhook
-- handler can look up which user a Stripe event belongs to, and so the
-- Customer Portal action knows which customer to open a session for.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Same reasoning as plan in 20260820003049_add_billing_plan.sql: only
-- server code using the service-role client (checkout/portal/webhook
-- handlers) should ever write these, never the browser client directly.
revoke update (stripe_customer_id, stripe_subscription_id)
  on public.profiles from authenticated;
