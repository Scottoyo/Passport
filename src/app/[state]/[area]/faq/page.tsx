import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";
import { FaqList } from "@/components/faq-list";

interface Props {
  params: Promise<{ state: string; area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `FAQ | ${area.name} Passport` : "FAQ" };
}

export default async function AreaFaqPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  return (
    <div>
      {/* Compact branded header - a text band, not the full hero photo,
          since a FAQ page doesn't need (or benefit from) a large visual. */}
      <div className="bg-brand-primary">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            {area.name} Passport
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
            Frequently asked questions
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <FaqList />
      </div>
    </div>
  );
}
