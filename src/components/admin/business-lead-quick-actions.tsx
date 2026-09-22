"use client";

import { setLeadDisposition, setLeadActivity } from "@/app/admin/business-leads/[leadId]/actions";
import type { BusinessLeadDisposition } from "@/lib/types/domain";

const DISPOSITIONS: { value: BusinessLeadDisposition; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed_won", label: "Closed Won" },
  { value: "lost", label: "Lost" },
];

// Auto-submits on change, same idiom as GlobalScopeSelector/
// RegionScopeSelector (admin/layout.tsx's state/region pickers) -
// e.currentTarget.form?.requestSubmit() rather than a separate Save button
// for a single-field change.
export function LeadDispositionSelect({
  leadId,
  current,
}: {
  leadId: string;
  current: BusinessLeadDisposition;
}) {
  return (
    <form action={setLeadDisposition.bind(null, leadId)}>
      <select
        name="disposition"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-border px-3 py-2 text-sm font-semibold"
      >
        {DISPOSITIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
    </form>
  );
}

export function LeadActivityToggle({
  leadId,
  field,
  label,
  checked,
}: {
  leadId: string;
  field: "emailed" | "called" | "visited";
  label: string;
  checked: boolean;
}) {
  return (
    <form action={setLeadActivity.bind(null, leadId, field)}>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name={field}
          defaultChecked={checked}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        {label}
      </label>
    </form>
  );
}
