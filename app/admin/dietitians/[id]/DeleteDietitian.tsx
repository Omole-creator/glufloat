"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/**
 * Delete a dietitian's practice (founder, 2026-10-13: the practice only, never
 * their login). Uses the same route as deleting a hospital
 * (/api/admin/hospitals DELETE): the practice, its patient list, notes and
 * rules go; patients keep their own accounts and get back any paid days they
 * brought; the dietitian's login stays an ordinary account; money already in
 * Finance and her Paystack payment records stay.
 */
export default function DeleteDietitian({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const del = async () => {
    const typed = prompt(
      `This deletes ${name}'s practice, patient list, notes and food rules. Patients keep their own GluFloat accounts, and ${name} keeps their login.\n\nType the name to delete it:`,
    );
    if (typed == null) return;
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/hospitals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, confirmName: typed }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(j.error === "Type the hospital's name exactly to delete it." ? "Type the name exactly to delete it." : j.error ?? "Could not delete.");
    router.push("/admin/dietitians");
    router.refresh();
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={del}
        disabled={busy}
        aria-label={`Delete ${name}`}
        className="inline-flex items-center gap-1 rounded-full border border-verdict-red/30 px-3 py-1.5 text-xs font-bold text-verdict-red hover:bg-verdict-red/10 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> {busy ? "Deleting..." : "Delete dietitian"}
      </button>
      {msg && <span className="text-xs font-semibold text-verdict-red">{msg}</span>}
    </span>
  );
}
