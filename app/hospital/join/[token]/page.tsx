import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { createAdminClient } from "@/lib/supabase/server";
import StaffJoinForm from "./StaffJoinForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join your hospital's team", robots: { index: false, follow: false } };

const ROLE_WORD = { admin: "hospital admin", doctor: "doctor", dietitian: "dietitian" } as const;

export default async function StaffJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invite: { hospital: string; role: keyof typeof ROLE_WORD; name: string | null; phone: string | null; email: string | null } | null = null;
  let bad = "This invite link is not right. Please ask for a new one.";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("hospital_invites")
      .select("role,name,phone,email,used_at,expires_at,hospitals(name)")
      .eq("token", token)
      .maybeSingle();
    if (data) {
      if (data.used_at) bad = "This invite has already been used. If that was you, just log in.";
      else if (new Date(data.expires_at as string).getTime() < Date.now()) bad = "This invite is more than 14 days old. Please ask for a new one.";
      else
        invite = {
          hospital: (data as unknown as { hospitals: { name: string } | null }).hospitals?.name ?? "your hospital",
          role: data.role as keyof typeof ROLE_WORD,
          name: (data.name as string | null) ?? null,
          phone: (data.phone as string | null) ?? null,
          email: (data.email as string | null) ?? null,
        };
    }
  } catch {
    /* falls through to `bad` */
  }

  if (!invite)
    return (
      <AuthShell title="This link does not work" subtitle={bad} side="hospital">
        <a href="/signin" className="font-semibold text-brand hover:underline">
          Log in
        </a>
      </AuthShell>
    );

  return (
    <AuthShell
      side="hospital"
      sideTitle={invite.hospital}
      title={`Join as ${invite.role === "admin" ? "the" : "a"} ${ROLE_WORD[invite.role]}`}
      subtitle={`${invite.hospital} uses GluFloat. Make your login to see your patients' meals, sugar tests and reports.`}
    >
      <StaffJoinForm token={token} name={invite.name} phone={invite.phone} email={invite.email} hospital={invite.hospital} />
    </AuthShell>
  );
}
