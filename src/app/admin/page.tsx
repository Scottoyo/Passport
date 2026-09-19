import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, getAccessibleAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminScope, getAreaIdsForState, narrowAreaIds, NO_MATCH_ID } from "@/lib/admin-scope";
import { getDashboardMetrics, getDashboardLeaderboards, type DashboardLeaderboards } from "@/lib/admin-queries";
import type { PassportArea } from "@/lib/types/domain";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const supabase = await createClient();

  if (currentUser.isNationalAdmin) {
    const { state, area } = await getCurrentAdminScope();
    const stateAreaIds = state ? await getAreaIdsForState(state.id) : null;
    const narrowedToArea = stateAreaIds && narrowAreaIds(stateAreaIds, area).length === 1 ? area : null;
    // Only switch to areaIds-based scoping once actually narrowed to one
    // region — passing {stateId} otherwise keeps getDashboardMetrics's
    // totalPassportHolders count working (it's only computed for a stateId
    // or fully-nationwide scope, not an areaIds one).
    const scopeOpts = narrowedToArea ? { areaIds: [narrowedToArea.id] } : { stateId: state?.id };
    const [metrics, leaderboards] = await Promise.all([
      getDashboardMetrics(scopeOpts),
      getDashboardLeaderboards(scopeOpts),
    ]);

    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Admin Dashboard
          {state && (
            <span className="font-normal text-slate-500">
              {" "}
              - {narrowedToArea ? `${narrowedToArea.name}, ${state.name}` : state.name}
            </span>
          )}
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

        <Leaderboards leaderboards={leaderboards} />
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
  const { area: scopeArea } = await getCurrentAdminScope();
  const accessibleAreaIds = await getAccessibleAreaIds(currentUser);
  let heading = "Your regions";
  let metrics;
  let leaderboards: DashboardLeaderboards;
  let dashboardLabel = "Region admin dashboard";
  let dashboardSub = "Metrics for the regions you manage.";

  if (currentUser.stateAssignments.length === 1 && currentUser.areaAssignments.length === 0) {
    const stateId = currentUser.stateAssignments[0].state_id;
    const stateAreaIds = await getAreaIdsForState(stateId);
    const narrowedToArea =
      narrowAreaIds(stateAreaIds, scopeArea).length === 1 ? scopeArea : null;
    // Same totalPassportHolders consideration as the national branch above.
    const scopeOpts = narrowedToArea ? { areaIds: [narrowedToArea.id] } : { stateId };
    [metrics, leaderboards] = await Promise.all([
      getDashboardMetrics(scopeOpts),
      getDashboardLeaderboards(scopeOpts),
    ]);
    const { data: stateRow } = await supabase.from("states").select("name").eq("id", stateId).maybeSingle();
    if (stateRow) heading = narrowedToArea ? `${narrowedToArea.name}, ${stateRow.name}` : stateRow.name;
    dashboardLabel = narrowedToArea ? "Region admin dashboard" : "State admin dashboard";
    dashboardSub = narrowedToArea ? "Metrics for the region you manage." : "Metrics for the state you manage.";
  } else {
    const scopedAreaIds = narrowAreaIds(accessibleAreaIds, scopeArea);
    [metrics, leaderboards] = await Promise.all([
      getDashboardMetrics({ areaIds: scopedAreaIds }),
      getDashboardLeaderboards({ areaIds: scopedAreaIds }),
    ]);
    if (scopedAreaIds.length === 1) {
      const { data: areaRow } = await supabase
        .from("passport_areas")
        .select("name")
        .eq("id", scopedAreaIds[0])
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
        {dashboardLabel} <span className="font-normal text-slate-500">- {heading}</span>
      </h1>
      <p className="mt-1 text-slate-600">{dashboardSub}</p>

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

      <Leaderboards leaderboards={leaderboards} />

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

function Leaderboards({ leaderboards }: { leaderboards: DashboardLeaderboards }) {
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <LeaderboardCard title="Top businesses" description="Ranked by total redemptions completed.">
        {leaderboards.topBusinesses.map((b, i) => (
          <li key={b.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                #{i + 1} {b.name}
              </p>
              <p className="text-xs text-slate-500">
                {b.areaName ?? "Unknown area"} &middot; {b.activeOfferCount} active offer
                {b.activeOfferCount === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{b.redemptions}</p>
          </li>
        ))}
      </LeaderboardCard>

      <LeaderboardCard title="Businesses with no redemptions" description="Active businesses that haven't had a redemption yet.">
        {leaderboards.businessesNoRedemptions.map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <p className="text-sm font-medium text-slate-900">{b.name}</p>
            <p className="text-xs text-slate-500">{b.areaName ?? "Unknown area"}</p>
          </li>
        ))}
      </LeaderboardCard>

      <LeaderboardCard title="Top offers" description="Individual perks with the highest redemption counts.">
        {leaderboards.topOffers.map((o, i) => (
          <li key={o.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                #{i + 1} {o.title}
              </p>
              <p className="text-xs text-slate-500">{o.businessName}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{o.redemptions}</p>
          </li>
        ))}
      </LeaderboardCard>

      <LeaderboardCard title="Active offers with no redemptions" description="Perks that may need more marketing attention.">
        {leaderboards.offersNoRedemptions.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-4 px-6 py-3">
            <p className="text-sm font-medium text-slate-900">{o.title}</p>
            <p className="text-xs text-slate-500">{o.businessName}</p>
          </li>
        ))}
      </LeaderboardCard>

      <LeaderboardCard title="Top passport holders" description="Consumer accounts ranked by redemption activity.">
        {leaderboards.topPassportHolders.map((h, i) => (
          <li key={`${h.profileId}-${i}`} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                #{i + 1} {h.holderName}
              </p>
              <p className="text-xs text-slate-500">{h.passportNumber}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{h.redemptions}</p>
          </li>
        ))}
      </LeaderboardCard>

      <LeaderboardCard title="Popular geographic areas" description="Neighborhoods ranked by redemption activity.">
        {leaderboards.topGeographicAreas.map((a, i) => (
          <li key={a.subareaId} className="flex items-center justify-between gap-4 px-6 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                #{i + 1} {a.name}
              </p>
              <p className="text-xs text-slate-500">
                {a.businessCount} business{a.businessCount === 1 ? "" : "es"}
              </p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{a.redemptions}</p>
          </li>
        ))}
      </LeaderboardCard>
    </div>
  );
}

function LeaderboardCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {isEmpty ? (
          <li className="px-6 py-4 text-sm text-slate-500">No data yet.</li>
        ) : (
          children
        )}
      </ul>
    </div>
  );
}
