"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { buttonClasses } from "@/lib/ui-classes";

export interface FilterOption {
  value: string;
  label: string;
}

export function BusinessDiscoverFilter({
  basePath,
  q,
  categoryId,
  categories,
  subarea,
}: {
  basePath: string;
  q: string;
  categoryId: string;
  categories: FilterOption[];
  subarea?: string;
}) {
  const router = useRouter();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const key of ["q", "category", "subarea"]) {
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
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border p-4"
    >
      <input type="hidden" name="subarea" value={subarea ?? ""} />
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Search businesses</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Business name"
          className="w-56 rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Category</span>
        <select
          name="category"
          defaultValue={categoryId}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <button className={buttonClasses("outline", "sm")}>Search</button>
      {(q || categoryId || subarea) && (
        <button type="button" onClick={() => router.push(basePath)} className={buttonClasses("ghost", "sm")}>
          Clear filters
        </button>
      )}
    </form>
  );
}
