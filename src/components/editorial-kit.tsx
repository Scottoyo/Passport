import { Fraunces, DM_Sans } from "next/font/google";

// Shared "editorial travel poster" building blocks - the visual language
// introduced for the Orlando business sell page (src/app/[state]/[area]/
// for-businesses/page.tsx) and reused here so any other page that wants the
// same brand feel (e.g. the region passport purchase page) stays visually
// identical rather than drifting via copy-pasted, slightly-different code.
// Scoped to whichever pages import it - the rest of the app keeps its
// existing Geist/Arial type.
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-fraunces",
});
export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
});

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A circular "passport stamp" icon paired with a title/body - used for
// parallel value-prop style facts (not sequential steps; see RouteStep for
// that).
export function StampStat({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-brand-primary text-brand-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7" aria-hidden>
          <path d="M12 3v18M3 12h18" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h3 className="mt-4 font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#102F3B]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[#102F3B]/70">{children}</p>
    </div>
  );
}

// A numbered stop along a sequential route (used for "How it works" style
// steps, e.g. 01, 02, 03...).
export function RouteStep({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary font-[family-name:var(--font-fraunces)] text-sm font-bold text-white">
        {step}
      </div>
      <h3 className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[#102F3B]">{title}</h3>
      <p className="mt-1 text-sm text-[#102F3B]/70">{children}</p>
    </div>
  );
}
