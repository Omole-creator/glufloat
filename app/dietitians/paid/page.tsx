import type { Metadata } from "next";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import PaidClaim from "./PaidClaim";

export const metadata: Metadata = { title: "Finishing your payment", robots: { index: false, follow: false } };

/**
 * Where Paystack sends a dietitian after she pays for her plan (each of the
 * three "glufloat-practice-*" pages redirects here; the old /hospital/paid forwards here too). It links the payment to
 * her practice and sends her to her Plan page.
 */
export default function PaidPage() {
  return (
    <AuthShell title="Finishing your payment" sideTitle="GluFloat for dietitians">
      <Suspense fallback={<div className="h-24" />}>
        <PaidClaim />
      </Suspense>
    </AuthShell>
  );
}
