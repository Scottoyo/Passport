import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getSubareasForArea,
  getBusinessesForArea,
  getCategories,
  getPrimaryOffersForBusinesses,
} from "@/lib/queries";
import { BusinessCard } from "@/components/business-card";
import { BusinessDiscoverFilter } from "@/components/business-discover-filter";

interface Props {
  params: Promise<{ state: string; area: string }>;
  searchParams: Promise<{ q?: string; category?: string; subarea?: string }>;
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `${area.name}, ${state.abbreviation}` : "Passport Area" };
}

export default async function AreaPage({ params, searchParams }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const { q: qParam, category: categoryId, subarea: subareaSlug } = await searchParams;
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/${state.slug}`} className="hover:text-slate-700">
          {state.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{area.name}</span>
      </nav>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {area.name} Passport
      </p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">
        Discover {area.name} Perks
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        {area.tagline || `Save at the best local spots in ${area.name} with your Passport.`}
      </p>
      {area.description && (
        <p className="mt-2 max-w-2xl text-slate-600">{area.description}</p>
      )}

      <Link
        href={`/${state.slug}/${area.slug}/passport`}
        className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Get the {area.name} Passport
      </Link>

      {subareas.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">Neighborhoods</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={buildAreaFilterHref(`/${state.slug}/${area.slug}`, { q, categoryId })}
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
                href={buildAreaFilterHref(`/${state.slug}/${area.slug}`, {
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
          basePath={`/${state.slug}/${area.slug}`}
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
