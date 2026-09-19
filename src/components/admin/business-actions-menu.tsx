"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export function BusinessActionsMenu({
  viewHref,
  editHref,
  children,
}: {
  viewHref: string;
  editHref: string;
  children?: React.ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <details ref={detailsRef} className="relative inline-block text-left">
      <summary className="cursor-pointer list-none rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500">
        Actions
      </summary>
      <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
        <Link href={viewHref} className="block px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          View
        </Link>
        <Link href={editHref} className="block px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Edit
        </Link>
        {children}
      </div>
    </details>
  );
}
