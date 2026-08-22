import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "~/env";

/**
 * Service-role client: bypasses RLS entirely. Never expose this to the
 * browser — only call it from server actions/route handlers, and only for
 * operations the anon/user-scoped client genuinely can't do (e.g. deleting
 * an auth.users row via the admin API).
 */
export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
