import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Server-only Supabase vars can go here if needed
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
    ALBUM_ASSISTANT_MODEL: z
      .string()
      .min(1)
      .default("anthropic/claude-sonnet-5"),
    PHOTO_TAGGING_MODEL: z.string().min(1).default("openai/gpt-4o-mini"),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    ALBUM_ASSISTANT_MODEL: process.env.ALBUM_ASSISTANT_MODEL,
    PHOTO_TAGGING_MODEL: process.env.PHOTO_TAGGING_MODEL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
