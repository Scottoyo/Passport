"use client";

import { useState } from "react";
import type { DashboardBusinessInfo } from "@/lib/admin-queries";

export function BusinessInfoModalButton({ business }: { business: DashboardBusinessInfo }) {
  const [open, setOpen] = useState(false);

  const publicHref =
    business.stateSlug && business.areaSlug && business.slug
      ? `/${business.stateSlug}/${business.areaSlug}/businesses/${business.slug}`
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
      >
        View
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{business.name}</h3>
                <p className="text-sm text-slate-500">{business.areaName ?? "Unknown area"}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700"
              >
                &times;
              </button>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              {business.categoryName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Category</dt>
                  <dd className="text-slate-900">{business.categoryName}</dd>
                </div>
              )}
              {(business.addressLine1 || business.city) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Address</dt>
                  <dd className="text-right text-slate-900">
                    {business.addressLine1}
                    {business.addressLine1 && business.city ? ", " : ""}
                    {business.city}
                    {business.stateCode ? ` ${business.stateCode}` : ""}
                  </dd>
                </div>
              )}
              {business.phone && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="text-slate-900">{business.phone}</dd>
                </div>
              )}
              {business.shortDescription && (
                <p className="mt-2 text-slate-600">{business.shortDescription}</p>
              )}
            </dl>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                Close
              </button>
              {publicHref && (
                <a
                  href={publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  View business page
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
