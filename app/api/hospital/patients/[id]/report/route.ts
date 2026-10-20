import { NextResponse } from "next/server";
import { staffContext } from "@/lib/hospitalServer";
import { hospitalLive, isDoctorPractice } from "@/lib/hospitalPlans";
import { doctorCanSeeRecord } from "@/lib/careFeesServer";
import { patientHba1cs, patientMonth, patientProfile, patientReadings, patientWeights, watMonth, weightLineFor } from "@/lib/patientRecord";

export const dynamic = "force-dynamic";

/**
 * One month of one patient's report, for their hospital's staff. Read by the
 * same MonthReport the patient sees (its `viewer` mode), so the doctor and the
 * patient can never be shown two different stories.
 *
 * Only staff of the patient's own hospital, and only while the patient holds a
 * place there (active). A removed or waiting patient is not shown.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const ctx = await staffContext(url.searchParams.get("hid"));
  if (!ctx) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  // A hospital whose plan has ended keeps its list, not its patients' records.
  if (!hospitalLive(ctx.hospital))
    return NextResponse.json({ error: "Your GluFloat plan has ended." }, { status: 402 });

  const { data: p } = await ctx.admin
    .from("hospital_patients")
    .select("id,user_id,status,name")
    .eq("id", id)
    .eq("hospital_id", ctx.hospital.id)
    .maybeSingle();
  if (!p || !p.user_id || p.status !== "active")
    return NextResponse.json({ error: "This patient is not on your list." }, { status: 404 });

  const uid = p.user_id as string;
  // A GluFloat doctor sees a patient's record only while they pay or are on
  // their free trial (founder, 2026-10-20).
  if (isDoctorPractice(ctx.hospital) && !(await doctorCanSeeRecord(ctx.admin, uid)))
    return NextResponse.json({ error: "This patient has not paid for GluFloat yet." }, { status: 402 });
  const month = watMonth(url.searchParams.get("month"));
  // The report's graphs (founder, 2026-10-17): the sugar line covers the 3
  // months up to the end of the month on screen; the weight line, every
  // weight saved up to then.
  const [{ items, loose }, hba1cs, profile, weights, trend] = await Promise.all([
    patientMonth(ctx.admin, uid, month.from, month.to),
    patientHba1cs(ctx.admin, uid),
    patientProfile(ctx.admin, uid),
    patientWeights(ctx.admin, uid),
    patientReadings(ctx.admin, uid, 90, month.to),
  ]);

  return NextResponse.json(
    {
      name: profile.name || (p.name as string),
      period: month.label,
      items,
      loose,
      hba1c: hba1cs[0] ?? null,
      weightLine: weightLineFor(profile, weights),
      trend,
      weights: weights.filter((w) => new Date(w.at).getTime() < month.to.getTime()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
