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
      <h2 className="text-2xl font-bold text-ink">Redemptions</h2>
      <p className="mt-1 text-ink-muted">Latest activity for your business.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-elevated text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Offer</th>
              <th className="px-4 py-3">Redeemed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {redemptions.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-ink">{r.offerTitle}</td>
                <td className="px-4 py-3 text-ink-muted">{new Date(r.redeemedAt).toLocaleString()}</td>
              </tr>
            ))}
            {redemptions.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-4 text-sm text-ink-muted">
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
