"use client";

import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import {
  pushSupported,
  pushConfigured,
  pushPermission,
  enablePush,
} from "@/lib/push";

const DISMISS_KEY = "gf_push_dismissed";

/**
 * A gentle, one-time offer of a meal-time reminder. Not a permission popup on
 * open (that gets refused): a small card the person can accept or wave away. It
 * only appears when the phone can do push, a key is set, and they have not
 * already answered or dismissed it. The honest limits are stated in the copy.
 */
export default function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) return;
    if (pushPermission() !== "default") return; // already granted or blocked
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      setDone(true);
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    if (res.reason === "denied") {
      setMsg("No problem. You can turn it on later in your phone settings.");
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    } else {
      setMsg("This phone could not turn it on. The app will still remind you when you open it.");
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-verdict-green/50 bg-verdict-green/5 px-4 py-3">
        <Check className="h-5 w-5 shrink-0 text-leaf-deep" strokeWidth={3} />
        <p className="text-sm font-semibold text-ink">
          Done. We will remind you before your meals.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-line bg-white p-5 shadow-sm">
      <button
        onClick={dismiss}
        aria-label="Close"
        className="absolute right-3 top-3 text-ink-soft/50 transition-colors hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
        <Bell className="h-4 w-4" /> A little reminder
      </p>
      <p className="mt-1 text-sm text-ink">
        Want a reminder before your meals, so you check your food first? On an
        iPhone, add Glufloat to your home screen first.
      </p>
      {msg && <p className="mt-2 text-sm font-medium text-ink-soft">{msg}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={turnOn}
          disabled={busy}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
        >
          {busy ? "Turning it on..." : "Yes, remind me"}
        </button>
        <button
          onClick={dismiss}
          className="rounded-full border-2 border-line bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:border-brand"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
