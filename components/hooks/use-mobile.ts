"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind's `md` breakpoint, so this agrees with every `md:` class already in the app. */
const MOBILE_BREAKPOINT = 768;

/** `undefined` until the first effect runs (no window on the server). */
export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
