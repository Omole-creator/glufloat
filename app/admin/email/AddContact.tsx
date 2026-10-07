"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

const WHO = [
  { value: "diabetic", label: "Diabetic" },
  { value: "health_pro", label: "Health professional" },
  { value: "caregiver", label: "Caregiver" },
  { value: "unset", label: "Not sure" },
];

const field =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";

/** Add one person straight onto a Mailyte list. */
export default function AddContact({ disabled }: { disabled: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [group, setGroup] = useState("diabetic");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/mailyte/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, group, agreed }),
      });
      const body = await res.json();
      if (res.ok) {
        setMsg({ ok: true, text: `Added ${email}.` });
        setName("");
        setEmail("");
        setAgreed(false);
      } else {
        setMsg({ ok: false, text: body.error ?? "It did not work. Try again." });
      }
    } catch {
      setMsg({ ok: false, text: "No connection. Try again." });
    }
    setBusy(false);
  };

  return (
    <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} aria-label="Contact name" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-semibold text-ink">Email</span>
        <input
          className={field}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Contact email"
        />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block font-semibold text-ink">Who are they?</span>
        <select className={field} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Who the contact is">
          {WHO.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm text-ink sm:col-span-2">
        <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        This person told us they want to get GluFloat emails.
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={disabled || busy || !agreed}
          className="inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {busy ? "Adding..." : "Add contact"}
        </button>
        {msg && (
          <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>
        )}
      </div>
    </form>
  );
}
