"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const MAX_TRIES = 20;
const WAIT_MS = 3000;

/**
 * Links a dietitian's Paystack payment to her practice
 * (/api/paystack/claim, which sends a practice amount to
 * lib/practicePayment.ts). A card clears at once. A bank transfer or USSD can
 * take a minute, and Paystack answers "pending" (202) until it lands, so this
 * asks again every few seconds, the same way /unlock does for patients.
 */
export default function PaidClaim() {
  const router = useRouter();
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [state, setState] = useState<"working" | "slow" | "failed" | "no_practice">(reference ? "working" : "failed");

  useEffect(() => {
    if (!reference) return;
    let stop = false;
    let tries = 0;
    (async function run() {
      if (stop) return;
      const res = await fetch("/api/paystack/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      }).catch(() => null);
      if (stop) return;
      if (res?.status === 401) {
        router.replace(`/signin?next=${encodeURIComponent(`/dietitians/paid?reference=${reference}`)}`);
        return;
      }
      if (res?.ok) {
        router.replace("/hospital/plan?paid=1");
        router.refresh();
        return;
      }
      if (res?.status === 402) return setState("failed");
      const j = res ? await res.json().catch(() => null) : null;
      if (j?.error === "no_practice") return setState("no_practice");
      if (++tries >= MAX_TRIES) return setState("slow");
      setTimeout(run, WAIT_MS);
    })();
    return () => {
      stop = true;
    };
  }, [reference, router]);

  if (state === "working")
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center text-sm text-ink-soft">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" aria-hidden />
        Please wait. If you paid by bank transfer, this can take a minute.
      </div>
    );

  const help = encodeURIComponent(`Hello GluFloat, I paid for my dietitian plan. My payment reference is ${reference || "(none)"}.`);
  return (
    <div className="space-y-4 text-center text-sm text-ink">
      <p>
        {state === "failed"
          ? "Paystack says this payment did not go through. No money was taken for it."
          : state === "no_practice"
            ? "We got your payment, but we could not find your dietitian account. Please send us a message and we will sort it out."
            : "Your payment has not reached us yet. Bank transfers can take a while. You can close this page, and your plan opens once it lands."}
      </p>
      <a
        href={`https://wa.me/2348132097317?text=${help}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center rounded-full bg-leaf text-sm font-bold text-white hover:bg-leaf-deep"
      >
        Message GluFloat on WhatsApp
      </a>
      <Link href="/hospital/plan" className="block font-semibold text-brand hover:underline">
        Back to my plan
      </Link>
    </div>
  );
}
