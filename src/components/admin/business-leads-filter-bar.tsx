"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { PassportArea, State } from "@/lib/types/domain";

interface StateWithAreas {
  state: State;
  areas: PassportArea[];
}

const DISPOSITIONS = [
  { value: "lead", label: "Lead" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed_won", label: "Closed Won" },
  { value: "lost", label: "Lost" },
];

const selectClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

// State/region options here are pre-scoped server-side (only what the
// signed-in user is authorized to see) - this component never widens that,
// it only lets the user narrow further within it. All filter state lives
// in the URL, matching this app's established admin filter-bar convention
// (see businesses-filter-bar.tsx) - the only new piece is debouncing the
// free-text search input specifically, since a leads table can grow large
// enough that submitting on every keystroke would be wasteful (this repo
// has no existing debounce pattern to reuse, so this is a small, scoped
// addition, not a new dependency).
export function BusinessLeadsFilterBar({ statesWithAreas }: { statesWithAreas: StateWithAreas[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => updateParams({ q: q || null, page: null }), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  const selectedStateId = searchParams.get("state") ?? "";
  const selectedRegionId = searchParams.get("region") ?? "";
  const areasForSelectedState = statesWithAreas.find((s) => s.state.id === selectedStateId)?.areas ?? [];

  const hasActiveFilters = ["q", "state", "region", "disposition", "emailed", "called", "visited"].some((key) =>
    searchParams.get(key)
  );

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 p-4">
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Search</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Business, contact, phone, email"
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-slate-600">State</span>
        <select
          value={selectedStateId}
          onChange={(e) => updateParams({ state: e.target.value || null, region: null, page: null })}
          className={selectClass}
        >
          <option value="">All states</option>
          {statesWithAreas.map(({ state }) => (
            <option key={state.id} value={state.id}>
              {state.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Region</span>
        <select
          value={selectedRegionId}
          onChange={(e) => updateParams({ region: e.target.value || null, page: null })}
          disabled={!selectedStateId}
          className={`${selectClass} disabled:opacity-50`}
        >
          <option value="">All regions</option>
          {areasForSelectedState.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Disposition</span>
        <select
          value={searchParams.get("disposition") ?? ""}
          onChange={(e) => updateParams({ disposition: e.target.value || null, page: null })}
          className={selectClass}
        >
          <option value="">All</option>
          {DISPOSITIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>

      <TriStateFilter label="Emailed" paramKey="emailed" searchParams={searchParams} onChange={updateParams} />
      <TriStateFilter label="Called" paramKey="called" searchParams={searchParams} onChange={updateParams} />
      <TriStateFilter label="Visited" paramKey="visited" searchParams={searchParams} onChange={updateParams} />

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.push(pathname);
          }}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function TriStateFilter({
  label,
  paramKey,
  searchParams,
  onChange,
}: {
  label: string;
  paramKey: string;
  searchParams: URLSearchParams;
  onChange: (updates: Record<string, string | null>) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <select
        value={searchParams.get(paramKey) ?? ""}
        onChange={(e) => onChange({ [paramKey]: e.target.value || null, page: null })}
        className={selectClass}
      >
        <option value="">Any</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}
