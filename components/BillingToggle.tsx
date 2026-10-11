"use client";

/**
 * Monthly / Yearly switch, shared by the landing pricing cards and the /app
 * plan picker so the two read the same. A real two-button radio group, so a
 * screen reader hears which one is chosen. The "Save 20%" chip sits inside
 * the Yearly button: it is the reason to tap it.
 */
export default function BillingToggle({
  yearly,
  onChange,
}: {
  yearly: boolean;
  onChange: (yearly: boolean) => void;
}) {
  const base =
    "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition-all sm:flex-none sm:px-6";
  const on = "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(27,95,170,0.6)]";
  const off = "text-ink-soft hover:text-ink";
  return (
    <div
      role="radiogroup"
      aria-label="How often you pay"
      className="mx-auto flex w-full max-w-xs items-center gap-1 rounded-full bg-white p-1 ring-1 ring-line sm:w-auto sm:max-w-none"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!yearly}
        onClick={() => onChange(false)}
        className={`${base} ${yearly ? off : on}`}
      >
        Monthly
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={yearly}
        onClick={() => onChange(true)}
        className={`${base} ${yearly ? on : off}`}
      >
        Yearly
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${
            yearly ? "bg-white/20 text-white" : "bg-verdict-green/15 text-leaf-deep"
          }`}
        >
          Save 20%
        </span>
      </button>
    </div>
  );
}
