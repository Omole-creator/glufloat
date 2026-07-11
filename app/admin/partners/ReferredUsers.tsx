import { naira } from "@/lib/partners";
import { getPayouts, getReferredUsers } from "@/lib/partnerStats";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const BADGE: Record<string, string> = {
  paying: "bg-v-green/20 text-ink",
  trial: "bg-v-yellow/25 text-ink",
  expired: "bg-v-red/15 text-ink",
  "signed up": "bg-mist text-ink-soft",
};

/** The people one partner brought in, and every payout made to them. */
export default async function ReferredUsers({ partnerId }: { partnerId: string }) {
  const [users, payouts] = await Promise.all([
    getReferredUsers(partnerId),
    getPayouts(partnerId),
  ]);

  const th = "px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink/50";
  const td = "px-3 py-3 text-sm text-ink";

  return (
    <div className="mt-7 grid gap-7 lg:grid-cols-[1.6fr_1fr]">
      {/* who they brought */}
      <div>
        <h3 className="font-display text-lg font-bold text-ink">
          People they brought ({users.length})
        </h3>
        {users.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-mist p-5 text-sm text-ink-soft">
            Nobody has signed up through their link yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[30rem]">
              <thead className="border-b border-line bg-mist">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Status</th>
                  <th className={th}>Joined</th>
                  <th className={th}>Earned them</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email} className="border-b border-line last:border-0">
                    <td className={td}>
                      <span className="font-semibold">{u.name}</span>
                      <span className="block text-xs text-ink-soft">{u.email}</span>
                    </td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className={td}>{longDate(u.joined)}</td>
                    <td className={td}>{naira(u.earnedForPartner)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* what you have paid them */}
      <div>
        <h3 className="font-display text-lg font-bold text-ink">Payouts</h3>
        {payouts.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-mist p-5 text-sm text-ink-soft">
            You have not paid them anything yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
              >
                <span>
                  <span className="font-display font-bold text-ink">{naira(p.amount)}</span>
                  <span className="block text-xs text-ink-soft">
                    {p.count} payment{p.count === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="rounded-full bg-v-green/20 px-2.5 py-1 text-xs font-bold text-ink">
                    paid
                  </span>
                  <span className="mt-1 block text-xs text-ink-soft">{longDate(p.paid_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
