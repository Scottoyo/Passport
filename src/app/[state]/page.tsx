import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreasForState, getSecondaryAreasForState } from "@/lib/queries";
import { cardClasses } from "@/lib/ui-classes";
import { RegionHeroBanner, getRegionHeroImage } from "@/components/region-hero-banner";

interface Props {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  return { title: state ? state.name : "State" };
}

export default async function StatePage({ params }: Props) {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();

  const [areas, secondaryAreas] = await Promise.all([
    getAreasForState(state.id),
    getSecondaryAreasForState(state.id),
  ]);
  const sortedSecondaryAreas = [...secondaryAreas].sort((a, b) => a.area.name.localeCompare(b.area.name));
  const heroImage = getRegionHeroImage(state);
  const heroOverlay = state.brand_hero_overlay === "scrim" ? "scrim" : "none";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {heroImage && (
        <div className="mb-6">
          <RegionHeroBanner src={heroImage.src} alt={heroImage.alt} variant="card" fit="contain" overlay={heroOverlay} />
        </div>
      )}
      <h1 className="font-display text-3xl font-bold text-ink">{state.name}</h1>
      {state.intro_copy && (
        <p className="mt-2 max-w-2xl text-ink-muted">{state.intro_copy}</p>
      )}

      <h2 className="mt-10 text-xl font-semibold text-ink">
        Passport Areas in {state.name}
      </h2>
      {areas.length === 0 && sortedSecondaryAreas.length === 0 ? (
        <p className="mt-2 text-ink-muted">
          No Passport Areas are live in {state.name} yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Link
              key={area.id}
              href={`/${state.slug}/${area.slug}`}
              className={`p-6 transition-colors hover:border-brand-primary ${cardClasses()}`}
            >
              <h3 className="text-lg font-semibold text-ink">{area.name}</h3>
              {area.tagline && (
                <p className="mt-1 text-sm text-ink-muted">{area.tagline}</p>
              )}
            </Link>
          ))}
          {sortedSecondaryAreas.map(({ area, primaryStateSlug, primaryStateAbbreviation }) => (
            <Link
              key={`secondary-${area.id}`}
              href={`/${primaryStateSlug}/${area.slug}`}
              className={`p-6 transition-colors hover:border-brand-primary ${cardClasses()}`}
            >
              <h3 className="text-lg font-semibold text-ink">
                {area.name} ({primaryStateAbbreviation})
              </h3>
              {area.tagline && (
                <p className="mt-1 text-sm text-ink-muted">{area.tagline}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-16 flex flex-col items-center gap-3 border-t border-border pt-10 text-center">
        <h2 className="text-lg font-semibold text-ink">Own a business in {state.name}?</h2>
        <p className="max-w-xl text-sm text-ink-muted">
          It&apos;s free to join The Passport - no monthly fees - and put your business in front
          of locals and visitors actively looking for new places to go.
        </p>
        <Link
          href={`/register-business?state=${state.slug}`}
          className="text-sm font-semibold text-brand-primary hover:text-brand-primary-dark"
        >
          Register Your Business &rarr;
        </Link>
      </div>
    </div>
  );
}
