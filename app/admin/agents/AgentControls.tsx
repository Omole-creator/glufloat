"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Send, Trash2, X } from "lucide-react";

type Advisor = { id: string; name: string };

/** Add a field agent or an advisor. They never sign up: this is how they start. */
export function AddAgentForm({ advisors }: { advisors: Advisor[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"agent" | "advisor">("agent");
  const [managerId, setManagerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const add = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, role, managerId: role === "agent" ? managerId : null }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not work.");
    setName("");
    setPhone("");
    setEmail("");
    router.refresh();
  };

  const box = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="text-xs font-semibold text-ink-soft">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required className={`mt-1 ${box}`} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        WhatsApp number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={`mt-1 ${box}`} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        Email (optional)
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={`mt-1 ${box}`} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        They are
        <select value={role} onChange={(e) => setRole(e.target.value as "agent" | "advisor")} className={`mt-1 ${box}`}>
          <option value="agent">A doctor acquisition rep</option>
          <option value="advisor">An advisor (has doctor acquisition reps)</option>
        </select>
      </label>
      {role === "agent" && (
        <label className="text-xs font-semibold text-ink-soft">
          Their advisor
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={`mt-1 ${box}`}>
            <option value="">No advisor</option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-end">
        <button disabled={busy || !name.trim()} className="h-11 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
          {busy ? "Adding..." : "Add"}
        </button>
      </div>
      {err && <p className="text-sm font-semibold text-verdict-red sm:col-span-2 lg:col-span-3">{err}</p>}
    </form>
  );
}

/** The two links, copy and send, on/off, a fresh dashboard link, edit and delete. */
export function AgentLinks({
  id,
  name,
  phone,
  email = null,
  role = "agent",
  managerId = null,
  advisors = [],
  doctorLink,
  patientLink,
  dashLink,
  off,
}: {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  role?: "agent" | "advisor";
  managerId?: string | null;
  /** Advisors an agent can be moved under (never themselves). */
  advisors?: Advisor[];
  doctorLink: string;
  /** Their link for patients (/p/<code>), optional so older callers still build. */
  patientLink?: string;
  dashLink: string;
  off: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ name, phone: phone ?? "", email: email ?? "", managerId: managerId ?? "" });
  const [err, setErr] = useState("");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const first = name.split(/\s+/)[0];
  const wa = phone ? (phone.startsWith("0") && phone.length === 11 ? "234" + phone.slice(1) : phone) : "";
  // ONE link to send: their dashboard, which carries their link for doctors
  // with its own copy and WhatsApp buttons.
  const message = `Hello ${first}, welcome to GluFloat.\n\nThis is your own GluFloat dashboard. Keep it private:\n${dashLink}\n\nOpen it to get your link for doctors (copy it, or send it to a doctor on WhatsApp in one tap), and to see your doctors and your money.`;

  const act = async (action: string, ask?: string) => {
    if (ask && !confirm(ask)) return;
    setBusy(true);
    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setBusy(false);
    if (!res.ok) return alert("That did not work. Please try again.");
    router.refresh();
  };

  const save = async () => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "edit", ...v, managerId: role === "agent" ? v.managerId || null : null }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not save.");
    setEditing(false);
    router.refresh();
  };

  const remove = async () => {
    const typed = prompt(
      `Delete ${name}? Only somebody added by mistake can be deleted: no doctors, no agents under them and no money on record. Anybody else is switched off instead.\n\nType the name to delete:`,
    );
    if (typed == null) return;
    setBusy(true);
    const res = await fetch("/api/admin/agents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, confirmName: typed }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j.error ?? "Could not delete.");
    router.refresh();
  };
  const box = "mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand";

  const copy = async (text: string, which: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-2 text-sm">
      {[
        { label: "Link for doctors", value: doctorLink, key: "d" },
        ...(patientLink ? [{ label: "Link for patients", value: patientLink, key: "p" }] : []),
        { label: "Their dashboard (private)", value: dashLink, key: "a" },
      ].map((l) => (
        <div key={l.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-mist/60 px-3 py-2">
          <span className="text-xs font-semibold text-ink-soft">{l.label}</span>
          <span className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{l.value}</span>
          <button
            type="button"
            onClick={() => copy(l.value, l.key)}
            aria-label={`Copy ${l.label.toLowerCase()} for ${name}`}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink hover:border-brand"
          >
            <Copy className="h-3 w-3" /> {copied === l.key ? "Copied" : "Copy"}
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Send ${name} their dashboard on WhatsApp`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white hover:brightness-95"
          >
            <Send className="h-3.5 w-3.5" /> Send dashboard on WhatsApp
          </a>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => act("new_link", `Make a new dashboard link for ${name}? The old one stops working.`)}
          aria-label={`New dashboard link for ${name}`}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-ink hover:border-brand disabled:opacity-50"
        >
          New dashboard link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(off ? "on" : "off", off ? undefined : `Switch off ${name}? Their link for doctors stops, and they stop earning.`)}
          aria-label={off ? `Switch ${name} back on` : `Switch ${name} off`}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold disabled:opacity-50 ${
            off ? "bg-leaf text-white hover:bg-leaf-deep" : "border border-line text-ink-soft hover:border-verdict-red hover:text-verdict-red"
          }`}
        >
          {off ? "Switch on" : "Switch off"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(true)}
          aria-label={`Edit ${name}`}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-ink hover:border-brand disabled:opacity-50"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          aria-label={`Delete ${name}`}
          className="inline-flex items-center gap-1 rounded-full border border-verdict-red/30 px-3.5 py-1.5 text-xs font-bold text-verdict-red hover:bg-verdict-red/10 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={() => setEditing(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-6 text-left shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Edit {name}</h3>
              <button type="button" onClick={() => setEditing(false)} aria-label="Close" className="rounded-full p-1 text-ink-soft hover:bg-mist">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink-soft">
                Name
                <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required className={box} />
              </label>
              <label className="block text-xs font-semibold text-ink-soft">
                WhatsApp number
                <input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} inputMode="tel" className={box} />
              </label>
              <label className="block text-xs font-semibold text-ink-soft">
                Email (optional)
                <input value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} type="email" className={box} />
              </label>
              {role === "agent" && (
                <label className="block text-xs font-semibold text-ink-soft">
                  Their advisor
                  <select value={v.managerId} onChange={(e) => setV({ ...v, managerId: e.target.value })} className={box}>
                    <option value="">No advisor</option>
                    {advisors.filter((a) => a.id !== id).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {err && <p className="mt-2 text-sm font-semibold text-verdict-red">{err}</p>}
            <button disabled={busy} className="mt-5 h-11 w-full rounded-full bg-leaf text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
              {busy ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
