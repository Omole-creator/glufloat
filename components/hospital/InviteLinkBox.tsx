"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { normalizePhone } from "@/lib/phone";

const ROLE_WORD = { admin: "admin", doctor: "doctor", dietitian: "dietitian" } as const;

function wa(phone: string | null | undefined): string | null {
  const local = normalizePhone(phone);
  if (!local) return null;
  return local.startsWith("0") && local.length === 11 ? "234" + local.slice(1) : local;
}

/**
 * A staff invite link, with the two ways it actually gets sent here: WhatsApp
 * (first, because that is how this audience passes a link) and copy.
 */
export default function InviteLinkBox({
  token,
  hospitalName,
  name,
  phone,
  role,
}: {
  token: string;
  hospitalName: string;
  name: string | null;
  phone: string | null;
  role: keyof typeof ROLE_WORD;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/hospital/join/${token}`;
  const first = (name ?? "").trim().split(/\s+/)[0];
  const text = `Hello${first ? ` ${first}` : ""}, here is your link to join ${hospitalName} on GluFloat as ${
    role === "admin" ? "an" : "a"
  } ${ROLE_WORD[role]}: ${url}\n\nIt works once, for 14 days.`;
  const number = wa(phone);

  return (
    <div className="rounded-xl bg-mist/70 p-3.5">
      <p className="text-xs font-semibold text-ink-soft">
        Send this link to {name || "them"}. It works once, for 14 days.
      </p>
      <p className="mt-1.5 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-ink ring-1 ring-inset ring-line">{url}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:brightness-95"
        >
          Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:border-brand"
        >
          {copied ? <Check className="h-4 w-4 text-leaf" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
