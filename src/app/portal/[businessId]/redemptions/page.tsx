import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess, getRedemptionsForBusiness } from "@/lib/portal-queries";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalRedemptionsPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  const redemptions = await getRedemptionsForBusiness(businessId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Redemptions</h2>
      <p className="mt-1 text-slate-600">Latest activity for your business.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Offer</th>
              <th className="px-4 py-3">Redeemed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {redemptions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-slate-900">{r.offerTitle}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.redeemedAt).toLocaleString()}</td>
              </tr>
            ))}
            {redemptions.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-4 text-sm text-slate-500">
                  No redemptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
