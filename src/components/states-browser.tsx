"use client";

import { useMemo, useState } from "react";
import { StateMap } from "@/components/state-map";
import type { State } from "@/lib/types/domain";

export function StatesBrowser({ states }: { states: State[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return states;
    return states.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.abbreviation.toLowerCase().includes(q)
    );
  }, [states, query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search states..."
        className="mb-6 w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-500 focus:outline-none"
        aria-label="Search states"
      />
      <StateMap states={filtered} />
    </div>
  );
}
