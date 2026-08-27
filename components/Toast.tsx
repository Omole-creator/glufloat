"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

/**
 * A small floating "Saved" confirmation, reusable across the app. Follows the
 * exact pub/sub idiom already used for INTAKE_CHANGED / READINGS_CHANGED /
 * PERSONALIZATION_CHANGED (lib/history.ts, lib/glucoseLog.ts,
 * lib/personalizationProfile.ts): a plain window CustomEvent, no context, no
 * new state library.
 */
export const TOAST_EVENT = "glufloat:toast";

export function showToast(message: string): void {
  try {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
  } catch {
    /* no window (server) or blocked; nothing shows, nothing breaks */
  }
}

/**
 * Mounted once (app/app/page.tsx). Reuses the same fixed/z-[90]/verdict-pop
 * shell as FeedbackPopup, but green (a save is a success, not a feedback ask)
 * and auto-dismissing rather than needing a manual close.
 */
export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      setMessage(detail);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setMessage(null), 2000);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="verdict-pop pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex justify-center px-4">
      <div className="flex items-center gap-2.5 rounded-full bg-leaf px-5 py-3 text-sm font-bold text-white shadow-[0_16px_40px_-14px_rgba(46,204,113,0.6)]">
        <Check className="h-4 w-4" strokeWidth={3} />
        {message}
      </div>
    </div>
  );
}
