"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Field, SubmitButton } from "@/components/auth/Field";

/** glufloat.com/j with no code: type the code printed under a hospital or dietitian QR code. */
export default function TypeCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <AuthShell title="Join with your code" subtitle="Type the code printed under your hospital or dietitian's GluFloat QR code.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.replace(/[^a-z0-9]/gi, "").toUpperCase();
          if (!c) return;
          setBusy(true);
          router.push(`/j/${c}`);
        }}
        className="space-y-5"
      >
        <Field
          label="Hospital code"
          icon={Hash}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. 4KQ7MD"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          required
        />
        <SubmitButton busy={busy} busyText="Opening..." tone="leaf">
          Continue
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
