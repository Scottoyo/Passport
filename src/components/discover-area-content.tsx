import Link from "next/link";
import {
  getSubareasForArea,
  getBusinessesForArea,
  getCategories,
  getPrimaryOffersForBusinesses,
  getFavoritedBusinessIds,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/components/business-card";
import { BusinessDiscoverFilter } from "@/components/business-discover-filter";
import { toggleFavorite } from "@/app/[state]/[area]/businesses/[business]/actions";
import type { State, PassportArea } from "@/lib/types/domain";

function buildAreaFilterHref(
  basePath: string,
  params: { q?: string; categoryId?: string; subarea?: string }
) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.categoryId) qs.set("category", params.categoryId);
  if (params.subarea) qs.set("subarea", params.subarea);
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

// Shared by the standalone region discover page
// (src/app/[state]/[area]/discover/page.tsx) and the embedded version shown
// inside the account sidebar (src/app/account/discover/page.tsx) - same
// data and grid, just a different basePath so filter/pagination links and
// the passport-purchase CTA stay wherever the caller wants them to land.
export async function DiscoverAreaContent({
  state,
  area,
  searchParams,
  basePath,
  passportHref,
  showPassportCta = true,
}: {
  state: State;
  area: PassportArea;
  searchParams: { q?: string; category?: string; subarea?: string };
  basePath: string;
  passportHref?: string;
  // The account-embedded view (/account/discover) is only ever shown to
  // someone who already owns a passport for this exact region (it's
  // resolved from their own passport) - repeating the "Get the Passport"
  // sales pitch there doesn't make sense the way it does on the public page.
  showPassportCta?: boolean;
}) {
  const { q: qParam, category: categoryId, subarea: subareaSlug } = searchParams;
  const q = (qParam ?? "").trim();

  const subareas = await getSubareasForArea(area.id);
  const activeSubarea = subareaSlug ? subareas.find((s) => s.slug === subareaSlug) : null;

  const [businesses, categories] = await Promise.all([
    getBusinessesForArea(area.id, {
      q: q || undefined,
      categoryId: categoryId || undefined,
      subareaId: activeSubarea?.id,
    }),
    getCategories([state.id]),
  ]);
  const primaryOffers = await getPrimaryOffersForBusinesses(businesses.map((b) => b.id));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const favoritedIds = user ? await getFavoritedBusinessIds(user.id) : new Set<string>();

  const resolvedPassportHref = passportHref ?? `/${state.slug}/${area.slug}/passport`;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {area.name} Passport
      </p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
        Discover {area.name} Perks
      </h1>
      {showPassportCta && (
        <>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            {area.tagline || `Save at the best local spots in ${area.name} with your Passport.`}
          </p>
          {area.description && (
            <p className="mt-2 max-w-2xl text-slate-600">{area.description}</p>
          )}

          <Link
            href={resolvedPassportHref}
            className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Get the {area.name} Passport
          </Link>
        </>
      )}

      {subareas.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Neighborhoods</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={buildAreaFilterHref(basePath, { q, categoryId })}
              className={
                !activeSubarea
                  ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500"
              }
            >
              All Neighborhoods
            </Link>
            {subareas.map((subarea) => (
              <Link
                key={subarea.id}
                href={buildAreaFilterHref(basePath, {
                  q,
                  categoryId,
                  subarea: subarea.slug,
                })}
                className={
                  activeSubarea?.id === subarea.id
                    ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500"
                }
              >
                {subarea.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">
          {activeSubarea ? `Participating businesses in ${activeSubarea.name}` : "Participating businesses"}
        </h2>
        <BusinessDiscoverFilter
          basePath={basePath}
          q={q}
          categoryId={categoryId ?? ""}
          subarea={subareaSlug ?? ""}
          categories={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        {businesses.length === 0 ? (
          <p className="mt-4 text-slate-600">
            {q || categoryId || activeSubarea
              ? "No businesses match your search."
              : `No businesses are live in ${area.name} yet.`}
          </p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                href={`/${state.slug}/${area.slug}/businesses/${business.slug}`}
                offer={primaryOffers.get(business.id) ?? null}
                favorite={{
                  isSignedIn: Boolean(user),
                  isFavorited: favoritedIds.has(business.id),
                  toggleAction: toggleFavorite.bind(null, business.id, basePath),
                  passportHref: resolvedPassportHref,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
