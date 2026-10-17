import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import DoctorStartForm from "./DoctorStartForm";

export const metadata: Metadata = {
  title: "GluFloat for doctors",
  robots: { index: false, follow: false },
};

/**
 * GluFloat for doctors: reached through a link from a field agent or a
 * colleague (/d/<code>), and since 2026-10-17 from a quiet "For doctors" line
 * in the For professionals menu and the footer (never a home-page card). A
 * doctor who arrives that way is credited to nobody, so only they earn.
 */
export default function DoctorStartPage() {
  return (
    <AuthShell
      side="hospital"
      sideTitle="GluFloat for doctors"
      title="Look after your patients' diabetes between visits"
      subtitle="Your patients learn what to eat and how much. You see their meals, sugar tests and reports. Free for you."
    >
      <DoctorStartForm />
    </AuthShell>
  );
}
