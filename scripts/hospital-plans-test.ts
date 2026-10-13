// npx tsx scripts/hospital-plans-test.ts
import {
  HOSPITAL_PLANS,
  PRACTICE_PLANS,
  PRACTICE_TRIAL_DAYS,
  PRACTICE_TRIAL_SEATS,
  acceptsPatients,
  isPractice,
  orgWords,
  planName,
  practicePlanForAmount,
  practiceMonthsForAmount,
  practiceYearly,
  waitingForFirstPatient,
  addMonths,
  annualPrice,
  annualSaving,
  documentAmountKobo,
  extendAccess,
  hospitalLive,
  perPatientDay,
  perPatientMonth,
  premiumValue,
} from "../lib/hospitalPlans";
import { normalizePhone } from "../lib/phone";
import { TIER_AMOUNTS, TIER_YEARLY_AMOUNTS } from "../lib/pricing";
import { isPhoneLoginEmail, looksLikePhone, phoneLoginEmail } from "../lib/phoneLogin";

let fails = 0;
function check(name: string, ok: boolean, got?: unknown) {
  if (!ok) {
    fails++;
    console.log(`FAIL ${name}`, got ?? "");
  } else console.log(`ok   ${name}`);
}

const [c50, c100, c200] = HOSPITAL_PLANS;
check("Care 50 is N100,000 for 50", c50.monthly === 100000 && c50.seats === 50);
check("Care 100 is N180,000 for 100", c100.monthly === 180000 && c100.seats === 100);
check("Care 200 is N300,000 for 200", c200.monthly === 300000 && c200.seats === 200);
check("per patient: 2,000 / 1,800 / 1,500", [c50, c100, c200].map((p) => perPatientMonth(p)).join() === "2000,1800,1500");
check("per day: 67 / 60 / 50", [c50, c100, c200].map((p) => perPatientDay(p)).join() === "67,60,50", [c50, c100, c200].map((p) => perPatientDay(p)));
check("yearly is 10 months", annualPrice(c50) === 1_000_000 && annualPrice(c200) === 3_000_000);
check("yearly saves 2 months", annualSaving(c100) === 360_000);
check("Premium value of 50 is 225,000", premiumValue(c50) === 225_000);
check("every plan is cheaper than Premium alone", HOSPITAL_PLANS.every((p) => p.monthly < premiumValue(p)));

const m = documentAmountKobo({ plan: "care50", billing: "monthly" });
check("monthly invoice = 1 month, 10,000,000 kobo", m.months === 1 && m.total === 10_000_000 && m.vat === 0);
const y = documentAmountKobo({ plan: "care200", billing: "annual" });
check("annual invoice = 12 months for 10", y.months === 12 && y.total === 300_000_000);
const c = documentAmountKobo({ plan: "custom", billing: "monthly", seats: 350, perPatient: 1300 });
check("custom 350 x 1,300", c.seats === 350 && c.total === 45_500_000);
const v = documentAmountKobo({ plan: "care50", billing: "monthly", vatRate: 0.075 });
check("VAT switch adds 7.5%", v.vat === 750_000 && v.total === 10_750_000);

check("31 Jan + 1 month = 28 Feb", addMonths(new Date("2027-01-31T10:00:00Z"), 1).toISOString().slice(0, 10) === "2027-02-28");
const now = new Date("2026-10-12T09:00:00Z");
check("extend from now when lapsed", extendAccess("2026-09-01T00:00:00Z", 1, now).toISOString().slice(0, 10) === "2026-11-12");
check("extend from the end when still live", extendAccess("2026-10-20T00:00:00Z", 1, now).toISOString().slice(0, 10) === "2026-11-20");
check("pilot live", hospitalLive({ status: "pilot", access_until: "2026-11-01T00:00:00Z" }, now.getTime()));
check("ended is not live", !hospitalLive({ status: "ended", access_until: "2027-11-01T00:00:00Z" }, now.getTime()));
check("past date is not live", !hospitalLive({ status: "active", access_until: "2026-10-01T00:00:00Z" }, now.getTime()));
check("requested is not live", !hospitalLive({ status: "requested", access_until: null }, now.getTime()));

