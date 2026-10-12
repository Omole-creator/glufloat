"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { HospitalRow } from "@/lib/hospitalServer";

/**
 * Change or delete a hospital by hand (founder, 2026-10-12). Editing sets the
 * plan, the number of places (e.g. 350 on Care Custom), the status and the end
 * date directly, for the cases an invoice does not cover. Deleting asks for the
 * hospital's name to be typed, because it cannot be undone.
 */
export default function HospitalEditCard({ hospital }: { hospital: HospitalRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({
    name: hospital.name,
    contact_name: hospital.contact_name ?? "",
    contact_role: hospital.contact_role ?? "",
    contact_phone: hospital.contact_phone ?? "",
    contact_email: hospital.contact_email ?? "",
    city: hospital.city ?? "",
    state: hospital.state ?? "",
    plan: hospital.plan ?? "pilot",
    seats: String(hospital.seats),
    status: hospital.status === "requested" || hospital.status === "declined" ? "" : hospital.status,
    accessUntil: hospital.access_until ? new Date(new Date(hospital.access_until).getTime() + 3600000).toISOString().slice(0, 10) : "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const body: Record<string, unknown> = {
      id: hospital.id,
      action: "edit",
      name: f.name,
      contact_name: f.contact_name,
      contact_role: f.contact_role,
      contact_phone: f.contact_phone,
      contact_email: f.contact_email,
      city: f.city,
      state: f.state,
      plan: f.plan,
      seats: f.seats,
    };
    if (f.status) body.status = f.status;
    if (f.accessUntil) body.accessUntil = f.accessUntil;
    const res = await fetch("/api/admin/hospitals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(j.error ?? "Could not save.");
    setMsg("Saved.");
    router.refresh();
  };

  const remove = async () => {
    const typed = prompt(`This deletes ${hospital.name}, its staff list, patient list and invoices. Patients keep their own GluFloat accounts.\n\nType the hospital's name to delete it:`);
    if (!typed) return;
    setBusy(true);
    const res = await fetch("/api/admin/hospitals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: hospital.id, confirmName: typed }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(j.error ?? "Could not delete.");
    router.push("/admin/hospitals");
    router.refresh();
  };

  const field = "mt-1 w-full rounded-xl border border-[#e3e9f1] bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";
  return (
    <section className="rounded-2xl border border-[#e3e9f1] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">Edit or delete</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink hover:border-brand"
          >
            <Pencil className="h-4 w-4" /> {open ? "Close" : "Edit hospital"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-verdict-red hover:bg-verdict-red/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete hospital
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
      {open && (
        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-ink-soft sm:col-span-2">
            Hospital name
            <input className={field} value={f.name} onChange={set("name")} required />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Contact name
            <input className={field} value={f.contact_name} onChange={set("contact_name")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Contact role
            <input className={field} value={f.contact_role} onChange={set("contact_role")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Contact phone
            <input className={field} value={f.contact_phone} onChange={set("contact_phone")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Contact email
            <input className={field} value={f.contact_email} onChange={set("contact_email")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            City
            <input className={field} value={f.city} onChange={set("city")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            State
            <input className={field} value={f.state} onChange={set("state")} />
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Plan
            <select className={field} value={f.plan} onChange={set("plan")}>
              <option value="pilot">Free pilot</option>
              <option value="care50">Care 50</option>
              <option value="care100">Care 100</option>
              <option value="care200">Care 200</option>
              <option value="custom">Care Custom</option>
            </select>
          </label>
          <label className="text-xs font-bold text-ink-soft">
            Places (patients at once)
            <input className={field} inputMode="numeric" value={f.seats} onChange={set("seats")} />
          </label>
          {f.status && (
            <label className="text-xs font-bold text-ink-soft">
              Status
              <select className={field} value={f.status} onChange={set("status")}>
                <option value="pilot">Free pilot</option>
                <option value="active">Paying</option>
                <option value="ended">Ended</option>
              </select>
            </label>
          )}
          {f.status && (
            <label className="text-xs font-bold text-ink-soft">
              Open until
              <input className={field} type="date" value={f.accessUntil} onChange={set("accessUntil")} />
            </label>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button disabled={busy} className="rounded-full bg-leaf px-5 py-2.5 text-sm font-bold text-white hover:bg-leaf-deep disabled:opacity-50">
              Save changes
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
