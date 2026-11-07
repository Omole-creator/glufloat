"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { linkCode } from "@/lib/creatorClient";

/**
 * On the home page, for somebody who came through a creator's link
 * (glufloat.com/faith): one small pill at the bottom saying the code is
 * saved, so they know it worked. Everyone else sees nothing, and the home
 * page stays a static page (this reads a cookie after it loads).
 */
export default function HomeCodeBanner() {
  const [code, setCode] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => setCode(linkCode()), []);
  if (!code || closed) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex max-w-md items-center gap-2 rounded-full bg-leaf px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-10px_rgba(12,45,77,0.5)]">
        <BadgeCheck aria-hidden className="h-4 w-4 shrink-0" />
        <span>Code {code} saved. 20% off your first 3 months after your free week.</span>
        <button type="button" onClick={() => setClosed(true)} aria-label="Close" className="shrink-0 text-white/80 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
