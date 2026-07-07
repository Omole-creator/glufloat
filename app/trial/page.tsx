"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAccess, startTrial } from "@/lib/account";
import { events } from "@/lib/analytics";

/**
 * The trial "gate": you must have an account to start the 3-day trial. New
 * accounts get their trial stamped here, then land in the app. Anonymous
 * visitors are sent to sign up first.
 */
export default function TrialPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { access } = await getAccess();
      if (access.status === "anon") {
        router.replace("/signup");
        return;
      }
      if (access.status === "new") {
        await startTrial();
        events.trialStarted();
      }
      router.replace("/app");
    })();
  }, [router]);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center justify-center bg-mist px-4 pb-24 pt-28">
        <p className="text-sm font-semibold text-ink-soft">
          Setting up your free trial...
        </p>
      </main>
      <Footer />
    </>
  );
}
