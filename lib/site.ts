/**
 * One place for the canonical origin. Every absolute URL the crawlers see
 * (canonical tags, Open Graph, sitemap, RSS, JSON-LD) is built from this, so
 * the site can never advertise two different addresses for the same page —
 * which is the classic way to split your own ranking in half.
 *
 * Paystack's callback already hardcodes www.glufloat.com, so www is the
 * canonical host. Do not change one without the other.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.glufloat.com"
).replace(/\/$/, "");

export const SITE_NAME = "Glufloat";

export const SITE_DESCRIPTION =
  "Clear answers on Nigerian foods for people living with diabetes. Every meal gets a green, yellow, or red rating, plus simple ways to improve it.";

/** Absolute URL for a path. `abs("/blog")` -> "https://www.glufloat.com/blog". */
export const abs = (path: string) =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
