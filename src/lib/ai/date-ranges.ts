/**
 * LLMs are unreliable at exact date arithmetic ("last weekend" relative to
 * a given date), so we compute the common relative ranges here in code and
 * hand the model the literal answer instead of asking it to derive one.
 */

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Most recent Sunday on or before `date`. */
function mostRecentSunday(date: Date): Date {
  let cursor = new Date(date);
  while (cursor.getUTCDay() !== 0) cursor = addDays(cursor, -1);
  return cursor;
}

/**
 * Builds a block of precomputed relative date ranges for the given
 * YYYY-MM-DD date, to inject into the album assistant's system prompt.
 */
export function buildDateReferenceContext(todayIso: string): string {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const dayOfWeek = today.getUTCDay(); // 0 = Sunday .. 6 = Saturday

  // "Last weekend" always excludes today, even if today is itself a
  // Saturday or Sunday — anchor the search on yesterday.
  const lastSunday = mostRecentSunday(addDays(today, -1));
  const lastSaturday = addDays(lastSunday, -1);

  // "This weekend" includes today if today is already Saturday or Sunday.
  let thisSaturday: Date;
  if (dayOfWeek === 6) thisSaturday = today;
  else if (dayOfWeek === 0) thisSaturday = addDays(today, -1);
  else thisSaturday = addDays(today, 6 - dayOfWeek);
  const thisSunday = addDays(thisSaturday, 1);

  const yesterday = addDays(today, -1);
  const last7Days = addDays(today, -7);

  return `Precomputed date reference — use these exact ranges as-is, do not
recompute them yourself (date arithmetic is easy to get off by a day or
more):
- Today: ${fmt(today)}
- Yesterday: ${fmt(yesterday)}
- Last weekend: ${fmt(lastSaturday)} to ${fmt(lastSunday)}
- This weekend: ${fmt(thisSaturday)} to ${fmt(thisSunday)}
- Last 7 days: ${fmt(last7Days)} to ${fmt(today)}`;
}
