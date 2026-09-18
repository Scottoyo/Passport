import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, assignedAreaIds } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { PassportArea } from "@/lib/types/domain";

// This layout is the app-level gatekeeper for the whole /admin section, but
// it is UX, not security: every query and mutation inside /admin runs
// through the signed-in user's own Supabase session and is independently
// re-checked by Row Level Security (supabase/migrations/0003_rls.sql). A
// bug here would be embarrassing, not exploitable.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?next=/admin");

  const areaIds = assignedAreaIds(currentUser);
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
        <h1 className="text-2xl font-bold text-slate-900">No admin access</h1>
        <p className="mt-2 text-slate-600">
          {currentUser.email} isn&apos;t a national admin and isn&apos;t
          assigned to manage any Passport Area. Ask a national admin to grant
          access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <aside className="w-56 shrink-0">
        <nav className="space-y-1 text-sm">
          <Link href="/admin" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
            Dashboard
          </Link>
          {currentUser.isNationalAdmin && (
            <>
              <Link href="/admin/locations" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                States &amp; Areas
              </Link>

              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Customers
              </p>
              <Link href="/admin/passport-holders" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Passport holders
              </Link>
              <Link href="/admin/profiles-without-passports" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Profiles without passports
              </Link>
              <Link href="/admin/expired-passports" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Expired passports
              </Link>

              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Catalog
              </p>
              <Link href="/admin/businesses" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Businesses
              </Link>
              <Link href="/admin/featured-offers" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Featured offers
              </Link>
              <Link href="/admin/categories" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Categories
              </Link>
              <Link href="/admin/passport-products" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Passport products
              </Link>

              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Operations
              </p>
              <Link href="/admin/marketing-requests" className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100">
                Marketing requests
              </Link>

              <p className="mt-4 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Coming soon
              </p>
              {["Admin notifications", "Promo codes", "Referral program", "Business passport sales", "Marketing products"].map(
                (label) => (
                  <span
                    key={label}
                    className="block cursor-not-allowed rounded-lg px-3 py-2 font-medium text-slate-400"
                  >
                    {label}
                  </span>
                )
              )}
            </>
          )}
          {areas.length > 0 && (
            <div className="pt-4">
              <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                My areas
              </p>
              {areas.map((area) => (
                <Link
                  key={area.id}
                  href={`/admin/areas/${area.id}`}
                  className="block rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                >
                  {area.name}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
