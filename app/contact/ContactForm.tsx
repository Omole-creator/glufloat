"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

/** The contact form. It emails glufloat@gmail.com (/api/contact). */
export default function ContactForm() {
  const [name, setName] = useState("");
  const [reach, setReach] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, reach, message, website }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Your message did not send. Please try again.");
    setSent(true);
  };

  if (sent)
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-leaf/10 p-5">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-leaf-deep" />
        <div>
          <p className="font-display text-lg font-bold text-ink">Thank you, we got your message</p>
          <p className="mt-1 text-sm text-ink">We will reply to you soon.</p>
        </div>
      </div>
    );

  const box = "mt-1.5 w-full rounded-xl border border-line bg-white px-4 text-base text-ink outline-none transition-colors focus:border-brand";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="relative space-y-4"
    >
      <label className="block text-sm font-semibold text-ink">
        Your name
        <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className={`${box} h-12`} />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Your email or phone number
        <input value={reach} onChange={(e) => setReach(e.target.value)} required autoComplete="email" className={`${box} h-12`} />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Your message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className={`${box} py-3`} />
      </label>
      {/* A box people never see. A bot fills every box it finds. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {err && <p className="text-sm font-semibold text-verdict-red">{err}</p>}
      <button
        disabled={busy}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-leaf px-6 py-3.5 text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(62,155,79,0.9)] hover:bg-leaf-deep disabled:opacity-60"
      >
        <Send className="h-4 w-4" /> {busy ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
