"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, NotebookPen, Trash2 } from "lucide-react";

const NOTE_MAX = 300;

type Note = { authorId: string; name: string; role: "doctor" | "dietitian"; note: string; updatedAt: string };

/**
 * A hospital doctor's or dietitian's own note for one patient (founder,
 * 2026-10-15): the patient sees it on top of their blue meal card, with the
 * writer's name. One note each; colleagues' notes show here too, so the
 * team does not say the same thing twice. A hospital admin sees them only.
 */
export default function CareNoteEditor({
  patientId,
  hid,
  firstName,
  me,
  canWrite,
  notes,
}: {
  patientId: string;
  hid: string | null;
  firstName: string;
  me: string;
  canWrite: boolean;
  notes: Note[];
}) {
  const router = useRouter();
  const mine = notes.find((n) => n.authorId === me);
  const others = notes.filter((n) => n.authorId !== me);
  const [note, setNote] = useState(mine?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (value: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/hospital/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: patientId, hid, action: "note", note: value }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: j.error ?? "This did not save. Please try again." });
    setNote(j.note ?? "");
    setMsg({
      ok: true,
      text: j.note ? `Saved. ${firstName} sees it on top of their meal card.` : `Removed. ${firstName} no longer sees your note.`,
    });
    router.refresh();
  };

  if (!canWrite && others.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <NotebookPen className="h-4 w-4" />
        </span>
        <h2 className="font-display text-base font-bold text-ink">Notes for {firstName}</h2>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {firstName} sees these on top of their meal card in GluFloat, with the name of who wrote each one.
      </p>

      {others.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {others.map((n) => (
            <li key={n.authorId} className="rounded-xl bg-mist/60 px-4 py-3">
              <p className="text-xs font-bold text-ink-soft">
                {n.name}, {n.role} ·{" "}
                {new Date(n.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-ink">{n.note}</p>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-ink">Your note</span>
            <textarea
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="For example: Take your tablet 30 minutes before breakfast, and walk for 20 minutes after dinner."
              className="mt-1.5 w-full rounded-2xl border-2 border-line bg-[#fbfcfe] px-4 py-3 text-base text-ink outline-none focus:border-brand focus:bg-white"
            />
            <span className="mt-1 block text-right text-xs text-ink-soft">
              {note.length} / {NOTE_MAX}
            </span>
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void save(note)}
              disabled={busy || !note.trim() || note.trim() === (mine?.note ?? "")}
              className="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> {busy ? "Saving..." : "Save my note"}
            </button>
            {mine && (
              <button
                onClick={() => confirm(`Remove your note? ${firstName} will no longer see it.`) && void save("")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink-soft hover:bg-verdict-red/10 hover:text-verdict-red disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Remove my note
              </button>
            )}
            {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
          </div>
        </>
      )}
    </section>
  );
}
