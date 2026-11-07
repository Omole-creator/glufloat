"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Send, Trash2, X } from "lucide-react";

/** Add a creator partner. They never sign up: this is how they start. */
export function AddCreatorForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const add = async () => {
    setBusy(true);
    setErr("");
    setOk("");
    const res = await fetch("/api/admin/creator-partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, code }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not work.");
    setOk(`Added. Their code is ${j.code}.`);
    setName("");
    setPhone("");
    setEmail("");
    setCode("");
    router.refresh();
  };

  const box = "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
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
        Code (leave empty for their first name)
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="FAITH"
          maxLength={20}
          className={`mt-1 uppercase ${box}`}
        />
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <button disabled={busy || !name.trim()} className="h-11 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
          {busy ? "Adding..." : "Add creator"}
        </button>
      </div>
      {err && <p className="text-sm font-semibold text-verdict-red sm:col-span-2 lg:col-span-4">{err}</p>}
      {ok && <p className="text-sm font-semibold text-leaf-deep sm:col-span-2 lg:col-span-4">{ok}</p>}
    </form>
  );
}

/** Their links, copy and send, the talking points, on/off, a fresh page link, edit and delete. */
export function CreatorLinks({
  id,
  name,
  phone,
  email,
  code,
  link,
  dashLink,
  points,
  off,
}: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  code: string;
  link: string;
  dashLink: string;
  points: string;
  off: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ name, phone: phone ?? "", email: email ?? "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const first = name.split(/\s+/)[0];
  const wa = phone ? (phone.startsWith("0") && phone.length === 11 ? "234" + phone.slice(1) : phone) : "";
  const message = `Hello ${first}, welcome to Glufloat. Thank you for saying yes.\n\nYour code is ${code}, and your link is ${link}\n\nThis is your own page. It shows your people and your money. Please keep it private:\n${dashLink}\n\nOn that page there is also a short list of what you can say about Glufloat.`;

  const act = async (action: string, ask?: string) => {
    if (ask && !confirm(ask)) return;
    setBusy(true);
    const res = await fetch("/api/admin/creator-partners", {
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
    const res = await fetch("/api/admin/creator-partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "edit", ...v }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not save.");
    setEditing(false);
    router.refresh();
  };

  const remove = async () => {
    const typed = prompt(
      `Delete ${name}? Only a creator added by mistake can be deleted: nobody signed up with their code and no money on record. Anybody else is switched off instead.\n\nType the name to delete:`,
    );
    if (typed == null) return;
    setBusy(true);
    const res = await fetch("/api/admin/creator-partners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, confirmName: typed }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j.error ?? "Could not delete.");
    router.refresh();
  };

  const copy = async (text: string, which: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };
  const box = "mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand";

  return (
    <div className="space-y-2 text-sm">
      {[
        { label: "Their link", value: link, key: "l" },
        { label: "Their page (private)", value: dashLink, key: "d" },
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
            aria-label={`Send ${name} their code and page on WhatsApp`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white hover:brightness-95"
          >
            <Send className="h-3.5 w-3.5" /> Send on WhatsApp
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}?subject=${encodeURIComponent(`Your Glufloat code: ${code}`)}&body=${encodeURIComponent(`${message}\n\n${points}`)}`}
            aria-label={`Email ${name} their code and page`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-ink hover:border-brand"
          >
            Email it
          </a>
        )}
        <button
          type="button"
          onClick={() => copy(points, "t")}
          aria-label={`Copy what ${name} can say`}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-ink hover:border-brand"
        >
          <Copy className="h-3 w-3" /> {copied === "t" ? "Copied" : "Copy what to say"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act("new_link", `Make a new page link for ${name}? The old one stops working.`)}
          aria-label={`New page link for ${name}`}
          className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-ink hover:border-brand disabled:opacity-50"
        >
          New page link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            act(off ? "on" : "off", off ? undefined : `Switch off ${name}? Their link and code stop working for new people. They still earn on people they already brought.`)
          }
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
            <p className="mt-1 text-xs text-ink-soft">The code {code} cannot change: it is already in their posts.</p>
            <label className="mt-4 block text-xs font-semibold text-ink-soft">
              Name
              <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required className={box} />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink-soft">
              WhatsApp number
              <input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} inputMode="tel" className={box} />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink-soft">
              Email
              <input value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} type="email" className={box} />
            </label>
            {err && <p className="mt-3 text-sm font-semibold text-verdict-red">{err}</p>}
            <button disabled={busy} className="mt-5 h-11 w-full rounded-full bg-leaf text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
              {busy ? "Saving..." : "Save"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Record that this month's money was sent (only earnings at least 14 days old). */
export function CreatorPayButton({ creatorId, name, ids, amount }: { creatorId: string; name: string; ids: string[]; amount: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (ids.length === 0) return null;
  return (
    <button
      type="button"
      disabled={busy}
      aria-label={`Mark ${amount} as paid to ${name}`}
      onClick={async () => {
        if (!confirm(`Mark ${amount} as paid to ${name}? Do this only after the bank transfer has gone.`)) return;
        setBusy(true);
        const res = await fetch("/api/admin/creator-partners/payout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creatorId, ids }),
        });
        const j = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return alert(j.error ?? "That did not work.");
        router.refresh();
      }}
      className="h-10 rounded-full bg-leaf px-5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
    >
      {busy ? "Saving..." : `Mark ${amount} as paid`}
    </button>
  );
}
