"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, type LucideIcon } from "lucide-react";

/**
 * One form field, as the auth screens use it: a visible label ABOVE the box
 * (older users lose track of a placeholder-only box the moment they type),
 * a large tap target, an icon, and an eye on password boxes.
 *
 * `label` is what is shown; `ariaLabel` is what a screen reader and the QA
 * suite find it by, kept as the old names ("Your email", "Your password") so
 * nothing that looks for them breaks.
 */
export function Field({
  label,
  ariaLabel,
  icon: Icon,
  hint,
  password = false,
  className = "",
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  ariaLabel?: string;
  icon?: LucideIcon;
  hint?: string;
  password?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <span className="relative mt-1.5 block">
        {Icon && (
          <Icon aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft/55" strokeWidth={2} />
        )}
        <input
          {...input}
          type={password ? (show ? "text" : "password") : input.type}
          aria-label={ariaLabel ?? label}
          className={`h-14 w-full rounded-2xl border-2 border-line bg-[#fbfcfe] text-base text-ink outline-none transition-colors placeholder:text-ink-soft/45 focus:border-brand focus:bg-white ${
            Icon ? "pl-12" : "pl-4"
          } ${password ? "pr-12" : "pr-4"}`}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-soft/60 transition-colors hover:text-ink"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </span>
      {hint && <span className="mt-1.5 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-verdict-red/10 px-4 py-3 text-sm font-medium text-ink ring-1 ring-inset ring-verdict-red/20">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-verdict-red" />
      <span>{children}</span>
    </p>
  );
}

export function SubmitButton({
  busy,
  children,
  busyText,
  tone = "brand",
  disabled,
}: {
  busy: boolean;
  children: React.ReactNode;
  busyText: string;
  tone?: "brand" | "leaf";
  disabled?: boolean;
}) {
  const color =
    tone === "leaf"
      ? "bg-leaf hover:bg-leaf-deep shadow-[0_14px_30px_-14px_rgba(62,155,79,0.9)]"
      : "bg-brand hover:bg-brand-deep shadow-[0_14px_30px_-14px_rgba(27,95,170,0.9)]";
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-bold text-white transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60 ${color}`}
    >
      {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {busy ? busyText : children}
    </button>
  );
}
