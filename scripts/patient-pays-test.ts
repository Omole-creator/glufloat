/**
 * Patients pay their dietitian through GluFloat (lib/patientPays.ts,
 * supabase/patient-pays-schema.sql). Run after ANY edit to lib/patientPays.ts:
 *   npx tsx scripts/patient-pays-test.ts
 */
import {
  daysLeft,
  dietitianPercent,
  dietitianShareKobo,
  dietitianShareNaira,
  GLUFLOAT_SHARE,
  GLUFLOAT_SHARE_VOLUME,
  glufloatShareFor,
  isPatientPays,
  nextPaidUntil,
  parsePatientPrice,
  PATIENT_FREE_DAYS,
  PATIENT_PRICE_MIN,
  patientPrice,
  VOLUME_PATIENTS,
} from "../lib/patientPays";

let failed = 0;
function check(name: string, ok: boolean, got?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${JSON.stringify(got)})`}`);
}

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 17, 10);

// The founder's numbers.
check("minimum price is N4,500", PATIENT_PRICE_MIN === 4_500);
check("GluFloat keeps N2,000", GLUFLOAT_SHARE === 2_000);
check("14 free days per patient", PATIENT_FREE_DAYS === 14);

// Her price.
check("no price set reads as N4,500", patientPrice({ patient_price: null }) === 4_500);
check("a set price is kept", patientPrice({ patient_price: 6_000 }) === 6_000);
check("a price under the minimum reads as the minimum", patientPrice({ patient_price: 3_000 }) === 4_500);

// The split: she gets exactly price minus N2,000 (Paystack's fee is GluFloat's).
check("N4,500 gives her N2,500", dietitianShareNaira(4_500) === 2_500);
check("N6,000 gives her N4,000", dietitianShareNaira(6_000) === 4_000);
check("kobo split matches naira split", dietitianShareKobo(600_000) === 400_000);
check("an amount at GluFloat's share gives her nothing", dietitianShareKobo(200_000) === 0);
check("an amount under GluFloat's share never goes negative", dietitianShareKobo(100_000) === 0);
check("her share plus GluFloat's is the whole price", [4_500, 5_000, 7_250, 10_000].every((p) => dietitianShareNaira(p) + GLUFLOAT_SHARE === p));
check("percentage at N6,000 is 67%", dietitianPercent(6_000) === 67);
check("percentage at N4,500 is 56%", dietitianPercent(4_500) === 56);

// The volume discount (founder, 2026-10-17): over 25 paying patients in 30
// days, GluFloat keeps N1,750 on every payment.
check("25 paying patients: still N2,000", glufloatShareFor(25) === 2_000);
check("26 paying patients: N1,750", glufloatShareFor(26) === 1_750 && GLUFLOAT_SHARE_VOLUME === 1_750 && VOLUME_PATIENTS === 25);
check("no count given: N2,000", glufloatShareFor() === 2_000);
check("N6,000 at 26 patients gives her N4,250", dietitianShareNaira(6_000, 26) === 4_250);
check("kobo at 26 patients", dietitianShareKobo(600_000, 26) === 425_000);
check("N4,500 at 30 patients gives her N2,750", dietitianShareNaira(4_500, 30) === 2_750);
check("shares still add up at the volume rate", [4_500, 6_000, 9_999].every((p) => dietitianShareNaira(p, 40) + 1_750 === p));
check("percentage at N6,000 with 26 patients is 71%", dietitianPercent(6_000, 26) === 71);

// Typing a price.
check("plain number", JSON.stringify(parsePatientPrice("6000")) === JSON.stringify({ price: 6000 }));
check("with naira sign and comma", JSON.stringify(parsePatientPrice("₦6,000")) === JSON.stringify({ price: 6000 }));
check("under the minimum is refused", "error" in parsePatientPrice("4000"));
check("letters are refused", "error" in parsePatientPrice("six thousand"));
check("decimals are refused", "error" in parsePatientPrice("4500.50"));
check("the minimum itself is allowed", "price" in parsePatientPrice("4500"));

// One payment = 30 days, added after what is left.
const plus30 = (from: number) => from + 30 * DAY;
check("ran out: 30 days from now", nextPaidUntil({ status: "active", paid_until: new Date(now - 5 * DAY).toISOString() }, now).getTime() === plus30(now));
check("never set: 30 days from now", nextPaidUntil({ status: "active", paid_until: null }, now).getTime() === plus30(now));
check("paying early keeps the days left", nextPaidUntil({ status: "active", paid_until: new Date(now + 3 * DAY).toISOString() }, now).getTime() === plus30(now + 3 * DAY));
check(
  "paused: the saved days come first, never lost or made",
  nextPaidUntil({ status: "paused", paid_until: new Date(now - 40 * DAY).toISOString(), paused_left_ms: 2 * DAY }, now).getTime() === plus30(now + 2 * DAY),
);
check("paused with nothing saved: 30 days from now", nextPaidUntil({ status: "paused", paid_until: null, paused_left_ms: null }, now).getTime() === plus30(now));

check("days left counts up", daysLeft(new Date(now + 2.5 * DAY).toISOString(), now) === 3);
check("days left never negative", daysLeft(new Date(now - DAY).toISOString(), now) === 0);

// Which practices.
check("a patient-pays dietitian", isPatientPays({ kind: "dietitian", plan: "patient_pays" }));
check("an old-plan dietitian is not", !isPatientPays({ kind: "dietitian", plan: "diet10" }));
check("a hospital is not", !isPatientPays({ kind: "hospital", plan: "patient_pays" }));

console.log(failed ? `\n${failed} FAILED` : "\nAll passed.");
process.exit(failed ? 1 : 0);
