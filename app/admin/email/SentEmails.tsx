"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { SentEmail } from "@/lib/mailyte";

/** Fired with a copy of a sent email; Compose.tsx fills itself from it. */
export const EDIT_EMAIL_EVENT = "gf-admin-edit-email";
export type EditEmailDetail = { subject: string; html: string; senderId: string | null };

const STATE: Record<string, string> = {
  sent: "Sent",
  sending: "Sending",
  scheduled: "Scheduled",
  paused: "Paused",
  canceled: "Cancelled",
};

/** The sent emails, folded away until opened, each with Edit and Delete. */
export default function SentEmails({ sent }: { sent: SentEmail[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<SentEmail | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const edit = async (c: SentEmail) => {
    setBusy(c.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/mailyte/campaign/${encodeURIComponent(c.id)}`);
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not load this email.");
      window.dispatchEvent(new CustomEvent<EditEmailDetail>(EDIT_EMAIL_EVENT, { detail: out }));
      document.getElementById("write-email")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not load this email." });
    }
    setBusy("");
  };

  const remove = async () => {
    if (!pending) return;
    const c = pending;
    setBusy(c.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/mailyte/campaign/${encodeURIComponent(c.id)}`, { method: "DELETE" });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "It did not delete.");
      setMsg({ ok: true, text: `Deleted "${c.subject}".` });
      setPending(null);
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "It did not delete." });
      setPending(null);
    }
    setBusy("");
  };

  return (
    <details className="group mt-4 rounded-2xl border border-[#e3e9f1] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-base font-bold text-ink">
          Sent emails <span className="font-normal text-ink-soft">· {sent.length}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e3e9f1] bg-white text-ink-soft transition-transform group-open:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>

      {msg && (
        <p className={`px-5 pb-3 text-sm font-semibold sm:px-6 ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>
      )}

      {sent.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-soft sm:px-6">None yet.</p>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-5 py-2 sm:px-6">Subject</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Sent</th>
                <th className="px-3 py-2 text-right">Opened</th>
                <th className="px-3 py-2 text-right">Clicked</th>
                <th className="px-5 py-2 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sent.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-semibold text-ink sm:px-6">{c.subject}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-soft">
                    {new Date(c.when).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{STATE[c.state] ?? c.state}</td>
                  <td className="px-3 py-3 text-right">{c.sent ?? "—"}</td>
                  <td className="px-3 py-3 text-right">{c.opened ?? "—"}</td>
                  <td className="px-3 py-3 text-right">{c.clicked ?? "—"}</td>
                  <td className="px-5 py-3 sm:px-6">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => edit(c)}
                        disabled={!!busy}
                        aria-label={`Edit a copy of ${c.subject}`}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-brand ring-1 ring-brand/30 hover:bg-brand/5 disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        {busy === c.id && !pending ? "Opening..." : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPending(c)}
                        disabled={!!busy}
                        aria-label={`Delete ${c.subject}`}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-verdict-red ring-1 ring-verdict-red/30 hover:bg-verdict-red/5 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/40 px-4"
          onClick={() => !busy && setPending(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-email-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="delete-email-title" className="font-display text-lg font-bold text-ink">
              Delete this email?
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              &quot;{pending.subject}&quot; is already in people&apos;s inboxes. Deleting only removes it and its numbers
              from this list. You cannot get it back.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                disabled={!!busy}
                className="rounded-full px-4 py-2 text-sm font-bold text-ink ring-1 ring-line hover:bg-mist"
              >
                No, keep it
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={!!busy}
                className="rounded-full bg-verdict-red px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Yes, delete it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </details>
  );
}
