"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2 } from "lucide-react";

/**
 * The "Email sent" pop-up in the middle of the screen (founder, 2026-11-01).
 * Shown only after Mailyte has accepted the email. Rendered onto <body> so no
 * card around it can pin or clip it. Closes on OK, Escape or a tap outside.
 */
export default function SentPopup({
  title = "Email sent",
  text,
  onClose,
}: {
  title?: string;
  text: string;
  onClose: () => void;
}) {
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sent-popup-title"
        className="verdict-pop w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf/15 text-leaf-deep">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </span>
        <h2 id="sent-popup-title" className="mt-4 font-display text-xl font-bold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">{text}</p>
        <button
          ref={okRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep"
        >
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
