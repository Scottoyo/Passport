"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getRegisterBusinessHref } from "@/lib/register-business-href";

export interface MobileMenuItem {
  href: string;
  label: string;
  variant?: "solid" | "outline" | "text";
  badge?: number;
}

export function MobileMenuButton({
  items,
  showRegisterBusiness,
  signOutAction,
  breakpoint = "sm",
}: {
  items: MobileMenuItem[];
  showRegisterBusiness?: boolean;
  signOutAction?: () => Promise<void>;
  // Must match whichever breakpoint the caller's own desktop nav switches
  // on - otherwise there's a dead zone where neither this button nor the
  // desktop nav renders.
  breakpoint?: "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hiddenAt = breakpoint === "lg" ? "lg:hidden" : "sm:hidden";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted ${hiddenAt}`}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden>
          <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={`fixed inset-0 z-50 bg-surface ${hiddenAt}`}>
          <div className="flex items-center justify-end px-4 py-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-muted"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden>
                <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-3 px-6 pb-10">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={itemClassName(item.variant)}
              >
                {item.label}
                {item.badge ? (
                  <span className="ml-2 rounded-full bg-error px-2 py-0.5 text-xs font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
            {showRegisterBusiness && (
              <Link
                href={getRegisterBusinessHref(pathname)}
                onClick={() => setOpen(false)}
                className={itemClassName("outline")}
              >
                Register a Business
              </Link>
            )}
            {signOutAction && (
              <form action={signOutAction}>
                <button type="submit" className={itemClassName("outline") + " w-full"}>
                  Log Out
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function itemClassName(variant: MobileMenuItem["variant"] = "outline") {
  if (variant === "solid") {
    return "rounded-lg bg-brand-primary px-6 py-3 text-center font-semibold text-white";
  }
  if (variant === "text") {
    return "px-6 py-3 text-center font-medium text-ink-muted";
  }
  return "rounded-lg border border-border px-6 py-3 text-center font-medium text-ink";
}
