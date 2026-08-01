"use client";

import { useEffect, useState } from "react";
import { getAccess, type Access } from "@/lib/account";
import { createClient } from "@/lib/supabase/client";

// One access read, shared by every button on the page.
//
// The navbar plus the six calls to action on the landing page would otherwise fire
// seven identical getAccess() round trips on one page load. The promise is cached at
// module level, so they all wait on the same one.

type Result = {
  email: string | null;
  name: string | null;
  access: Access;
};

let cached: Promise<Result> | null = null;

/** getAccess(), but every caller on the page shares a single request. */
export function accessOnce(): Promise<Result> {
  return (cached ??= getAccess());
}

/** Throw the shared answer away, so the next reader asks the account again. */
export function clearAccessCache(): void {
  cached = null;
}

// A signed-in member should not see "Start my 7-day free trial" flash on screen
// before the account answers. This remembers only that somebody was signed in on this
// device, so the first paint can be the member button.
//
// IMPORTANT: this picks a BUTTON LABEL and nothing else. It grants no access. /app
// still gates on getAccess() against the account, exactly as before. Do not grow this
// into a device-based access check: that is the localStorage gating lib/access.ts
// deleted on purpose.
const HINT_KEY = "gf_seen_in";

function readHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(HINT_KEY, "1");
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // Private mode. One flash on the next visit is the whole cost.
  }
}

export type AccessState = Result & {
  /** True once the account has really answered. Before that, access is a guess. */
  ready: boolean;
};

const ANON: Result = { email: null, name: null, access: { status: "anon" } };

export function useAccess(): AccessState {
  // The server has no session, so it must render the anon shape or hydration breaks.
  // The hint is read after mount instead.
  const [state, setState] = useState<AccessState>({ ...ANON, ready: false });

  useEffect(() => {
    let alive = true;

    // Paint the member button straight away if this device was signed in last time.
    // It is replaced a moment later by whatever the account actually says.
    if (readHint()) {
      setState((s) =>
        s.ready ? s : { ...s, access: { status: "subscribed", daysLeft: 30 } },
      );
    }

    const load = () => {
      accessOnce().then((r) => {
        if (!alive) return;
        writeHint(r.access.status !== "anon");
        setState({ ...r, ready: true });
      });
    };
    load();

    // Without this the bar keeps saying "Log in" after somebody signs in, until they
    // reload the page.
    const { data } = createClient().auth.onAuthStateChange(() => {
      clearAccessCache();
      load();
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
