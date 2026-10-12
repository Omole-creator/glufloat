import type { Metadata } from "next";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalLive, planName } from "@/lib/hospitalPlans";
import { seatsUsed } from "@/lib/hospitalServer";
import { readInvoiceSettings } from "@/lib/invoiceSettings";
import type { DocumentForPdf } from "@/lib/hospitalPdf";
import PlanPanel from "./PlanPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan and poster", robots: { index: false, follow: false } };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/plan");
  if (!ctx) return <NotStaff />;
  if (ctx.staff.role !== "admin")
    return (
      <HospitalShell ctx={ctx} title="Plan and poster">
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">Only your hospital admin can see this page.</p>
      </HospitalShell>
    );
  const h = ctx.hospital;
  const [used, { data: docs }, bank] = await Promise.all([
    seatsUsed(ctx.admin, h.id),
    ctx.admin.from("hospital_documents").select("*").eq("hospital_id", h.id).neq("status", "void").order("created_at", { ascending: false }),
    readInvoiceSettings(ctx.admin),
  ]);
  return (
    <HospitalShell ctx={ctx} title="Plan and poster" subtitle={`${planName(h.plan)}${h.billing === "annual" ? ", paid yearly" : ""}`}>
      <PlanPanel
        hospital={h}
        live={hospitalLive(h)}
        used={used}
        documents={(docs ?? []) as (DocumentForPdf & { id: string })[]}
        bank={bank}
      />
    </HospitalShell>
  );
}
