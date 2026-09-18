import Link from "next/link";
import { getCurrentUser, assignedAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminScope } from "@/lib/admin-scope";
import { getDashboardMetrics } from "@/lib/admin-queries";
import type { PassportArea } from "@/lib/types/domain";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const supabase = await createClient();

  if (currentUser.isNationalAdmin) {
    const { state } = await getCurrentAdminScope();
    const metrics = await getDashboardMetrics({ stateId: state?.id });

    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          National admin dashboard
          {state && <span className="font-normal text-slate-500"> &mdash; {state.name}</span>}
        </h1>
        <p className="mt-1 text-slate-600">
          System metrics, redemption performance, and administrative health
          indicators.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total businesses" value={metrics.totalBusinesses} sub="Platform partners registered" />
          <Stat label="Active businesses" value={metrics.activeBusinesses} sub="Currently live on site" />
          <Stat label="Featured businesses" value={metrics.featuredBusinesses} sub="Highlighted on homepage" />
          <Stat label="Total offers" value={metrics.totalOffers} sub="Offers configured" />
          <Stat label="Active offers" value={metrics.activeOffers} sub="Eligible for redemption" />
          <Stat label="Total passport holders" value={metrics.totalPassportHolders} sub="Registered consumer accounts" />
          <Stat label="Total redemptions" value={metrics.totalRedemptions} sub="Lifetime perks redeemed" highlight />
          <Stat label="Today's redemptions" value={metrics.todaysRedemptions} sub="Completed since midnight UTC" />
          <Stat label="This month's redemptions" value={metrics.thisMonthsRedemptions} sub="Completed this calendar month" />
          <Stat
            label="Businesses pending approval"
            value={metrics.businessesPendingApproval}
            sub="Awaiting admin review"
            highlight="amber"
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/admin/locations" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            Manage states &amp; areas &rarr;
          </Link>
          <Link href="/admin/businesses" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            Review businesses &rarr;
          </Link>
          <Link href="/admin/passport-holders" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            View passport holders &rarr;
          </Link>
          <Link href="/admin/marketing-requests" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
            Review marketing requests &rarr;
          </Link>
        </div>
      </div>
    );
  }

  const areaIds = assignedAreaIds(currentUser);
  const { data: areas } = await supabase
    .from("passport_areas")
    .select("*")
    .in("id", areaIds)
    .returns<PassportArea[]>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your areas</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {(areas ?? []).map((area) => (
          <Link
            key={area.id}
            href={`/admin/areas/${area.id}`}
            className="rounded-2xl border border-slate-200 p-6 hover:border-slate-400"
          >
            <h2 className="font-semibold text-slate-900">{area.name}</h2>
            <p className="mt-1 text-sm text-slate-500 capitalize">{area.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub: string;
  highlight?: "amber" | true;
}) {
  const style =
    highlight === "amber"
      ? "border-amber-200 bg-amber-50"
      : highlight
        ? "border-slate-200 bg-slate-100"
        : "border-slate-200";
  const valueStyle = highlight === "amber" ? "text-amber-700" : "text-slate-900";

  return (
    <div className={`rounded-2xl border p-6 ${style}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueStyle}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </div>
  );
}
