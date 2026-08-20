export type Plan = "free" | "pro";

export function isPlan(value: unknown): value is Plan {
  return value === "free" || value === "pro";
}

export const PLAN_STORAGE_BYTES: Record<Plan, number> = {
  free: 1 * 1024 * 1024 * 1024, // 1 GB — unchanged from the existing free-tier default
  pro: 5 * 1024 * 1024 * 1024, // 5 GB
};

export const PRO_PRICE_LABEL = "$6.99/mo";
