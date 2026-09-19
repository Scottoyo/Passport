import Link from "next/link";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminScope, NO_MATCH_ID } from "@/lib/admin-scope";
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
          Admin Dashboard
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
          <Stat
            label="Total passport holders"
            value={metrics.totalPassportHolders ?? 0}
            sub="Registered consumer accounts"
          />
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
      </div>
    );
  }

  // Manager dashboard (region and/or state-level). A clean single-state
  // manager (exactly one state_assignments row, no direct area grants)
  // gets the precise state-wide metrics, including passport holders,
  // same as the national admin scoped to that state. Anything wider or
  // mixed (multiple states, or a mix of direct areas and a state) falls
  // back to the areas-based path, which omits passport holders — passports
  // have no area column, so that count isn't well-defined below "exactly
  // one state."
  const accessibleAreaIds = await getAccessibleAreaIds(currentUser);
  let heading = "Your regions";
  let metrics;

  if (currentUser.stateAssignments.length === 1 && currentUser.areaAssignments.length === 0) {
    const stateId = currentUser.stateAssignments[0].state_id;
    metrics = await getDashboardMetrics({ stateId });
    const { data: stateRow } = await supabase.from("states").select("name").eq("id", stateId).maybeSingle();
    if (stateRow) heading = stateRow.name;
  } else {
    metrics = await getDashboardMetrics({ areaIds: accessibleAreaIds });
    if (accessibleAreaIds.length === 1) {
      const { data: areaRow } = await supabase
        .from("passport_areas")
        .select("name")
        .eq("id", accessibleAreaIds[0])
        .maybeSingle();
      if (areaRow) heading = areaRow.name;
    }
  }

  const { data: areas } = await supabase
    .from("passport_areas")
    .select("*")
    .in("id", accessibleAreaIds.length ? accessibleAreaIds : [NO_MATCH_ID])
    .order("name")
    .returns<PassportArea[]>();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Region admin dashboard <span className="font-normal text-slate-500">&mdash; {heading}</span>
      </h1>
      <p className="mt-1 text-slate-600">Metrics for the regions you manage.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total businesses" value={metrics.totalBusinesses} sub="Platform partners registered" />
        <Stat label="Active businesses" value={metrics.activeBusinesses} sub="Currently live on site" />
        <Stat label="Featured businesses" value={metrics.featuredBusinesses} sub="Highlighted on homepage" />
        <Stat label="Total offers" value={metrics.totalOffers} sub="Offers configured" />
        <Stat label="Active offers" value={metrics.activeOffers} sub="Eligible for redemption" />
        {metrics.totalPassportHolders !== null && (
          <Stat
            label="Total passport holders"
            value={metrics.totalPassportHolders}
            sub="Registered consumer accounts"
          />
        )}
        <Stat label="Total redemptions" value={metrics.totalRedemptions} sub="Lifetime perks redeemed" highlight />
        <Stat label="Today's redemptions" value={metrics.todaysRedemptions} sub="Completed since midnight UTC" />
        <Stat
          label="This month's redemptions"
          value={metrics.thisMonthsRedemptions}
          sub="Completed this calendar month"
        />
        <Stat
          label="Businesses pending approval"
          value={metrics.businessesPendingApproval}
          sub="Awaiting admin review"
          highlight="amber"
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Your regions</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(areas ?? []).map((area) => (
          <Link
            key={area.id}
            href={`/admin/areas/${area.id}`}
            className="rounded-2xl border border-slate-200 p-6 hover:border-slate-400"
          >
            <h3 className="font-semibold text-slate-900">{area.name}</h3>
            <p className="mt-1 text-sm text-slate-500 capitalize">{area.status}</p>
          </Link>
        ))}
        {(areas ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No regions assigned yet.</p>
        )}
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
