"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardPaste, UserPlus } from "lucide-react";

type Patient = { name: string; phone: string; email: string };

/**
 * "Name, phone, email" per line, the shape a list copied out of Excel or a
 * WhatsApp message usually has. Tabs count as commas, so a straight paste from
 * a spreadsheet works too. The email is optional.
 */
function parseList(text: string): Patient[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/\t|,|;/).map((x) => x.trim());
      const email = parts.find((x) => x.includes("@")) ?? "";
      const phone = parts.find((x) => /\d{7,}/.test(x.replace(/[\s+()-]/g, ""))) ?? "";
      const name = parts.find((x) => x && x !== email && x !== phone) ?? "";
      return { name, phone, email };
    });
}

export default function AddPatients({ hid, open, backHref }: { hid: string | null; open: boolean; backHref: string }) {
  const [mode, setMode] = useState<"one" | "many">("one");
  const [one, setOne] = useState<Patient>({ name: "", phone: "", email: "" });
  const [text, setText] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<{ added: number; skipped: { name: string; reason: string }[] } | null>(null);

  const list = mode === "one" ? [one] : parseList(text);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return setErr("Please tick the box to say these patients agreed to join.");
    setBusy(true);
    setErr("");
    const res = await fetch("/api/hospital/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hid, patients: list, confirmed: true }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong.");
    setResult({ added: j.added ?? 0, skipped: j.skipped ?? [] });
    setOne({ name: "", phone: "", email: "" });
    setText("");
    setAgreed(false);
  };

  const field =
    "mt-1.5 w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand";

  if (!open)
    return (
      <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink-soft">
        Your plan has ended, so new patients cannot be added. Please contact GluFloat.
      </p>
    );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={submit} className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
        <div className="inline-flex rounded-full bg-[#f2f5f9] p-1" role="tablist" aria-label="How to add">
          {[
            { id: "one" as const, label: "One patient", icon: UserPlus },
            { id: "many" as const, label: "Paste a list", icon: ClipboardPaste },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => setMode(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                mode === t.id ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {mode === "one" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink sm:col-span-2">
              Patient&apos;s full name
              <input className={field} value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} required />
            </label>
            <label className="text-sm font-semibold text-ink">
              Phone number
              <input
                className={field}
                type="tel"
                inputMode="tel"
                value={one.phone}
                onChange={(e) => setOne({ ...one, phone: e.target.value })}
                required
              />
            </label>
            <label className="text-sm font-semibold text-ink">
              Email <span className="font-normal text-ink-soft">(if they have one)</span>
              <input className={field} type="email" value={one.email} onChange={(e) => setOne({ ...one, email: e.target.value })} />
            </label>
          </div>
        ) : (
          <div className="mt-5">
            <label className="text-sm font-semibold text-ink">
              One patient on each line: name, phone, email
              <textarea
                className={`${field} min-h-48 font-mono text-sm`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Adaeze Okafor, 0803 123 4567\nMusa Bello, 0812 765 4321, musa@gmail.com"}
              />
            </label>
            <p className="mt-2 text-sm text-ink-soft">
              {list.length} {list.length === 1 ? "patient" : "patients"} found. You can paste straight from Excel.
            </p>
          </div>
        )}

        <label className="mt-5 flex items-start gap-3 rounded-xl bg-mist/70 p-3.5 text-sm text-ink">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {mode === "one" ? "This patient agreed" : "These patients agreed"} to join GluFloat, and know that our doctors and
            dietitians will see their meals and sugar tests.
          </span>
        </label>

        {err && <p className="mt-3 text-sm font-medium text-verdict-red">{err}</p>}
        <button
          disabled={busy || list.length === 0}
          className="mt-5 w-full rounded-full bg-leaf px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(62,155,79,0.8)] hover:bg-leaf-deep disabled:opacity-50 sm:w-auto"
        >
          {busy ? "Adding..." : mode === "one" ? "Add patient" : `Add ${list.length} ${list.length === 1 ? "patient" : "patients"}`}
        </button>

        {result && (
          <div className="mt-5 rounded-xl bg-leaf/10 p-4 text-sm text-ink">
            <p className="flex items-center gap-2 font-bold text-leaf-deep">
              <CheckCircle2 className="h-4 w-4" /> {result.added} added
            </p>
            {result.skipped.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-ink">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    Not added: <span className="font-semibold">{s.name}</span> ({s.reason})
                  </li>
                ))}
              </ul>
            )}
            <Link href={backHref} className="mt-3 inline-block font-bold text-brand hover:underline">
              Send them their invites from the patient list
            </Link>
          </div>
        )}
      </form>

      <aside className="h-fit rounded-2xl bg-[#0b2e59] p-5 text-white sm:p-6">
        <h2 className="font-display text-lg font-bold">What happens next</h2>
        <ol className="mt-4 space-y-4 text-sm text-white/85">
          {[
            "Each patient appears on your list as Invited.",
            "Tap Send invite. Their own link opens in WhatsApp, ready to send.",
            "They open it, check their phone number and choose a password. No email needed.",
            "They get everything in GluFloat Premium, and your doctors and dietitians see their record.",
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-leaf text-xs font-bold text-white">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl bg-white/10 px-3.5 py-3 text-sm text-white/85">
          Patients can also join on their own with your QR code. Print it from Plan and QR code.
        </p>
      </aside>
    </div>
  );
}
