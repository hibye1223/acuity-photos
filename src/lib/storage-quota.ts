import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB per user

/** Relies on RLS to scope rows to the signed-in user — never filter by user_id here. */
export async function getUsedStorageBytes(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.from("photos").select("size_bytes");

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => sum + (row.size_bytes ?? 0), 0);
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
