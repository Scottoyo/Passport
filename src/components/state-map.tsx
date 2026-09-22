"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import usaMap from "@svg-maps/usa";
import type { State } from "@/lib/types/domain";
import { joinStateWaitlist } from "@/app/actions";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

interface MapLocation {
  id: string;
  name: string;
  path: string;
}

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm";

// Highlights every state that has a row in the `states` table (all 50, in
// practice); every other state renders muted and is not clickable. An
// active state links straight through on click - active status alone is
// enough, regardless of whether it has any businesses/offers live yet. A
// state that isn't active yet (still "draft" in the admin portal) opens a
// "Coming Soon" waitlist modal instead of navigating to what would
// otherwise be an empty state page.
export function StateMap({ states }: { states: State[] }) {
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
    if (state.status === "active") {
      router.push(`/${state.slug}`);
    } else {
      setWaitlistState(state);
    }
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
                  <title>
                    {active
                      ? active.status === "active"
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

      {waitlistState && (
        <WaitlistModal state={waitlistState} onClose={() => setWaitlistState(null)} />
      )}
    </div>
  );
}

function WaitlistModal({ state, onClose }: { state: State; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await joinStateWaitlist(state.id, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
      onClick={onClose}
    >
      <div className={`w-full max-w-sm p-6 shadow-xl ${cardClasses()}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-ink">
            {success ? "You're on the list!" : "Coming Soon! Get Notified"}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-ink">
            &times;
          </button>
        </div>

        {success ? (
          <p className="mt-3 text-sm text-ink-muted">
            We&apos;ll email you as soon as {state.name} Passport is live.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              {state.name} Passport isn&apos;t live yet. Leave your details and we&apos;ll let you
              know the moment it launches.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-ink-muted">First name</span>
                <input name="first_name" required className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-muted">Last name</span>
                <input name="last_name" required className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-ink-muted">Email</span>
                <input name="email" type="email" required className={inputClass} />
              </label>
              {error && <p className="text-sm text-error">{error}</p>}
              <button type="submit" disabled={isPending} className={`w-full ${buttonClasses("primary")}`}>
                {isPending ? "Submitting..." : "Notify Me"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
