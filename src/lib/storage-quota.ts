import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlan, PLAN_STORAGE_BYTES } from "~/lib/plans";

// The free-tier default, unless an admin override or a paid plan applies.
export const MAX_STORAGE_BYTES = PLAN_STORAGE_BYTES.free;

/** Relies on RLS to scope rows to the signed-in user — never filter by user_id here. */
export async function getUsedStorageBytes(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.from("photos").select("size_bytes");

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);
}

/**
 * The signed-in user's quota: their admin-set override if one exists,
 * otherwise whatever their plan (free/pro) grants.
 */
export async function getStorageLimitBytes(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return MAX_STORAGE_BYTES;

  const { data } = await supabase
    .from("profiles")
    .select("storage_quota_bytes, plan")
    .eq("id", user.id)
    .single();

  if (data?.storage_quota_bytes) return data.storage_quota_bytes;

  const plan = isPlan(data?.plan) ? data.plan : "free";
  return PLAN_STORAGE_BYTES[plan];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
