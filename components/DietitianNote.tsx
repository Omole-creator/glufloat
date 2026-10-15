import { MessageCircle, NotebookPen } from "lucide-react";

export type NoteItem = { name: string; role: "doctor" | "dietitian"; note: string; updatedAt?: string | null };

function initials(name: string): string {
  return name
    .replace(/^(dr|dtn|mr|mrs|ms|prof|pharm|nurse)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
}

/**
 * Notes from the patient's care team, on the Today tab right above the meal,
 * so the advice carries its writer's name. A dietitian's practice has one
 * note (hers); a hospital has one per doctor or dietitian who wrote one,
 * newest first (founder, 2026-10-15). Plain text as they typed it; React
 * escapes it. "Reply in chat" opens the chat tab for anyone who has one.
 */
export default function DietitianNote({ notes, onReply }: { notes: NoteItem[]; onReply?: () => void }) {
  if (notes.length === 0) return null;
  const allDietitians = notes.every((n) => n.role === "dietitian");
  const heading = notes.length === 1 ? `A note from your ${notes[0].role}` : allDietitians ? "Notes from your dietitians" : "Notes from your care team";

  return (
    <section className="relative mb-4 overflow-hidden rounded-3xl bg-white shadow-[0_10px_32px_-18px_rgba(12,42,71,0.35)] ring-1 ring-brand/10">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand to-leaf" />
      <div className="py-4 pl-5 pr-4 sm:pl-6 sm:pr-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <NotebookPen className="h-4.5 w-4.5" strokeWidth={2.2} />
          </span>
          <h2 className="font-display text-base font-bold text-ink">{heading}</h2>
        </div>

        <ul className="mt-3 space-y-3">
          {notes.map((n) => (
            <li key={n.name + n.role} className="rounded-2xl bg-mist/60 p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-display text-xs font-bold text-white">
                  {initials(n.name)}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                  {n.name}
                  <span className="font-semibold text-ink-soft">, {n.role}</span>
                </p>
                {n.updatedAt && <span className="shrink-0 text-xs font-semibold text-ink-soft">{dateLabel(n.updatedAt)}</span>}
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink">{n.note}</p>
            </li>
          ))}
        </ul>

        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-4 py-2 text-sm font-bold text-brand transition-colors hover:bg-brand/15"
          >
            <MessageCircle className="h-4 w-4" /> Reply in chat
          </button>
        )}
      </div>
    </section>
  );
}
