"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROFESSIONS, naira } from "@/lib/partners";

type Row = {
  id: string;
  seq: number;
  code: string;
  name: string;
  profession: string;
  email: string;
  phone: string | null;
  active: boolean;
  clicks: number;
  signups: number;
  trials: number;
  activeSubs: number;
  earned: number;
  pending: number;
  paidOut: number;
};

const input =
  "mt-1.5 w-full rounded-xl border-2 border-line bg-white px-4 py-2.5 text-ink outline-none transition-colors focus:border-brand";
const label = "block font-display text-sm font-bold text-ink";

export default function PartnerPanel({
  rows,
  openId,
  query,
}: {
  rows: Row[];
  openId: string | null;
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [profession, setProfession] = useState<string>(PROFESSIONS[0]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<{ name: string; link: string } | null>(null);
  const [copied, setCopied] = useState("");
  // The partner currently being edited, if any.
  const [edit, setEdit] = useState<{
    id: string;
    name: string;
    profession: string;
    email: string;
    phone: string;
  } | null>(null);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const linkFor = (code: string) => `${origin}/r/${code}`;

  async function add() {
    setBusy(true);
    setError("");
    setMade(null);
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, profession, email, phone }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not add them. Try again.");
      return;
    }
    setMade({ name: json.partner.name, link: linkFor(json.partner.code) });
    setName("");
    setEmail("");
    setPhone("");
    router.refresh();
  }

  async function copy(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard blocked; the link is on screen anyway */
    }
  }

  async function togglePartner(id: string, active: boolean) {
    await fetch("/api/admin/partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    router.refresh();
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edit),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save the change.");
      return;
    }
    setEdit(null);
    router.refresh();
  }

  async function removePartner(id: string, who: string) {
    if (!confirm(`Delete ${who}?\n\nThis cannot be undone.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/partners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      // A partner with history cannot be deleted. The message says why, and what
      // to do instead.
      setError(json.error ?? "Could not delete them.");
      return;
    }
    router.refresh();
  }

  async function markPaid(id: string, owed: number, who: string) {
    if (owed <= 0) return;
    if (!confirm(`Mark ${naira(owed)} as paid to ${who}?\n\nDo this AFTER you have actually sent the money.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: id }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not mark it paid.");
      return;
    }
    router.refresh();
  }

  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink/50";
  const td = "px-3 py-3 text-sm text-ink align-middle";

  return (
    <>
      {/* ---- add a partner ---- */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-6">
        <h2 className="font-display text-xl font-bold text-ink">Add a health professional</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Their link is made for you. Send it to them, and anyone who signs up
          after clicking it belongs to them.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label} htmlFor="p-name">Their name</label>
            <input id="p-name" className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okoye" />
          </div>
          <div>
            <label className={label} htmlFor="p-prof">What they do</label>
            <select id="p-prof" className={input} value={profession} onChange={(e) => setProfession(e.target.value)}>
              {PROFESSIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="p-email">Their email</label>
            <input id="p-email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@clinic.com" />
          </div>
          <div>
            <label className={label} htmlFor="p-phone">
              Phone <span className="font-normal text-ink-soft">(if you have it)</span>
            </label>
            <input id="p-phone" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803..." />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-v-red/10 px-4 py-3 text-sm font-semibold text-v-red">{error}</p>
        )}

        {made && (
          <div className="mt-4 rounded-xl border-2 border-leaf bg-v-green/10 p-4">
            <p className="font-display font-bold text-ink">{made.name} is added. Here is their link:</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-brand">{made.link}</code>
              <button onClick={() => copy(made.link, "new")} className="rounded-full bg-brand px-4 py-1.5 text-sm font-display font-bold text-white">
                {copied === "new" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={add}
          disabled={busy || !name.trim() || !email.trim()}
          className="mt-5 rounded-full bg-brand px-7 py-3 font-display font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
        >
          {busy ? "Working..." : "Save and make their link"}
        </button>
      </section>

      {/* ---- edit one ---- */}
      {edit && (
        <section className="mt-8 rounded-2xl border-2 border-brand bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink">Edit {edit.name}</h2>
            <button
              onClick={() => setEdit(null)}
              className="text-sm text-ink-soft underline hover:text-brand"
            >
              Cancel
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={label} htmlFor="e-name">Their name</label>
              <input id="e-name" className={input} value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="e-prof">What they do</label>
              <select id="e-prof" className={input} value={edit.profession}
                onChange={(e) => setEdit({ ...edit, profession: e.target.value })}>
                {PROFESSIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                {!PROFESSIONS.includes(edit.profession as (typeof PROFESSIONS)[number]) && (
                  <option value={edit.profession}>{edit.profession}</option>
                )}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="e-email">Their email</label>
              <input id="e-email" className={input} value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="e-phone">Phone</label>
              <input id="e-phone" className={input} value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </div>
          </div>

          {/*
            The link is not editable, on purpose. It is already printed on a card
            or sitting in a WhatsApp message. Changing it would break every copy
            already out there and quietly stop crediting them.
          */}
          <p className="mt-4 rounded-xl bg-mist px-4 py-3 text-sm text-ink-soft">
            Their link stays{" "}
            <strong className="text-brand">/r/{rows.find((r) => r.id === edit.id)?.code}</strong>{" "}
            even if you change the name. It is already out there with people, and
            changing it would break every copy of it and stop crediting them.
          </p>

          <button
            onClick={saveEdit}
            disabled={busy}
            className="mt-5 rounded-full bg-brand px-7 py-3 font-display font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save changes"}
          </button>
        </section>
      )}

      {/* ---- the partners ---- */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-ink">Partners ({rows.length})</h2>

        {/* Errors from Edit / Delete / Mark paid land here, next to the table. */}
        {error && !made && (
          <p className="mt-3 rounded-xl bg-v-red/10 px-4 py-3 text-sm font-semibold text-v-red">
            {error}
          </p>
        )}

        {rows.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-line bg-white p-6 text-center text-ink-soft">
            No partners yet. Add your first one above.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[62rem]">
              <thead className="border-b border-line bg-mist">
                <tr>
                  <th className={th}>Partner</th>
                  <th className={th}>Their link</th>
                  <th className={th}>Clicks</th>
                  <th className={th}>Trials</th>
                  <th className={th}>Active subs</th>
                  <th className={th}>Earned</th>
                  <th className={th}>Owed now</th>
                  <th className={th}>Paid out</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-line last:border-0 ${openId === r.id ? "bg-mist" : ""} ${r.active ? "" : "opacity-50"}`}
                  >
                    <td className={td}>
                      <Link
                        href={`/admin/partners?${new URLSearchParams({ ...query, partner: r.id })}`}
                        className="font-display font-bold hover:text-brand"
                      >
                        {r.name}
                      </Link>
                      <span className="block text-xs text-ink-soft">
                        {r.profession}
                        {!r.active && " . switched off"}
                      </span>
                    </td>
                    <td className={td}>
                      <button
                        onClick={() => copy(linkFor(r.code), r.id)}
                        title="Copy the link"
                        className="rounded-lg bg-mist px-2 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white"
                      >
                        {copied === r.id ? "Copied" : `/r/${r.code}`}
                      </button>
                    </td>
                    <td className={td}>{r.clicks.toLocaleString()}</td>
                    <td className={td}>{r.trials.toLocaleString()}</td>
                    <td className={td}>{r.activeSubs.toLocaleString()}</td>
                    <td className={td}>{naira(r.earned)}</td>
                    {/* Zero is muted. In bold, "N0" reads as the word "NO". */}
                    <td
                      className={`${td} ${
                        r.pending > 0
                          ? "font-display font-bold text-v-red"
                          : "text-ink-soft"
                      }`}
                    >
                      {r.pending > 0 ? naira(r.pending) : "nothing owed"}
                    </td>
                    <td className={td}>{naira(r.paidOut)}</td>
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          onClick={() => markPaid(r.id, r.pending, r.name)}
                          disabled={busy || r.pending <= 0}
                          className="rounded-full bg-leaf px-3 py-1.5 text-xs font-display font-bold text-white disabled:opacity-30"
                        >
                          Mark paid
                        </button>
                        <button
                          onClick={() => {
                            setError("");
                            setEdit({
                              id: r.id,
                              name: r.name,
                              profession: r.profession,
                              email: r.email,
                              phone: r.phone ?? "",
                            });
                          }}
                          className="text-xs text-ink-soft underline hover:text-brand"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => togglePartner(r.id, !r.active)}
                          className="text-xs text-ink-soft underline hover:text-brand"
                        >
                          {r.active ? "Switch off" : "Switch on"}
                        </button>
                        <button
                          onClick={() => removePartner(r.id, r.name)}
                          className="text-xs text-v-red underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
