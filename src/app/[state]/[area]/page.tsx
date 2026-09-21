import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getBusinessesForArea,
  getPrimaryOffersForBusinesses,
  getFavoritedBusinessIds,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BusinessCard } from "@/components/business-card";
import { toggleFavorite } from "@/app/[state]/[area]/businesses/[business]/actions";

interface Props {
  params: Promise<{ state: string; area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `${area.name}, ${state.abbreviation}` : "Passport Area" };
}

export default async function AreaHomePage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const featuredBusinesses = await getBusinessesForArea(area.id, { featured: true });
  const primaryOffers = await getPrimaryOffersForBusinesses(featuredBusinesses.map((b) => b.id));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const favoritedIds = user ? await getFavoritedBusinessIds(user.id) : new Set<string>();
  const homePath = `/${state.slug}/${area.slug}`;
  const themed = Boolean(area.brand_primary_color);

  return (
    <div>
      <section
        className={themed ? "bg-brand-primary" : "border-b border-slate-200 bg-slate-50"}
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p
            className={`text-sm font-semibold uppercase tracking-wide ${
              themed ? "text-white/80" : "text-slate-500"
            }`}
          >
            {area.name} Passport
          </p>
          <h1
            className={`mt-1 text-3xl font-bold tracking-tight sm:text-4xl ${
              themed ? "text-white" : "text-slate-900"
            }`}
          >
            The {area.name} Passport
          </h1>
          <p className={`mt-3 max-w-2xl text-lg ${themed ? "text-white/90" : "text-slate-600"}`}>
            {area.tagline || `Save at the best local spots in ${area.name} with your Passport.`}
          </p>
          {area.description && (
            <p className={`mt-2 max-w-2xl ${themed ? "text-white/90" : "text-slate-600"}`}>
              {area.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/${state.slug}/${area.slug}/passport`}
              className={
                themed
                  ? "rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-slate-100"
                  : "rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white hover:bg-brand-primary-dark"
              }
            >
              Get the {area.name} Passport
            </Link>
            <Link
              href={`/${state.slug}/${area.slug}/discover`}
              className={
                themed
                  ? "rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white"
                  : "rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-500"
              }
            >
              Browse businesses
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Why get the {area.name} Passport
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          <Benefit
            title="Deep local savings"
            body={`Your ${area.name} Passport unlocks every participating business across the region.`}
          />
          <Benefit
            title="Real savings, not gimmicks"
            body="Every offer is a real discount, freebie, or deal from a business that opted in - no fine print designed to make it unusable."
          />
          <Benefit
            title="Bring the family"
            body="Many Passports cover more than one person, so everyone in your group saves - not just the Passport holder."
          />
        </div>
      </section>

      {featuredBusinesses.length > 0 && (
        <section className={themed ? "border-t border-slate-200 bg-brand-tint" : "border-t border-slate-200 bg-slate-50"}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900">Featured Businesses</h2>
              <Link
                href={`/${state.slug}/${area.slug}/discover`}
                className={
                  themed
                    ? "text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
                    : "text-sm font-semibold text-slate-700 hover:text-slate-900"
                }
              >
                View all businesses &rarr;
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  href={`/${state.slug}/${area.slug}/businesses/${business.slug}`}
                  offer={primaryOffers.get(business.id) ?? null}
                  themed={themed}
                  favorite={{
                    isSignedIn: Boolean(user),
                    isFavorited: favoritedIds.has(business.id),
                    toggleAction: toggleFavorite.bind(null, business.id, homePath),
                    passportHref: `/${state.slug}/${area.slug}/passport`,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900">Own a business in {area.name}?</h2>
          <p className="max-w-xl text-sm text-slate-600">
            Join the {area.name} Passport and put your business in front of locals and visitors
            actively looking for new places to go.
          </p>
          <Link
            href={`/${state.slug}/${area.slug}/for-businesses`}
            className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
          >
            Register Your Business &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}
