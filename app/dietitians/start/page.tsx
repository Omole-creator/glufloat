import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { PRACTICE_TRIAL_DAYS, PRACTICE_TRIAL_SEATS } from "@/lib/hospitalPlans";
import StartForm from "./StartForm";

export const metadata: Metadata = {
  title: "Start GluFloat for dietitians",
  robots: { index: false, follow: false },
};

export default function DietitianStartPage() {
  return (
    <AuthShell
      title={`Start your ${PRACTICE_TRIAL_DAYS} free days`}
      sideTitle="GluFloat for dietitians"
      subtitle={`For ${PRACTICE_TRIAL_SEATS} patients. Your ${PRACTICE_TRIAL_DAYS} days start when your first patient joins. No payment to start.`}
    >
      <StartForm />
    </AuthShell>
  );
}
