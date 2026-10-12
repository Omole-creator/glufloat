import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { createAdminClient } from "@/lib/supabase/server";
import { hospitalLive } from "@/lib/hospitalPlans";
import JoinForm from "./JoinForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Join your hospital", robots: { index: false, follow: false } };

/**
 * Where the poster's QR code and a patient's own invite land:
 * /j/4KQ7MD (poster) or /j/4KQ7MD?t=TOKEN (their invite).
 *
 * With a token, the page greets the patient by the name the hospital typed
 * (the token is secret to them). Without one it never shows anybody's name.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ code }, { t }] = await Promise.all([params, searchParams]);
  const clean = (code ?? "").trim().toUpperCase();

  let hospital: { name: string; live: boolean } | null = null;
  let invite: { name: string; phone: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("hospitals").select("id,name,status,access_until").eq("code", clean).maybeSingle();
    if (data) {
      hospital = { name: data.name as string, live: hospitalLive(data as { status: string; access_until: string | null }) };
      if (t) {
        const { data: p } = await admin
          .from("hospital_patients")
          .select("name,phone")
          .eq("hospital_id", data.id)
          .eq("invite_token", t)
          .eq("status", "invited")
          .is("user_id", null)
          .maybeSingle();
        if (p) invite = { name: p.name as string, phone: p.phone as string };
      }
    }
  } catch {
    hospital = null;
  }

  if (!hospital || !hospital.live) {
    return (
      <AuthShell
        title={hospital ? "Not open right now" : "We could not find this hospital"}
        subtitle={
          hospital
            ? `${hospital.name}'s GluFloat is not open right now. Please speak to your hospital.`
            : "Please check the address, or ask your hospital for it again."
        }
      >
        <a href="/j" className="font-semibold text-brand hover:underline">
          Type your hospital code
        </a>
      </AuthShell>
    );
  }

  const first = invite?.name.split(/\s+/)[0];
  return (
    <AuthShell
      title={first ? `Welcome, ${first}` : `Join ${hospital.name}`}
      subtitle={`${hospital.name} gives you GluFloat. It tells you what to eat for your diabetes and how much, and keeps a report for your doctor.`}
      sideTitle={hospital.name}
    >
      <JoinForm
        code={clean}
        token={invite ? t ?? null : null}
        hospitalName={hospital.name}
        knownName={invite?.name ?? null}
        tokenWasBad={!!t && !invite}
      />
    </AuthShell>
  );
}
