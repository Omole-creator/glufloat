import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { createAdminClient } from "@/lib/supabase/server";
import DoctorSetupForm from "./DoctorSetupForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finish setting up", robots: { index: false, follow: false } };

export default async function DoctorSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invite: { name: string; email: string } | null = null;
  let bad = "This link is not right. Please sign up again to get a new one.";
  try {
    const { data } = await createAdminClient()
      .from("hospital_invites")
      .select("name,email,used_at,expires_at,hospitals(kind)")
      .eq("token", token)
      .maybeSingle();
    const kind = (data as unknown as { hospitals: { kind: string | null } | null } | null)?.hospitals?.kind;
    if (data && kind === "doctor") {
      if (data.used_at) bad = "This link has already been used. If that was you, just log in.";
      else if (new Date(data.expires_at as string).getTime() < Date.now()) bad = "This link is more than 14 days old. Please sign up again to get a new one.";
      else invite = { name: (data.name as string | null) ?? "Doctor", email: (data.email as string | null) ?? "" };
    }
  } catch {
    /* falls through to `bad` */
  }

  if (!invite)
    return (
      <AuthShell side="hospital" sideTitle="GluFloat for doctors" title="This link does not work" subtitle={bad}>
        <a href="/signin" className="font-semibold text-brand hover:underline">
          Log in
        </a>
      </AuthShell>
    );

  return (
    <AuthShell
      side="hospital"
      sideTitle="GluFloat for doctors"
      title={`Welcome, ${invite.name}`}
      subtitle="Choose your password. Then add your patients, or show them your QR code."
    >
      <DoctorSetupForm token={token} email={invite.email} />
    </AuthShell>
  );
}
