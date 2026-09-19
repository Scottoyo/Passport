import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getSubareasForArea,
  getBusinessesForArea,
} from "@/lib/queries";
import { BusinessCard } from "@/components/business-card";

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

export default async function AreaPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const [subareas, businesses] = await Promise.all([
    getSubareasForArea(area.id),
    getBusinessesForArea(area.id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/${state.slug}`} className="hover:text-slate-700">
          {state.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{area.name}</span>
      </nav>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{area.name}</h1>
      {area.tagline && <p className="mt-1 text-lg text-slate-600">{area.tagline}</p>}
      {area.description && (
        <p className="mt-4 max-w-2xl text-slate-600">{area.description}</p>
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
            {subareas.map((subarea) => (
              <Link
                key={subarea.id}
                href={`/${state.slug}/${area.slug}/${subarea.slug}`}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500"
              >
                {subarea.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">
          Participating businesses
        </h2>
        {businesses.length === 0 ? (
          <p className="mt-2 text-slate-600">
            No businesses are live in {area.name} yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                href={`/${state.slug}/${area.slug}/businesses/${business.slug}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
