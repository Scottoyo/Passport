"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { buttonClasses } from "@/lib/ui-classes";

export interface BusinessFilterOption {
  value: string;
  label: string;
}

export function BusinessesFilterBar({
  basePath,
  q,
  status,
  approval,
  categoryId,
  featured,
  areaId,
  categories,
  areas,
}: {
  basePath: string;
  q: string;
  status: string;
  approval: string;
  categoryId: string;
  featured: string;
  areaId: string;
  categories: BusinessFilterOption[];
  areas: BusinessFilterOption[];
}) {
  const router = useRouter();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const key of ["q", "status", "approval", "category", "featured", "area"]) {
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
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Search</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Business name"
          className="w-56 rounded-lg border border-border px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Status</span>
        <select name="status" defaultValue={status} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Any</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Approval</span>
        <select name="approval" defaultValue={approval} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Any</option>
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Category</span>
        <select name="category" defaultValue={categoryId} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Any</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Area</span>
        <select name="area" defaultValue={areaId} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Any</option>
          {areas.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-ink-muted">Featured</span>
        <select name="featured" defaultValue={featured} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">Any</option>
          <option value="yes">Featured</option>
          <option value="no">Not featured</option>
        </select>
      </label>
      <button className={buttonClasses("outline")}>Search</button>
      {(q || status || approval || categoryId || featured || areaId) && (
        <button type="button" onClick={() => router.push(basePath)} className="text-sm font-semibold text-ink-muted hover:text-ink">
          Clear filters
        </button>
      )}
    </form>
  );
}
