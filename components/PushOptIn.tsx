"use client";

import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import {
  pushSupported,
  pushConfigured,
  pushPermission,
  enablePush,
} from "@/lib/push";

// The day (in the browser's local time) this device was last shown the offer.
const LAST_SHOWN_KEY = "gf_push_lastshown";
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * A gentle offer of a meal-time reminder, shown AT MOST ONCE A DAY until the
 * person turns it on (founder rule). Once accepted, the browser's permission is
 * "granted", so it never shows again. Once blocked, it also stops. If they just
 * wave it away, it stays gone for the rest of the day and offers again tomorrow.
 * Not a permission popup on open (that gets refused): a small card they choose.
 */
export default function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) return;
    // "granted" = they accepted (never nag again); "denied" = blocked (do not
    // nag). Only "default" (not asked yet) can be offered.
    if (pushPermission() !== "default") return;
    try {
      if (localStorage.getItem(LAST_SHOWN_KEY) === todayKey()) return; // shown today already
      localStorage.setItem(LAST_SHOWN_KEY, todayKey()); // remember we showed it today
    } catch {
      /* storage blocked: still show it this once */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  // "Not now" just hides it. The once-a-day record above already stops it from
  // coming back until tomorrow, so there is nothing else to write.
  const dismiss = () => setShow(false);

  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      setDone(true); // permission is now "granted"; it will never show again
      return;
    }
    if (res.reason === "denied") {
      setMsg("No problem. You can turn it on later in your phone settings.");
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
    <div className="relative rounded-3xl bg-white p-5 shadow-[0_4px_24px_-12px_rgba(12,42,71,0.22)] ring-1 ring-ink/[0.04]">
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
