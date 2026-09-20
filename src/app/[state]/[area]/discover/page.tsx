import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";
import { DiscoverAreaContent } from "@/components/discover-area-content";

interface Props {
  params: Promise<{ state: string; area: string }>;
  searchParams: Promise<{ q?: string; category?: string; subarea?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `Discover ${area.name}, ${state.abbreviation}` : "Passport Area" };
}

export default async function AreaDiscoverPage({ params, searchParams }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const resolvedSearchParams = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <DiscoverAreaContent
        state={state}
        area={area}
        searchParams={resolvedSearchParams}
        basePath={`/${state.slug}/${area.slug}/discover`}
      />
    </div>
  );
}
