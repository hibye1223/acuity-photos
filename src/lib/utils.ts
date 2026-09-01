import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a Supabase embedded-resource field that can come back as either
 * a single object or a one-item array, depending on how PostgREST infers the
 * relationship's cardinality for a given query. Every join onto a to-one
 * foreign key in this app goes through this instead of assuming either shape.
 */
export function toOne<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}
