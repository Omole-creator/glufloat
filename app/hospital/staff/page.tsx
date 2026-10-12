import type { Metadata } from "next";
import HospitalShell from "@/components/hospital/HospitalShell";
import NotStaff from "@/components/hospital/NotStaff";
import { requireStaffPage } from "@/components/hospital/requireStaff";
import { whatsappNumber, type StaffRow } from "@/lib/hospitalServer";
import StaffPanel from "./StaffPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Doctors and dietitians", robots: { index: false, follow: false } };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireStaffPage(sp.h, "/hospital/staff");
  if (!ctx) return <NotStaff />;
  const [{ data: staff }, { data: invites }] = await Promise.all([
    ctx.admin.from("hospital_staff").select("*").eq("hospital_id", ctx.hospital.id).order("created_at"),
    ctx.admin
      .from("hospital_invites")
      .select("token,role,name,phone,expires_at")
      .eq("hospital_id", ctx.hospital.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);
  // The same choice chatContact() makes for the patient's app.
  const reachable = ((staff ?? []) as StaffRow[]).filter((s) => whatsappNumber(s.phone));
  const chat =
    reachable.find((s) => s.user_id === ctx.hospital.chat_user_id) ??
    reachable.find((s) => s.role === "dietitian") ??
    reachable.find((s) => s.role === "doctor");
  return (
    <HospitalShell
      ctx={ctx}
      title="Doctors and dietitians"
      subtitle="Everyone here can see every patient's record. Adding staff is free."
    >
      <StaffPanel
        hid={ctx.all.length > 1 ? ctx.hospital.id : null}
        me={ctx.user.id}
        isAdmin={ctx.staff.role === "admin"}
        hospitalName={ctx.hospital.name}
        staff={(staff ?? []) as StaffRow[]}
        invites={(invites ?? []) as { token: string; role: "admin" | "doctor" | "dietitian"; name: string | null; phone: string | null; expires_at: string }[]}
        chatUserId={ctx.hospital.chat_user_id}
        chatId={chat?.user_id ?? null}
        chatName={chat?.name ?? null}
      />
    </HospitalShell>
  );
}
