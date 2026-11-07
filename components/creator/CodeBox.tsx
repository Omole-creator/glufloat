"use client";

import { useState } from "react";
import { BadgeCheck, Ticket } from "lucide-react";

/**
 * The "Have a code?" control. Folded to one small link, because most people
 * have no code and an open empty box makes them think they are missing a
 * discount. Tapping it opens one box and an Add button.
 */
export default function CodeBox({
  onAdd,
  className = "",
  tone = "light",
}: {
  /** Returns an error to show, or null when the code was added. */
  onAdd: (code: string) => Promise<string | null>;
  className?: string;
  tone?: "light" | "plain";
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline ${className}`}
      >
        <Ticket aria-hidden className="h-4 w-4" />
        Have a code?
      </button>
    );

  const add = async () => {
    const c = code.trim();
    if (!c) return setErr("Please type the code.");
    setBusy(true);
    setErr("");
    const e = await onAdd(c);
    setBusy(false);
    if (e) setErr(e);
  };

  return (
    <div className={`${tone === "light" ? "rounded-2xl border border-line bg-[#fbfcfe] p-3" : ""} ${className}`}>
      <label className="block text-left">
        <span className="text-sm font-semibold text-ink">Your code</span>
        <span className="mt-1.5 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            aria-label="Your code"
            className="h-12 min-w-0 flex-1 rounded-xl border-2 border-line bg-white px-3 text-base font-semibold uppercase tracking-wide text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className="h-12 shrink-0 rounded-xl bg-leaf px-5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Adding..." : "Add code"}
          </button>
        </span>
      </label>
      {err && <p className="mt-2 text-left text-sm font-semibold text-verdict-red">{err}</p>}
    </div>
  );
}

/** The green line once a code is on: "Code FAITH added. 20% off your first 3 months." */
export function CodeAdded({ code, text, className = "" }: { code: string; text: string; className?: string }) {
  return (
    <p className={`flex items-start gap-2 rounded-2xl bg-leaf/10 px-3 py-2.5 text-left text-sm font-semibold text-leaf-deep ${className}`}>
      <BadgeCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Code {code} added. {text}
      </span>
    </p>
  );
}
