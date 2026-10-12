"use client";

import { useState } from "react";
import { CheckCircle2, Hospital, Mail, MapPin, Phone, UserRound, Users } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/auth/Field";

/** The free-pilot request. It lands in /admin/hospitals for GluFloat to approve. */
export default function PilotForm() {
  const [f, setF] = useState({
    hospital: "",
    contactName: "",
    contactRole: "",
    phone: "",
    email: "",
    city: "",
    state: "",
    patients: "",
    message: "",
    website: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/hospitals/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong. Please try again.");
    setSent(true);
  };

  if (sent)
    return (
      <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_24px_60px_-36px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.04]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" />
        <p className="mt-4 font-display text-2xl font-bold text-ink">Thank you</p>
        <p className="mx-auto mt-2 max-w-sm text-ink-soft">
          We have your request. We will call {f.contactName.split(/\s+/)[0] || "you"} on {f.phone} to set up your free pilot.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="rounded-[28px] bg-white p-6 shadow-[0_24px_60px_-36px_rgba(12,42,71,0.35)] ring-1 ring-ink/[0.04] sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2" label="Hospital or clinic name" icon={Hospital} value={f.hospital} onChange={set("hospital")} required autoComplete="organization" />
        <Field label="Your name" icon={UserRound} value={f.contactName} onChange={set("contactName")} required autoComplete="name" />
        <Field label="Your role" value={f.contactRole} onChange={set("contactRole")} placeholder="e.g. Medical Director" />
        <Field label="Phone number" ariaLabel="Your phone number" icon={Phone} type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} required autoComplete="tel" />
        <Field label="Email" ariaLabel="Your work email" icon={Mail} type="email" value={f.email} onChange={set("email")} required autoComplete="email" />
        <Field label="City" icon={MapPin} value={f.city} onChange={set("city")} />
        <Field label="State" value={f.state} onChange={set("state")} />
        <Field
          className="sm:col-span-2"
          label="About how many patients with diabetes do you see?"
          icon={Users}
          inputMode="numeric"
          value={f.patients}
          onChange={set("patients")}
        />
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-ink">Anything else? (optional)</span>
          <textarea
            value={f.message}
            onChange={set("message")}
            rows={3}
            className="mt-1.5 w-full rounded-2xl border-2 border-line bg-[#fbfcfe] px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand focus:bg-white"
          />
        </label>
        {/* People never see this. A bot fills it in. */}
        <input tabIndex={-1} autoComplete="off" aria-hidden value={f.website} onChange={set("website")} className="hidden" name="website" />
      </div>
      <div className="mt-5 space-y-4">
        <FormError>{err}</FormError>
        <SubmitButton busy={busy} busyText="Sending..." tone="leaf">
          Ask for my free pilot
        </SubmitButton>
      </div>
    </form>
  );
}
