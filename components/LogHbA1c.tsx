"use client";

import { useEffect, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { giveHealthConsent, hasHealthConsent } from "@/lib/glucoseLog";
import { parseHba1c, saveHba1c } from "@/lib/hba1c";
import { localDayKey } from "@/lib/mealtime";
import { trackUsage } from "@/lib/usage";
import { showToast } from "@/components/Toast";

/**
 * "My doctor gave me a 3-month sugar test number."
 *
 * Optional, and quiet on purpose: a bordered pill under the green "I tested my
 * sugar" button, because most people get this test a few times a year at most.
 * Like every sugar number in the app, it is saved and shown back, never graded.
 */
export default function LogHbA1c() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [testedOn, setTestedOn] = useState(localDayKey());
  const [needConsent, setNeedConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!open) return;
    void hasHealthConsent().then((ok) => setNeedConsent(!ok));
  }, [open]);

  const close = () => {
    setOpen(false);
    setTyped("");
    setTestedOn(localDayKey());
    setSaved(null);
    setProblem("");
    setAgreed(false);
  };

  const save = async () => {
    const percent = parseHba1c(typed);
    if (percent === null) {
      setProblem("Type the number on your test result, for example 7.2");
      return;
    }
    if (!testedOn) {
      setProblem("Pick the day you did the test.");
      return;
    }
    setBusy(true);
    setProblem("");
    if (needConsent && agreed) await giveHealthConsent();
    const ok = await saveHba1c(percent, testedOn);
    setBusy(false);
    if (!ok) {
      setProblem("That did not save. Please check your internet and try again.");
      return;
    }
    void trackUsage("hba1c_logged");
    setNeedConsent(false);
    setSaved(percent);
    showToast("Saved");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand/30 bg-white px-3.5 py-1.5 text-xs font-bold text-brand transition-colors hover:border-brand hover:bg-brand/5"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={3} />
        Add your 3-month sugar test (HbA1c) if any
      </button>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-ink/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-base font-bold text-ink">Your 3-month sugar test</p>
        <button
          onClick={close}
          aria-label="Close the 3-month sugar test box"
          className="rounded-full p-1 text-ink-soft hover:bg-mist hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {saved !== null ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Check className="h-5 w-5 shrink-0 text-leaf-deep" strokeWidth={3} />
          Saved: {saved}%. It is on your doctor&apos;s report now.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-soft">
            Your doctor may call it HbA1c or A1c. It is a number with a % sign.
          </p>

          <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="hba1c-value">
            Type the number on your result
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id="hba1c-value"
              inputMode="decimal"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-28 rounded-xl border-2 border-line px-3 py-2 text-lg font-semibold text-ink outline-none focus:border-brand"
            />
            <span className="text-lg font-semibold text-ink-soft">%</span>
          </div>

          <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="hba1c-date">
            When did you do the test?
          </label>
          <input
            id="hba1c-date"
            type="date"
            value={testedOn}
            max={localDayKey()}
            onChange={(e) => setTestedOn(e.target.value)}
            className="mt-1.5 rounded-xl border-2 border-line px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
          />

          {needConsent && (
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-mist px-4 py-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--blue)]"
              />
              <span className="text-sm text-ink">
                Glufloat will keep your sugar test numbers on your account so you can
                show them to your doctor. Only you can see them.
                <strong className="mt-1 block font-semibold">
                  Yes, save my sugar test numbers.
                </strong>
              </span>
            </label>
          )}

          {problem && <p className="mt-3 text-sm font-semibold text-verdict-red">{problem}</p>}

          <button
            onClick={save}
            disabled={busy || (needConsent && !agreed)}
            className="mt-5 rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save my 3-month test"}
          </button>
        </>
      )}
    </div>
  );
}
