"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, Download, Pencil, Trash2, Link2, Phone, X } from "lucide-react";
import {
  callLength,
  clock,
  sizeLabel,
  type CallLine,
  type CallSession,
} from "@/lib/recordingTypes";
import { buildTranscriptPdf, transcriptFileName } from "@/lib/recordingPdf";

const FREE_FILE_STORAGE = 1024 * 1024 * 1024; // Supabase free plan: 1GB of files

const STATUS: Record<CallSession["status"], { label: string; cls: string }> = {
  waiting: { label: "Not started", cls: "bg-[#f2f5f9] text-ink-soft" },
  live: { label: "On a call", cls: "bg-leaf/10 text-leaf-deep" },
  ended: { label: "Finished", cls: "bg-brand/10 text-brand" },
};

export function callLink(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.glufloat.com";
  return `${origin}/call/${token}`;
}

export function whatsAppInvite(name: string, token: string): string {
  const text = `Hello ${name}, this is GluFloat. Here is the link for our call: ${callLink(token)}\n\nOpen it in Chrome when we are ready to talk.`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function RecordingsPanel({
  sessions,
  lineCounts,
  needsSetup,
}: {
  sessions: CallSession[];
  lineCounts: Record<string, number>;
  needsSetup: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<CallSession | null>(null);
  const [copied, setCopied] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPurpose, setEditPurpose] = useState("");
  const [exporting, setExporting] = useState(false);

  const used = useMemo(() => sessions.reduce((n, s) => n + Number(s.audio_bytes || 0), 0), [sessions]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/admin/recordings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer_name: name, purpose }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(j.error ?? "That did not work. Try again.");
      return;
    }
    setMade(j.session);
    setName("");
    setPurpose("");
    router.refresh();
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(callLink(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link is on screen to copy by hand */
    }
  }

  async function remove(s: CallSession) {
    if (!confirm(`Delete the call with ${s.customer_name}? The audio and the transcript are both removed for good.`)) return;
    await fetch(`/api/admin/recordings/${s.id}?what=all`, { method: "DELETE" });
    setPicked((p) => {
      const n = new Set(p);
      n.delete(s.id);
      return n;
    });
    router.refresh();
  }

  async function saveEdit(id: string) {
    const r = await fetch(`/api/admin/recordings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer_name: editName, purpose: editPurpose }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? "That did not save.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function exportPdf() {
    if (picked.size === 0) return;
    setExporting(true);
    try {
      const ids = sessions.filter((s) => picked.has(s.id)).map((s) => s.id);
      const r = await fetch(`/api/admin/recordings/export?ids=${ids.join(",")}`);
      const j = (await r.json()) as { calls: { session: CallSession; lines: CallLine[] }[] };
      buildTranscriptPdf(j.calls).save(transcriptFileName(j.calls));
    } finally {
      setExporting(false);
    }
  }

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allPicked = sessions.length > 0 && picked.size === sessions.length;

  const field =
    "h-10 w-full rounded-lg border border-[#e3e9f1] bg-white px-3 text-sm text-ink outline-none focus:border-brand";
  const th = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink/50";

  if (needsSetup) {
    return (
      <p className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-6 text-sm text-ink">
        The recordings tables are not in the database yet. Paste{" "}
        <code className="rounded bg-mist px-1.5 py-0.5">supabase/recordings-schema.sql</code> into
        the Supabase SQL editor and run it, then reload this page.
      </p>
    );
  }

  return (
    <>
      {/* ---- make a link ---- */}
      <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">New call link</h2>
        <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-semibold text-ink">Customer name</span>
            <input className={`${field} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink">Purpose of the call</span>
            <input
              className={`${field} mt-1.5`}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={300}
              placeholder="For example: what they think of the meal plans"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !name.trim() || !purpose.trim()}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-leaf px-4 font-display text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" /> {busy ? "Making..." : "Make the link"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm font-semibold text-v-red">{error}</p>}

        {made && (
          <div className="mt-4 rounded-xl bg-leaf/5 p-4 ring-1 ring-inset ring-leaf/20">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink">
                Link for {made.customer_name} is ready. Send it, then open the call and wait for them.
              </p>
              <button onClick={() => setMade(null)} aria-label="Close the new link box" className="text-ink-soft hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-ink ring-1 ring-inset ring-[#e3e9f1]">
              {callLink(made.token)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => copy(made.token)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e3e9f1] bg-white px-3 text-sm font-bold text-ink hover:border-brand"
              >
                {copied ? <Check className="h-4 w-4 text-leaf-deep" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={whatsAppInvite(made.customer_name, made.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-bold text-white"
              >
                Send on WhatsApp
              </a>
              <Link
                href={`/admin/recordings/${made.id}`}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-bold text-white"
              >
                <Phone className="h-4 w-4" /> Open the call
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ---- the calls ---- */}
      <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">All calls ({sessions.length})</h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Audio uses {sizeLabel(used)} of {sizeLabel(FREE_FILE_STORAGE)}. Past 800 MB the oldest audio is removed
              on its own. Transcripts are always kept.
            </p>
          </div>
          <button
            onClick={exportPdf}
            disabled={picked.size === 0 || exporting}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 font-display text-sm font-bold text-white transition-colors hover:bg-brand/90 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Making PDF..." : picked.size > 1 ? `Download ${picked.size} as one PDF` : "Download PDF"}
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">No calls yet. Make a link above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead className="border-y border-[#e3e9f1] bg-[#f8fafc]">
                <tr>
                  <th className={th}>
                    <input
                      type="checkbox"
                      aria-label="Pick every call"
                      checked={allPicked}
                      onChange={() => setPicked(allPicked ? new Set() : new Set(sessions.map((s) => s.id)))}
                      className="h-4 w-4 accent-[var(--blue)]"
                    />
                  </th>
                  <th className={th}>Customer</th>
                  <th className={th}>Purpose</th>
                  <th className={th}>Date</th>
                  <th className={th}>Length</th>
                  <th className={th}>Status</th>
                  <th className={th}>Audio</th>
                  <th className={th}>Lines</th>
                  <th className={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const len = callLength(s);
                  const st = STATUS[s.status];
                  const isEditing = editing === s.id;
                  return (
                    <tr key={s.id} className="border-b border-[#eef2f7] align-top last:border-0">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Pick the call with ${s.customer_name}`}
                          checked={picked.has(s.id)}
                          onChange={() => toggle(s.id)}
                          className="h-4 w-4 accent-[var(--blue)]"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {isEditing ? (
                          <input className={field} value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Customer name" />
                        ) : (
                          s.customer_name
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-ink-soft">
                        {isEditing ? (
                          <input className={field} value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)} aria-label="Purpose of the call" />
                        ) : (
                          s.purpose
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                        {new Date(s.started_at ?? s.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{len !== null ? clock(len) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                        {s.audio_bytes > 0 ? sizeLabel(s.audio_bytes) : s.audio_deleted_at ? "Removed" : "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{lineCounts[s.id] ?? 0}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={() => saveEdit(s.id)} className="rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-white">
                              Save
                            </button>
                            <button onClick={() => setEditing(null)} className="rounded-lg border border-[#e3e9f1] px-3 py-1.5 text-xs font-bold text-ink">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/admin/recordings/${s.id}`}
                              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
                            >
                              Open
                            </Link>
                            <button
                              onClick={() => {
                                setEditing(s.id);
                                setEditName(s.customer_name);
                                setEditPurpose(s.purpose);
                              }}
                              aria-label={`Edit the call with ${s.customer_name}`}
                              className="rounded-lg border border-[#e3e9f1] p-1.5 text-ink-soft hover:border-brand hover:text-brand"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => remove(s)}
                              aria-label={`Delete the call with ${s.customer_name}`}
                              className="rounded-lg border border-[#e3e9f1] p-1.5 text-ink-soft hover:border-v-red hover:text-v-red"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
