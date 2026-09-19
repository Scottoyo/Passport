"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Open/closed state lives in the URL (closeHref), matching every other
// stateful admin control in this app (ScopeFilter, GlobalScopeSelector) —
// not local-only client state. `children` is ordinary server-rendered
// content passed in from the parent Server Component.
export function Overlay({
  children,
  closeHref,
}: {
  children: React.ReactNode;
  closeHref: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.push(closeHref);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeHref, router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 py-10"
      onClick={() => router.push(closeHref)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            onClick={() => router.push(closeHref)}
            aria-label="Close"
            className="text-xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
