/**
 * Read every row of an admin query, not just the first 1,000.
 *
 * Supabase caps a select at 1,000 rows by default and says nothing when it
 * does, so a table that grows past that (usage_events will) quietly makes every
 * number built on it too small. This pages through with .range() until a short
 * page comes back.
 *
 * `make` builds a fresh query each time, because a Supabase builder can only be
 * awaited once. Returns [] on any error (a table that does not exist yet reads
 * as empty, never as a broken dashboard).
 */
const PAGE = 1000;

export async function fetchAll<T>(
  make: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> },
): Promise<{ rows: T[]; ok: boolean }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make().range(from, from + PAGE - 1);
    if (error) return { rows, ok: false };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) return { rows, ok: true };
  }
}
