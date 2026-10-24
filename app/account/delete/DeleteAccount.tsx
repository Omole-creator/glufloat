"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, MessageCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { createClient } from "@/lib/supabase/client";

type Preview = {
  internal: boolean;
  paidDaysLeft: number;
  practices: { id: string; name: string; kind: string }[];
  owedKobo: number;
};

const SUPPORT_WHATSAPP = "2348132097317";

function naira(kobo: number): string {
  return `N${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * "Delete my account", for every kind of user (lib/accountDelete.ts has the
 * rules). One screen: what goes, what stays, the paid days that are lost,
 * and a typed DELETE. No undo.
 */
export default function DeleteAccount() {
  const router = useRouter();
  const [pre, setPre] = useState<Preview | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/account/delete")
      .then(async (r) => {
        if (r.status === 401) return setSignedOut(true);
        setPre((await r.json()) as Preview);
      })
      .catch(() => setProblem("Could not load this page. Check your internet and try again."));
  }, []);

  const del = async () => {
    if (typed.trim().toUpperCase() !== "DELETE") {
      setProblem("Type DELETE in the box to confirm.");
      return;
    }
    setBusy(true);
    setProblem("");
    const r = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    }).catch(() => null);
    if (!r || !r.ok) {
      const body = r ? await r.json().catch(() => ({})) : {};
      setProblem(body.error ?? "Could not delete your account. Check your internet and try again.");
      setBusy(false);
      return;
    }
    // The server has already signed them out; clear this browser too.
    await createClient()
      .auth.signOut()
      .catch(() => undefined);
    try {
      localStorage.clear();
    } catch {
      /* nothing to clear */
    }
    setDone(true);
    setBusy(false);
  };

  if (done) {
    return (
      <AuthShell title="Your account is deleted" subtitle="Thank you for using GluFloat. We wish you good health.">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full rounded-full bg-brand px-5 py-3.5 text-sm font-bold text-white hover:bg-brand-deep"
        >
          Go to the home page
        </button>
      </AuthShell>
    );
  }

  if (signedOut) {
    return (
      <AuthShell title="Delete my account" subtitle="Sign in first, then come back to this page.">
        <Link
          href="/signin"
          className="block w-full rounded-full bg-brand px-5 py-3.5 text-center text-sm font-bold text-white hover:bg-brand-deep"
        >
          Sign in
        </Link>
      </AuthShell>
    );
  }

  const blocked = pre != null && (pre.internal || pre.owedKobo > 0);

  return (
    <AuthShell title="Delete my account" subtitle="This deletes your GluFloat account for good. You cannot undo it.">
      {!pre ? (
        <p className="text-center text-sm text-ink-soft">{problem || "Loading..."}</p>
      ) : (
        <div className="space-y-4 text-sm leading-relaxed text-ink">
          <div className="rounded-2xl bg-mist p-4">
            <p className="font-bold">What we delete</p>
            <p className="mt-1 text-ink-soft">
              Your details, the meals you saved, your sugar tests, your reports and your chats.
            </p>
            <p className="mt-3 font-bold">What we keep</p>
            <p className="mt-1 text-ink-soft">
              A record of payments, without your name or email, because the law asks us to keep our accounts.
            </p>
          </div>

          {pre.paidDaysLeft > 0 && (
            <p className="rounded-2xl bg-verdict-yellow/15 p-4 font-semibold text-ink ring-1 ring-verdict-yellow/40">
              You still have {pre.paidDaysLeft} paid {pre.paidDaysLeft === 1 ? "day" : "days"}. These will be lost and
              are not refunded.
            </p>
          )}

          {pre.practices.length > 0 && pre.owedKobo === 0 && (
            <p className="rounded-2xl bg-mist p-4 text-ink-soft">
              Your patient list will close. Each patient keeps their own GluFloat account.
            </p>
          )}

          {pre.internal && (
            <p className="rounded-2xl bg-mist p-4 font-semibold text-ink">
              This is a GluFloat team or test account. It cannot be deleted here.
            </p>
          )}

          {pre.owedKobo > 0 && (
            <div className="rounded-2xl bg-mist p-4">
              <p className="font-semibold text-ink">
                GluFloat still owes you {naira(pre.owedKobo)}. Message us so we can pay you first. Then you can delete
                your account.
              </p>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep"
              >
                <MessageCircle className="h-4 w-4" /> Message us on WhatsApp
              </a>
            </div>
          )}

          {!blocked && (
            <>
              <label className="block">
                <span className="font-semibold">Type DELETE to confirm</span>
                <input
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setProblem("");
                  }}
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-verdict-red"
                />
              </label>
              {problem && <p className="font-semibold text-verdict-red">{problem}</p>}
              <button
                type="button"
                onClick={del}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-verdict-red px-5 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> {busy ? "Deleting..." : "Delete my account for good"}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => router.back()}
            className="block w-full text-center text-sm font-semibold text-brand hover:underline"
          >
            Keep my account
          </button>
        </div>
      )}
    </AuthShell>
  );
}
