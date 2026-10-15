"use client";

import { useMemo, useState } from "react";
import { Ban, Check, Plus, Search, ThumbsUp, X } from "lucide-react";

type FoodOpt = { id: string; name: string };

const NOTE_MAX = 300;

/**
 * GluFloat for dietitians (founder, 2026-10-13): her own advice for one
 * patient, about two minutes' work. A note the patient sees on their Today
 * screen as "From <her name>", foods to leave out, and foods to eat more of.
 * GluFloat's meal picks follow her rules and still fit the patient's own My
 * details (lib/nextMeal.ts applyPracticeRules); she never has to choose the
 * replacement meals herself.
 */
export default function PracticeRulesEditor({
  patientId,
  hid,
  firstName,
  dietitianName,
  foods,
  initial,
}: {
  patientId: string;
  hid: string | null;
  firstName: string;
  dietitianName: string;
  foods: FoodOpt[];
  initial: { note: string; avoid: string[]; prefer: string[] };
}) {
  const [note, setNote] = useState(initial.note);
  const [avoid, setAvoid] = useState<string[]>(initial.avoid);
  const [prefer, setPrefer] = useState<string[]>(initial.prefer);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const byId = useMemo(() => new Map(foods.map((f) => [f.id, f.name])), [foods]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/hospital/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: patientId, hid, action: "rules", note, avoid, prefer }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: j.error ?? "This did not save. Please try again." });
    setAvoid(j.avoid ?? avoid);
    setPrefer(j.prefer ?? prefer);
    setMsg({ ok: true, text: `Saved. ${firstName} sees it the next time they open GluFloat.` });
  };

  return (
    <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">Your advice for {firstName}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {firstName} sees your note at the top of their dashboard. We recommend meals that follow your rules and are right
        for {firstName}.
      </p>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-ink">Your note</span>
        <textarea
          value={note}
          maxLength={NOTE_MAX}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="For example: Drink a cup of water before each meal, and walk for 20 minutes after dinner."
          className="mt-1.5 w-full rounded-2xl border-2 border-line bg-[#fbfcfe] px-4 py-3 text-base text-ink outline-none focus:border-brand focus:bg-white"
        />
        <span className="mt-1 block text-right text-xs text-ink-soft">
          {note.length} / {NOTE_MAX}
        </span>
      </label>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <FoodPicker
          title="Leave out these foods"
          hint="GluFloat will not suggest them."
          icon={Ban}
          tone="red"
          chosen={avoid}
          other={prefer}
          foods={foods}
          byId={byId}
          onChange={(next) => {
            setAvoid(next);
            setPrefer((p) => p.filter((id) => !next.includes(id)));
          }}
        />
        <FoodPicker
          title="Eat more of these foods"
          hint="GluFloat will suggest meals with them more often."
          icon={ThumbsUp}
          tone="green"
          chosen={prefer}
          other={avoid}
          foods={foods}
          byId={byId}
          onChange={setPrefer}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {busy ? "Saving..." : "Save my advice"}
        </button>
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-leaf-deep" : "text-verdict-red"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}

function FoodPicker({
  title,
  hint,
  icon: Icon,
  tone,
  chosen,
  other,
  foods,
  byId,
  onChange,
}: {
  title: string;
  hint: string;
  icon: typeof Ban;
  tone: "red" | "green";
  chosen: string[];
  other: string[];
  foods: FoodOpt[];
  byId: Map<string, string>;
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return foods.filter((f) => f.name.toLowerCase().includes(s) && !chosen.includes(f.id) && !other.includes(f.id)).slice(0, 6);
  }, [q, foods, chosen, other]);
  const chip = tone === "red" ? "bg-verdict-red/10 text-verdict-red ring-verdict-red/20" : "bg-leaf/10 text-leaf-deep ring-leaf/25";

  return (
    <div className="rounded-2xl bg-mist/50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        <Icon className={`h-4 w-4 ${tone === "red" ? "text-verdict-red" : "text-leaf-deep"}`} /> {title}
      </p>
      <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>
      {chosen.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chosen.map((id) => (
            <li key={id} className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-sm font-semibold ring-1 ring-inset ${chip}`}>
              {byId.get(id) ?? id}
              <button
                type="button"
                onClick={() => onChange(chosen.filter((x) => x !== id))}
                aria-label={`Take ${byId.get(id) ?? id} off "${title}"`}
                className="rounded-full p-0.5 hover:bg-white/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative mt-3">
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a food, e.g. eba"
          aria-label={`Find a food for "${title}"`}
          className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 text-sm text-ink outline-none focus:border-brand"
        />
      </div>
      {matches.length > 0 && (
        <ul className="mt-2 space-y-1">
          {matches.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...chosen, f.id]);
                  setQ("");
                }}
                className="flex w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm text-ink ring-1 ring-ink/[0.06] hover:ring-brand"
              >
                <Plus className="h-4 w-4 text-brand" /> {f.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
