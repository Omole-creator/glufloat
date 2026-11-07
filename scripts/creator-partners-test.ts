/**
 * Creator partner rules (lib/creators.ts). Run: npx tsx scripts/creator-partners-test.ts
 * Run after any edit to lib/creators.ts, lib/pricing.ts or a new top-level page.
 */
import { readdirSync } from "fs";
import { join } from "path";
import {
  CREATOR_HIGH_AFTER,
  RESERVED_CODES,
  TIER_CREATOR_AMOUNTS,
  codeFromName,
  creatorLink,
  creatorPrice,
  creatorRate,
  creatorShare,
  creatorWindowOpen,
  isCreatorAmount,
  nextPayDay,
  normalizeCode,
  payableNow,
  talkingPoints,
  validCode,
} from "../lib/creators";
import { TIER_AMOUNTS, TIER_YEARLY_AMOUNTS, isYearlyAmount, periodMsForAmount, tierForAmount } from "../lib/pricing";
import { paystackFee } from "../lib/finance";
import { practicePlanForAmount } from "../lib/hospitalPlans";

let fails = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) {
    fails++;
    console.log(`FAIL  ${name}`, detail ?? "");
  } else console.log(`ok    ${name}`);
}
const DAY = 86_400_000;

// --- prices
check("discount prices are N1,200 / N2,000 / N3,600", TIER_CREATOR_AMOUNTS.basic === 120_000 && TIER_CREATOR_AMOUNTS.plus === 200_000 && TIER_CREATOR_AMOUNTS.dietitian === 360_000);
for (const t of ["basic", "plus", "dietitian"] as const) {
  check(`${t}: discount amount reads as the same tier`, tierForAmount(TIER_CREATOR_AMOUNTS[t]) === t);
  check(`${t}: discount amount buys 30 days, never a year`, periodMsForAmount(TIER_CREATOR_AMOUNTS[t]) === 30 * DAY && !isYearlyAmount(TIER_CREATOR_AMOUNTS[t]));
  check(`${t}: full and yearly prices still read as before`, tierForAmount(TIER_AMOUNTS[t]) === t && tierForAmount(TIER_YEARLY_AMOUNTS[t]) === t);
  check(`${t}: discount amount is not a dietitian-practice amount`, !practicePlanForAmount(TIER_CREATOR_AMOUNTS[t]));
}
check("an unknown amount still falls back to Basic", tierForAmount(123_456) === "basic");
check("isCreatorAmount knows the three", isCreatorAmount(120_000) && isCreatorAmount(360_000) && !isCreatorAmount(150_000));
check("discount on payments 1, 2 and 3", creatorPrice("plus", 0) === 200_000 && creatorPrice("plus", 2) === 200_000);
check("no discount from the 4th payment", creatorPrice("plus", 3) === null && creatorPrice("basic", 9) === null);

// --- share
check("40% below 50 payers", creatorRate(0) === 0.4 && creatorRate(CREATOR_HIGH_AFTER - 1) === 0.4);
check("50% from 50 payers", creatorRate(CREATOR_HIGH_AFTER) === 0.5);
const fee = paystackFee(360_000);
check("Premium with code: share is 40% of N3,600 less Paystack's fee", creatorShare(360_000, fee, 0.4) === Math.floor((360_000 - fee) * 0.4), { fee });
check("full Premium: N4,500 less N167.50 fee, 40% = N1,733", creatorShare(450_000, paystackFee(450_000), 0.4) === 173_300, creatorShare(450_000, paystackFee(450_000), 0.4));
check("share rounds down, never up", creatorShare(100_001, 0, 0.4) === 40_000);
check("share is never negative", creatorShare(100, 500, 0.4) === 0);

// --- 12 months
const first = new Date("2026-01-10T10:00:00Z");
check("first payment opens the window", creatorWindowOpen(null, first));
check("day 364 is inside", creatorWindowOpen(first, new Date(first.getTime() + 364 * DAY)));
check("day 365 is outside", !creatorWindowOpen(first, new Date(first.getTime() + 365 * DAY)));

// --- hold and pay day
const now = new Date("2026-11-07T12:00:00").getTime();
check("13 days old: not yet", !payableNow(new Date(now - 13 * DAY), now));
check("14 days old: payable", payableNow(new Date(now - 14 * DAY), now));
check("pay day on 7 Nov is 10 Nov", nextPayDay(new Date("2026-11-07T12:00:00")).getDate() === 10 && nextPayDay(new Date("2026-11-07T12:00:00")).getMonth() === 10);
check("pay day on 11 Nov is 10 Dec", nextPayDay(new Date("2026-11-11T12:00:00")).getMonth() === 11);

// --- codes
check("faith, Faith and ' FAITH ' are one code", normalizeCode(" faith ") === "FAITH" && normalizeCode("Faith") === "FAITH");
check("Faith Eze gets FAITH", codeFromName("Faith Eze", new Set()) === "FAITH");
check("a second Faith Eze gets FAITHE", codeFromName("Faith Eze", new Set(["FAITH"])) === "FAITHE");
check("a third gets FAITH2", codeFromName("Faith Eze", new Set(["FAITH", "FAITHE"])) === "FAITH2");
check("a title is skipped", codeFromName("Nurse Esther Bello", new Set()) === "ESTHER");
check("a short name is still 3+ letters", validCode(codeFromName("Jo", new Set())));
check("a code can never be one of our page words", !validCode("BLOG") && !validCode("ADMIN") && !validCode("APP"));
check("a code from a page word gets changed", codeFromName("Blog Smith", new Set()) !== "BLOG");
check("the link is glufloat.com/faith", creatorLink("https://www.glufloat.com", "FAITH") === "glufloat.com/faith");
check("talking points carry the code and no cure claim", (() => {
  const t = talkingPoints("FAITH", "glufloat.com/faith");
  return t.includes("FAITH") && t.includes("glufloat.com/faith") && !/cures diabetes\./i.test(t.split("Please don't say:")[0]);
})());

// --- every top-level page and public file is reserved
const root = join(__dirname, "..");
const names = [
  ...readdirSync(join(root, "app"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("[") && !d.name.startsWith("(") && !d.name.startsWith("_"))
    .map((d) => d.name),
  ...readdirSync(join(root, "public")).map((f) => f.replace(/\.[^.]+$/, "")),
]
  .map((n) => normalizeCode(n))
  .filter((n) => /^[A-Z]/.test(n) && n.length >= 3 && n.length <= 20);
const missing = names.filter((n) => !RESERVED_CODES.has(n));
check("every top-level page and public file is a reserved word", missing.length === 0, missing);
check("FORGOTPASSWORD cannot be a code", !validCode("FORGOTPASSWORD"));

console.log(fails ? `\n${fails} FAILED` : "\nAll creator partner checks pass.");
process.exit(fails ? 1 : 0);
