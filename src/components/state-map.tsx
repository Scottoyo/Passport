"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import usaMap from "@svg-maps/usa";
import type { State } from "@/lib/types/domain";
import { buttonClasses } from "@/lib/ui-classes";

interface MapLocation {
  id: string;
  name: string;
  path: string;
}

// Highlights states that have an active row in the `states` table; every
// other state renders muted and is not clickable. Any active state links
// straight through on click - active status alone is enough, regardless of
// whether it has any businesses/offers live yet.
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

  function handleSelect(state: State) {
    router.push(`/${state.slug}`);
  }

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <svg viewBox={viewBox} role="img" aria-label="Map of the United States">
            {locations.map((location) => {
              const active = activeByAbbreviation.get(location.id);
              const isHovered = hoveredId === location.id;
              return (
                <path
                  key={location.id}
                  d={location.path}
                  onClick={() => active && handleSelect(active)}
                  onMouseEnter={() => setHoveredId(location.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={
                    active
                      ? `cursor-pointer transition-colors ${isHovered ? "fill-brand-primary-dark" : "fill-brand-primary"}`
                      : "fill-border"
                  }
                >
                  <title>{active ? `${location.name} - explore Passport Areas` : location.name}</title>
                </path>
              );
            })}
          </svg>
        </div>
        <div>
          <ul className="flex flex-wrap gap-2">
            {states.length === 0 && (
              <li className="text-sm text-ink-muted">No states are live yet - check back soon.</li>
            )}
            {states.map((state) => (
              <li key={state.id}>
                <button type="button" onClick={() => handleSelect(state)} className={buttonClasses("outline", "sm")}>
                  {state.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
