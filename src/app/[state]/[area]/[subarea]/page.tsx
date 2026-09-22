import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getSubareaBySlug,
  getBusinessesForArea,
  getCategories,
} from "@/lib/queries";
import { BusinessCard } from "@/components/business-card";

interface Props {
  params: Promise<{ state: string; area: string; subarea: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug, subarea: subareaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return {};
  const subarea = await getSubareaBySlug(area.id, subareaSlug);
  return { title: subarea ? `${subarea.name} - ${area.name}` : "Neighborhood" };
}

export default async function SubareaPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug, subarea: subareaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();
  const subarea = await getSubareaBySlug(area.id, subareaSlug);
  if (!subarea) notFound();

  const [businesses, categories] = await Promise.all([
    getBusinessesForArea(area.id, { subareaId: subarea.id }),
    getCategories([state.id]),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-ink-muted">
        <Link href={`/${state.slug}`} className="hover:text-ink">
          {state.name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${state.slug}/${area.slug}`} className="hover:text-ink">
          {area.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{subarea.name}</span>
      </nav>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">{subarea.name}</h1>
      {subarea.description && (
        <p className="mt-4 max-w-2xl text-ink-muted">{subarea.description}</p>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-ink">
          Participating businesses
        </h2>
        {businesses.length === 0 ? (
          <p className="mt-2 text-ink-muted">
            No businesses are live in {subarea.name} yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                href={`/${state.slug}/${area.slug}/businesses/${business.slug}`}
                category={business.category_id ? categoryNameById.get(business.category_id) : null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
