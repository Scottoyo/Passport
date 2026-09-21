"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Keeps the --brand-* CSS variables (and the header's colored-border
// attribute) correct on every client-side navigation, not just the initial
// hard load. The root layout already sets the right values server-side for
// whichever page is first rendered, but that layout is shared across the
// whole app and Next.js does not re-run it on a plain Link click - so
// without this, clicking from an unbranded page into a branded region (or
// between two different branded regions) would leave the old colors/header
// border in place until a hard reload. This component skips its first
// effect run (the server-rendered markup already matches on mount) and
// only re-resolves on subsequent pathname changes.
export function BrandColorSync() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;

    fetch(`/api/brand-colors?path=${encodeURIComponent(pathname)}`)
      .then((res) => res.json())
      .then((data: { themed: boolean; primary?: string; primaryDark?: string; secondary?: string }) => {
        if (cancelled) return;
        const body = document.body;
        if (data.themed && data.primary) {
          body.style.setProperty("--brand-primary", data.primary);
          body.style.setProperty("--brand-primary-dark", data.primaryDark ?? data.primary);
          body.style.setProperty("--brand-secondary", data.secondary ?? data.primary);
          body.dataset.themed = "true";
        } else {
          body.style.removeProperty("--brand-primary");
          body.style.removeProperty("--brand-primary-dark");
          body.style.removeProperty("--brand-secondary");
          delete body.dataset.themed;
        }
      })
      .catch(() => {
        // Best-effort - if this fails, colors just stay whatever they were
        // (worst case: a stale theme until the next successful sync or a
        // hard reload), never a broken page.
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
