import type { SupabaseClient } from "@supabase/supabase-js";
import { Droplet, UtensilsCrossed } from "lucide-react";
import { displayLabel } from "@/lib/foodName";
import { formatBoth, gapLabel } from "@/lib/glucose";

/**
 * What a nurse partner sees of one patient (founder, 2026-11-24): the meals
 * they logged, each with the sugar tests saved ON that meal (before eating,
 * and after). Nothing else is read here: no profile, medicine, weight, HbA1c,
 * tests not tied to a meal, flags or notes. You cannot leak a field you never
 * fetched, so the queries below select only what is shown.
 */

export type NurseTest = { mgdl: number; takenAt: string };
export type NurseMeal = { id: number; label: string; checkedAt: string; before: NurseTest[]; after: NurseTest[] };

export async function nurseMeals(admin: SupabaseClient, uid: string, days: number): Promise<NurseMeal[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: meals } = await admin
    .from("meal_checks")
    .select("id,label,checked_at")
    .eq("user_id", uid)
    .gte("checked_at", since)
    .order("checked_at", { ascending: false })
    .limit(300);
  const list = ((meals ?? []) as { id: number; label: string; checked_at: string }[]).map((m) => ({
    id: m.id,
    label: m.label,
    checkedAt: m.checked_at,
    before: [] as NurseTest[],
    after: [] as NurseTest[],
  }));
  if (!list.length) return [];
  const byId = new Map(list.map((m) => [m.id, m]));
  const ids = list.map((m) => m.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { data: tests } = await admin
      .from("glucose_readings")
      .select("meal_check_id,mgdl,taken_at,context")
      .eq("user_id", uid)
      .in("meal_check_id", ids.slice(i, i + 100))
      .order("taken_at", { ascending: true });
    for (const t of (tests ?? []) as { meal_check_id: number; mgdl: number; taken_at: string; context: string | null }[]) {
      const m = byId.get(t.meal_check_id);
      if (!m) continue;
      (t.context === "before_meal" ? m.before : m.after).push({ mgdl: Number(t.mgdl), takenAt: t.taken_at });
    }
  }
  return list;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

export default function NurseRecord({ firstName, days, span }: { firstName: string; days: NurseMeal[]; span: number }) {
  return (
    <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">Meals and sugar tests</h2>
      <p className="mt-1 text-sm text-ink-soft">
        What {firstName} saved in the last {span} days, with any sugar test saved before or after that meal.
      </p>
      {days.length === 0 ? (
        <p className="mt-5 rounded-xl bg-mist/70 px-4 py-3.5 text-sm text-ink-soft">{firstName} has not saved a meal in the last {span} days.</p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {days.map((m) => (
            <li key={m.id} className="py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden>
                  <UtensilsCrossed className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink/50">{when(m.checkedAt)}</p>
                  <p className="mt-0.5 font-semibold text-ink">{displayLabel(m.label)}</p>
                  {m.before.length + m.after.length > 0 ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Tests title="Before eating" tests={m.before} meal={m.checkedAt} />
                      <Tests title="After eating" tests={m.after} meal={m.checkedAt} after />
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-ink-soft">No sugar test saved with this meal.</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Tests({ title, tests, meal, after = false }: { title: string; tests: NurseTest[]; meal: string; after?: boolean }) {
  return (
    <div className="rounded-xl bg-mist/60 px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
        <Droplet className="h-3.5 w-3.5" aria-hidden /> {title}
      </p>
      {tests.length === 0 ? (
        <p className="mt-1 text-sm text-ink-soft">None saved</p>
      ) : (
        tests.map((t, i) => (
          <p key={i} className="mt-1 text-sm text-ink">
            <span className="font-semibold">{formatBoth(t.mgdl)}</span>{" "}
            <span className="text-ink-soft">
              at {time(t.takenAt)}
              {after && gapLabel(meal, t.takenAt) ? `, ${gapLabel(meal, t.takenAt)}` : ""}
            </span>
          </p>
        ))
      )}
    </div>
  );
}
