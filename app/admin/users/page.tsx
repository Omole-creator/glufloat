import { cookies } from "next/headers";
import { Users as UsersIcon, CheckCircle2, AlertTriangle } from "lucide-react";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/server";
import AdminLogin from "../AdminLogin";
import AdminShell from "../AdminShell";
import AdminHero from "../AdminHero";
import AdminTile from "../AdminTile";
import UsersPanel, { type UserRow } from "./UsersPanel";
import { isUserType } from "@/lib/userType";
import { normalizePhone, repeatedPhones } from "@/lib/phone";

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
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: profiles }, { data: subs }, { data: recentCheckRows }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id,name,email,phone,user_type,trial_start,created_at")
        .order("created_at", { ascending: false }),
      admin.from("subscriptions").select("user_id,status,current_period_end"),
      // Who has actually used the app lately. This is the "did they come back?"
      // signal that raw sign-up counts cannot give.
      admin.from("meal_checks").select("user_id").gte("checked_at", weekAgo),
    ]);

  const activeThisWeek = new Set(
    (recentCheckRows ?? []).map((r) => r.user_id),
  ).size;

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

  /**
   * Numbers that turn up on more than one account.
   *
   * Email is already one-per-account: Supabase refuses a second sign-up on the
   * same address. A phone is not, and it cannot safely be made so, because a
   * caregiver and the person they care for really do share one handset here. So
   * the repeat is shown rather than blocked. What it is really watching for is
   * one person taking a fresh free week with me+1@, me+2@ and the same phone.
   *
   * Counted on the NORMALISED number, so +234 and 0 forms group together even
   * on accounts made before sign-up started storing one shape.
   */
  const repeats = repeatedPhones(profiles ?? []);

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name ?? "",
    email: p.email,
    phone: p.phone ?? "",
    userType: isUserType(p.user_type) ? p.user_type : null,
    joined: p.created_at,
    trialStarted: !!p.trial_start,
    paying: paying.has(p.id),
    sharesPhone: repeats.get(normalizePhone(p.phone)) ?? 0,
  }));

  const onSharedNumbers = rows.filter((r) => r.sharesPhone > 1).length;

  const counts = {
    all: rows.length,
    diabetic: rows.filter((r) => r.userType === "diabetic").length,
    health_pro: rows.filter((r) => r.userType === "health_pro").length,
    caregiver: rows.filter((r) => r.userType === "caregiver").length,
    none: rows.filter((r) => r.userType === null).length,
  };

  const pct = (n: number) =>
    counts.all ? `${Math.round((n / counts.all) * 100)}% of everyone` : "";

  return (
    <AdminShell title="Users" icon={<UsersIcon className="h-5 w-5" strokeWidth={2.2} />}>
      <>
        <div className="mt-6">
          <AdminHero
            items={[
              { label: "Everyone", value: counts.all.toLocaleString(), sub: "all accounts" },
              { label: "Diabetic", value: counts.diabetic.toLocaleString(), sub: pct(counts.diabetic) },
              { label: "Health professionals", value: counts.health_pro.toLocaleString(), sub: pct(counts.health_pro) },
              { label: "Family members", value: counts.caregiver.toLocaleString(), sub: pct(counts.caregiver) },
            ]}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminTile
            icon={CheckCircle2}
            tone="green"
            label="Active this week"
            value={activeThisWeek.toLocaleString()}
            sub="checked their food in the last 7 days"
          />
          {onSharedNumbers > 0 && (
            <AdminTile
              icon={AlertTriangle}
              tone="amber"
              label="Same number"
              value={onSharedNumbers.toLocaleString()}
              sub="accounts sharing a phone number"
            />
          )}
          {counts.none > 0 && (
            <AdminTile label="Not set" value={counts.none.toLocaleString()} sub="signed up before we asked" />
          )}
        </div>

        <UsersPanel rows={rows} counts={counts} />
      </>
    </AdminShell>
  );
}
