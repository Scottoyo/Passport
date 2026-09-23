import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleAreaIds, hasAnyCapability } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminScope, getAllStatesForAdmin } from "@/lib/admin-scope";
import { GlobalScopeSelector } from "@/components/admin/global-scope-selector";
import { RegionScopeSelector } from "@/components/admin/region-scope-selector";
import type { PassportArea } from "@/lib/types/domain";

// This layout is the app-level gatekeeper for the whole /admin section, but
// it is UX, not security: every query and mutation inside /admin runs
// through the signed-in user's own Supabase session and is independently
// re-checked by Row Level Security (supabase/migrations/0003_rls.sql). A
// bug here would be embarrassing, not exploitable.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin");

  const areaIds = await getAccessibleAreaIds(currentUser);
  let areas: PassportArea[] = [];
  if (areaIds.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("passport_areas")
      .select("*")
      .in("id", areaIds)
      .order("name")
      .returns<PassportArea[]>();
    areas = data ?? [];
  }

  if (!currentUser.isNationalAdmin && areas.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-ink">No admin access</h1>
        <p className="mt-2 text-ink-muted">
          {currentUser.email} isn&apos;t a national admin and isn&apos;t
          assigned to manage any Passport Area. Ask a national admin to grant
          access.
        </p>
      </div>
    );
  }

  const [{ state: scopeState, area: scopeArea }, allStates] = currentUser.isNationalAdmin
    ? await Promise.all([getCurrentAdminScope(), getAllStatesForAdmin()])
    : [await getCurrentAdminScope(), []];

  let stateAreas: PassportArea[] = [];
  if (currentUser.isNationalAdmin && scopeState) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("passport_areas")
      .select("*")
      .eq("state_id", scopeState.id)
      .order("name")
      .returns<PassportArea[]>();
    stateAreas = data ?? [];
  }

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-10 sm:px-6">
      {currentUser.isNationalAdmin && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-elevated px-4 py-3">
          <p className="text-sm text-ink-muted">
            This selector applies across every admin section - Businesses,
            Categories, Featured Offers, Passport Holders, and the rest -
            until you change it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <GlobalScopeSelector
              key={scopeState?.slug ?? "national"}
              states={allStates}
              current={scopeState}
            />
            {scopeState && (
              <RegionScopeSelector
                key={scopeArea?.id ?? "all"}
                areas={stateAreas}
                current={scopeArea}
              />
            )}
          </div>
        </div>
      )}
      {!currentUser.isNationalAdmin && areas.length > 1 && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface-elevated px-4 py-3">
          <p className="text-sm text-ink-muted">
            This selector applies across every admin section until you change it.
          </p>
          <RegionScopeSelector key={scopeArea?.id ?? "all"} areas={areas} current={scopeArea} />
        </div>
      )}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
      <aside className="md:w-56 md:shrink-0">
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
            Dashboard
          </Link>
          {currentUser.isNationalAdmin && (
            <>
              <Link href="/admin/passport-holders" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Passport holders
              </Link>
              <Link href="/admin/profiles-without-passports" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Profiles without passports
              </Link>
              <Link href="/admin/expired-passports" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Expired passports
              </Link>
              <Link href="/admin/businesses" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Businesses
              </Link>
              <Link href="/admin/business-leads" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Business Leads CRM
              </Link>
              <Link href="/admin/featured-offers" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Featured offers
              </Link>
              <Link href="/admin/categories" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Categories
              </Link>
              <Link href="/admin/passport-products" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Passport products
              </Link>
              <Link href="/admin/marketing-requests" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Marketing
              </Link>
              <Link href="/admin/notifications" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Notifications
              </Link>
              <Link href="/admin/announcements" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Announcements
              </Link>
              <Link href="/admin/promo-codes" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Promo codes
              </Link>
              <Link href="/admin/referrals" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Referral program
              </Link>
              <Link href="/admin/business-sales" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                Business passport sales
              </Link>
              <Link href="/admin/locations" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                States &amp; Regions
              </Link>
              <Link href="/admin/national-branding" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                National Branding
              </Link>
            </>
          )}
          {!currentUser.isNationalAdmin &&
            (currentUser.stateAssignments.length > 0 || currentUser.areaAssignments.length > 0) && (
              <>
                <Link href="/admin/passport-holders" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Passport holders
                </Link>
                <Link href="/admin/expired-passports" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Expired passports
                </Link>
                <Link href="/admin/businesses" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Businesses
                </Link>
                {hasAnyCapability(currentUser, "manage_leads") && (
                  <Link href="/admin/business-leads" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                    Business Leads CRM
                  </Link>
                )}
                <Link href="/admin/featured-offers" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Featured offers
                </Link>
                {currentUser.stateAssignments.length > 0 && (
                  <Link href="/admin/categories" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                    Categories
                  </Link>
                )}
                <Link href="/admin/marketing-requests" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Marketing
                </Link>
                <Link href="/admin/notifications" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Notifications
                </Link>
                {hasAnyCapability(currentUser, "manage_announcements") && (
                  <Link href="/admin/announcements" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                    Announcements
                  </Link>
                )}
                <Link href="/admin/promo-codes" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Promo codes
                </Link>
                <Link href="/admin/referrals" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Referral program
                </Link>
                <Link href="/admin/business-sales" className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated">
                  Business passport sales
                </Link>
              </>
            )}
          {areas.length > 0 && (
            <>
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Regions
              </p>
              {areas.map((area) => (
                <Link
                  key={area.id}
                  href={`/admin/areas/${area.id}`}
                  className="block rounded-lg px-3 py-2 font-medium text-ink hover:bg-surface-elevated"
                >
                  {area.name}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
