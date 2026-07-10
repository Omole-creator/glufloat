"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAccess } from "@/lib/account";
import {
  savePendingReference,
  clearPendingReference,
  pendingReference,
} from "@/lib/access";
import { events } from "@/lib/analytics";

/**
 * Where Paystack sends a buyer after payment. The redirect URL set in the
 * Paystack dashboard points here, so this route must keep existing even though
 * the old `code` param is ignored: deleting it would 404 every buyer.
 *
 * There used to be an access-code form here backed by localStorage. Access is
 * an account fact now (see lib/account.ts), so a code could never open the app,
 * yet the page still said "You are in".
 *
 * Paystack appends `reference` (and `trxref`) to the callback. We hand that to
 * /api/paystack/claim, which verifies it with Paystack and grants the payment to
 * the signed-in account. That is what makes access survive a buyer paying under
 * a different email than they signed up with: the webhook matches on email and
 * would miss them, but the claim matches on session. If there is no reference
 * (they reopened the page later) we fall back to waiting for the webhook.
 */
/**
 * Card clears in seconds. Transfer and USSD do not: the buyer is sent back here
 * while the bank is still moving the money. So we keep claiming the reference
 * rather than claiming once, and we wait minutes rather than seconds.
 */
const POLL_MS = 2500;
const MAX_TRIES = 48; // about two minutes

function Card({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_16px_40px_-18px_rgba(12,45,77,0.35)]">
        {children}
      </div>
    </main>
  );
}

function UnlockInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let stop = false;
    let tries = 0;
    // Fall back on a reference kept from an earlier visit: a transfer buyer who
    // closed the tab before the money landed still gets unlocked when they
    // return, without depending on the email they typed on Paystack.
    const reference =
      params.get("reference") || params.get("trxref") || pendingReference();
    if (reference) savePendingReference(reference);

    (async function run() {
      if (stop) return;
      let { access } = await getAccess();

      if (access.status === "anon") {
        router.replace("/signin");
        return;
      }

      // Claim before deciding where to send them. Someone who pays while still
      // on their free trial already reads as "trial", so an early redirect here
      // would leave the payment unlinked and lock them out when the trial ends.
      //
      // Claim on EVERY pass, not once. A transfer that has not settled answers
      // 202 "pending", and the next pass is what finally links the payment. The
      // claim is idempotent, and it identifies the payer by session rather than
      // by the email they typed, which is the whole point.
      if (reference && access.status !== "subscribed") {
        const res = await fetch("/api/paystack/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        }).catch(() => null);

        if (res?.ok) {
          clearPendingReference();
        } else if (res?.status === 402) {
          // Paystack says this payment failed outright. Retrying cannot help.
          clearPendingReference();
          setSlow(true);
          return;
        }
        ({ access } = await getAccess());
      }

      if (access.status === "subscribed") {
        clearPendingReference();
        events.unlocked();
        router.replace("/app");
        return;
      }
      // No reference to wait on, and they already have access: nothing to do.
      if (!reference && access.status === "trial") {
        router.replace("/app");
        return;
      }

      if (++tries >= MAX_TRIES) {
        setSlow(true);
        return;
      }
      setTimeout(run, POLL_MS);
    })();

    return () => {
      stop = true;
    };
  }, [router, params]);

  if (slow) {
    return (
      <>
        <Navbar />
        <Card>
          <h1 className="font-display text-2xl font-bold text-ink">
            Your payment is still going through
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Your money is safe. If you paid by bank transfer or USSD, the bank
            can take a few minutes to send it.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            You do not have to wait here. Open the app, and we will let you in
            as soon as the money lands. If it still asks you to pay after an
            hour, send us the email you signed up with and we will fix it.
          </p>
          <Link
            href="/app"
            className="mt-6 inline-block rounded-full bg-leaf px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-leaf-deep"
          >
            Open the app
          </Link>
        </Card>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Card>
        <h1 className="font-display text-2xl font-bold text-ink">
          Checking your payment
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          One moment. We are opening the app for you.
        </p>
      </Card>
      <Footer />
    </>
  );
}

// useSearchParams needs a Suspense boundary above it.
export default function UnlockPage() {
  return (
    <Suspense>
      <UnlockInner />
    </Suspense>
  );
}
