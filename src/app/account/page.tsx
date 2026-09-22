import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getMyPassports, getAreaVisitProgress, getAchievementProgress } from "@/lib/queries";
import { getFavoriteBusinessesForHolder, getRedemptionsForPassports } from "@/lib/admin-queries";
import type { PassportArea, Profile } from "@/lib/types/domain";
import { buttonClasses } from "@/lib/ui-classes";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const [passports, { data: profile }] = await Promise.all([
    getMyPassports(user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
  ]);

  const primary = passports[0] ?? null;
  const areaIds = [...new Set(passports.map((p) => p.passport_area_id))];
  const { data: areas } = areaIds.length
    ? await supabase.from("passport_areas").select("*").in("id", areaIds).returns<PassportArea[]>()
    : { data: [] as PassportArea[] };
  const areaById = new Map((areas ?? []).map((a) => [a.id, a]));
  const primaryArea = primary ? areaById.get(primary.passport_area_id) : null;
  const { data: primaryState } = primaryArea
    ? await supabase.from("states").select("slug").eq("id", primaryArea.state_id).maybeSingle()
    : { data: null };

  const [favorites, redemptions, subareaProgress, businessesInAreas, achievements] = await Promise.all([
    getFavoriteBusinessesForHolder(user.id),
    getRedemptionsForPassports(passports.map((p) => p.id)),
    primary ? getAreaVisitProgress(primary.passport_area_id, user.id) : Promise.resolve([]),
    areaIds.length
      ? supabase.from("businesses").select("id").in("passport_area_id", areaIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
    getAchievementProgress(user.id),
  ]);

  const businessIdsInAreas = (businessesInAreas.data ?? []).map((b) => b.id as string);
  const { count: activeOfferCount } = businessIdsInAreas.length
    ? await supabase
        .from("offers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .in("business_id", businessIdsInAreas)
    : { count: 0 };

  const nextAchievement = achievements.find((a) => !a.unlocked) ?? null;
  const recentRedemptions = redemptions.slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">
        Welcome back{profile?.first_name ? `, ${profile.first_name}` : ""}!
      </h1>
      <p className="mt-1 text-ink-muted">
        Manage your Passport, view your redemptions, and explore local perks.
      </p>

      {primary ? (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink">{primaryArea?.name ?? "Unknown region"} Passport</h2>
              <p className="text-sm text-ink-muted">
                {passports.length > 1 ? `${passports.length} Passports` : "Passport holder"}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                primary.status === "active" ? "bg-success-bg text-success" : "bg-surface-elevated text-ink-muted"
              }`}
            >
              {primary.status}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Passport holder</p>
              <p className="text-sm font-medium text-ink">{profile?.full_name || user.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Passport number</p>
              <p className="text-sm font-medium text-ink">{primary.passport_number}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Expires</p>
              <p className="text-sm font-medium text-ink">
                {new Date(primary.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Link
            href="/account/passport"
            className={`mt-4 block text-center ${buttonClasses("primary")}`}
          >
            View Passport Details
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-ink-muted">You don&apos;t have a Passport yet.</p>
          <Link
            href="/passport"
            className={`mt-4 ${buttonClasses("primary")}`}
          >
            Get Your Passport
          </Link>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Redemptions</p>
          <p className="mt-1 text-2xl font-bold text-ink">{redemptions.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Favorites</p>
          <p className="mt-1 text-2xl font-bold text-ink">{favorites.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Available offers</p>
          <p className="mt-1 text-2xl font-bold text-ink">{activeOfferCount ?? 0}</p>
        </div>
      </div>

      {primary && subareaProgress.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-ink">Continue Exploring</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subareaProgress.map(({ subarea, totalBusinesses, visitedBusinesses }) => {
              const pct = totalBusinesses > 0 ? Math.round((visitedBusinesses / totalBusinesses) * 100) : 0;
              return (
                <div key={subarea.id} className="rounded-2xl border border-border bg-surface p-4">
                  <p className="font-semibold text-ink">{subarea.name}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {visitedBusinesses} of {totalBusinesses} businesses visited
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-elevated">
                    <div className="h-1.5 rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{pct}% complete</p>
                  {primaryArea && primaryState && (
                    <Link
                      href={`/${primaryState.slug}/${primaryArea.slug}/${subarea.slug}`}
                      className={`mt-3 ${buttonClasses("outline", "sm")}`}
                    >
                      View Area
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {nextAchievement && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-ink">Next Achievement</h2>
          <p className="mt-1 text-sm text-ink">{nextAchievement.name}</p>
          <p className="text-sm text-ink-muted">{nextAchievement.description}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-surface-elevated">
              <div
                className="h-1.5 rounded-full bg-brand-primary"
                style={{ width: `${(nextAchievement.current / nextAchievement.target) * 100}%` }}
              />
            </div>
            <span className="text-xs text-ink-muted">
              {nextAchievement.current} of {nextAchievement.target}
            </span>
          </div>
          <Link
            href="/account/achievements"
            className={`mt-3 ${buttonClasses("outline", "sm")}`}
          >
            View Achievements
          </Link>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-ink">Recent Activity</h2>
        {recentRedemptions.length === 0 ? (
          <div className="mt-3 text-center">
            <p className="text-sm text-ink-muted">You haven&apos;t redeemed any Passport promotions yet.</p>
            <Link
              href="/account/discover"
              className={`mt-3 ${buttonClasses("primary")}`}
            >
              Discover Businesses
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentRedemptions.map((r) => (
              <li key={r.id} className="py-2">
                <p className="text-sm font-medium text-ink">{r.businessName}</p>
                <p className="text-xs text-ink-muted">
                  {r.offerTitle} &middot; {new Date(r.redeemed_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
