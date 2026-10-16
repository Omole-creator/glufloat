"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Droplet, MessageCircle, KeyRound, PauseCircle, PlayCircle, Search, Send, UserMinus, UserCheck } from "lucide-react";
import type { RosterRow } from "@/lib/hospitalRoster";
import { formatBoth } from "@/lib/glucose";
import { SITE_URL } from "@/lib/site";
import { safetyBadge } from "@/lib/safetyFlag";
import { waitLabel } from "@/lib/chat";

const DAY_MS = 86400000;

type Filter = "all" | "messages" | "safety" | "active" | "due" | "quiet" | "waiting" | "invited" | "paused";

/**
 * The patient's own payment to their dietitian or hospital, which happens
 * outside GluFloat (patient-paid-schema.sql): the countdown starts at 30 days
 * when they join, and "Record payment" adds months when they pay again.
 */
/** A paused patient's countdown is frozen: say what they will have when unpaused. */
function pausedLine(r: { pausedLeftMs: number | null; paidUntil: string | null }): string {
  const ms = r.pausedLeftMs ?? (r.paidUntil ? Math.max(0, new Date(r.paidUntil).getTime() - Date.now()) : 0);
  const days = Math.ceil(ms / DAY_MS);
  return days > 0 ? `Paused · ${days} ${days === 1 ? "day" : "days"} kept` : "Paused · payment due";
}

/** A GluFloat doctor's patient pays GluFloat themselves: show their own plan. */
const PLAN_LABEL: Record<NonNullable<RosterRow["plan"]>, string> = {
  premium: "Premium",
  plus: "Plus",
  basic: "Basic",
  trial: "Free trial",
  ended: "Not subscribed",
};

function paidLine(paidUntil: string | null): { text: string; due: boolean } {
  if (!paidUntil) return { text: "Not recorded", due: false };
  const days = Math.ceil((new Date(paidUntil).getTime() - Date.now()) / DAY_MS);
  const when = new Date(paidUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (days > 0) return { text: `Until ${when} · ${days} ${days === 1 ? "day" : "days"} left`, due: false };
  const over = -days;
  return { text: over === 0 ? "Due today" : `Due ${over} ${over === 1 ? "day" : "days"} ago`, due: true };
}

/**
 * The red safety flag (lib/safetyFlag.ts): a test under 70, over 300, or a
 * drop after a meal, in the last 14 days. Clinicians only. The dot pulses only
 * for people who allow motion; the words carry the meaning either way.
 */
function SafetyBadge({ r }: { r: RosterRow }) {
  const text = safetyBadge(r.safety);
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-verdict-red px-2 py-0.5 text-[11px] font-bold text-white">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" />
      Sugar: {text}
    </span>
  );
}

/** The patient wrote in the chat and nobody has answered yet. */
function MessageBadge({ r, href }: { r: RosterRow; href: string }) {
  if (!r.chatWaitingSince) return null;
  return (
    <Link
      href={`${href}#chat`}
      className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white hover:bg-brand-deep"
    >
      <MessageCircle aria-hidden className="h-3 w-3" />
      New message · {waitLabel(r.chatWaitingSince)}
    </Link>
  );
}

/** The amber flags: worth a look, never blinking. */
function AmberBadges({ r }: { r: RosterRow }) {
  if (!r.beforeFlag && r.patterns.length === 0) return null;
  return (
    <>
      {r.beforeFlag && (
        <span className="inline-flex items-center rounded-full bg-verdict-yellow/30 px-2 py-0.5 text-[11px] font-bold text-ink">
          Before meals: mostly above {r.beforeFlag.target}
        </span>
      )}
      {r.patterns.length > 0 && (
        <span className="inline-flex items-center rounded-full bg-verdict-yellow/30 px-2 py-0.5 text-[11px] font-bold text-ink">
          Same meal high 3 times{r.patterns.length > 1 ? ` (${r.patterns.length} meals)` : ""}
        </span>
      )}
    </>
  );
}

