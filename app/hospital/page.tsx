import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalRoster } from "@/lib/hospitalRoster";
import { isDoctorPractice, isPractice } from "@/lib/hospitalPlans";
import PatientTable from "./PatientTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Patients", robots: { index: false, follow: false } };

const DAY_MS = 86400000;

export default async function HospitalHome({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital");
  if (!ctx) return <NotStaff />;

  const rows = await hospitalRoster(ctx.admin, ctx.hospital.id);
  const active = rows.filter((r) => r.status === "active");
  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const usedThisWeek = active.filter((r) => r.lastActive && r.lastActive >= weekAgo).length;
  const meals = active.reduce((n, r) => n + r.meals30, 0);
  const tests = active.reduce((n, r) => n + r.tests30, 0);
  const waiting = rows.filter((r) => r.status === "waiting").length;
  const isAdmin = ctx.staff.role === "admin";

  const doctor = isDoctorPractice(ctx.hospital);
  const premium = active.filter((r) => r.plan === "premium").length;
  const tiles = [
    doctor
      ? { label: "Your patients", value: String(active.length), sub: premium ? `${premium} on GluFloat Premium` : "joined with your QR code or link" }
      : { label: "Places used", value: `${active.length} of ${ctx.hospital.seats}`, sub: waiting ? `${waiting} waiting for a place` : "patients using GluFloat" },
    { label: "Used it this week", value: String(usedThisWeek), sub: `of ${active.length} ${active.length === 1 ? "patient" : "patients"}` },
    { label: "Meals saved", value: meals.toLocaleString(), sub: "last 30 days" },
    { label: "Sugar tests saved", value: tests.toLocaleString(), sub: "last 30 days" },
  ];

  return (
    <HospitalShell
      ctx={ctx}
      title="Patients"
      subtitle={`${ctx.hospital.name} · ${isPractice(ctx.hospital) || doctor ? "Your practice" : ROLE_GREETING[ctx.staff.role]}`}
      actions={
        isAdmin ? (
          <Link
            href={ctx.all.length > 1 ? `/hospital/add?h=${ctx.hospital.id}` : "/hospital/add"}
            className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(62,155,79,0.8)] hover:bg-leaf-deep"
          >
            <UserPlus className="h-4 w-4" /> Add patients
          </Link>
        ) : undefined
      }
    >
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 rounded-2xl border border-[#e3e9f1] bg-white p-4 sm:p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50">{t.label}</p>
            <p className="mt-2 font-display text-2xl font-bold leading-none text-ink sm:text-3xl">{t.value}</p>
            <p className="mt-2 text-xs text-ink-soft">{t.sub}</p>
          </div>
        ))}
      </div>

      <PatientTable rows={rows} isAdmin={isAdmin} hid={ctx.all.length > 1 ? ctx.hospital.id : null} hospitalName={ctx.hospital.name} hospitalCode={ctx.hospital.code} doctor={doctor} />
    </HospitalShell>
  );
}

const ROLE_GREETING = {
  admin: "You are the hospital admin",
  doctor: "You are signed in as a doctor",
  dietitian: "You are signed in as a dietitian",
} as const;
