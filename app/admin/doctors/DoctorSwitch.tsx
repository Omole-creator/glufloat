"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Switch a GluFloat doctor off, or back on. */
export default function DoctorSwitch({ id, name, off }: { id: string; name: string; off: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async () => {
    if (!off && !confirm(`Switch off ${name}? Their dashboard closes and they stop earning. Their patients keep their own accounts.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/doctors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: off ? "on" : "off" }),
    });
    setBusy(false);
    if (!res.ok) return alert("That did not work. Please try again.");
    router.refresh();
  };
  return (
    <button
      onClick={act}
      disabled={busy}
      aria-label={off ? `Switch ${name} back on` : `Switch ${name} off`}
      className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
        off ? "bg-leaf text-white hover:bg-leaf-deep" : "border border-line text-ink-soft hover:border-verdict-red hover:text-verdict-red"
      }`}
    >
      {busy ? "..." : off ? "Switch on" : "Switch off"}
    </button>
  );
}
