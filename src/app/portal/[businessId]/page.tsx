import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalBusinessAccess, getBusinessMetrics } from "@/lib/portal-queries";

interface Props {
  params: Promise<{ businessId: string }>;
}

export default async function PortalDashboardPage({ params }: Props) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/portal");

  const business = await getPortalBusinessAccess(user.id, businessId);
  if (!business) notFound();

  const metrics = await getBusinessMetrics(businessId);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
      <p className="mt-1 text-slate-600">Overview of your business performance (last 30 days).</p>

      <section className="mt-6 rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900">Your redemption code</h3>
        <p className="mt-1 text-sm text-slate-500">
          Give this code to eligible Passport holders when they claim your offer.
        </p>
        <div className="mt-4 flex justify-center">
          <span className="rounded-xl bg-slate-100 px-8 py-4 font-mono text-3xl tracking-widest text-slate-900">
            {business.redemption_code ?? "Not set"}
          </span>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Your code is stored securely. If you need a new code or have forgotten it, please
          contact an administrator.
        </p>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total redemptions</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.totalRedemptions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last 30 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.redemptionsLast30Days}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unique customers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.uniqueCustomers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Most redeemed offer</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {metrics.mostRedeemedOfferLast30Days ?? "No redemptions in this period"}
          </p>
        </div>
      </div>
    </div>
  );
}
