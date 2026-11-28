import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import StartForm from "./StartForm";

export const metadata: Metadata = {
  title: "Start Glufloat for dietitians",
  robots: { index: false, follow: false },
};

export default function DietitianStartPage() {
  return (
    <AuthShell
      title="Start Glufloat for your patients"
      sideTitle="Glufloat for dietitians"
      subtitle="No payment to start. You set your price and choose the free days. Your patients pay you inside Glufloat."
    >
      <StartForm />
    </AuthShell>
  );
}
