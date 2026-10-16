import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import DoctorStartForm from "./DoctorStartForm";

export const metadata: Metadata = {
  title: "GluFloat for doctors",
  robots: { index: false, follow: false },
};

/**
 * GluFloat for doctors: reached only through a link from a field agent or a
 * colleague (/d/<code>), never from the site's menus (founder, 2026-10-16).
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
