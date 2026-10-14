"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Target } from "lucide-react";

/**
 * The sugar flags on a patient's page, for clinicians only (lib/safetyFlag.ts).
 *
 * Red: a test under 70, over 300, or a drop after a meal, in the last 14 days.
 * "Mark as seen" hides those for the whole hospital; a newer one shows again.
 * Amber: before-meal sugar mostly above the patient's own target, and the same
 * meal high 3 times. The target is set here by any doctor or dietitian.
 *
 * Every line is worked out on the server and only states numbers.
 */
export default function SugarFlags({
  patientId,
  hid,
  firstName,
  red,
  redDays,
  seen,
  amber,
  target,
}: {
  patientId: string;
  hid: string | null;
  firstName: string;
  red: string[];
  redDays: number;
  seen: { by: string | null; at: string } | null;
  amber: string[];
  /** mgdl: what the flag uses now. set: whether a clinician chose it. ready: the database can store it. */
  target: { mgdl: number; mmol: string; set: boolean; ready: boolean };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"seen" | "target" | null>(null);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(target.set ? String(target.mgdl) : "");

  const send = async (action: "seen" | "target", extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setMsg("");
    const res = await fetch("/api/hospital/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hid, id: patientId, action, ...extra }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  };

  const seenWhen = seen
    ? new Date(seen.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })
    : "";

  return (
    <div className="mt-5 space-y-4">
      {red.length > 0 && (
        <section role="alert" className="rounded-2xl border-2 border-verdict-red bg-verdict-red/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-verdict-red motion-safe:animate-pulse" />
              <h2 className="font-display text-base font-bold text-verdict-red">Sugar tests to look at</h2>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void send("seen")}
              className="inline-flex items-center gap-1.5 rounded-full border border-verdict-red/40 bg-white px-3.5 py-1.5 text-xs font-bold text-verdict-red hover:border-verdict-red disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {busy === "seen" ? "Saving..." : "Mark as seen"}
            </button>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            Under 70, over 300, or a drop of 30 or more after a meal ending under 100, in the last {redDays} days.{" "}
            {firstName} does not see this flag. Mark as seen hides these for everyone here. A new one shows again.
          </p>
          <ul className="mt-3 space-y-1.5">
            {red.map((l, i) => (
              <li key={i} className="text-sm font-semibold text-ink">
                {l}
              </li>
            ))}
          </ul>
        </section>
      )}
      {red.length === 0 && seen && (
        <p className="text-xs text-ink-soft">
          Red sugar flag marked as seen{seen.by ? ` by ${seen.by}` : ""}, {seenWhen}. Nothing new since.
        </p>
      )}

      {amber.length > 0 && (
        <section className="rounded-2xl border-2 border-verdict-yellow bg-verdict-yellow/10 p-5">
          <h2 className="font-display text-base font-bold text-ink">Worth a look</h2>
          <p className="mt-1 text-xs text-ink-soft">Patterns in {firstName}&apos;s own tests. {firstName} does not see this.</p>
          <ul className="mt-3 space-y-2">
            {amber.map((l, i) => (
              <li key={i} className="text-sm text-ink">
                {l}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-[#e3e9f1] bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Target className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Before-meal target</p>
            <p className="text-xs text-ink-soft">
              {target.mgdl} mg/dL ({target.mmol} mmol/L){target.set ? ", set for " + firstName : ", the default until you set one"}
            </p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMsg("");
              }}
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-bold text-ink hover:border-brand"
            >
              Change
            </button>
          )}
        </div>
        {editing && (
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send("target", { target: value }).then((ok) => ok && setEditing(false));
            }}
          >
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              aria-label={`Before-meal target for ${firstName}, in mg/dL or mmol/L`}
              placeholder="150 or 8.3"
              className="w-32 rounded-full border border-[#e3e9f1] px-4 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="rounded-full bg-leaf px-4 py-2 text-xs font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
            >
              {busy === "target" ? "Saving..." : "Save target"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-2 py-2 text-xs font-bold text-ink-soft hover:text-ink">
              Cancel
            </button>
            <p className="w-full text-xs text-ink-soft">
              Type it in mg/dL or mmol/L. Leave it empty to go back to 150. Flags when most before-meal tests in 30 days (at
              least 4) are above it.
            </p>
          </form>
        )}
        {!target.ready && <p className="mt-2 text-xs text-ink-soft">Setting a target is not ready yet.</p>}
      </section>

      {msg && <p className="text-sm font-semibold text-verdict-red">{msg}</p>}
    </div>
  );
}
