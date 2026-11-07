"use client";

import CodeBox, { CodeAdded } from "./CodeBox";
import { addCode, type CreatorState } from "@/lib/creatorClient";

/**
 * On Today, during the free week only: a quiet "Have a code?" for somebody
 * who heard a creator's code but did not use the link, or the green line
 * once a code is on. Nothing for anyone else, and nothing after they pay.
 */
export default function CreatorCodeToday({ creator, trial }: { creator: CreatorState | null; trial: boolean }) {
  if (!trial || !creator) return null;
  if (creator.code)
    return <CodeAdded code={creator.code} text="You get 20% off your first 3 months when your free week ends." />;
  if (!creator.canAdd) return null;
  return (
    <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
      <CodeBox onAdd={addCode} tone="plain" />
    </div>
  );
}
