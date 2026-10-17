import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { PATIENT_FREE_DAYS } from "@/lib/patientPays";
import StartForm from "./StartForm";

export const metadata: Metadata = {
  title: "Start GluFloat for dietitians",
  robots: { index: false, follow: false },
};

export default function DietitianStartPage() {
  return (
    <AuthShell
      title="Start GluFloat for your patients"
      sideTitle="GluFloat for dietitians"
      subtitle={`No payment to start. You set your price. Each patient gets ${PATIENT_FREE_DAYS} free days, then pays you inside GluFloat.`}
    >
      <StartForm />
    </AuthShell>
  );
}
