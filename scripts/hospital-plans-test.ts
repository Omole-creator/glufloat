// npx tsx scripts/hospital-plans-test.ts
import {
  HOSPITAL_PLANS,
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

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
