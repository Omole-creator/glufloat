"use client";

import { useState } from "react";
import { Download, FileText, QrCode } from "lucide-react";
import { planName } from "@/lib/hospitalPlans";
import { buildDocumentPdf, buildPosterPdf, joinShort, ngn, type DocumentForPdf } from "@/lib/hospitalPdf";
import type { InvoiceSettings } from "@/lib/invoiceSettings";
import type { HospitalRow } from "@/lib/hospitalServer";

// GluFloat's own WhatsApp, the same number as the "Chat with us" bubble.
const GLUFLOAT_WHATSAPP = "2348132097317";

function niceDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function PlanPanel({
  hospital,
  live,
  used,
  documents,
  bank,
}: {
  hospital: HospitalRow;
  live: boolean;
  used: number;
  documents: (DocumentForPdf & { id: string })[];
  bank: InvoiceSettings;
}) {
  const [busy, setBusy] = useState(false);
  const pct = hospital.seats ? Math.min(100, Math.round((used / hospital.seats) * 100)) : 0;
  const ask = encodeURIComponent(`Hello GluFloat, this is ${hospital.name}. We would like to talk about our plan.`);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b2e59] to-brand p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Your plan</p>
          <p className="mt-1 font-display text-3xl font-bold">{planName(hospital.plan)}</p>
          <p className="mt-1 text-sm text-white/75">
            {live ? `Open until ${niceDate(hospital.access_until)}` : `Ended ${niceDate(hospital.access_until)}`}
          </p>
          <div className="mt-6">
            <div className="flex justify-between text-sm">
              <span className="text-white/75">Places used</span>
              <span className="font-bold">
                {used} of {hospital.seats}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-leaf-bright" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="mt-5 text-sm text-white/80">
            Every patient gets everything in GluFloat Premium. Your doctors and dietitians are free.
          </p>
          <a
            href={`https://wa.me/${GLUFLOAT_WHATSAPP}?text=${ask}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-deep hover:bg-white/90"
          >
            {hospital.status === "pilot" ? "Choose a paid plan" : "Change or renew my plan"}
          </a>
        </section>

        <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink">Quotes and invoices</h2>
          {documents.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">GluFloat&apos;s quotes and invoices for you will be here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#eef2f7]">
              {documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                  <FileText className="h-4 w-4 text-ink-soft" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {d.kind === "quote" ? "Quote" : "Invoice"} {d.number}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {planName(d.plan)}, {d.billing === "annual" ? "12 months" : "1 month"} · {ngn(d.amount)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      d.status === "paid" ? "bg-leaf/10 text-leaf-deep" : d.kind === "invoice" ? "bg-verdict-yellow/20 text-ink" : "bg-brand/10 text-brand"
                    }`}
                  >
                    {d.status === "paid" ? "Paid" : d.kind === "invoice" ? "To pay" : "Quote"}
                  </span>
                  <button
                    onClick={async () => (await buildDocumentPdf(d, hospital, bank)).save(`${d.number}.pdf`)}
                    aria-label={`Download ${d.number}`}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="h-fit rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf-deep">
            <QrCode className="h-5 w-5" />
          </span>
          <h2 className="font-display text-lg font-bold text-ink">Your QR code</h2>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Print it and put it where your patients wait. They scan it with their phone camera to join. Everyone who joins
          shows up on your patient list.
        </p>
        <div className="mt-4 rounded-2xl bg-mist/70 px-4 py-5 text-center">
          <p className="text-xs font-semibold text-ink-soft">Your join address</p>
          <p className="mt-1 font-display text-xl font-bold text-brand">{joinShort(hospital.code)}</p>
          <p className="mt-1 text-xs text-ink-soft">Your hospital code: {hospital.code}</p>
        </div>
        <button
          disabled={busy || !live}
          onClick={async () => {
            setBusy(true);
            try {
              (await buildPosterPdf(hospital)).save(`glufloat-qr-code-${hospital.code}.pdf`);
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {busy ? "Getting it ready..." : "Download QR code"}
        </button>
      </section>
    </div>
  );
}
