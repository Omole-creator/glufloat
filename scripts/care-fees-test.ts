/**
 * Care fee rules (lib/careFees.ts). Run: npx tsx scripts/care-fees-test.ts
 */
import {
  ADVISOR_DIRECT_RATE,
  ADVISOR_RATE,
  AGENT_RATE,
  REVIEW_FEE_KOBO,
  agentWindowOpen,
  glufloatShare,
  maskAccount,
  nairaFromKobo,
  reviewMonthWAT,
  reviewReference,
  splitPayment,
  splitRepPatientPayment,
  weekStartWAT,
} from "../lib/careFees";

let fails = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) {
    fails++;
    console.log(`FAIL  ${name}`, detail ?? "");
  } else console.log(`ok    ${name}`);
}

const DAY = 86_400_000;
const now = new Date("2026-10-16T10:00:00Z");
const by = (s: ReturnType<typeof splitPayment>, k: string) => s.find((x) => x.kind === k)?.amount ?? 0;

// N4,500 with an agent and an advisor, first payment. Since 2026-10-20 the
// doctor earns nothing from a payment: they are paid per review instead.
const full = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("a payment pays the doctor nothing", by(full, "care") === 0, full);
check("agent 11.12% = N500.40", by(full, "agent") === 50_040, full);
check("advisor 10% = N450", by(full, "advisor") === 45_000, full);
check("GluFloat keeps 78.88%", glufloatShare(450_000, full) === 354_960, glufloatShare(450_000, full));
check("agent + advisor rates add to 21.12%", Math.abs(AGENT_RATE + ADVISOR_RATE - 0.2112) < 1e-9);

// No agent: nobody is paid from the payment.
const direct = splitPayment({ amountKobo: 450_000, hasAgent: false, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("no agent: no share at all", direct.length === 0, direct);

// The advisor brought the doctor himself: advisor 15%, no agent share.
const adv = splitPayment({ amountKobo: 450_000, hasAgent: true, agentIsAdvisor: true, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("advisor's own doctor: advisor 15% = N675", by(adv, "advisor") === 67_500 && ADVISOR_DIRECT_RATE === 0.15, adv);
check("advisor's own doctor: advisor only", adv.length === 1, adv);
const advLate = splitPayment({ amountKobo: 450_000, hasAgent: true, agentIsAdvisor: true, hasAdvisor: true, paidAt: now, firstPaidAt: new Date(now.getTime() - 400 * DAY) });
check("advisor's own doctor after 12 months: nobody", advLate.length === 0, advLate);

// Agent with no advisor.
const noAdv = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: false, paidAt: now, firstPaidAt: null });
check("agent without advisor: agent only", noAdv.length === 1 && by(noAdv, "agent") === 50_040, noAdv);

// The 12-month window.
const m11 = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: new Date(now.getTime() - 330 * DAY) });
check("month 11: agent and advisor still paid", by(m11, "agent") > 0 && by(m11, "advisor") > 0, m11);
const m13 = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: new Date(now.getTime() - 400 * DAY) });
check("month 13: nobody is paid from the payment", m13.length === 0, m13);
check("window boundary: day 364 open, day 365 closed",
  agentWindowOpen(new Date(now.getTime() - 364 * DAY), now) && !agentWindowOpen(new Date(now.getTime() - 365 * DAY), now));

const off = splitPayment({ amountKobo: 450_000, hasAgent: true, agentActive: false, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("agent switched off: nobody", off.length === 0, off);

// Yearly plan N43,200.
const year = splitPayment({ amountKobo: 4_320_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("yearly: doctor nothing, agent N4,803", by(year, "care") === 0 && by(year, "agent") === 480_384, year);
check("yearly: never more than the payment", glufloatShare(4_320_000, year) > 0);

// The review fee.
check("review fee is N1,000", REVIEW_FEE_KOBO === 100_000 && nairaFromKobo(REVIEW_FEE_KOBO) === "₦1,000");
check("review month is the WAT month", reviewMonthWAT(new Date("2026-10-31T23:30:00Z")) === "2026-11" && reviewMonthWAT(new Date("2026-10-31T22:30:00Z")) === "2026-10");
check("one review key per doctor, patient and month",
  reviewReference("d1", "u1", new Date("2026-10-02T10:00:00Z")) === reviewReference("d1", "u1", new Date("2026-10-30T10:00:00Z")) &&
  reviewReference("d1", "u1", new Date("2026-10-02T10:00:00Z")) !== reviewReference("d1", "u1", new Date("2026-11-02T10:00:00Z")) &&
  reviewReference("d1", "u1", new Date("2026-10-02T10:00:00Z")) !== reviewReference("d1", "u2", new Date("2026-10-02T10:00:00Z")));
check("review key never looks like a Paystack reference", reviewReference("d1", "u1", now).startsWith("review:"));

// Never more than paid, for many amounts.
let over = 0;
for (let k = 1; k < 5_000_000; k += 7_919) {
  for (const a of [true, false]) {
    const s = splitPayment({ amountKobo: k, hasAgent: a, hasAdvisor: a, paidAt: now, firstPaidAt: null });
    if (glufloatShare(k, s) < 0) over++;
  }
}
check("shares never add up to more than the payment", over === 0, over);
check("zero payment pays nobody", splitPayment({ amountKobo: 0, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: null }).length === 0);

// Helpers.
check("naira text", nairaFromKobo(100_035) === "₦1,000", nairaFromKobo(100_035));
check("mask account", maskAccount("0123456789") === "******6789");
const wk = weekStartWAT(new Date("2026-10-18T22:30:00Z")); // Sunday 23:30 WAT
check("week starts Monday 00:00 WAT", wk.toISOString() === "2026-10-11T23:00:00.000Z", wk.toISOString());
const wk2 = weekStartWAT(new Date("2026-10-18T23:30:00Z")); // Monday 00:30 WAT
check("Monday 00:30 WAT is a new week", wk2.toISOString() === "2026-10-18T23:00:00.000Z", wk2.toISOString());

// A rep's patient link: a third of each payment, first 12 months, no advisor.
const rp = (amountKobo: number, firstPaidAt: Date | null = null, agentActive = true) =>
  splitRepPatientPayment({ amountKobo, agentActive, paidAt: now, firstPaidAt });
check("rep patient: Premium N4,500 pays the rep N1,500", by(rp(450_000), "agent") === 150_000, rp(450_000));
check("rep patient: GluFloat keeps N3,000", glufloatShare(450_000, rp(450_000)) === 300_000);
check("rep patient: no advisor share", by(rp(450_000), "advisor") === 0);
check("rep patient: Basic N1,500 pays N500", by(rp(150_000), "agent") === 50_000);
check("rep patient: Plus N2,500 pays N833.33", by(rp(250_000), "agent") === 83_333);
check("rep patient: Premium yearly N43,200 pays N14,400", by(rp(4_320_000), "agent") === 1_440_000);
check("rep patient: month 12 still pays", by(rp(450_000, new Date(now.getTime() - 364 * DAY)), "agent") === 150_000);
check("rep patient: after 12 months pays nothing", rp(450_000, new Date(now.getTime() - 366 * DAY)).length === 0);
check("rep patient: switched-off rep paid nothing", rp(450_000, null, false).length === 0);
check("rep patient: never more than the payment", rp(1).length === 0 && by(rp(2), "agent") === 0);

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
