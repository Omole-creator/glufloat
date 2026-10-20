import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalLive, isDoctorPractice, isPractice } from "@/lib/hospitalPlans";
import { practiceRuleFoodIds } from "@/lib/nextMeal";
import { getFood } from "@/lib/search";
import { cleanFoodName } from "@/lib/foodName";
import { whatsappNumber } from "@/lib/hospitalServer";
import { patientHba1cs, patientProfile, patientReadings, patientWeights, weightLineFor } from "@/lib/patientRecord";
import { formatMmol } from "@/lib/glucose";
import { displayLabel } from "@/lib/foodName";
import {
  DEFAULT_BEFORE_TARGET,
  FLAG_DAYS,
  PATTERN_DAYS,
  beforeLine,
  beforeMealFlag,
  mealPatternFlags,
  patternLine,
  safetyEvents,
  safetyLine,
  validTarget,
  type PatternMeal,
} from "@/lib/safetyFlag";
import SugarFlags from "./SugarFlags";
import PatientDetail from "./PatientDetail";
import PracticeRulesEditor from "./PracticeRulesEditor";
import CareNoteEditor from "./CareNoteEditor";
import ReviewButton from "./ReviewButton";
import { doctorCanSeeRecord, payingNow, reviewFeeThisMonth } from "@/lib/careFeesServer";
import StaffChat from "@/components/chat/StaffChat";
import { canAnswer, chatReady } from "@/lib/chatServer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Patient", robots: { index: false, follow: false } };

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ h?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireStaffPage(sp.h, `/hospital/patients/${id}`);
  if (!ctx) return <NotStaff />;
  const back = ctx.all.length > 1 ? `/hospital?h=${ctx.hospital.id}` : "/hospital";

  const { data: row } = await ctx.admin
    .from("hospital_patients")
    .select("id,user_id,status,name,phone,joined_at")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .maybeSingle();

  const closed = !hospitalLive(ctx.hospital);
  if (!row || !row.user_id || row.status !== "active" || closed) {
    return (
      <HospitalShell ctx={ctx} title="Patient">
        <Link href={back} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> All patients
        </Link>
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          {closed
            ? "Your GluFloat plan has ended, so patient records are closed."
            : "This patient is not using one of your places right now."}
        </p>
      </HospitalShell>
    );
  }

  const uid = row.user_id as string;
  // A GluFloat doctor sees a patient's record while the patient pays or is on
  // their free trial; the review button (and its N1,000) only while they pay
  // (founder, 2026-10-20).
  const doctorPractice = isDoctorPractice(ctx.hospital);
  const paying = doctorPractice ? await payingNow(ctx.admin, uid) : false;
  if (doctorPractice && !paying && !(await doctorCanSeeRecord(ctx.admin, uid))) {
    const first = (row.name as string).split(/\s+/)[0];
    return (
      <HospitalShell ctx={ctx} title={row.name as string}>
        <Link href={back} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft className="h-4 w-4" /> All patients
        </Link>
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          {first} has not paid for GluFloat yet. You can see their meals and sugar tests once they pay.
        </p>
      </HospitalShell>
    );
  }
  // GluFloat for dietitians: her note and food rules for this patient. Its own
  // read, so a database without practice-rules-schema.sql (#26) only hides the editor.
  const practice = isPractice(ctx.hospital) && ctx.staff.role === "admin";
  const rulesRead = practice
    ? await ctx.admin.from("hospital_patients").select("dietitian_note,avoid_food_ids,prefer_food_ids").eq("id", row.id).maybeSingle()
    : null;
  const ruleFoods = practice
    ? practiceRuleFoodIds()
        .map((fid) => ({ id: fid, name: cleanFoodName(getFood(fid)?.name ?? fid) }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  // The sugar-flag fields (clinician-flags-schema.sql, #29), in their own read
  // so a database without them still shows every flag (target 150, nothing seen).
  const flagRead = await ctx.admin
    .from("hospital_patients")
    .select("before_target_mgdl,safety_seen_at,safety_seen_by")
    .eq("id", row.id)
    .maybeSingle();
  const flagCols = flagRead.error ? null : (flagRead.data as { before_target_mgdl: number | null; safety_seen_at: string | null; safety_seen_by: string | null } | null);
  const { data: mealRows } = await ctx.admin
    .from("meal_checks")
    .select("id,kind,label,checked_at,started_at,food_ids")
    .eq("user_id", uid)
    .gte("checked_at", new Date(Date.now() - (PATTERN_DAYS + 1) * 86400000).toISOString());
  const patternMeals: PatternMeal[] = ((mealRows ?? []) as Record<string, unknown>[]).map((m) => ({
    id: m.id as number,
    kind: m.kind as PatternMeal["kind"],
    label: m.label as string,
    checkedAt: m.checked_at as string,
    startedAt: (m.started_at as string | null) ?? null,
    foodIds: Array.isArray(m.food_ids) ? (m.food_ids as string[]) : null,
  }));
  // Hospital doctors' and dietitians' notes (chat-schema.sql). A practice has its own note above.
  const notesRead = isPractice(ctx.hospital)
    ? null
    : await ctx.admin
        .from("patient_notes")
        .select("author_id,author_name,author_role,note,updated_at")
        .eq("patient_row_id", row.id)
        .order("updated_at", { ascending: false });
  const chatOn = await chatReady(ctx.admin);
  const [profile, hba1cs, weights, readings, { data: staffRows }] = await Promise.all([
    patientProfile(ctx.admin, uid),
    patientHba1cs(ctx.admin, uid),
    patientWeights(ctx.admin, uid),
    patientReadings(ctx.admin, uid, 90),
    ctx.admin.from("hospital_staff").select("user_id,role,name,phone").eq("hospital_id", ctx.hospital.id).order("created_at"),
  ]);
  // Everyone else on the team with a WhatsApp number: a doctor can pass a
  // patient to the dietitian, and the other way round (founder, 2026-10-12).
  const colleagues = ((staffRows ?? []) as { user_id: string; role: string; name: string; phone: string | null }[])
    .filter((s) => s.user_id !== ctx.user.id && s.role !== "admin" && whatsappNumber(s.phone))
    .map((s) => ({ name: s.name, role: s.role, whatsapp: whatsappNumber(s.phone) as string }));

  const firstName = (profile.name || (row.name as string)).split(/\s+/)[0];
  // A GluFloat doctor's monthly review (N1,000 once a month), only for a
  // paying patient: none during the free trial. reviewed_at is its own read: without doctor-review-schema.sql the
  // button still works, the last date is just not shown.
  const review = doctorPractice && paying
    ? await Promise.all([
        reviewFeeThisMonth(ctx.admin, ctx.hospital.id, uid),
        ctx.admin.from("hospital_patients").select("reviewed_at").eq("id", row.id).maybeSingle(),
      ]).then(([fee, r]) => ({
        fee,
        reviewedAt: r.error ? null : ((r.data?.reviewed_at as string | null) ?? null),
      }))
    : null;
  const targetSet = validTarget(flagCols?.before_target_mgdl);
  const targetMgdl = targetSet ?? DEFAULT_BEFORE_TARGET;
  const before = beforeMealFlag(readings, targetMgdl);
  const amber = [
    ...(before ? [beforeLine(before, firstName)] : []),
    ...mealPatternFlags(patternMeals, readings).map((f) => patternLine(f, displayLabel(f.label))),
  ];

  return (
    <HospitalShell ctx={ctx} title={profile.name || (row.name as string)} subtitle={`Joined ${new Date(row.joined_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}>
      <Link href={back} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> All patients
      </Link>
      {review && (
        <ReviewButton
          patientId={id}
          hid={ctx.all.length > 1 ? ctx.hospital.id : null}
          firstName={firstName}
          month={new Date().toLocaleDateString("en-GB", { month: "long", timeZone: "Africa/Lagos" })}
          feeThisMonth={review.fee}
          reviewedAt={review.reviewedAt}
        />
      )}
      {rulesRead && !rulesRead.error && (
        <PracticeRulesEditor
          patientId={id}
          hid={ctx.all.length > 1 ? ctx.hospital.id : null}
          firstName={(profile.name || (row.name as string)).split(/\s+/)[0]}
          dietitianName={ctx.hospital.name}
          foods={ruleFoods}
          initial={{
            note: (rulesRead.data?.dietitian_note as string | null) ?? "",
            avoid: (rulesRead.data?.avoid_food_ids as string[] | null) ?? [],
            prefer: (rulesRead.data?.prefer_food_ids as string[] | null) ?? [],
          }}
        />
      )}
      {notesRead && !notesRead.error && (
        <CareNoteEditor
          patientId={id}
          hid={ctx.all.length > 1 ? ctx.hospital.id : null}
          firstName={firstName}
          me={ctx.user.id}
          canWrite={isDoctorPractice(ctx.hospital) || ctx.staff.role === "doctor" || ctx.staff.role === "dietitian"}
          notes={((notesRead.data ?? []) as { author_id: string; author_name: string; author_role: "doctor" | "dietitian"; note: string; updated_at: string }[]).map((n) => ({
            authorId: n.author_id,
            name: n.author_name,
            role: n.author_role,
            note: n.note,
            updatedAt: n.updated_at,
          }))}
        />
      )}
      <SugarFlags
        patientId={id}
        hid={ctx.all.length > 1 ? ctx.hospital.id : null}
        firstName={firstName}
        red={safetyEvents(readings, new Date(), flagCols?.safety_seen_at ?? null).map(safetyLine)}
        redDays={FLAG_DAYS}
        seen={flagCols?.safety_seen_at ? { by: flagCols.safety_seen_by, at: flagCols.safety_seen_at } : null}
        amber={amber}
        target={{ mgdl: targetMgdl, mmol: formatMmol(targetMgdl).replace(/\s*mmol\/L$/, ""), set: targetSet !== null, ready: !!flagCols }}
      />
      {chatOn && (
        <div className="mt-6">
          <StaffChat
            firstName={firstName}
            apiUrl="/api/hospital/chat"
            ids={{ id, hid: ctx.all.length > 1 ? ctx.hospital.id : null }}
            canSend={canAnswer(ctx.staff.role, ctx.hospital)}
            note={
              isPractice(ctx.hospital)
                ? `${firstName} chats with you here.`
                : isDoctorPractice(ctx.hospital)
                  ? `${firstName} can chat with you here on GluFloat Premium.`
                : canAnswer(ctx.staff.role, ctx.hospital)
                  ? "Every doctor and dietitian here can read and answer this chat."
                  : "Your doctors and dietitians answer this chat."
            }
          />
        </div>
      )}
      <PatientDetail
        patientId={id}
        hid={ctx.all.length > 1 ? ctx.hospital.id : null}
        name={profile.name || (row.name as string)}
        phone={row.phone as string}
        profile={profile}
        hba1cs={hba1cs}
        weights={weights}
        weightLine={weightLineFor(profile, weights)}
        readings={readings}
        colleagues={colleagues}
      />
    </HospitalShell>
  );
}
