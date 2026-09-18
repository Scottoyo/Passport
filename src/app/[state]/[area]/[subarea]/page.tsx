import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getSubareaBySlug,
  getBusinessesForArea,
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
  return { title: subarea ? `${subarea.name} — ${area.name}` : "Neighborhood" };
}

export default async function SubareaPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug, subarea: subareaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();
  const subarea = await getSubareaBySlug(area.id, subareaSlug);
  if (!subarea) notFound();

  const businesses = await getBusinessesForArea(area.id, { subareaId: subarea.id });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/${state.slug}`} className="hover:text-slate-700">
          {state.name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${state.slug}/${area.slug}`} className="hover:text-slate-700">
          {area.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{subarea.name}</span>
      </nav>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{subarea.name}</h1>
      {subarea.description && (
        <p className="mt-4 max-w-2xl text-slate-600">{subarea.description}</p>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">
          Participating businesses
        </h2>
        {businesses.length === 0 ? (
          <p className="mt-2 text-slate-600">
            No businesses are live in {subarea.name} yet.
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
