"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Where feedback is sent. Change this to a dedicated inbox if you prefer.
const FEEDBACK_EMAIL = "glufloat@gmail.com";
const KEY = "glufloat_feedback_v1";
const DELAY_MS = 2 * 60 * 1000; // show once, two minutes into the visit

/**
 * A gentle one-time feedback ask. It appears two minutes after the app opens.
 * There is no backend: "Send" opens the visitor's own email app with the note
 * pre-filled to our address, so no extra software or service is needed.
 */
export default function FeedbackPopup() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return; // already sent or dismissed
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const close = (status: "sent" | "dismissed") => {
    try {
      localStorage.setItem(KEY, status);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const send = () => {
    const subject = encodeURIComponent("Leave us a feedback");
    const body = encodeURIComponent(text.trim() || "(no message)");
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
    close("sent");
  };

  return (
    <div className="verdict-pop fixed inset-x-0 bottom-0 z-[90] flex justify-center p-4 sm:bottom-5">
      <div className="w-full max-w-sm rounded-[1.5rem] bg-gradient-to-b from-brand-deep to-ink p-5 text-left text-white shadow-[0_36px_80px_-24px_rgba(15,61,117,0.85)] ring-1 ring-white/15">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-white">
            Leave us a feedback
          </h3>
          <button
            onClick={() => close("dismissed")}
            aria-label="Close"
            className="text-white/50 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-white/70">
          Tell us what is good, or what we can fix. It helps us make it better
          for you.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Type your feedback here..."
          className="mt-3 w-full resize-none rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-white outline-none transition-colors placeholder:text-white/50 focus:border-white/50"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={send}
            className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-brand-deep shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Send feedback
          </button>
          <button
            onClick={() => close("dismissed")}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
          >
            No thanks
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] text-white/50">
          This opens your email app to send to our team.
        </p>
      </div>
    </div>
  );
}
