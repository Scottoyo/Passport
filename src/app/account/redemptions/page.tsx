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
      <h1 className="text-2xl font-bold text-slate-900">Redemption History</h1>
      <p className="mt-1 text-slate-600">A record of all the perks you&apos;ve claimed.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Offer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {redemptions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate-500">{new Date(r.redeemed_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-900">{r.businessName}</td>
                <td className="px-4 py-3 text-slate-500">{r.offerTitle}</td>
              </tr>
            ))}
            {redemptions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-sm text-slate-500">
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
