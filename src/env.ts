import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Bypasses RLS entirely — only ever used server-side, for the admin
    // deleteUser call behind self-service account deletion.
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    ALBUM_ASSISTANT_MODEL: z
      .string()
      .min(1)
      .default("anthropic/claude-sonnet-5"),
    // Comma-separated AI Gateway model IDs, tried in order if
    // ALBUM_ASSISTANT_MODEL errors out (e.g. a free-tier rate limit) — see
    // providerOptions.gateway.models in src/app/api/album-assistant/route.ts.
    // Deliberately a different provider/quota bucket than the primary model.
    ALBUM_ASSISTANT_FALLBACK_MODELS: z
      .string()
      .min(1)
      .default(
        "anthropic/claude-haiku-4.5,google/gemini-2.5-flash-lite,xai/grok-4.1-fast-non-reasoning,openai/gpt-4.1-nano",
      ),
    // Deliberately a different provider than ALBUM_ASSISTANT_MODEL so photo
    // tagging and album generation don't share a rate-limit bucket.
    PHOTO_TAGGING_MODEL: z
      .string()
      .min(1)
      .default("google/gemini-2.5-flash-lite"),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRO_PRICE_ID: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // Set in Vercel's Production/Preview env vars to
    // https://www.acuityphotos.com. The localhost default only applies to
    // local dev — don't let it silently mask a missing prod env var.
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    ALBUM_ASSISTANT_MODEL: process.env.ALBUM_ASSISTANT_MODEL,
    ALBUM_ASSISTANT_FALLBACK_MODELS:
      process.env.ALBUM_ASSISTANT_FALLBACK_MODELS,
    PHOTO_TAGGING_MODEL: process.env.PHOTO_TAGGING_MODEL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
