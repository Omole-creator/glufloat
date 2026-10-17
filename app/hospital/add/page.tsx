import type { Metadata } from "next";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { acceptsPatients, isDoctorPractice } from "@/lib/hospitalPlans";
import { seatsUsed } from "@/lib/hospitalServer";
import { isPatientPays } from "@/lib/patientPays";
import AddPatients from "./AddPatients";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add patients", robots: { index: false, follow: false } };

export default async function AddPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/add");
  if (!ctx) return <NotStaff />;
  if (ctx.staff.role !== "admin")
    return (
      <HospitalShell ctx={ctx} title="Add patients">
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
          Only your hospital admin can add patients.
        </p>
      </HospitalShell>
    );
  const used = await seatsUsed(ctx.admin, ctx.hospital.id);
  return (
    <HospitalShell
      ctx={ctx}
      title="Add patients"
      subtitle={
        isDoctorPractice(ctx.hospital)
          ? `${used} ${used === 1 ? "patient has" : "patients have"} joined. Each patient you add gets an invite to join you on GluFloat.`
          : isPatientPays(ctx.hospital)
            ? `${used} ${used === 1 ? "patient has" : "patients have"} joined. Each new patient gets 14 free days, then pays you inside GluFloat.`
            : `${used} of ${ctx.hospital.seats} places used. Added patients get a place when they join.`
      }
    >
      <AddPatients
        hid={ctx.all.length > 1 ? ctx.hospital.id : null}
        open={acceptsPatients(ctx.hospital)}
        backHref={ctx.all.length > 1 ? `/hospital?h=${ctx.hospital.id}` : "/hospital"}
        patientPays={isPatientPays(ctx.hospital)}
      />
    </HospitalShell>
  );
}
