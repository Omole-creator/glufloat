import { cookies } from "next/headers";
import Link from "next/link";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import UsersPanel, { type UserRow } from "./UsersPanel";
import { isUserType } from "@/lib/userType";

export const dynamic = "force-dynamic";

/**
 * Everybody, in one place.
 *
 * The main dashboard only ever shows the newest 12 sign-ups, so as people join,
 * older ones fall off the bottom and look as though they have vanished. They
 * never went anywhere. This page lists every account, with no cap, and a search
 * box, and it is also where a person who tapped the wrong thing at sign-up gets
 * put right.
 */
export default async function UsersPage() {
  const c = await cookies();
  const authed =
    !!process.env.ADMIN_PASSWORD && c.get(ADMIN_COOKIE)?.value === adminToken();
  if (!authed) return <AdminLogin />;

  const admin = createAdminClient();
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    admin
      .from("profiles")
      .select("id,name,email,user_type,trial_start,created_at")
      .order("created_at", { ascending: false }),
    admin.from("subscriptions").select("user_id,status,current_period_end"),
  ]);

  const now = Date.now();
  const paying = new Set(
    (subs ?? [])
      .filter(
        (s) =>
          (s.status === "active" || s.status === "non-renewing") &&
          s.current_period_end &&
          new Date(s.current_period_end).getTime() > now,
      )
      .map((s) => s.user_id),
  );

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? "",
    email: p.email,
    userType: isUserType(p.user_type) ? p.user_type : null,
    joined: p.created_at,
    trialStarted: !!p.trial_start,
    paying: paying.has(p.id),
  }));

  const counts = {
    all: rows.length,
    diabetic: rows.filter((r) => r.userType === "diabetic").length,
    health_pro: rows.filter((r) => r.userType === "health_pro").length,
    caregiver: rows.filter((r) => r.userType === "caregiver").length,
    none: rows.filter((r) => r.userType === null).length,
  };

  const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );

  const pct = (n: number) =>
    counts.all ? `${Math.round((n / counts.all) * 100)}% of everyone` : "";

  return (
    <main className="min-h-screen bg-mist px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Users</h1>
            <p className="mt-1 text-ink-soft">
              Everyone who has ever signed up. Nobody is hidden and nobody drops
              off this list.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-line bg-white px-5 py-2 font-display font-bold text-ink hover:border-brand"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Everyone" value={counts.all.toLocaleString()} sub="all accounts" />
          <Tile
            label="Diabetic"
            value={counts.diabetic.toLocaleString()}
            sub={pct(counts.diabetic)}
          />
          <Tile
            label="Health professionals"
            value={counts.health_pro.toLocaleString()}
            sub={pct(counts.health_pro)}
          />
          <Tile
            label="Family members"
            value={counts.caregiver.toLocaleString()}
            sub={pct(counts.caregiver)}
          />
        </div>

        {counts.none > 0 && (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-ink-soft">
            <strong className="font-display text-ink">{counts.none}</strong>{" "}
            {counts.none === 1 ? "account" : "accounts"} signed up before this
            question was asked, so nothing is stored for them. They sit in{" "}
            <strong className="text-ink">Not set</strong> below. Nobody was
            guessed into a group. Set them by hand when you find out, or leave
            them.
          </p>
        )}

        <UsersPanel rows={rows} counts={counts} />

        <p className="mt-6 text-xs text-ink-soft">
          What a person picked does not change anything they see in the app. It is
          only here, for your numbers and for sending a mail to one group. Every
          new sign-up must pick one.
        </p>
      </div>
    </main>
  );
}
