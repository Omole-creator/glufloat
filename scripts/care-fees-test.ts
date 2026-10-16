/**
 * Care fee rules (lib/careFees.ts). Run: npx tsx scripts/care-fees-test.ts
 */
import {
  ADVISOR_DIRECT_RATE,
  ADVISOR_RATE,
  AGENT_RATE,
  DOCTOR_RATE,
  agentWindowOpen,
  glufloatShare,
  maskAccount,
  nairaFromKobo,
  splitPayment,
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

// N4,500 with an agent and an advisor, first payment.
const full = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("doctor 22.23% of N4,500 = N1,000.35", by(full, "care") === 100_035, full);
check("agent 11.12% = N500.40", by(full, "agent") === 50_040, full);
check("advisor 10% = N450", by(full, "advisor") === 45_000, full);
check("GluFloat keeps 56.65%", glufloatShare(450_000, full) === 254_925, glufloatShare(450_000, full));
check("rates add to 43.35%", Math.abs(DOCTOR_RATE + AGENT_RATE + ADVISOR_RATE - 0.4335) < 1e-9);

// No agent: the doctor keeps the same 22.23%, nobody else.
const direct = splitPayment({ amountKobo: 450_000, hasAgent: false, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("no agent: doctor still 22.23% = N1,000.35", by(direct, "care") === 100_035, direct);
check("no agent: no agent or advisor share", direct.length === 1, direct);

// The advisor brought the doctor himself: advisor 15%, no agent share.
const adv = splitPayment({ amountKobo: 450_000, hasAgent: true, agentIsAdvisor: true, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("advisor's own doctor: advisor 15% = N675", by(adv, "advisor") === 67_500 && ADVISOR_DIRECT_RATE === 0.15, adv);
check("advisor's own doctor: doctor 22.23%, no agent share", by(adv, "care") === 100_035 && by(adv, "agent") === 0 && adv.length === 2, adv);
check("advisor's own doctor: GluFloat keeps 62.77%", glufloatShare(450_000, adv) === 282_465, glufloatShare(450_000, adv));
const advLate = splitPayment({ amountKobo: 450_000, hasAgent: true, agentIsAdvisor: true, hasAdvisor: true, paidAt: now, firstPaidAt: new Date(now.getTime() - 400 * DAY) });
check("advisor's own doctor after 12 months: doctor only", advLate.length === 1, advLate);

// Agent with no advisor.
const noAdv = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: false, paidAt: now, firstPaidAt: null });
check("agent without advisor: 2 shares", noAdv.length === 2 && by(noAdv, "advisor") === 0, noAdv);

// The 12-month window.
const m11 = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: new Date(now.getTime() - 330 * DAY) });
check("month 11: agent and advisor still paid", by(m11, "agent") > 0 && by(m11, "advisor") > 0, m11);
const m13 = splitPayment({ amountKobo: 450_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: new Date(now.getTime() - 400 * DAY) });
check("month 13: only the doctor is paid", m13.length === 1 && by(m13, "care") === 100_035, m13);
check("month 13: doctor keeps 22.23%", m13[0].rate === DOCTOR_RATE);
check("window boundary: day 364 open, day 365 closed",
  agentWindowOpen(new Date(now.getTime() - 364 * DAY), now) && !agentWindowOpen(new Date(now.getTime() - 365 * DAY), now));

const off = splitPayment({ amountKobo: 450_000, hasAgent: true, agentActive: false, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("agent switched off: doctor keeps 22.23%, nobody else", off.length === 1 && off[0].rate === DOCTOR_RATE, off);

// Yearly plan N43,200.
const year = splitPayment({ amountKobo: 4_320_000, hasAgent: true, hasAdvisor: true, paidAt: now, firstPaidAt: null });
check("yearly: doctor N9,603", by(year, "care") === 960_336, year);
check("yearly: never more than the payment", glufloatShare(4_320_000, year) > 0);

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

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
