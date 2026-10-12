/**
 * GluFloat for hospitals: the plans, in ONE place. Pure (no "use client", no
 * I/O), so the public /hospitals page, the hospital dashboard, the GluFloat
 * admin and the quote/invoice PDF all read the same numbers.
 * `npx tsx scripts/hospital-plans-test.ts` proves the maths.
 *
 * Founder's decisions, 2026-10-12:
 *  - Every hospital patient gets everything in GluFloat Premium. The dashboard
 *    for the hospital's doctors and dietitians is free.
 *  - Named by patient count (Care 50 / 100 / 200), because every plan has the
 *    same features. A big clinic and a small hospital can sit on either.
 *  - Paid by bank transfer, against a GluFloat invoice.
 *  - Yearly: 12 months for the price of 10.
 *  - A free 30-day pilot for 20 patients before any money.
 *  - No VAT for now (a switch in /admin turns it on later).
 */

export type HospitalPlanId = "care50" | "care100" | "care200";
export type HospitalBilling = "monthly" | "annual";

export type HospitalPlan = {
  id: HospitalPlanId;
  name: string;
  seats: number;
  /** Naira per month. */
  monthly: number;
};

export const HOSPITAL_PLANS: HospitalPlan[] = [
  { id: "care50", name: "Care 50", seats: 50, monthly: 100_000 },
  { id: "care100", name: "Care 100", seats: 100, monthly: 180_000 },
  { id: "care200", name: "Care 200", seats: 200, monthly: 300_000 },
];

export const CUSTOM_PLAN_NAME = "Care Custom";
/** The plan a custom quote starts from, per patient per month. Admin can change it. */
export const CUSTOM_DEFAULT_PER_PATIENT = 1_300;

/** What one Premium member pays on their own, per month (lib/pricing.ts). */
export const PREMIUM_MONTHLY = 4_500;

/** Pay this many months, get a year. */
export const ANNUAL_MONTHS_PAID = 10;

export const PILOT_DAYS = 30;
export const PILOT_SEATS = 20;

export function planById(id: string | null | undefined): HospitalPlan | undefined {
  return HOSPITAL_PLANS.find((p) => p.id === id);
}

export function planName(id: string | null | undefined): string {
  if (id === "custom") return CUSTOM_PLAN_NAME;
  if (id === "pilot") return "Free pilot";
  return planById(id)?.name ?? "No plan";
}

/** Naira for a year on this plan: 10 months' price, 12 months' access. */
export function annualPrice(p: HospitalPlan): number {
  return p.monthly * ANNUAL_MONTHS_PAID;
}

/** Per patient per month, rounded to the naira. */
export function perPatientMonth(p: HospitalPlan, billing: HospitalBilling = "monthly"): number {
  const monthly = billing === "annual" ? annualPrice(p) / 12 : p.monthly;
  return Math.round(monthly / p.seats);
}

/** Per patient per day (30-day month), rounded to the naira. */
export function perPatientDay(p: HospitalPlan, billing: HospitalBilling = "monthly"): number {
  const monthly = billing === "annual" ? annualPrice(p) / 12 : p.monthly;
  return Math.round(monthly / p.seats / 30);
}

/** What the same patients would pay for Premium on their own, per month. */
export function premiumValue(p: HospitalPlan): number {
  return p.seats * PREMIUM_MONTHLY;
}

/** What the hospital keeps, in naira, on a year paid up front. */
export function annualSaving(p: HospitalPlan): number {
  return p.monthly * 12 - annualPrice(p);
}

/**
 * The amount of a quote or invoice, in kobo. `perPatient` is only for a custom
 * plan; the named plans always charge their own price.
 */
export function documentAmountKobo(opts: {
  plan: HospitalPlanId | "custom";
  billing: HospitalBilling;
  seats?: number;
  perPatient?: number;
  vatRate?: number;
}): { seats: number; months: number; subtotal: number; vat: number; total: number } {
  const months = opts.billing === "annual" ? 12 : 1;
  const paidMonths = opts.billing === "annual" ? ANNUAL_MONTHS_PAID : 1;
  let seats: number;
  let monthlyNaira: number;
  if (opts.plan === "custom") {
    seats = Math.max(1, Math.round(opts.seats ?? 0));
    monthlyNaira = seats * Math.max(1, Math.round(opts.perPatient ?? CUSTOM_DEFAULT_PER_PATIENT));
  } else {
    const p = planById(opts.plan)!;
    seats = p.seats;
    monthlyNaira = p.monthly;
  }
  const subtotal = monthlyNaira * paidMonths * 100;
  const vat = Math.round(subtotal * Math.max(0, opts.vatRate ?? 0));
  return { seats, months, subtotal, vat, total: subtotal + vat };
}

export function nairaText(n: number): string {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

/** Add calendar months, the way an invoice reads ("12 Oct to 12 Nov"). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31 Jan + 1 month must be 28/29 Feb, not 3 March.
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/** Where a paid invoice moves a hospital's access to: from the later of now and the current end. */
export function extendAccess(currentUntil: string | null, months: number, now = new Date()): Date {
  const cur = currentUntil ? new Date(currentUntil) : null;
  const from = cur && cur.getTime() > now.getTime() ? cur : now;
  return addMonths(from, months);
}

/** A hospital is open (patients covered, poster link works) while this is true. */
export function hospitalLive(h: { status: string; access_until: string | null }, now = Date.now()): boolean {
  return (
    (h.status === "pilot" || h.status === "active") &&
    !!h.access_until &&
    new Date(h.access_until).getTime() > now
  );
}