check("phone email is stable", phoneLoginEmail("+234 813 209 7317") === phoneLoginEmail("08132097317"));
check("phone email shape", phoneLoginEmail("0813 209 7317") === "08132097317@phone.glufloat.com", phoneLoginEmail("0813 209 7317"));
check("phone email is recognised", isPhoneLoginEmail("08132097317@phone.glufloat.com"));
check("real email is not phone email", !isPhoneLoginEmail("ada@gmail.com"));
check("phone looks like phone", looksLikePhone("0813 209 7317") && looksLikePhone("+2348132097317"));
check("email is not a phone", !looksLikePhone("ada@gmail.com") && !looksLikePhone("12345"));
check("normalise still works", normalizePhone("2348132097317") === "08132097317");

// ---- GluFloat for dietitians (2026-10-13) ----
const [d5, d10, d20] = PRACTICE_PLANS;
check("5 Patients is N12,000", d5.seats === 5 && d5.monthly === 12000 && d5.name === "5 Patients");
check("10 Patients is N22,000", d10.seats === 10 && d10.monthly === 22000);
check("20 Patients is N40,000", d20.seats === 20 && d20.monthly === 40000);
check("per patient falls 2,400 / 2,200 / 2,000", PRACTICE_PLANS.map((p) => p.monthly / p.seats).join() === "2400,2200,2000");
check(
  "no dietitian plan is cheaper per patient than any hospital plan",
  PRACTICE_PLANS.every((d) => HOSPITAL_PLANS.every((h) => d.monthly / d.seats >= h.monthly / h.seats)),
);
check("free start is 14 days for 5", PRACTICE_TRIAL_DAYS === 14 && PRACTICE_TRIAL_SEATS === 5);
check("amount finds the plan", practicePlanForAmount(1_200_000)?.id === "diet5" && practicePlanForAmount(4_000_000)?.id === "diet20");
const patientAmounts = [...Object.values(TIER_AMOUNTS), ...Object.values(TIER_YEARLY_AMOUNTS)];
check("no patient amount is a dietitian amount", patientAmounts.every((a) => !practicePlanForAmount(a)), patientAmounts);
check("an odd amount is no dietitian plan", !practicePlanForAmount(1_250_000) && !practicePlanForAmount(null));
check("plan names include dietitian plans", planName("diet10") === "10 Patients" && planName("care50") === "Care 50");
const fresh = { kind: "dietitian", status: "pilot", access_until: null };
check("new dietitian waits for first patient", waitingForFirstPatient(fresh) && isPractice(fresh));
check("new dietitian accepts patients", acceptsPatients(fresh, now.getTime()));
check("new dietitian is not live yet", !hospitalLive(fresh, now.getTime()));
check("a hospital with no end date takes nobody", !acceptsPatients({ status: "pilot", access_until: null }, now.getTime()));
check("switched-off dietitian takes nobody", !acceptsPatients({ kind: "dietitian", status: "declined", access_until: null }, now.getTime()));
check("started dietitian is live", acceptsPatients({ kind: "dietitian", status: "pilot", access_until: "2026-11-01T00:00:00Z" }, now.getTime()) && !waitingForFirstPatient({ kind: "dietitian", status: "pilot", access_until: "2026-11-01T00:00:00Z" }));
check("words: dietitian", orgWords(fresh).yours === "your dietitian" && orgWords({ kind: "hospital" }).yours === "your hospital");
check("words: old row is a hospital", orgWords({}).yours === "your hospital");
check("yearly is 12 for 10: 120,000 / 220,000 / 400,000", PRACTICE_PLANS.map(practiceYearly).join() === "120000,220000,400000");
check("yearly amount finds the plan and buys 12 months", practicePlanForAmount(22_000_000)?.id === "diet10" && practiceMonthsForAmount(22_000_000) === 12);
check("monthly amount buys 1 month", practiceMonthsForAmount(2_200_000) === 1);
check(
  "no yearly dietitian plan is cheaper per patient than a hospital yearly plan",
  PRACTICE_PLANS.every((d) => HOSPITAL_PLANS.every((h) => practiceYearly(d) / d.seats >= annualPrice(h) / h.seats)),
);
check("no patient amount is a yearly dietitian amount", patientAmounts.every((a) => practiceMonthsForAmount(a) === 1));

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
