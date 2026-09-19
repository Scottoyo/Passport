"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export function BusinessDiscoverFilter({
  basePath,
  q,
  categoryId,
  categories,
}: {
  basePath: string;
  q: string;
  categoryId: string;
  categories: FilterOption[];
}) {
  const router = useRouter();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const key of ["q", "category"]) {
      const value = String(data.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(e.currentTarget);
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={(e) => submit(e.currentTarget)}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 p-4"
    >
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Search businesses</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Business name"
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-slate-600">Category</span>
        <select name="category" defaultValue={categoryId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
        Search
      </button>
      {(q || categoryId) && (
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Clear filters
        </button>
      )}
    </form>
  );
}
