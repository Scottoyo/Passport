import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports } from "@/lib/queries";
import { getRedemptionsForPassports } from "@/lib/admin-queries";

export default async function RedemptionHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/redemptions");

  const passports = await getMyPassports(user.id);
  const redemptions = await getRedemptionsForPassports(passports.map((p) => p.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Redemption History</h1>
      <p className="mt-1 text-ink-muted">A record of all the perks you&apos;ve claimed.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-elevated text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Offer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {redemptions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-ink-muted">{new Date(r.redeemed_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-ink">{r.businessName}</td>
                <td className="px-4 py-3 text-ink-muted">{r.offerTitle}</td>
              </tr>
            ))}
            {redemptions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-sm text-ink-muted">
                  You haven&apos;t redeemed any perks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
