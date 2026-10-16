import type { Metadata } from "next";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { hospitalLive, isDoctorPractice, isPractice, planName, practicePlanName, waitingForFirstPatient } from "@/lib/hospitalPlans";
import QrCodeCard from "@/components/hospital/QrCodeCard";
import InviteColleagueCard from "@/components/hospital/InviteColleagueCard";
import { SITE_URL } from "@/lib/site";
import { seatsUsed } from "@/lib/hospitalServer";
import { readInvoiceSettings } from "@/lib/invoiceSettings";
import type { DocumentForPdf } from "@/lib/hospitalPdf";
import PlanPanel from "./PlanPanel";
import PracticePlanPanel, { type PracticePayment } from "./PracticePlanPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Plan and QR code", robots: { index: false, follow: false } };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ h?: string; paid?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/plan");
  if (!ctx) return <NotStaff />;
  if (ctx.staff.role !== "admin")
    return (
      <HospitalShell ctx={ctx} title="Plan and QR code">
        <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">Only your hospital admin can see this page.</p>
      </HospitalShell>
    );
  const h = ctx.hospital;

  // GluFloat for doctors: nothing to pay. Their QR code for patients, and
  // their link for colleagues.
  if (isDoctorPractice(h))
    return (
      <HospitalShell ctx={ctx} title="QR code" subtitle="Patients scan it to join you. Colleagues sign up with your link.">
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <QrCodeCard name={h.name} code={h.code} open={hospitalLive(h)} practice />
          <InviteColleagueCard link={`${SITE_URL}/d/${h.code}`} />
        </div>
      </HospitalShell>
    );

  // GluFloat for dietitians: she pays by Paystack, not by invoice.
  if (isPractice(h)) {
    const [used, paid, { data: pdocs }, pbank] = await Promise.all([
      seatsUsed(ctx.admin, h.id),
      ctx.admin
        .from("practice_payments")
        .select("reference,plan,amount,paid_at")
        .eq("hospital_id", h.id)
        .order("paid_at", { ascending: false })
        .limit(24),
      ctx.admin.from("hospital_documents").select("*").eq("hospital_id", h.id).neq("status", "void").order("created_at", { ascending: false }),
      readInvoiceSettings(ctx.admin),
    ]);
    return (
      <HospitalShell ctx={ctx} title="Plan and QR code" subtitle={h.plan && h.plan !== "pilot" ? practicePlanName(h.plan) : "Free days"}>
        <PracticePlanPanel
          practice={h}
          used={used}
          live={hospitalLive(h)}
          notStarted={waitingForFirstPatient(h)}
          email={ctx.user.email}
          payments={(paid.data ?? []) as PracticePayment[]}
          justPaid={sp.paid === "1"}
          documents={(pdocs ?? []) as (DocumentForPdf & { id: string })[]}
          bank={pbank}
        />
      </HospitalShell>
    );
  }

  const [used, { data: docs }, bank] = await Promise.all([
    seatsUsed(ctx.admin, h.id),
    ctx.admin.from("hospital_documents").select("*").eq("hospital_id", h.id).neq("status", "void").order("created_at", { ascending: false }),
    readInvoiceSettings(ctx.admin),
  ]);
  return (
    <HospitalShell ctx={ctx} title="Plan and QR code" subtitle={`${planName(h.plan)}${h.billing === "annual" ? ", paid yearly" : ""}`}>
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
