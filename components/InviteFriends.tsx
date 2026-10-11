"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { showToast } from "./Toast";

type Info = { ready: true; link: string; rewarded: number; daysEarned: number; days: number };

const ATTACH_TRIED = "gf_invite_attach_tried";

/**
 * "Invite a friend, get 5 free days" (lib/referral.ts). Green because it is an
 * extra, not the answer: blue is the meal for now.
 *
 * It also does the quiet half of the feature: the first time a NEW member opens
 * /app, it asks the server to tie their account to whoever invited them (the
 * inviter lives in an httpOnly cookie set by /i/<code>). Once a session.
 *
 * Shows nothing until the referral tables exist (the API answers ready: false).
 */
export default function InviteFriends() {
  const [info, setInfo] = useState<Info | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!sessionStorage.getItem(ATTACH_TRIED)) {
          sessionStorage.setItem(ATTACH_TRIED, "1");
          await fetch("/api/referral", { method: "POST" });
        }
      } catch {
        /* storage blocked or offline: try again next visit */
      }
      try {
        const r = await fetch("/api/referral", { cache: "no-store" });
        const j = await r.json();
        if (alive && j?.ready) setInfo(j as Info);
      } catch {
        /* nothing to show */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!info) return null;

  const message = `I use GluFloat to know which Nigerian foods are good for my sugar. Try it free for 7 days: ${info.link}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(info.link);
      setCopied(true);
      showToast("Link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked: the link is on screen to copy by hand */
    }
  };

  return (
    <section
      aria-label="Invite a friend"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f7a3a] via-[#2e9b4f] to-[#3eb35f] p-5 text-white shadow-[0_14px_36px_-18px_rgba(31,122,58,0.8)]"
    >
      <div aria-hidden className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold leading-snug">
            Invite a friend, get {info.days} free days
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-white/85">
            Send your link to someone who needs it. When they pay for GluFloat, you get {info.days} more days free.
          </p>
        </div>
      </div>

      {info.daysEarned > 0 && (
        <p className="relative mt-4 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold ring-1 ring-inset ring-white/20">
          You have earned {info.daysEarned} free days so far. Thank you.
        </p>
      )}

      <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-leaf-deep transition-colors hover:bg-white/90"
        >
          Invite a friend on WhatsApp
        </a>
        <button
          type="button"
          onClick={copy}
          className="flex items-center justify-center gap-2 rounded-full bg-white/15 px-5 py-3 text-sm font-bold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/25"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy my invite link"}
        </button>
      </div>
      <p className="relative mt-3 break-all text-center text-xs text-white/70">{info.link}</p>
    </section>
  );
}
