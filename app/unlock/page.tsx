"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAccess } from "@/lib/account";
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
const POLL_MS = 1500;
const MAX_TRIES = 12; // about 18 seconds

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
    const reference = params.get("reference") || params.get("trxref");

    (async function run() {
      if (stop) return;
      const { access } = await getAccess();

      if (access.status === "anon") {
        router.replace("/signin");
        return;
      }
      if (access.status === "subscribed" || access.status === "trial") {
        events.unlocked();
        router.replace("/app");
        return;
      }

      // Signed in but no access yet. If Paystack sent a reference, claim it
      // against this account rather than waiting on the email-matched webhook.
      if (reference && tries === 0) {
        await fetch("/api/paystack/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        }).catch(() => {});
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
            This can take a minute. Your money is safe.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Open the app in a minute and you should be in. If it still asks you
            to pay, send us the email you paid with and we will fix it.
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
