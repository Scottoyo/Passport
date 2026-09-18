"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import usaMap from "@svg-maps/usa";
import type { State } from "@/lib/types/domain";

interface MapLocation {
  id: string;
  name: string;
  path: string;
}

// Highlights states that have an active row in the `states` table; every
// other state renders muted and is not clickable. This keeps the map
// entirely database-driven — adding a state in the admin portal is what
// makes it light up here, no code change required.
export function StateMap({ states }: { states: State[] }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeByAbbreviation = useMemo(() => {
    const map = new Map<string, State>();
    for (const state of states) {
      map.set(state.abbreviation.toLowerCase(), state);
    }
    return map;
  }, [states]);

  const locations = (usaMap as { locations: MapLocation[] }).locations;
  const viewBox = (usaMap as { viewBox: string }).viewBox;

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <svg viewBox={viewBox} role="img" aria-label="Map of the United States">
          {locations.map((location) => {
            const active = activeByAbbreviation.get(location.id);
            const isHovered = hoveredId === location.id;
            return (
              <path
                key={location.id}
                d={location.path}
                onClick={() => active && router.push(`/${active.slug}`)}
                onMouseEnter={() => setHoveredId(location.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={
                  active
                    ? `cursor-pointer transition-colors ${isHovered ? "fill-slate-700" : "fill-slate-900"}`
                    : "fill-slate-200"
                }
              >
                <title>{active ? `${location.name} — explore Passport Areas` : location.name}</title>
              </path>
            );
          })}
        </svg>
      </div>
      <div>
        <ul className="space-y-1">
          {states.length === 0 && (
            <li className="text-sm text-slate-500">
              No states are live yet — check back soon.
            </li>
          )}
          {states.map((state) => (
            <li key={state.id}>
              <a
                href={`/${state.slug}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {state.name}
                <span aria-hidden className="text-slate-400">
                  &rarr;
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
