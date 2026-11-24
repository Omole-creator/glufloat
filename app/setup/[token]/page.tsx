import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { createAdminClient } from "@/lib/supabase/server";
import { isNursePractice } from "@/lib/hospitalPlans";
import { looksLikeNurseToken, nurseFirstName } from "@/lib/nurseCodes";
import DoctorSetupForm from "@/app/doctors/setup/[token]/DoctorSetupForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finish setting up", robots: { index: false, follow: false } };

/**
 * A nurse partner's set-up link: glufloat.com/setup/<first name><2 digits>
 * (founder, 2026-11-24). It never shows her email: she types it, with a new
 * password, so a guessed link opens nothing.
 */
export default async function NurseSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invite: { name: string } | null = null;
  let bad = "This link is not right. Please ask Glufloat for a new one on 0813 209 7317.";
  if (looksLikeNurseToken(token)) {
    try {
      const { data } = await createAdminClient()
        .from("hospital_invites")
        .select("name,used_at,expires_at,hospitals(kind,contact_role)")
        .eq("token", token)
        .maybeSingle();
      const h = (data as unknown as { hospitals: { kind: string | null; contact_role: string | null } | null } | null)?.hospitals;
      if (data && isNursePractice(h)) {
        if (data.used_at) bad = "This link has already been used. If that was you, just log in.";
        else if (new Date(data.expires_at as string).getTime() < Date.now())
          bad = "This link is more than 14 days old. Please ask Glufloat for a new one on 0813 209 7317.";
        else invite = { name: (data.name as string | null) ?? "" };
      }
    } catch {
      /* falls through to `bad` */
    }
  }

  if (!invite)
    return (
      <AuthShell side="hospital" sideTitle="Glufloat for nurses" title="This link does not work" subtitle={bad}>
        <a href="/signin" className="font-semibold text-brand hover:underline">
          Log in
        </a>
      </AuthShell>
    );

  const f = nurseFirstName(invite.name);
  const first = f ? f.charAt(0) + f.slice(1).toLowerCase() : invite.name;
  return (
    <AuthShell
      side="hospital"
      sideTitle="Glufloat for nurses"
      title={`Welcome, ${first}`}
      subtitle="Type your email and choose a password. Then add your patients, or show them your QR code."
    >
      <DoctorSetupForm token={token} email="" nurse />
    </AuthShell>
  );
}
