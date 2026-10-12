"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import InviteLinkBox from "@/components/hospital/InviteLinkBox";

type Role = "admin" | "doctor" | "dietitian";
const ROLE_LABEL: Record<Role, string> = { admin: "Hospital admin", doctor: "Doctor", dietitian: "Dietitian" };
const ROLE_HELP: Record<Role, string> = {
  doctor: "Can see every patient's record.",
  dietitian: "Can see every patient's record.",
  admin: "Can see every record, and can also add patients and staff. You can have more than one admin.",
};

type Staff = { user_id: string; role: Role; name: string; phone: string | null; whatsapp: string | null };

export default function StaffPanel({
  hid,
  me,
  isAdmin,
  hospitalName,
  staff,
  invites,
  chatDietitianId,
  chatDoctorId,
}: {
  hid: string | null;
  me: string;
  isAdmin: boolean;
  hospitalName: string;
  staff: Staff[];
  invites: { token: string; role: Role; name: string | null; phone: string | null; expires_at: string }[];
  chatDietitianId: string | null;
  chatDoctorId: string | null;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("doctor");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState<{ token: string; name: string; phone: string; role: Role } | null>(null);

  const call = async (method: string, body: Record<string, unknown>) => {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/hospital/staff", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hid, ...body }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(j.error ?? "Something went wrong.");
      return null;
    }
    return j;
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const j = await call("POST", { role, name, phone });
    if (j?.token) {
      setMade({ token: j.token, name, phone, role });
      setName("");
      setPhone("");
      router.refresh();
    }
  };

  const field = "mt-1.5 w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-brand";
  const withPhone = (r: Role) => staff.filter((s) => s.role === r && s.whatsapp);
  const first = (n: string) => n.replace(/^(dr|dtn|mr|mrs|ms|prof|pharm)\.?\s+/i, "").split(/\s+/)[0];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        {/* Everybody sees everybody's WhatsApp: a doctor can hand a patient to
            the dietitian, and the other way round (founder, 2026-10-12). */}
        <section className="rounded-2xl border border-[#e3e9f1] bg-white">
          <ul className="divide-y divide-[#eef2f7]">
            {staff.map((s) => (
              <li key={s.user_id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand">
                  {s.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {s.name}
                    {s.user_id === me && <span className="ml-1.5 text-xs font-normal text-ink-soft">(you)</span>}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {ROLE_LABEL[s.role]}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </p>
                  {(s.user_id === chatDietitianId || s.user_id === chatDoctorId) && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2 py-0.5 text-[11px] font-bold text-leaf-deep">
                      <MessageCircle className="h-3 w-3" /> Patients can message them
                    </span>
                  )}
                </div>
                {s.whatsapp && s.user_id !== me && (
                  <a
                    href={`https://wa.me/${s.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white hover:brightness-95"
                  >
                    WhatsApp {first(s.name)}
                  </a>
                )}
                {isAdmin && s.user_id !== me && (
                  <button
                    disabled={busy}
                    onClick={() => confirm(`Remove ${s.name}? They will no longer see your patients.`) && void call("DELETE", { userId: s.user_id }).then((j) => j && router.refresh())}
                    aria-label={`Remove ${s.name}`}
                    className="rounded-full p-2 text-ink-soft hover:bg-verdict-red/10 hover:text-verdict-red"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {isAdmin && (
          <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5">
            <h2 className="font-display text-base font-bold text-ink">Who can your patients message?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Your patients see a Chat button in their app. Pick one dietitian for food questions and one doctor for
              medicine questions. They need a WhatsApp number to show up here.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["dietitian", "dietitianId", "Dietitian", chatDietitianId],
                  ["doctor", "doctorId", "Doctor", chatDoctorId],
                ] as const
              ).map(([r, key, label, current]) => (
                <label key={r} className="text-sm font-semibold text-ink">
                  {label}
                  <select
                    aria-label={`${label} patients can message`}
                    value={current ?? ""}
                    disabled={busy || withPhone(r).length === 0}
                    onChange={(e) => void call("PATCH", { [key]: e.target.value || null }).then((j) => j && router.refresh())}
                    className="mt-1.5 w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-brand disabled:bg-mist"
                  >
                    {withPhone(r).length === 0 ? (
                      <option value="">No {label.toLowerCase()} yet</option>
                    ) : (
                      withPhone(r).map((s) => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ))}
            </div>
            {err && <p className="mt-3 text-sm text-verdict-red">{err}</p>}
          </section>
        )}

        {isAdmin && invites.length > 0 && (
          <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5">
            <h2 className="font-display text-base font-bold text-ink">Invites not used yet</h2>
            <ul className="mt-3 space-y-2">
              {invites.map((i) => (
                <li key={i.token} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-ink">
                    <span className="font-semibold">{i.name}</span> · {ROLE_LABEL[i.role]}
                  </span>
                  <span className="flex items-center gap-3">
                    <button
                      onClick={() => setMade({ token: i.token, name: i.name ?? "", phone: i.phone ?? "", role: i.role })}
                      className="font-bold text-brand hover:underline"
                    >
                      Show link
                    </button>
                    <button
                      onClick={() => void call("DELETE", { inviteToken: i.token }).then((j) => j && router.refresh())}
                      className="text-ink-soft hover:text-verdict-red"
                    >
                      Cancel
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {isAdmin ? (
        <form onSubmit={invite} className="h-fit rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink">Add a doctor, dietitian or admin</h2>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-[#f2f5f9] p-1" role="radiogroup" aria-label="Their job">
            {(["doctor", "dietitian", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={`rounded-full px-2 py-2 text-sm font-bold transition-colors ${role === r ? "bg-white text-ink shadow-sm" : "text-ink-soft"}`}
              >
                {r === "admin" ? "Admin" : ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">{ROLE_HELP[role]}</p>
          <label className="mt-4 block text-sm font-semibold text-ink">
            Their name
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dr Chidi Eze" required />
          </label>
          <label className="mt-4 block text-sm font-semibold text-ink">
            Their WhatsApp number
            <input className={field} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <button disabled={busy} className="mt-5 w-full rounded-full bg-leaf px-6 py-3.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
            Make their link
          </button>
          {made && (
            <div className="mt-5">
              <InviteLinkBox token={made.token} hospitalName={hospitalName} name={made.name} phone={made.phone} role={made.role} />
            </div>
          )}
        </form>
      ) : (
        <p className="h-fit rounded-2xl bg-mist/70 p-5 text-sm text-ink-soft">Your hospital admin adds doctors and dietitians.</p>
      )}
    </div>
  );
}
