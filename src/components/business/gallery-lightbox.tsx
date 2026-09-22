"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/lib/ui-classes";
import type { BusinessMedia } from "@/lib/types/domain";

// A native <dialog> gets focus-trap and Escape-to-close for free per the
// HTML spec (showModal()), so this needs no extra dependency and no
// hand-rolled focus-trap code - just Left/Right for prev/next on top.
export function GalleryLightbox({ items }: { items: BusinessMedia[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + items.length) % items.length);
    }
    const dialog = dialogRef.current;
    dialog?.addEventListener("keydown", onKeyDown);
    return () => dialog?.removeEventListener("keydown", onKeyDown);
  }, [items.length]);

  function open(i: number) {
    setIndex(i);
    dialogRef.current?.showModal();
  }

  if (items.length === 0) return null;
  const active = items[index];

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => open(i)}
            className="overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.alt_text ?? ""} className="h-32 w-full object-cover" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="max-h-[90vh] max-w-[90vw] rounded-2xl border border-border bg-surface p-4 backdrop:bg-ink/70"
        aria-label="Gallery image viewer"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            {index + 1} of {items.length}
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className={buttonClasses("ghost", "sm")}
          >
            Close
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            disabled={items.length < 2}
            className={buttonClasses("ghost", "sm")}
            aria-label="Previous image"
          >
            ←
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.alt_text ?? ""}
            className="max-h-[70vh] max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            disabled={items.length < 2}
            className={buttonClasses("ghost", "sm")}
            aria-label="Next image"
          >
            →
          </button>
        </div>
        {active.alt_text && <p className="mt-2 text-center text-sm text-ink-muted">{active.alt_text}</p>}
      </dialog>
    </>
  );
}
