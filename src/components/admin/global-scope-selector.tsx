"use client";

import type { State } from "@/lib/types/domain";
import { setAdminScope } from "@/app/admin/scope-actions";

export function GlobalScopeSelector({
  states,
  current,
}: {
  states: State[];
  current: State | null;
}) {
  return (
    <form action={setAdminScope} className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Viewing</span>
      <select
        name="state"
        defaultValue={current?.slug ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900"
      >
        <option value="">National (all states)</option>
        {states.map((state) => (
          <option key={state.id} value={state.slug}>
            {state.name}
          </option>
        ))}
      </select>
    </form>
  );
}
