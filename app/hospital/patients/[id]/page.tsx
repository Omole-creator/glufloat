import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalLive, isPractice } from "@/lib/hospitalPlans";
import { practiceRuleFoodIds } from "@/lib/nextMeal";
import { getFood } from "@/lib/search";
import { cleanFoodName } from "@/lib/foodName";
import { whatsappNumber } from "@/lib/hospitalServer";
import { patientHba1cs, patientProfile, patientReadings, patientWeights, weightLineFor } from "@/lib/patientRecord";
import { FLAG_DAYS, safetyEvents, safetyLine } from "@/lib/safetyFlag";
import PatientDetail from "./PatientDetail";
import PracticeRulesEditor from "./PracticeRulesEditor";

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

  return (
    <HospitalShell ctx={ctx} title={profile.name || (row.name as string)} subtitle={`Joined ${new Date(row.joined_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}>
      <Link href={back} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> All patients
      </Link>
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
      <PatientDetail
        patientId={id}
        hid={ctx.all.length > 1 ? ctx.hospital.id : null}
        name={profile.name || (row.name as string)}
        phone={row.phone as string}
        whatsapp={whatsappNumber(row.phone as string)}
        profile={profile}
        hba1cs={hba1cs}
        weights={weights}
        weightLine={weightLineFor(profile, weights)}
        readings={readings}
        safety={{ days: FLAG_DAYS, lines: safetyEvents(readings).map(safetyLine) }}
        colleagues={colleagues}
      />
    </HospitalShell>
  );
}
