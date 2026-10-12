import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hospital } from "lucide-react";
import { isAdmin } from "@/lib/adminSession";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../../AdminLogin";
import AdminShell from "../../AdminShell";
import AdminHero from "../../AdminHero";
import AdminCard from "../../AdminCard";
import { hospitalLive, planName } from "@/lib/hospitalPlans";
import { ROLE_LABEL, type HospitalRow, type StaffRow } from "@/lib/hospitalServer";
import { readInvoiceSettings } from "@/lib/invoiceSettings";
import type { DocumentForPdf } from "@/lib/hospitalPdf";
import HospitalAdminPanel from "./HospitalAdminPanel";

export const dynamic = "force-dynamic";

function niceDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function HospitalAdminDetail({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("hospitals").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const h = data as HospitalRow;

  const [{ data: staff }, { data: pats }, { data: docs }, settings] = await Promise.all([
    admin.from("hospital_staff").select("*").eq("hospital_id", id).order("created_at"),
    admin.from("hospital_patients").select("status").eq("hospital_id", id),
    admin.from("hospital_documents").select("*").eq("hospital_id", id).order("created_at", { ascending: false }),
    readInvoiceSettings(admin),
  ]);
  const count = (s: string) => (pats ?? []).filter((p) => p.status === s).length;
  const live = hospitalLive(h);

  return (
    <AdminShell
      title={h.name}
      subtitle={`${planName(h.plan)}${h.billing === "annual" ? ", yearly" : ""} · code ${h.code}`}
      icon={<Hospital className="h-5 w-5" />}
    >
      <Link href="/admin/hospitals" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="h-4 w-4" /> All hospitals
      </Link>

      <div className="mt-4">
        <AdminHero
          items={[
            { label: "Places used", value: `${count("active")} of ${h.seats}`, sub: live ? "open now" : "closed" },
            { label: "Waiting", value: String(count("waiting")), sub: "no place yet" },
            { label: "Invited", value: String(count("invited")), sub: "not joined yet" },
            { label: "Open until", value: h.access_until ? new Date(h.access_until).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "-", sub: niceDate(h.access_until) },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <AdminCard title="Contact">
          <dl className="space-y-2 text-sm">
            {[
              ["Name", [h.contact_name, h.contact_role].filter(Boolean).join(", ")],
              ["Phone", h.contact_phone],
              ["Email", h.contact_email],
              ["Where", [h.city, h.state].filter(Boolean).join(", ")],
              ["Patients they said", h.est_patients ? h.est_patients.toLocaleString() : ""],
              ["Asked", niceDate(h.created_at)],
              ["Approved", niceDate(h.approved_at)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="text-right font-semibold text-ink">{v || "-"}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.08em] text-ink/50">Staff</h3>
          {(staff ?? []).length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">Nobody has joined yet. Send the admin link.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {((staff ?? []) as StaffRow[]).map((s) => (
                <li key={s.user_id} className="flex justify-between gap-3">
                  <span className="font-semibold text-ink">{s.name}</span>
                  <span className="text-ink-soft">{ROLE_LABEL[s.role]}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <HospitalAdminPanel
          hospital={h}
          documents={(docs ?? []) as (DocumentForPdf & { id: string })[]}
          bank={settings}
        />
      </div>
    </AdminShell>
  );
}
