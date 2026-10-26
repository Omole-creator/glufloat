"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { STATUSES, STATUS_LABEL, type OutreachStatus } from "@/lib/creatorOutreach";

type Editable = {
  id: string;
  name: string;
  platform: string | null;
  handle: string | null;
  status: OutreachStatus;
  reply_summary: string | null;
  notes: string | null;
};

/** Edit and Delete for one creator on /admin/creators. */
export default function CreatorControls({ c }: { c: Editable }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: c.name,
    platform: c.platform ?? "",
    handle: c.handle ?? "",
    status: c.status,
    reply_summary: c.reply_summary ?? "",
    notes: c.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const call = async (method: "PATCH" | "DELETE", body: object) => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/creators", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "That did not work.");
      return false;
    }
    router.refresh();
    return true;
  };

  const remove = async () => {
    const typed = window.prompt(`Type the name to delete it from this list:\n${c.name}`);
    if (typed === null) return;
    if (typed.trim() !== c.name) return setErr("The name did not match, so nothing was deleted.");
    await call("DELETE", { id: c.id });
  };

  const box = "mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand";

  if (!editing)
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink hover:border-brand">
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </button>
        <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-semibold text-verdict-red hover:border-verdict-red">
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
        </button>
        {err && <p className="w-full text-xs text-verdict-red">{err}</p>}
      </div>
    );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (await call("PATCH", { id: c.id, ...form })) setEditing(false);
      }}
      className="mt-4 grid gap-3 rounded-xl bg-mist p-4 sm:grid-cols-2"
    >
      <label className="text-xs font-semibold text-ink-soft">
        Name
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        Status
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OutreachStatus })} className={box}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        Platform
        <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft">
        Handle
        <input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
        What they replied
        <textarea value={form.reply_summary} onChange={(e) => setForm({ ...form, reply_summary: e.target.value })} rows={2} className={box} />
      </label>
      <label className="text-xs font-semibold text-ink-soft sm:col-span-2">
        Notes
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={box} />
      </label>
      <p className="text-xs text-ink-soft sm:col-span-2">Any status other than &ldquo;Emails going out&rdquo; stops all emails to this creator.</p>
      {err && <p className="text-xs text-verdict-red sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink">
          <X className="h-4 w-4" aria-hidden /> Cancel
        </button>
      </div>
    </form>
  );
}
