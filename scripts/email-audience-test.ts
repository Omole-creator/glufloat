// npx tsx scripts/email-audience-test.ts
// Who lands on which email list (lib/emailAudience.ts), with made-up people.
import { emailAudience } from "../lib/emailAudience";

let fails = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  if (!ok) { fails++; console.log(`FAIL ${name}`, got ?? ""); } else console.log(`ok   ${name}`);
};

const profiles = [
  { id: "u1", email: "ada@gmail.com", name: "Ada", user_type: "diabetic" },          // direct user
  { id: "u2", email: "dtn@gmail.com", name: "Mary", user_type: "health_pro" },       // runs a practice
  { id: "u3", email: "doc@gmail.com", name: "Chidi", user_type: "health_pro" },      // hospital staff
  { id: "u4", email: "pat@gmail.com", name: "Tunde", user_type: "diabetic" },        // a dietitian's patient
  { id: "u5", email: "hp@gmail.com", name: "Halima", user_type: "caregiver" },       // a hospital's patient
  { id: "u6", email: "nurse@gmail.com", name: "Bisi", user_type: "health_pro" },     // health pro, no org
  { id: "u7", email: "old@gmail.com", name: "Emeka", user_type: "diabetic" },        // patient of an ENDED hospital
  { id: "u8", email: "qa@glufloat.com", name: "QA", user_type: "diabetic" },         // test account
  { id: "u9", email: "08130000000@phone.glufloat.com", name: "Phone", user_type: "diabetic" }, // no mailbox
  { id: "u10", email: "both@gmail.com", name: "Both", user_type: "diabetic" },       // dietitian AND a patient
];
const staff = [
  { user_id: "u2", hospitals: { kind: "dietitian", status: "pilot" } },
  { user_id: "u3", hospitals: { kind: "hospital", status: "active" } },
  { user_id: "u10", hospitals: { kind: "dietitian", status: "active" } },
];
const pats = [
  { user_id: "u4", hospitals: { kind: "dietitian", status: "active" } },
  { user_id: "u5", hospitals: { kind: "hospital", status: "pilot" } },
  { user_id: "u7", hospitals: { kind: "hospital", status: "ended" } },
  { user_id: "u10", hospitals: { kind: "hospital", status: "active" } },
];
const table = (t: string) => ({ profiles, hospital_staff: staff, hospital_patients: pats })[t] ?? [];
const fake = {
  from: (t: string) => {
    const result = { data: table(t), error: null };
    const q: Record<string, unknown> = { select: () => q, in: () => q, then: (r: (v: unknown) => unknown) => Promise.resolve(result).then(r) };
    return q;
  },
} as never;

void (async () => {
const rows = await emailAudience(fake);
const key = (email: string) => rows.find((r) => r.email === email)?.key;
check("direct diabetic stays Diabetic", key("ada@gmail.com") === "diabetic");
check("practice owner -> Dietitians", key("dtn@gmail.com") === "dietitians");
check("hospital staff -> Hospital staff", key("doc@gmail.com") === "hospital_staff");
check("dietitian's patient -> Dietitian patients", key("pat@gmail.com") === "dietitian_patients");
check("hospital's patient -> Hospital patients", key("hp@gmail.com") === "hospital_patients");
check("health pro with no org stays Health professional", key("nurse@gmail.com") === "health_pro");
check("patient of an ended hospital is a direct user again", key("old@gmail.com") === "diabetic");
check("test account left out", key("qa@glufloat.com") === undefined);
check("phone-only patient left out", key("08130000000@phone.glufloat.com") === undefined);
check("staff wins over patient", key("both@gmail.com") === "dietitians");
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
})();
