"use client";

import type { PassportArea } from "@/lib/types/domain";
import { setAdminAreaScope } from "@/app/admin/scope-actions";

// Mirrors GlobalScopeSelector exactly — same remount-on-change trick via
// `key={current?.id ?? "all"}` so defaultValue (an *initial*-only prop)
// never shows a stale selection after a confirmed change.
export function RegionScopeSelector({
  areas,
  current,
}: {
  areas: PassportArea[];
  current: PassportArea | null;
}) {
  return (
    <form action={setAdminAreaScope} className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Region</span>
      <select
        name="area"
        defaultValue={current?.id ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900"
      >
        <option value="">All regions</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
    </form>
  );
}
