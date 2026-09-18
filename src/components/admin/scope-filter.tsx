"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { State } from "@/lib/types/domain";

export function ScopeFilter({
  states,
  current,
  note,
}: {
  states: State[];
  current: State | null;
  note?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("state", e.target.value);
    } else {
      params.delete("state");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-end gap-3">
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">View</span>
        <select
          value={current?.slug ?? ""}
          onChange={handleChange}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">National (all states)</option>
          {states.map((state) => (
            <option key={state.id} value={state.slug}>
              {state.name}
            </option>
          ))}
        </select>
      </label>
      {note && <p className="max-w-sm text-xs text-slate-500">{note}</p>}
    </div>
  );
}
