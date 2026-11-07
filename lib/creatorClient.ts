"use client";

/**
 * Creator codes in the browser (rules: lib/creators.ts, server:
 * lib/creatorsServer.ts). The person is tied to a creator on the server the
 * first time /app opens; this file only carries the code there.
 */
import { useEffect, useState } from "react";
import type { Tier } from "@/lib/pricing";

/** A code typed at sign-up, waiting for the account to exist. */
const K_TYPED = "gf_creator_code";

export type CreatorState = {
  ready: boolean;
  code: string | null;
  canAdd: boolean;
  paymentsSoFar: number;
  discountLeft: number;
  prices: Record<Tier, number> | null;
};

/** The code from a creator's link on this device (display only; the server keeps its own copy). */
export function linkCode(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)gf_crt_code=([A-Z0-9]{3,20})/);
  return m ? m[1] : null;
}

export function saveTypedCode(code: string): void {
  try {
    localStorage.setItem(K_TYPED, code);
  } catch {
    /* private mode: the person can still add it in the app */
  }
}
function typedCode(): string | null {
  try {
    return localStorage.getItem(K_TYPED);
  } catch {
    return null;
  }
}
function clearTypedCode(): void {
  try {
    localStorage.removeItem(K_TYPED);
  } catch {
    /* nothing to clear */
  }
}

/** Ask the server whether a typed code is real, before an account exists. */
export async function checkCode(code: string): Promise<string | null> {
  const r = await fetch(`/api/creator/check?code=${encodeURIComponent(code)}`).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  return j?.ok ? (j.code as string) : null;
}

const listeners = new Set<(s: CreatorState) => void>();
let current: CreatorState | null = null;
let loading: Promise<CreatorState | null> | null = null;

function publish(s: CreatorState) {
  current = s;
  listeners.forEach((l) => l(s));
}

async function load(): Promise<CreatorState | null> {
  // First tie anything waiting on this device: a code typed at sign-up, then a creator's link.
  const typed = typedCode();
  if (typed) {
    await fetch("/api/creator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: typed }) }).catch(() => null);
    clearTypedCode();
  }
  await fetch("/api/creator", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
  const r = await fetch("/api/creator").catch(() => null);
  const j = r && r.ok ? await r.json().catch(() => null) : null;
  if (!j?.ready) return null;
  const s = j as CreatorState;
  publish(s);
  return s;
}

/** This person's creator code and discount, once per page (null until known, or before the SQL runs). */
export function useCreator(enabled = true): CreatorState | null {
  const [s, setS] = useState<CreatorState | null>(current);
  useEffect(() => {
    if (!enabled) return;
    listeners.add(setS);
    if (!current && !loading) loading = load().finally(() => (loading = null));
    return () => {
      listeners.delete(setS);
    };
  }, [enabled]);
  return s;
}

/** Add a typed code to the signed-in account. Returns an error to show, or null. */
export async function addCode(code: string): Promise<string | null> {
  const r = await fetch("/api/creator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  if (!j?.ok) return (j?.error as string) ?? "That did not work. Please try again.";
  publish({ ready: true, ...(j as Omit<CreatorState, "ready">) });
  return null;
}

/** Start a 20%-off payment and go to Paystack. Returns an error to show, or never returns. */
export async function payWithCode(tier: Tier): Promise<string | null> {
  const r = await fetch("/api/creator/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  if (j?.url) {
    window.location.href = j.url as string;
    return null;
  }
  return (j?.error as string) ?? "We could not start the payment. Please try again.";
}
