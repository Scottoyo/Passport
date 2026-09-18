import Link from "next/link";
import type { Metadata } from "next";
import { getActiveAreasWithStates, getActiveStates } from "@/lib/queries";

export const metadata: Metadata = { title: "Get the Passport" };

// Region-first picker: most visitors think in terms of their region, not
// their state — but a Passport is still priced and purchased per state
// (see docs/ARCHITECTURE.md), so every region here routes into
// /[state]/passport, the same purchase page a state pick would.
export default async function PassportChooserPage() {
  const [areas, states] = await Promise.all([getActiveAreasWithStates(), getActiveStates()]);

  const areasByState = new Map<string, typeof areas>();
  for (const area of areas) {
    const list = areasByState.get(area.stateSlug) ?? [];
    list.push(area);
    areasByState.set(area.stateSlug, list);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Get the Passport</h1>
      <p className="mt-4 text-lg text-slate-600">
        Find your region below to get started. A Passport is priced per
        state, so picking your region takes you straight to your state&apos;s
        pricing and purchase page.
      </p>

      {areas.length === 0 ? (
        <p className="mt-10 text-slate-600">No regions are live yet — check back soon.</p>
      ) : (
        <div className="mt-10 space-y-8">
          {[...areasByState.entries()].map(([stateSlug, stateAreas]) => (
            <div key={stateSlug}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {stateAreas[0].stateName}
              </h2>
              <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {stateAreas.map((area) => (
                  <li key={area.id}>
                    <Link
                      href={`/${stateSlug}/passport`}
                      className="flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {area.name}
                      <span aria-hidden className="text-slate-400">
                        &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Don&apos;t see your region? Browse by state
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {states.map((state) => (
            <li key={state.id}>
              <Link
                href={`/${state.slug}/passport`}
                className="inline-block rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-500"
              >
                {state.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Visiting more than one state? You&apos;ll need a separate Passport
        for each &mdash; each one only unlocks offers in its own state.
      </p>
    </div>
  );
}
