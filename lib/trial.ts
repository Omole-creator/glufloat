/**
 * How long the free trial lasts, in calendar days.
 *
 * This lives in its own tiny module, with no "use client", because both sides
 * of the app need it: the browser (`lib/account.ts`, which decides whether a
 * person gets into `/app`) and the server (`lib/partnerStats.ts` and
 * `/admin`, which report who is still on trial). A server component cannot
 * safely read a plain value out of a "use client" module, and the number was
 * previously hardcoded a second and a third time because of that, which is
 * exactly how a partner's report ends up disagreeing with the app.
 *
 * It is the ONLY place the length is written. Nothing in Supabase, on Vercel
 * or at Paystack stores it: the database keeps one timestamp
 * (`profiles.trial_start`) and the days left are worked out fresh on every
 * read. So changing this number moves everybody already inside the new window,
 * including somebody whose shorter trial had already run out.
 */
export const TRIAL_DAYS = 7;
