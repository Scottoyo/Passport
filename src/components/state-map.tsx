"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import usaMap from "@svg-maps/usa";
import type { State } from "@/lib/types/domain";
import { joinPerkWaitlist } from "@/app/actions";

interface MapLocation {
  id: string;
  name: string;
  path: string;
}

// Highlights states that have an active row in the `states` table; every
// other state renders muted and is not clickable. Among active states,
// only ones with a live perk (perkStateIds) go straight through on click —
// the rest collect a "notify me" signup instead, so nobody lands on an
// empty state page.
export function StateMap({ states, perkStateIds }: { states: State[]; perkStateIds: Set<string> }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [waitlistState, setWaitlistState] = useState<State | null>(null);

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
    if (perkStateIds.has(state.id)) {
      router.push(`/${state.slug}`);
    } else {
      setWaitlistState(state);
    }
  }

  return (
    <div>
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
                  onClick={() => active && handleSelect(active)}
                  onMouseEnter={() => setHoveredId(location.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={
                    active
                      ? `cursor-pointer transition-colors ${isHovered ? "fill-slate-700" : "fill-slate-900"}`
                      : "fill-slate-200"
                  }
                >
                  <title>
                    {active
                      ? perkStateIds.has(active.id)
                        ? `${location.name} - explore Passport Areas`
                        : `${location.name} - coming soon`
                      : location.name}
                  </title>
                </path>
              );
            })}
          </svg>
        </div>
        <div>
          <ul className="flex flex-wrap gap-2">
            {states.length === 0 && (
              <li className="text-sm text-slate-500">No states are live yet - check back soon.</li>
            )}
            {states.map((state) => (
              <li key={state.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(state)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500"
                >
                  {state.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {waitlistState && <WaitlistModal state={waitlistState} onClose={() => setWaitlistState(null)} />}
    </div>
  );
}

function WaitlistModal({ state, onClose }: { state: State; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await joinPerkWaitlist(state.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">{state.name}: Coming Soon</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <p className="mt-4 text-sm text-slate-600">
            Thanks - we&apos;ll email you when {state.name} perks are live.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Get notified when perks are available in {state.name}.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="first_name"
                  placeholder="First name"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="last_name"
                  placeholder="Last name"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Notify me"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
