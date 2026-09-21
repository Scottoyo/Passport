"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const DISPOSITIONS = [
  { value: "lead", label: "Lead" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed_won", label: "Closed Won" },
  { value: "lost", label: "Lost" },
];

const selectClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm";

// No State/Region filter here - the admin section's own "Viewing" scope
// selector (GlobalScopeSelector/RegionScopeSelector in admin/layout.tsx)
// already controls which states/regions this list is scoped to, site-wide.
// A second, page-local state/region filter would either duplicate that or
// (as it did before this) silently do nothing, since the list query is
// only ever narrowed by the shared scope cookie, not by page searchParams.
// All filter state here lives in the URL, matching this app's established
// admin filter-bar convention (see businesses-filter-bar.tsx) - the only
// new piece is debouncing the free-text search input specifically, since a
// leads table can grow large enough that submitting on every keystroke
// would be wasteful (this repo has no existing debounce pattern to reuse,
// so this is a small, scoped addition, not a new dependency).
export function BusinessLeadsFilterBar() {
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

  const hasActiveFilters = ["q", "disposition", "emailed", "called", "visited"].some((key) => searchParams.get(key));

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
