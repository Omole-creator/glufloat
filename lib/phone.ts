/**
 * One shape for a Nigerian phone number.
 *
 * People type the same number four ways: `08132097317`, `+2348132097317`,
 * `234 813 209 7317`, `0813 209 7317`. Stored exactly as typed, those are four
 * different strings, so the same handset can hold as many accounts as it likes
 * and nothing on the admin screen would ever show it. That matters more now the
 * free trial is a week: one person with `me+1@gmail.com`, `me+2@gmail.com` and
 * one phone can take a new week whenever they want.
 *
 * There is deliberately NO unique constraint on the column. In this audience a
 * caregiver and the person they care for really do share one handset, and a hard
 * block would lock out a real second account. This makes the repeat VISIBLE
 * instead, on /admin/users, so a real pattern can be seen before anything is
 * done about it.
 */

/**
 * The comparable form: digits only, local (leading `0`) shape.
 *
 * `+234 813 209 7317`, `2348132097317`, `08132097317` and `8132097317` all come
 * back as `08132097317`. Anything that is not a Nigerian-looking number is
 * returned as its bare digits, so a foreign number still compares with itself
 * and is never mangled into a wrong local one.
 */
export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // 234 + 10 digits: the international form.
  if (digits.startsWith("234") && digits.length === 13) return "0" + digits.slice(3);
  // 10 digits with no trunk 0, e.g. what you get after typing +234 in a picker.
  if (digits.length === 10 && !digits.startsWith("0")) return "0" + digits;
  return digits;
}

/** Are these the same handset, however each was typed? */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizePhone(a);
  return !!x && x === normalizePhone(b);
}

/**
 * How many accounts share each number. Keyed by the normalised form, so it sees
 * through the four ways of typing one number. Numbers used once are left out,
 * and blanks are ignored: 32 accounts were made before the phone field existed
 * and they all have none.
 */
export function repeatedPhones(
  people: { phone?: string | null }[],
): Map<string, number> {
  const seen = new Map<string, number>();
  for (const p of people) {
    const key = normalizePhone(p.phone);
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, n] of seen) if (n < 2) seen.delete(key);
  return seen;
}
