import type { SupabaseClient } from "@supabase/supabase-js";

const FALLBACK_PROMPTS = [
  "Make an album of our trip to the beach.",
  "Create an album from our vacation in Florida.",
  "Build an album from last weekend.",
];

/**
 * Builds example prompts from the signed-in user's own content tags and
 * locations, so the suggestions feel like their library instead of generic
 * placeholders. Falls back to generic examples for a new/untagged library.
 */
export async function getExamplePrompts(
  supabase: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("tags, location")
    .limit(300);

  if (error || !data || data.length === 0) return FALLBACK_PROMPTS;

  const tagCounts = new Map<string, number>();
  const locationCounts = new Map<string, number>();

  for (const row of data as {
    tags: string[] | null;
    location: string | null;
  }[]) {
    for (const tag of row.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    if (row.location) {
      locationCounts.set(
        row.location,
        (locationCounts.get(row.location) ?? 0) + 1,
      );
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  const topLocation = [...locationCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  const prompts: string[] = [];
  if (topTags[0]) prompts.push(`Make an album of our ${topTags[0]} photos.`);
  if (topLocation) {
    prompts.push(`Build an album from ${topLocation.split(",")[0]}.`);
  }
  if (topTags[1]) prompts.push(`Create an album of our ${topTags[1]} photos.`);
  prompts.push("Build an album from last weekend.");

  return prompts.slice(0, 3);
}
