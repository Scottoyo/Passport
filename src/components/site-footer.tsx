"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { parseRegionSlugsFromPath } from "@/lib/region-path";

// Client component for the same reason as site-header-nav.tsx: the
// "For Businesses" link's region needs to reflect the CURRENT page on every
// client-side navigation, which a server-computed prop from the root
// layout can't guarantee (shared layouts don't re-run on every Link click).
export function SiteFooter() {
  const pathname = usePathname();
  const regionSlugs = parseRegionSlugsFromPath(pathname);

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; {new Date().getFullYear()} The Passport.</p>
        <div className="flex gap-4">
          <Link href="/#states" className="hover:text-slate-700">
            States
          </Link>
          <Link href="/passport" className="hover:text-slate-700">
            The Passport
          </Link>
          {regionSlugs && (
            <Link href={`/${regionSlugs.stateSlug}/${regionSlugs.areaSlug}/for-businesses`} className="hover:text-slate-700">
              For Businesses
            </Link>
          )}
          <Link href="/admin" className="hover:text-slate-700">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
