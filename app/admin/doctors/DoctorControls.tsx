"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2, X } from "lucide-react";

type Agent = { id: string; name: string; role: "agent" | "advisor" };

const box = "mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand";

/** The set-up link, with a copy button, after adding a doctor or making a fresh link. */
function LinkBox({ link, emailed, name }: { link: string; emailed: boolean; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-xl bg-leaf/10 px-3.5 py-3 text-sm text-ink ring-1 ring-inset ring-leaf/20">
      <p className="font-semibold">
        {emailed ? `Set-up link emailed to ${name}.` : `The email did not send. Send ${name} this link yourself.`} It works for 14 days.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 break-all font-mono text-xs">{link}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* ignore */
            }
          }}
          aria-label={`Copy set-up link for ${name}`}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink hover:border-brand"
        >
          <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/**
 * Add a doctor by hand (founder, 2026-10-17): no field agent needed. Opens at
 * once and emails their set-up link, exactly like the doctor's own sign-up.
 */
export function AddDoctorForm({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", mdcn: "", agentId: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ link: string; emailed: boolean; name: string } | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setV({ ...v, [k]: e.target.value });
    setErr("");
  };
  const add = async () => {
    setBusy(true);
    setErr("");
    setDone(null);
    const res = await fetch("/api/admin/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "That did not work.");
    if (j.link) setDone({ link: j.link, emailed: !!j.emailed, name: j.name });
    setV({ name: "", email: "", mdcn: "", agentId: "" });
    router.refresh();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-ink-soft">
          Doctor&apos;s name
          <input value={v.name} onChange={set("name")} required placeholder="Dr Ada Okafor" className={box} />
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Email
          <input value={v.email} onChange={set("email")} required type="email" className={box} />
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          MDCN folio number
          <input value={v.mdcn} onChange={set("mdcn")} required className={box} />
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Brought by
          <select value={v.agentId} onChange={set("agentId")} className={box}>
            <option value="">Nobody (GluFloat)</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.role === "advisor" ? "advisor" : "field agent"})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          disabled={busy || !v.name.trim() || !v.email.trim() || !v.mdcn.trim()}
          className="h-11 rounded-full bg-leaf px-6 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          {busy ? "Adding..." : "Add doctor"}
        </button>
        <p className="text-xs text-ink-soft">They get an email to set their password. Only the doctor earns unless you pick who brought them.</p>
      </div>
      {err && <p className="mt-2 text-sm font-semibold text-verdict-red">{err}</p>}
      {done && <LinkBox {...done} />}
    </form>
  );
}

/** Edit, a fresh set-up link, switch off/on, and delete, for one doctor. */
export function DoctorActions({
  id,
  name,
  email,
  mdcn,
  off,
}: {
  id: string;
  name: string;
  email: string;
  mdcn: string;
  off: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState({ name, email, mdcn });
  const [err, setErr] = useState("");
  const [link, setLink] = useState<{ link: string; emailed: boolean } | null>(null);

  const call = async (method: "PATCH" | "DELETE", payload: Record<string, unknown>) => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/doctors", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "That did not work.");
      return null;
    }
    return j;
  };

  const btn = "rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => setEditing(true)} aria-label={`Edit ${name}`} className={`${btn} inline-flex items-center gap-1`}>
        <Pencil className="h-3 w-3" /> Edit
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          const j = await call("PATCH", { action: "new_link" });
          if (j?.link) setLink({ link: j.link, emailed: !!j.emailed });
        }}
        aria-label={`New set-up link for ${name}`}
        className={btn}
      >
        New set-up link
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!off && !confirm(`Switch off ${name}? Their dashboard closes and they stop earning. Their patients keep their own accounts.`)) return;
          if (await call("PATCH", { action: off ? "on" : "off" })) router.refresh();
        }}
        aria-label={off ? `Switch ${name} back on` : `Switch ${name} off`}
        className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
          off ? "bg-leaf text-white hover:bg-leaf-deep" : "border border-line text-ink-soft hover:border-verdict-red hover:text-verdict-red"
        }`}
      >
        {off ? "Switch on" : "Switch off"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          const typed = prompt(
            `This deletes ${name}'s practice and patient list. Patients keep their own GluFloat accounts.\n\nA doctor with care fees on record cannot be deleted: switch them off instead.\n\nType the name to delete:`,
          );
          if (typed == null) return;
          if (await call("DELETE", { confirmName: typed })) router.refresh();
        }}
        aria-label={`Delete ${name}`}
        className="inline-flex items-center gap-1 rounded-full border border-verdict-red/30 px-3 py-1.5 text-xs font-bold text-verdict-red hover:bg-verdict-red/10 disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" /> Delete
      </button>
      {err && <p className="w-full text-xs font-semibold text-verdict-red">{err}</p>}
      {link && (
        <div className="w-full text-left">
          <LinkBox {...link} name={name} />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={() => setEditing(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={async (e) => {
              e.preventDefault();
              if (await call("PATCH", { action: "edit", ...v })) {
                setEditing(false);
                router.refresh();
              }
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
                Email
                <input value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} type="email" required className={box} />
              </label>
              <label className="block text-xs font-semibold text-ink-soft">
                MDCN folio number
                <input value={v.mdcn} onChange={(e) => setV({ ...v, mdcn: e.target.value })} required className={box} />
              </label>
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
