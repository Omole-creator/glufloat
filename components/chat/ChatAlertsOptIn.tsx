"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { enablePush, pushConfigured, pushPermission } from "@/lib/push";

/**
 * "Get a phone alert" for chat messages. Shown only while this phone has not
 * been asked yet; once it says yes or no, it never shows again (the browser
 * remembers). Uses the same phone alerts as the meal reminders, so somebody
 * who already allowed those gets chat alerts with no extra step.
 */
export default function ChatAlertsOptIn({ text, wrapClassName }: { text: string; /** Space around it, only when it shows. */ wrapClassName?: string }) {
  const [state, setState] = useState<"hidden" | "ask" | "on" | "blocked">("hidden");

  useEffect(() => {
    if (pushConfigured() && pushPermission() === "default") setState("ask");
  }, []);

  if (state === "hidden") return null;
  const box = (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand/[0.06] px-4 py-3 ring-1 ring-inset ring-brand/10">
      <BellRing className="h-5 w-5 shrink-0 text-brand" strokeWidth={2.2} />
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
        {state === "on" ? "Phone alerts are on." : state === "blocked" ? "Alerts are off on this phone. You can turn them on in your phone's settings." : text}
      </p>
      {state === "ask" && (
        <button
          type="button"
          onClick={async () => {
            const r = await enablePush();
            setState(r.ok ? "on" : r.reason === "denied" ? "blocked" : "hidden");
          }}
          className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-deep"
        >
          Turn on alerts
        </button>
      )}
    </div>
  );
  return wrapClassName ? <div className={wrapClassName}>{box}</div> : box;
}
