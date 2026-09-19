import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteBusinessesForHolder } from "@/lib/admin-queries";
import { getPrimaryOffersForBusinesses } from "@/lib/queries";
import { BusinessCard } from "@/components/business-card";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/favorites");

  const favorites = await getFavoriteBusinessesForHolder(user.id);
  const areaIds = [...new Set(favorites.map((b) => b.passport_area_id))];
  const { data: areas } = areaIds.length
    ? await supabase.from("passport_areas").select("id, slug, state_id").in("id", areaIds)
    : { data: [] as { id: string; slug: string; state_id: string }[] };
  const stateIds = [...new Set((areas ?? []).map((a) => a.state_id as string))];
  const { data: states } = stateIds.length
    ? await supabase.from("states").select("id, slug").in("id", stateIds)
    : { data: [] as { id: string; slug: string }[] };
  const areaById = new Map((areas ?? []).map((a) => [a.id as string, a]));
  const stateSlugById = new Map((states ?? []).map((s) => [s.id as string, s.slug as string]));
  const primaryOffers = await getPrimaryOffersForBusinesses(favorites.map((b) => b.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">My Favorites</h1>
      <p className="mt-1 text-slate-600">Businesses you&apos;ve saved to visit later.</p>

      {favorites.length === 0 ? (
        <p className="mt-6 text-slate-600">You haven&apos;t saved any businesses yet.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((business) => {
            const area = areaById.get(business.passport_area_id);
            const stateSlug = area ? stateSlugById.get(area.state_id as string) : null;
            const href = area && stateSlug ? `/${stateSlug}/${area.slug}/businesses/${business.slug}` : "#";
            return (
              <BusinessCard
                key={business.id}
                business={business}
                href={href}
                offer={primaryOffers.get(business.id) ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
