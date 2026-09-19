import Link from "next/link";
import type { Metadata } from "next";
import { getActiveAreasWithStates } from "@/lib/queries";

export const metadata: Metadata = { title: "Get the Passport" };

// Region-first picker: a Passport is priced and purchased per region (see
// docs/ARCHITECTURE.md) — every region here routes into
// /[state]/[area]/passport, the actual purchase page for that region.
export default async function PassportChooserPage() {
  const areas = await getActiveAreasWithStates();

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
        Find your region below to get started — a Passport is priced and
        sold per region, so picking yours takes you straight to its
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
                      href={`/${stateSlug}/${area.slug}/passport`}
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

      <p className="mt-8 text-sm text-slate-500">
        Visiting more than one region? You&apos;ll need a separate
        Passport for each &mdash; each one only unlocks offers in its own
        region.
      </p>
    </div>
  );
}
