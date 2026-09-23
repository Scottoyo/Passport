"use client";

import { useState } from "react";

export interface ScopeStateOption {
  id: string;
  name: string;
  areas: { id: string; name: string }[];
}

// Generic national/state/region scope picker - shared by anything an admin
// creates with a 3-tier scope (promo codes, announcements): a hidden
// "scope" field valued "national" | "state:<id>" | "area:<id>".
export function ScopeSelect({
  states,
  allowNational,
}: {
  states: ScopeStateOption[];
  allowNational: boolean;
}) {
  const [stateId, setStateId] = useState<string>(allowNational ? "" : (states[0]?.id ?? ""));
  const [areaId, setAreaId] = useState<string>("");

  const selectedState = states.find((s) => s.id === stateId) ?? null;
  const scopeValue = areaId ? `area:${areaId}` : stateId ? `state:${stateId}` : "national";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="scope" value={scopeValue} />
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">State</span>
        <select
          value={stateId}
          onChange={(e) => {
            setStateId(e.target.value);
            setAreaId("");
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          {allowNational && <option value="">National (all states)</option>}
          {states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {selectedState && selectedState.areas.length > 0 && (
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Region</span>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">All of {selectedState.name}</option>
            {selectedState.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
