"use client";

import { useState } from "react";
import type { DashboardBusinessInfo } from "@/lib/admin-queries";
import { buttonClasses } from "@/lib/ui-classes";

export function BusinessInfoModalButton({ business }: { business: DashboardBusinessInfo }) {
  const [open, setOpen] = useState(false);

  const publicHref =
    business.stateSlug && business.areaSlug && business.slug
      ? `/${business.stateSlug}/${business.areaSlug}/businesses/${business.slug}`
      : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses("outline", "sm")}>
        View
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">{business.name}</h3>
                <p className="text-sm text-ink-muted">{business.areaName ?? "Unknown area"}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-ink-muted hover:text-ink"
              >
                &times;
              </button>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              {business.categoryName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Category</dt>
                  <dd className="text-ink">{business.categoryName}</dd>
                </div>
              )}
              {(business.addressLine1 || business.city) && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Address</dt>
                  <dd className="text-right text-ink">
                    {business.addressLine1}
                    {business.addressLine1 && business.city ? ", " : ""}
                    {business.city}
                    {business.stateCode ? ` ${business.stateCode}` : ""}
                  </dd>
                </div>
              )}
              {business.phone && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Phone</dt>
                  <dd className="text-ink">{business.phone}</dd>
                </div>
              )}
              {business.shortDescription && (
                <p className="mt-2 text-ink-muted">{business.shortDescription}</p>
              )}
            </dl>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={buttonClasses("outline")}>
                Close
              </button>
              {publicHref && (
                <a href={publicHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary")}>
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
