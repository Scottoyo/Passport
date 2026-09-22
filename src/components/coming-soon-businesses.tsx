import Link from "next/link";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

// Shown in place of the normal business/promotion grid - on both the region
// Home page and the region Discover page (src/app/[state]/[area]/page.tsx
// and src/components/discover-area-content.tsx) - whenever
// hasPublishedOffersForArea() (src/lib/queries.ts) finds zero active offers
// for that region. One component, reused by both callers, so the two pages
// can never drift out of sync on copy or styling. Once the region's first
// offer goes live, both callers naturally stop rendering this and fall
// through to their existing business-grid markup - there's no separate
// "flag" to flip.
export function ComingSoonBusinesses({
  areaName,
  registerHref,
}: {
  areaName: string;
  registerHref: string;
}) {
  return (
    <section aria-labelledby="coming-soon-heading" className={`overflow-hidden ${cardClasses()}`}>
      <div className="mx-auto max-w-2xl px-6 py-16 text-center sm:px-10 sm:py-20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-brand-primary text-brand-primary">
          <SparkleIcon className="h-7 w-7" />
        </div>
        <h2 id="coming-soon-heading" className="mt-6 font-display text-2xl font-bold text-ink sm:text-3xl">
          Exciting Local Offers Are Coming Soon
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-muted">
          We&apos;re currently welcoming local businesses to join the {areaName} Passport. Check
          back soon to discover exclusive offers, local favorites, and new experiences throughout
          the area.
        </p>

        <div className="mx-auto mt-10 max-w-md rounded-2xl bg-brand-surface-alt p-6 sm:p-8">
          <p className="font-semibold text-ink">Own or manage a local business?</p>
          <p className="mt-2 text-sm text-ink-muted">
            Join the Passport and connect with residents and visitors looking for great places to
            shop, dine, explore, and experience.
          </p>
          <Link href={registerHref} className={`mt-5 inline-flex ${buttonClasses("primary")}`}>
            Register Your Business
          </Link>
        </div>
      </div>
    </section>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path
        d="M12 4.5c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 3.5c.2 1.1.7 1.6 1.8 1.8-1.1.2-1.6.7-1.8 1.8-.2-1.1-.7-1.6-1.8-1.8 1.1-.2 1.6-.7 1.8-1.8Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 16c.15.85.55 1.25 1.4 1.4-.85.15-1.25.55-1.4 1.4-.15-.85-.55-1.25-1.4-1.4.85-.15 1.25-.55 1.4-1.4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
