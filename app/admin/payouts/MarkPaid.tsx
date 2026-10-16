"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Record that this week's money was sent to one person (by earning id). */
export default function MarkPaid({
  who,
  name,
  amount,
  earningIds,
}: {
  who: { hospitalId: string } | { agentId: string };
  name: string;
  amount: string;
  earningIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async () => {
    if (!confirm(`Have you sent ${amount} to ${name}? This marks it as paid.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...who, earningIds }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) alert(j.error ?? "That did not work. Please try again.");
    router.refresh();
  };
  return (
    <button
      onClick={act}
      disabled={busy}
      aria-label={`Mark ${amount} to ${name} as paid`}
      className="rounded-full bg-leaf px-4 py-1.5 text-xs font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
    >
      {busy ? "..." : "Mark as paid"}
    </button>
  );
}