function ago(iso: string | null): string {
  if (!iso) return "Not yet";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function shortDate(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function wa(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") && d.length === 11 ? "234" + d.slice(1) : d;
}

const STATUS = {
  active: { label: "Using GluFloat", tone: "bg-leaf/10 text-leaf-deep" },
  waiting: { label: "Waiting for a place", tone: "bg-verdict-yellow/20 text-ink" },
  invited: { label: "Invited", tone: "bg-brand/10 text-brand" },
  removed: { label: "Removed", tone: "bg-ink/5 text-ink-soft" },
  paused: { label: "Paused", tone: "bg-ink/5 text-ink-soft" },
} as const;

export default function PatientTable({
  rows,
  isAdmin,
  hid,
  hospitalName,
  hospitalCode,
  doctor = false,
}: {
  rows: RosterRow[];
  isAdmin: boolean;
  hid: string | null;
  hospitalName: string;
  hospitalCode: string;
  /** A GluFloat doctor's practice: no payment countdown, show each patient's own plan. */
  doctor?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const isQuiet = (r: RosterRow) => r.status === "active" && (!r.lastActive || r.lastActive < weekAgo);
  const isDue = (r: RosterRow) => !doctor && r.status === "active" && paidLine(r.paidUntil).due;

  const isRed = (r: RosterRow) => r.status === "active" && r.safety.length > 0;
  const isAmber = (r: RosterRow) => r.status === "active" && (!!r.beforeFlag || r.patterns.length > 0);
  const isFlagged = (r: RosterRow) => isRed(r) || isAmber(r);

  const hasMessage = (r: RosterRow) => r.status === "active" && !!r.chatWaitingSince;

  const counts = {
    all: rows.length,
    messages: rows.filter(hasMessage).length,
    safety: rows.filter(isFlagged).length,
    active: rows.filter((r) => r.status === "active").length,
    due: rows.filter(isDue).length,
    quiet: rows.filter(isQuiet).length,
    paused: rows.filter((r) => r.status === "paused").length,
    waiting: rows.filter((r) => r.status === "waiting").length,
    invited: rows.filter((r) => r.status === "invited").length,
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    return rows
      .filter((r) =>
        filter === "all" ? true : filter === "messages" ? hasMessage(r) : filter === "safety" ? isFlagged(r) : filter === "quiet" ? isQuiet(r) : filter === "due" ? isDue(r) : r.status === filter,
      )
      .filter(
        (r) =>
          !needle ||
          r.name.toLowerCase().includes(needle) ||
          (digits.length >= 3 && r.phone.replace(/\D/g, "").includes(digits.replace(/^234/, "0"))) ||
          (r.email ?? "").toLowerCase().includes(needle),
      )
      // Red safety flags go to the top (newest first), then unanswered
      // messages, then amber flags. The sort is stable, so everyone else
      // keeps the order they had.
      .sort((a, b) => {
        const rank = (r: RosterRow) => (isRed(r) ? 3 : hasMessage(r) ? 2 : isAmber(r) ? 1 : 0);
        if (rank(a) !== rank(b)) return rank(b) - rank(a);
        return isRed(a) ? b.safety[0].takenAt.localeCompare(a.safety[0].takenAt) : 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, filter]);

  const patch = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(id);
    setMsg("");
    const res = await fetch("/api/hospital/patients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hid, id, action, ...extra }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  };

  const inviteLink = (r: RosterRow) => `${SITE_URL}/j/${hospitalCode}?t=${r.inviteToken}`;
  const inviteText = (r: RosterRow) =>
    `Hello ${r.name.split(/\s+/)[0]}, ${hospitalName} has added you to GluFloat. It tells you what to eat for your diabetes and how much, and keeps a report for your doctor and dietitian.\n\nOpen this link to join. Use this phone number (${r.phone}):\n${inviteLink(r)}`;

  const detailHref = (r: RosterRow) => `/hospital/patients/${r.id}${hid ? `?h=${hid}` : ""}`;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "Everyone" },
    { id: "messages", label: "New messages" },
    { id: "safety", label: "Sugar needs a look" },
    { id: "active", label: "Using GluFloat" },
    { id: "due", label: "Payment due" },
    { id: "quiet", label: "Not opened in 7 days" },
    { id: "waiting", label: "Waiting" },
    { id: "invited", label: "Invited" },
    { id: "paused", label: "Paused" },
  ].filter((f) => !doctor || (f.id !== "due" && f.id !== "paused" && f.id !== "waiting")) as { id: Filter; label: string }[];

  const Actions = ({ r }: { r: RosterRow }) =>
    !isAdmin ? null : (
      <div className="flex flex-wrap items-center gap-1.5">
        {r.status === "invited" && r.inviteToken && (
          <a
            href={`https://wa.me/${wa(r.phone)}?text=${encodeURIComponent(inviteText(r))}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Send ${r.name} the invite on WhatsApp`}
            className="inline-flex items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:brightness-95"
          >
            <Send className="h-3.5 w-3.5" /> Send invite
          </a>
        )}
        {r.status === "waiting" && (
          <button
            disabled={busy === r.id}
            onClick={() => patch(r.id, "activate")}
            aria-label={`Give ${r.name} a place`}
            className="inline-flex items-center gap-1 rounded-full bg-leaf px-3 py-1.5 text-xs font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" /> Give a place
          </button>
        )}
        {!doctor && (r.status === "active" || r.status === "paused") && (
          <select
            disabled={busy === r.id}
            value=""
            onChange={(e) => {
              const months = Number(e.target.value);
              if (months) void patch(r.id, "paid", { months }).then((ok) => ok && setMsg(`Payment recorded for ${r.name}.`));
            }}
            aria-label={r.status === "paused" ? `Record a payment for ${r.name} and unpause` : `Record a payment for ${r.name}`}
            className="rounded-full border border-leaf/40 bg-leaf/10 px-3 py-1.5 text-xs font-bold text-leaf-deep outline-none hover:border-leaf disabled:opacity-50"
          >
            <option value="">{r.status === "paused" ? "Paid: record and unpause" : "Record payment"}</option>
            <option value="1">Paid 1 month</option>
            <option value="3">Paid 3 months</option>
            <option value="6">Paid 6 months</option>
            <option value="12">Paid 12 months</option>
          </select>
        )}
        {!doctor && r.status === "paused" && (
          <button
            disabled={busy === r.id}
            onClick={() => void patch(r.id, "unpause").then((ok) => ok && setMsg(`${r.name} is back, with the days they had left.`))}
            aria-label={`Unpause ${r.name}`}
            className="inline-flex items-center gap-1 rounded-full bg-leaf px-3 py-1.5 text-xs font-bold text-white hover:bg-leaf-deep disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5" /> Unpause
          </button>
        )}
        {!doctor && r.status === "active" && (
          <button
            disabled={busy === r.id}
            onClick={() => {
              if (confirm(`Pause ${r.name}? Their days left are kept and their countdown stops. They are not covered until you unpause them.`))
                void patch(r.id, "pause");
            }}
            aria-label={`Pause ${r.name}`}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink-soft hover:border-ink/40 hover:text-ink disabled:opacity-50"
          >
            <PauseCircle className="h-3.5 w-3.5" /> Pause
          </button>
        )}
        {r.phoneLogin && r.status !== "invited" && (
          <button
            disabled={busy === r.id}
            onClick={() => {
              const pw = prompt(`Type a new password for ${r.name} (6 or more letters or numbers). Then tell them on the phone.`);
              if (pw) void patch(r.id, "reset_password", { password: pw }).then((ok) => ok && setMsg(`New password set for ${r.name}.`));
            }}
            aria-label={`Set a new password for ${r.name}`}
            className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-brand disabled:opacity-50"
          >
            <KeyRound className="h-3.5 w-3.5" /> New password
          </button>
        )}
        <button
          disabled={busy === r.id}
          onClick={() => {
            if (confirm(`Remove ${r.name} from ${hospitalName}? Their own GluFloat account and records stay theirs.`))
              void patch(r.id, "remove");
          }}
          aria-label={`Remove ${r.name}`}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-bold text-ink-soft hover:bg-verdict-red/10 hover:text-verdict-red disabled:opacity-50"
        >
          <UserMinus className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    );

  return (
    <section className="mt-6 rounded-2xl border border-[#e3e9f1] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#eef2f7] p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-full bg-[#f2f5f9] p-1" role="tablist" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                filter === f.id ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {f.label} <span className="ml-0.5 text-ink/40">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="relative lg:ml-auto lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            aria-label="Search patients"
            className="w-full rounded-full border border-[#e3e9f1] py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
      </div>

      {msg && <p className="border-b border-[#eef2f7] px-5 py-2.5 text-sm font-semibold text-ink">{msg}</p>}

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="font-display text-lg font-bold text-ink">No patients yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
            {isAdmin
              ? "Add your patients, or print your QR code from Plan and QR code so patients can join on their own."
              : "Your hospital admin adds patients. They will show up here."}
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-soft">Nobody matches.</p>
      ) : (
        <>
          {/* Wide screens: a table. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f9fc] text-left text-[11px] font-bold uppercase tracking-[0.06em] text-ink/50">
                  <th className="px-5 py-2.5">Patient</th>
                  <th className="px-3 py-2.5">Last used</th>
                  <th className="px-3 py-2.5 text-right">Meals</th>
                  <th className="px-3 py-2.5 text-right">Tests</th>
                  <th className="px-3 py-2.5">Latest sugar test</th>
                  <th className="px-3 py-2.5">HbA1c</th>
                  <th className="px-3 py-2.5">{doctor ? "GluFloat plan" : "Paid"}</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-[#eef2f7] align-middle hover:bg-[#f9fbfd]">
                    <td className="px-5 py-3">
                      {r.status === "active" ? (
                        <Link href={detailHref(r)} className="font-semibold text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink">{r.name}</span>
                      )}
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                        <span>{r.phone}</span>
                        <SafetyBadge r={r} />
                        <MessageBadge r={r} href={detailHref(r)} />
                        <AmberBadges r={r} />
                        {r.status !== "active" && (
                          <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-3 py-3 ${isQuiet(r) ? "font-semibold text-verdict-red" : "text-ink"}`}>
                      {r.status === "active" ? ago(r.lastActive) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{r.status === "active" ? r.meals30 : "-"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink">{r.status === "active" ? r.tests30 : "-"}</td>
                    <td className="px-3 py-3 text-ink">
                      {r.latestReading ? (
                        <>
                          <span className="font-semibold">{formatBoth(r.latestReading.mgdl)}</span>
                          <span className="block text-xs text-ink-soft">{shortDate(r.latestReading.takenAt)}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {r.latestHba1c ? (
                        <>
                          <span className="font-semibold">{r.latestHba1c.percent}%</span>
                          <span className="block text-xs text-ink-soft">{shortDate(r.latestHba1c.testedOn)}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className={`px-3 py-3 text-xs ${isDue(r) ? "font-semibold text-verdict-red" : "text-ink"}`}>
                      {doctor
                        ? r.plan
                          ? PLAN_LABEL[r.plan]
                          : "-"
                        : r.status === "paused"
                          ? pausedLine(r)
                          : r.status === "active"
                            ? paidLine(r.paidUntil).text
                            : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Actions r={r} />
                        {r.status === "active" && (
                          <Link
                            href={detailHref(r)}
                            aria-label={`Open ${r.name}'s record`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-deep"
                          >
                            Open record <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per patient. */}
          <ul className="divide-y divide-[#eef2f7] md:hidden">
            {shown.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {r.status === "active" ? (
                      <Link href={detailHref(r)} className="font-semibold text-brand">
                        {r.name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-ink">{r.name}</p>
                    )}
                    <p className="text-xs text-ink-soft">{r.phone}</p>
                    {(isFlagged(r) || hasMessage(r)) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <SafetyBadge r={r} />
                        <MessageBadge r={r} href={detailHref(r)} />
                        <AmberBadges r={r} />
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[r.status].tone}`}>
                    {STATUS[r.status].label}
                  </span>
                </div>
                {r.status === "active" && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-mist/60 px-2.5 py-2">
                      <p className="text-ink-soft">Last used</p>
                      <p className={`font-bold ${isQuiet(r) ? "text-verdict-red" : "text-ink"}`}>{ago(r.lastActive)}</p>
                    </div>
                    <div className="rounded-xl bg-mist/60 px-2.5 py-2">
                      <p className="text-ink-soft">Meals, 30 days</p>
                      <p className="font-bold text-ink">{r.meals30}</p>
                    </div>
                    <div className="rounded-xl bg-mist/60 px-2.5 py-2">
                      <p className="text-ink-soft">Tests, 30 days</p>
                      <p className="font-bold text-ink">{r.tests30}</p>
                    </div>
                  </div>
                )}
                {doctor
                  ? r.plan && <p className="mt-2 text-xs text-ink">GluFloat plan: {PLAN_LABEL[r.plan]}</p>
                  : (r.status === "active" || r.status === "paused") && (
                      <p className={`mt-2 text-xs ${isDue(r) ? "font-semibold text-verdict-red" : "text-ink"}`}>
                        Paid: {r.status === "paused" ? pausedLine(r) : paidLine(r.paidUntil).text}
                      </p>
                    )}
                {r.latestReading && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ink">
                    <Droplet className="h-3.5 w-3.5 text-brand" />
                    Latest: <span className="font-semibold">{formatBoth(r.latestReading.mgdl)}</span>
                    <span className="text-ink-soft">{shortDate(r.latestReading.takenAt)}</span>
                  </p>
                )}
                {r.status === "active" && (
                  <Link
                    href={detailHref(r)}
                    aria-label={`Open ${r.name}'s record`}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep"
                  >
                    Open record <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
                <div className="mt-3">
                  <Actions r={r} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
