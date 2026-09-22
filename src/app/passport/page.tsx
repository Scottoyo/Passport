import Link from "next/link";
import type { Metadata } from "next";
import { getActiveAreasWithStates } from "@/lib/queries";

export const metadata: Metadata = { title: "Get Your Passport" };

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
      <h1 className="text-3xl font-bold text-ink">Get Your Passport</h1>
      <p className="mt-4 text-lg text-ink-muted">
        Find your region below to get started - a Passport is priced and
        sold per region, so picking yours takes you straight to its
        pricing and purchase page.
      </p>

      {areas.length === 0 ? (
        <p className="mt-10 text-ink-muted">No regions are live yet - check back soon.</p>
      ) : (
        <div className="mt-10 space-y-8">
          {[...areasByState.entries()].map(([stateSlug, stateAreas]) => (
            <div key={stateSlug}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {stateAreas[0].stateName}
              </h2>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-surface">
                {stateAreas.map((area) => (
                  <li key={area.id}>
                    <Link
                      href={`/${stateSlug}/${area.slug}/passport`}
                      className="flex items-center justify-between px-6 py-4 text-sm font-medium text-ink hover:bg-surface-elevated"
                    >
                      {area.name}
                      <span aria-hidden className="text-ink-muted">
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

      <p className="mt-8 text-sm text-ink-muted">
        Visiting more than one region? You&apos;ll need a separate
        Passport for each - each one only unlocks offers in its own
        region.
      </p>
    </div>
  );
}
