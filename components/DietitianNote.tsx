import { Stethoscope } from "lucide-react";

/**
 * Her note for this patient (GluFloat for dietitians, 2026-10-13), shown on
 * the Today tab right above the meal, so the advice carries her name. Plain
 * text as she typed it; React escapes it.
 */
export default function DietitianNote({ name, note }: { name: string; note: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-white p-4 shadow-[0_6px_28px_-14px_rgba(12,42,71,0.2)] ring-1 ring-brand/10">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Stethoscope className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">From {name}</p>
        <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-relaxed text-ink">{note}</p>
      </div>
    </div>
  );
}
