"use client";

import { useEffect, useState } from "react";
import { Bell, X, Check } from "lucide-react";
import {
  pushSupported,
  pushConfigured,
  pushPermission,
  enablePush,
} from "@/lib/push";
import { INTAKE_CHANGED, recentChecks } from "@/lib/history";

// How many times this device has been offered reminders, and when last.
const OFFERS_KEY = "gf_push_offers";
const MAX_OFFERS = 3;
const GAP_MS = 3 * 24 * 60 * 60 * 1000;

function readOffers(): { count: number; last: number } {
  try {
    const v = JSON.parse(localStorage.getItem(OFFERS_KEY) ?? "");
    if (typeof v?.count === "number" && typeof v?.last === "number") return v;
  } catch {
    /* nothing stored yet */
  }
  return { count: 0, last: 0 };
}

/**
 * A gentle offer of a meal-time reminder (rebuilt 2026-10-11). It used to
 * appear once a day from the very first visit, which a brand-new user read as
 * being nagged before the app had done anything for them, so it was taken off
 * the screen. Now it waits for the moment the app has earned it:
 *
 *  - only once the person has saved at least one meal (they have seen what
 *    GluFloat does), and it can appear the moment that first meal is saved;
 *  - at most 3 times on this device, at least 3 days apart;
 *  - never again once the phone's permission is "granted" or "denied".
 *
 * A small card they choose, never a permission popup on open.
 */
export default function PushOptIn() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!pushSupported() || !pushConfigured()) return;
    let shown = false;
    const consider = async () => {
      if (shown) return;
      // "granted" = they accepted; "denied" = blocked. Only "default" is offered.
      if (pushPermission() !== "default") return;
      const offers = readOffers();
      if (offers.count >= MAX_OFFERS || Date.now() - offers.last < GAP_MS) return;
      const saved = await recentChecks(1);
      if (!saved.length) return;
      shown = true;
      try {
        localStorage.setItem(OFFERS_KEY, JSON.stringify({ count: offers.count + 1, last: Date.now() }));
      } catch {
        /* storage blocked: still show it this once */
      }
      setShow(true);
    };
    void consider();
    // The first saved meal is the moment to ask, without a reload.
    window.addEventListener(INTAKE_CHANGED, consider);
    return () => window.removeEventListener(INTAKE_CHANGED, consider);
  }, []);

  if (!show) return null;

  // "Not now" just hides it. The record above already keeps it away for 3 days.
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
