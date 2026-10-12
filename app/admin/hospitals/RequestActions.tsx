"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InviteLinkBox from "@/components/hospital/InviteLinkBox";

/** Approve or decline one pilot request. Approving hands back the admin's set-up link. */
export default function RequestActions({
  id,
  hospitalName,
  contactName,
  contactPhone,
}: {
  id: string;
  hospitalName: string;
  contactName: string | null;
  contactPhone: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const act = async (action: "approve" | "decline") => {
    if (action === "decline" && !confirm(`Decline ${hospitalName}?`)) return;
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/hospitals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong.");
    if (action === "approve" && j.token) setToken(j.token);
    else router.refresh();
  };

  if (token)
    return (
      <div className="w-full">
        <InviteLinkBox
          token={token}
          hospitalName={hospitalName}
          name={contactName}
          phone={contactPhone}
          role="admin"
        />
        <button onClick={() => router.refresh()} className="mt-3 text-sm font-bold text-brand hover:underline">
          Done
        </button>
      </div>
    );

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => act("decline")}
          className="rounded-full border border-[#e3e9f1] px-4 py-2 text-sm font-bold text-ink-soft hover:text-ink disabled:opacity-50"
        >
          Decline
        </button>
        <button
          disabled={busy}
          onClick={() => act("approve")}
          className="rounded-full bg-leaf px-4 py-2 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
        >
          Approve free pilot
        </button>
      </div>
      {err && <p className="text-sm text-verdict-red">{err}</p>}
    </div>
  );
}
