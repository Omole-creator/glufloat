"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GROUPS,
  USER_TYPES,
  groupLabel,
  inGroup,
  TYPE_LABEL,
  type Group,
  type UserType,
} from "@/lib/userType";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: UserType | null;
  joined: string;
  trialStarted: boolean;
  paying: boolean;
};

export default function UsersPanel({
  rows,
  counts,
}: {
  rows: UserRow[];
  counts: Record<Group, number>;
}) {
  const router = useRouter();
  const [group, setGroup] = useState<Group>("all");
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inGroup(r.userType, group)) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.phone.toLowerCase().includes(needle)
      );
    });
  }, [rows, group, q]);

  /**
   * Change what somebody is. `""` in the drop-down means "Not set", and it is
   * sent as null: that is the undo for a person who tapped the wrong thing.
   */
  async function setType(id: string, value: string) {
    setSavingId(id);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, user_type: value === "" ? null : value }),
    });
    const json = await res.json().catch(() => ({}));
    setSavingId("");
    if (!res.ok) {
      setError(json.error ?? "Could not change it. Try again.");
      return;
    }
    router.refresh();
  }

  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink/50";
  const td = "px-3 py-3 text-sm text-ink align-middle";

  return (
    <section className="mt-8">
      {/* ---- the groups, and the file ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`rounded-full border-2 px-4 py-2 font-display text-sm font-bold transition-colors ${
                group === g
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              {groupLabel(g)}{" "}
              <span className={group === g ? "text-white/70" : "text-ink-soft"}>
                {counts[g]}
              </span>
            </button>
          ))}
        </div>

        {/*
          A plain link, not a fetch. The browser downloads the file itself, and
          the group in the address is the one on screen, so the file always
          matches what you are looking at.
        */}
        <a
          href={`/api/admin/users/export?group=${group}`}
          className="rounded-full bg-leaf px-5 py-2.5 font-display text-sm font-bold text-white transition-transform hover:scale-105"
        >
          Download {groupLabel(group).toLowerCase()} for Excel
        </a>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email"
        aria-label="Search by name or email"
        className="mt-4 w-full max-w-md rounded-xl border-2 border-line bg-white px-4 py-2.5 text-ink outline-none transition-colors focus:border-brand"
      />

      {error && (
        <p className="mt-3 rounded-xl bg-v-red/10 px-4 py-3 text-sm font-semibold text-v-red">
          {error}
        </p>
      )}

      <p className="mt-3 text-sm text-ink-soft">
        Showing {shown.length.toLocaleString()} of {rows.length.toLocaleString()}{" "}
        {rows.length === 1 ? "person" : "people"}.
      </p>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-line bg-white p-6 text-center text-ink-soft">
          Nobody here.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[60rem]">
            <thead className="border-b border-line bg-mist">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Phone</th>
                <th className={th}>What they are</th>
                <th className={th}>Joined</th>
                <th className={th}>Trial</th>
                <th className={th}>Paying</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className={`${td} font-display font-bold`}>{r.name || "—"}</td>
                  <td className={td}>
                    <a href={`mailto:${r.email}`} className="text-brand hover:underline">
                      {r.email}
                    </a>
                  </td>
                  <td className={td}>
                    {r.phone ? (
                      <a href={`tel:${r.phone}`} className="text-brand hover:underline">
                        {r.phone}
                      </a>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className={td}>
                    <select
                      value={r.userType ?? ""}
                      disabled={savingId === r.id}
                      onChange={(e) => setType(r.id, e.target.value)}
                      aria-label={`What ${r.name || r.email} is`}
                      className={`rounded-lg border-2 bg-white px-2 py-1.5 text-sm outline-none transition-colors focus:border-brand disabled:opacity-50 ${
                        r.userType ? "border-line text-ink" : "border-v-yellow text-ink-soft"
                      }`}
                    >
                      <option value="">Not set</option>
                      {USER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`${td} text-ink-soft`}>
                    {new Date(r.joined).toLocaleDateString()}
                  </td>
                  <td className={`${td} text-ink-soft`}>
                    {r.trialStarted ? "started" : "—"}
                  </td>
                  <td className={td}>
                    {r.paying ? (
                      <span className="font-display font-bold text-leaf">Yes</span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
