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
import { RegionHeroBanner, getRegionHeroImage } from "@/components/region-hero-banner";
import { toggleFavorite } from "@/app/[state]/[area]/businesses/[business]/actions";
import { buttonClasses } from "@/lib/ui-classes";

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
  const heroImage = getRegionHeroImage(area.slug);

  return (
    <div>
      {heroImage ? (
        <RegionHeroBanner src={heroImage.src} alt={heroImage.alt}>
          <h1 className="sr-only">The {area.name} Passport</h1>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/${state.slug}/${area.slug}/passport`}
              className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-surface-elevated"
            >
              Get the {area.name} Passport
            </Link>
            <Link
              href={`/${state.slug}/${area.slug}/discover`}
              className="rounded-lg border border-white/60 px-6 py-3 text-sm font-semibold text-white hover:border-white"
            >
              Browse businesses
            </Link>
          </div>
        </RegionHeroBanner>
      ) : (
        <section className={themed ? "bg-brand-primary" : "border-b border-border bg-surface-elevated"}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <p
              className={`text-sm font-semibold uppercase tracking-wide ${
                themed ? "text-white/80" : "text-ink-muted"
              }`}
            >
              {area.name} Passport
            </p>
            <h1
              className={`mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl ${
                themed ? "text-white" : "text-ink"
              }`}
            >
              The {area.name} Passport
            </h1>
            <p className={`mt-3 max-w-2xl text-lg ${themed ? "text-white/90" : "text-ink-muted"}`}>
              {area.tagline || `Save at the best local spots in ${area.name} with your Passport.`}
            </p>
            {area.description && (
              <p className={`mt-2 max-w-2xl ${themed ? "text-white/90" : "text-ink-muted"}`}>
                {area.description}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/${state.slug}/${area.slug}/passport`}
                className={
                  themed
                    ? "rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-surface-elevated"
                    : buttonClasses("primary")
                }
              >
                Get the {area.name} Passport
              </Link>
              <Link
                href={`/${state.slug}/${area.slug}/discover`}
                className={
                  themed
                    ? "rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:border-white"
                    : buttonClasses("outline")
                }
              >
                Browse businesses
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center font-display text-2xl font-bold text-ink">
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
        <section className={themed ? "border-t border-border bg-brand-tint" : "border-t border-border bg-surface-elevated"}>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-ink">Featured Businesses</h2>
              <Link href={`/${state.slug}/${area.slug}/discover`} className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
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

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
          <h2 className="text-lg font-semibold text-ink">Own a business in {area.name}?</h2>
          <p className="max-w-xl text-sm text-ink-muted">
            It&apos;s free to join the {area.name} Passport - no monthly fees - and put your
            business in front of locals and visitors actively looking for new places to go.
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
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
    </div>
  );
}
