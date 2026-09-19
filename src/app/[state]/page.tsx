import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreasForState } from "@/lib/queries";

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

  const areas = await getAreasForState(state.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">{state.name}</h1>
      {state.intro_copy && (
        <p className="mt-2 max-w-2xl text-slate-600">{state.intro_copy}</p>
      )}

      <h2 className="mt-10 text-xl font-semibold text-slate-900">
        Passport Areas in {state.name}
      </h2>
      {areas.length === 0 ? (
        <p className="mt-2 text-slate-600">
          No Passport Areas are live in {state.name} yet.
        </p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area) => (
            <Link
              key={area.id}
              href={`/${state.slug}/${area.slug}`}
              className="rounded-2xl border border-slate-200 p-6 transition-colors hover:border-slate-400"
            >
              <h3 className="text-lg font-semibold text-slate-900">{area.name}</h3>
              {area.tagline && (
                <p className="mt-1 text-sm text-slate-600">{area.tagline}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
