"use client";

import type { State } from "@/lib/types/domain";
import { setAdminScope } from "@/app/admin/scope-actions";

// Caller passes `key={current?.slug ?? "national"}` — remounting on every
// confirmed scope change is what keeps defaultValue (an *initial*-only
// value) from ever showing a stale selection.
export function GlobalScopeSelector({
  states,
  current,
}: {
  states: State[];
  current: State | null;
}) {
  return (
    <form action={setAdminScope} className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Viewing</span>
      <select
        name="state"
        defaultValue={current?.slug ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
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
