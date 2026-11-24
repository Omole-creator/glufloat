/**
 * A nurse partner's two addresses (founder, 2026-11-24). Pure, so
 * `npx tsx scripts/nurse-codes-test.ts` proves every rule.
 *
 *  - Her patient link: glufloat.com/nurse<first name>, e.g. /nurseada. Stored
 *    as her practice's join code (hospitals.code, "NURSEADA"), suggested from
 *    her name and editable by Glufloat before saving, never after (it is
 *    printed on her flyer), exactly like a pharmacy's code.
 *  - Her set-up link: glufloat.com/setup/<first name><2 digits>, e.g.
 *    /setup/ada42. Short enough to guess, so the set-up page also asks for the
 *    email Glufloat has for her: the link alone opens nothing.
 */

/** Titles and words that are not her first name. */
const TITLES = new Set(["NURSE", "NRS", "RN", "MRS", "MISS", "MS", "MR", "MADAM", "SISTER", "SR", "MATRON", "DR", "CHIEF"]);

/** Her name's words in capitals, letters only, titles dropped. */
function nameWords(name: string): string[] {
  return String(name ?? "")
    .toUpperCase()
    .split(/[\s,.\-'/]+/)
    .map((w) => w.replace(/[^A-Z]/g, ""))
    .filter((w) => w && !TITLES.has(w));
}

/** "Nurse Ada Okafor" -> "ADA". Falls back to "NURSE" letters only if nothing is left. */
export function nurseFirstName(name: string): string {
  return nameWords(name)[0] ?? "";
}

export const NURSE_CODE_MAX = 20;

/** "nurse ada", "NurseAda" and "NURSEADA" are the same code. */
export function normalizeNurseCode(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** A patient-link code we accept: NURSE then 2 to 15 letters or digits. */
export function validNurseCode(code: string): boolean {
  return new RegExp(`^NURSE[A-Z][A-Z0-9]{1,${NURSE_CODE_MAX - 6}}$`).test(code);
}

/**
 * The code we suggest: NURSE + first name (NURSEADA); taken, then + the first
 * letter of her surname (NURSEADAO); then a number (NURSEADA2...).
 */
export function suggestNurseCode(name: string, taken: Set<string>): string {
  const words = nameWords(name);
  const first = (words[0] ?? "").slice(0, NURSE_CODE_MAX - 7);
  const base = `NURSE${first || "PARTNER"}`;
  const tries = [base, words[1] ? `${base}${words[1][0]}` : null].filter((x): x is string => !!x);
  for (const t of tries) if (validNurseCode(t) && !taken.has(t)) return t;
  for (let n = 2; n < 1000; n++) {
    const t = `${base}${n}`;
    if (validNurseCode(t) && !taken.has(t)) return t;
  }
  return `${base}${Date.now() % 100000}`;
}

/** glufloat.com/nurseada, shown and printed in lower case. */
export function nursePath(code: string): string {
  return `/${normalizeNurseCode(code).toLowerCase()}`;
}

/** Her set-up token: first name in lower case + a 2-digit number (10 to 99). */
export function nurseSetupToken(name: string, rand: () => number = Math.random): string {
  const first = nurseFirstName(name).toLowerCase().slice(0, 20) || "nurse";
  return `${first}${10 + Math.floor(rand() * 90)}`;
}

/** Does this look like a nurse set-up token (letters then 2 or 3 digits)? */
export function looksLikeNurseToken(token: string): boolean {
  return /^[a-z]{1,20}\d{2,3}$/.test(token);
}

/**
 * Is this practice join code a nurse's patient link? Hospital, dietitian and
 * doctor codes are 6 random characters (newCode); a nurse's is NURSE + at
 * least 2 more, so the two can never be confused.
 */
export function isNurseCode(code: string | null | undefined): boolean {
  const c = normalizeNurseCode(code);
  return c.length > 6 && validNurseCode(c);
}
