"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, QrCode } from "lucide-react";
import {
  CUSTOM_DEFAULT_PER_PATIENT,
  HOSPITAL_PLANS,
  isPractice,
  PRACTICE_CUSTOM_PER_PATIENT,
  documentAmountKobo,
  planName,
  type HospitalBilling,
  type HospitalPlanId,
} from "@/lib/hospitalPlans";
import { buildDocumentPdf, buildPosterPdf, ngn, type DocumentForPdf } from "@/lib/hospitalPdf";
import { VAT_RATE, type InvoiceSettings } from "@/lib/invoiceSettings";
import type { HospitalRow } from "@/lib/hospitalServer";
import InviteLinkBox from "@/components/hospital/InviteLinkBox";

type Doc = DocumentForPdf & { id: string };

const STATUS_TONE = {
  open: "bg-verdict-yellow/20 text-ink",
  paid: "bg-leaf/10 text-leaf-deep",
  void: "bg-ink/5 text-ink-soft line-through",
} as const;

export default function HospitalAdminPanel({
  hospital,
  documents,
  bank,
}: {
  hospital: HospitalRow;
  documents: Doc[];
  bank: InvoiceSettings;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"quote" | "invoice">("quote");
  // A dietitian's practice only ever gets a custom invoice, at N1,600 a patient.
  const practice = isPractice(hospital);
  const [plan, setPlan] = useState<HospitalPlanId | "custom">(practice ? "custom" : "care50");
  const [billing, setBilling] = useState<HospitalBilling>("monthly");
  const [seats, setSeats] = useState(practice ? "30" : "300");
  const [perPatient, setPerPatient] = useState(String(practice ? PRACTICE_CUSTOM_PER_PATIENT : CUSTOM_DEFAULT_PER_PATIENT));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      documentAmountKobo({
        plan,
        billing,
        seats: Number(seats),
        perPatient: Number(perPatient),
        vatRate: bank.vatOn ? VAT_RATE : 0,
      }),
    [plan, billing, seats, perPatient, bank.vatOn],
  );

  const call = async (url: string, method: string, body: unknown) => {
    setBusy(true);
    setErr("");
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "Something went wrong.");
      return null;
    }
    return j;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const j = await call("/api/admin/hospitals/documents", "POST", {
      hospitalId: hospital.id,
      kind,
      plan,
      billing,
      seats: Number(seats),
      perPatient: Number(perPatient),
      notes,
    });
    if (j) {
      setNotes("");
      router.refresh();
    }
  };

  const download = async (d: Doc) => {
    const pdf = await buildDocumentPdf(d, hospital, bank);
    pdf.save(`${d.number}-${hospital.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
  };

  const docAction = async (d: Doc, action: "paid" | "void" | "invoice") => {
    let paidOn: string | undefined;
    if (action === "paid") {
      const today = new Date().toISOString().slice(0, 10);
      const answer = prompt(
        `The transfer for ${d.number} (${ngn(d.amount)}) has arrived?\nType the date it arrived (YYYY-MM-DD):`,
        today,
      );
      if (!answer) return;
      paidOn = answer.trim();
    }
    if (action === "void" && !confirm(`Cancel ${d.number}?`)) return;
    const j = await call("/api/admin/hospitals/documents", "PATCH", { id: d.id, action, paidOn });
    if (j) router.refresh();
  };

  const hospitalAction = async (action: "invite" | "end") => {
    if (action === "end" && !confirm(`Switch ${hospital.name} off now? Its patients go back to their own trial or plan.`)) return;
    const j = await call("/api/admin/hospitals", "PATCH", { id: hospital.id, action });
    if (j?.token) setToken(j.token);
    else if (j) router.refresh();
  };

  const field = "mt-1 w-full rounded-xl border border-[#e3e9f1] bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">Make a quote or invoice</h2>
        {!bank.accountNumber && (
          <p className="mt-1 text-sm text-verdict-red">Add your bank details under Invoice settings first, or the PDF will have no way to pay.</p>
        )}
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-ink-soft">
            Make a
            <select className={field} value={kind} onChange={(e) => setKind(e.target.value as "quote" | "invoice")}>
              <option value="quote">Quote</option>
              <option value="invoice">Invoice</option>
            </select>
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Plan
            <select className={field} value={plan} onChange={(e) => setPlan(e.target.value as HospitalPlanId | "custom")}>
              {!practice &&
                HOSPITAL_PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.seats} patients)
                  </option>
                ))}
              <option value="custom">{practice ? "Custom plan (dietitian)" : "Care Custom"}</option>
            </select>
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Paid
            <select className={field} value={billing} onChange={(e) => setBilling(e.target.value as HospitalBilling)}>
              <option value="monthly">Monthly (1 month)</option>
              <option value="annual">Yearly (12 months for the price of 10)</option>
            </select>
          </label>
          {plan === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-ink-soft">
                Patients
                <input className={field} inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} />
              </label>
              <label className="text-xs font-bold text-ink-soft">
                Naira each a month
                <input className={field} inputMode="numeric" value={perPatient} onChange={(e) => setPerPatient(e.target.value)} />
              </label>
            </div>
          ) : (
            <div />
          )}
          <label className="text-xs font-bold text-ink-soft sm:col-span-2">
            Note on the PDF (optional)
            <input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <p className="text-sm text-ink">
              {preview.seats} patients, {preview.months} {preview.months === 1 ? "month" : "months"}:{" "}
              <span className="font-bold">{ngn(preview.total)}</span>
              {preview.vat > 0 && <span className="text-ink-soft"> (VAT {ngn(preview.vat)})</span>}
            </p>
            <button disabled={busy} className="rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
              Make {kind}
            </button>
          </div>
        </form>
        {err && <p className="mt-2 text-sm text-verdict-red">{err}</p>}

        {documents.length > 0 && (
          <ul className="mt-5 divide-y divide-[#eef2f7] border-t border-[#eef2f7]">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <FileText className="h-4 w-4 text-ink-soft" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {d.number} · {planName(d.plan)}, {d.billing === "annual" ? "yearly" : "monthly"}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {ngn(d.amount)} · {d.seats} patients · {new Date(d.issued_on).toLocaleDateString("en-GB")}
                    {d.paid_on ? ` · paid ${new Date(d.paid_on).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_TONE[d.status]}`}>
                  {d.status === "open" ? (d.kind === "quote" ? "Quote" : "Not paid") : d.status === "paid" ? "Paid" : "Cancelled"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => download(d)} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                  {d.kind === "quote" && d.status === "open" && (
                    <button disabled={busy} onClick={() => docAction(d, "invoice")} className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-brand hover:border-brand">
                      Make invoice
                    </button>
                  )}
                  {d.kind === "invoice" && d.status === "open" && (
                    <button disabled={busy} onClick={() => docAction(d, "paid")} className="rounded-full bg-leaf px-3 py-1.5 text-xs font-bold text-white hover:bg-leaf-deep">
                      Mark as paid
                    </button>
                  )}
                  {d.status === "open" && (
                    <button disabled={busy} onClick={() => docAction(d, "void")} className="rounded-full px-2 py-1.5 text-xs font-bold text-ink-soft hover:text-verdict-red">
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">Tools</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={async () => (await buildPosterPdf(hospital)).save(`glufloat-qr-code-${hospital.code}.pdf`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink hover:border-brand"
          >
            <QrCode className="h-4 w-4" /> Download QR code
          </button>
          <button
            disabled={busy}
            onClick={() => hospitalAction("invite")}
            className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink hover:border-brand disabled:opacity-50"
          >
            New admin link
          </button>
          {(hospital.status === "pilot" || hospital.status === "active") && (
            <button
              disabled={busy}
              onClick={() => hospitalAction("end")}
              className="rounded-full px-4 py-2 text-sm font-bold text-verdict-red hover:bg-verdict-red/10 disabled:opacity-50"
            >
              Switch off now
            </button>
          )}
        </div>
        {token && (
          <div className="mt-4">
            <InviteLinkBox token={token} hospitalName={hospital.name} name={hospital.contact_name} phone={hospital.contact_phone} role="admin" />
          </div>
        )}
      </section>
    </div>
  );
}
