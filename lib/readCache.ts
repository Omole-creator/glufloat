"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * One read, shared by every part of the page that asks for it.
 *
 * Opening /app used to send about 85 requests to the database: the profile was
 * read 31 times and the meal log 22 times, because the meal card, the calorie
 * tile, the extras card, the first-steps card and the rest each asked for the
 * same rows on their own. From Nigeria each request takes most of a second, so
 * the page waited 5 to 14 seconds for its first card (measured 2026-10-13).
 *
 * `shared(key, read)` hands every caller the same answer for `SHARE_MS`. It is
 * NOT a store of truth:
 * - every write here clears its group (`forget`) before it tells the page to
 *   re-read, so a saved meal or a saved profile is never answered from before;
 * - a change of signed-in person clears everything (see the listener below);
 * - after SHARE_MS the next reader asks the database again, so a change made on
 *   another phone still shows within seconds.
 *
 * Arrays and Maps are copied for each caller, so one screen sorting its list
 * can never reorder another screen's.
 */
export const SHARE_MS = 20_000;

type Entry = { at: number; p: Promise<unknown> };
const store = new Map<string, Entry>();

function copy<T>(v: T): T {
  if (Array.isArray(v)) return [...v] as T;
  if (v instanceof Map) return new Map(v) as T;
  return v;
}

export function shared<T>(key: string, read: () => Promise<T>, ttl = SHARE_MS): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttl) return (hit.p as Promise<T>).then(copy);
  const p = read();
  store.set(key, { at: now, p });
  // A read that threw is never handed to the next caller.
  p.catch(() => {
    if (store.get(key)?.p === p) store.delete(key);
  });
  return p.then(copy);
}

/** Drop every shared read whose key starts with one of these. */
export function forget(...prefixes: string[]): void {
  for (const k of [...store.keys()]) if (prefixes.some((p) => k.startsWith(p))) store.delete(k);
}

/** Groups, so a write clears exactly what it changed. */
export const MEALS = "meals:";
export const READINGS = "readings:";
export const PROFILE = "profile:";
export const HBA1C = "hba1c:";
export const WEIGHT = "weight:";

// A different person signing in on this tab must never see the last person's
// rows. The first event is the page's own starting session, so it only records
// who that is; after that, any change of person clears everything.
if (typeof window !== "undefined") {
  let lastUid: string | null | undefined;
  try {
    createClient().auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (lastUid !== undefined && uid !== lastUid) store.clear();
      lastUid = uid;
    });
  } catch {
    /* no auth client: nothing to clear */
  }
}
