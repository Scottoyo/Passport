import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug } from "@/lib/queries";
import { CreateProfileForm } from "@/components/create-profile-form";
import { buttonClasses } from "@/lib/ui-classes";

interface Props {
  params: Promise<{ state: string; area: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `Create a Profile | ${area.name} Passport` : "Create a Profile" };
}

const BENEFITS = [
  "Explore participating businesses",
  "Save your favorite businesses",
  "Discover Passport promotions and experiences",
  "Manage your profile",
  "Upgrade to a Passport anytime",
];

export default async function AreaCreateProfilePage({ params }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  return (
    <div>
      {/* Compact branded header - a small text band, not a large hero, so
          the form stays above the fold. */}
      <div className="bg-brand-primary">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-white">{area.name} Passport</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="bg-brand-surface-alt px-6 py-16 sm:px-12 lg:py-24">
          <div className="mx-auto max-w-md">
            <h1 className="font-display text-3xl font-bold text-ink">Create Your Free Profile</h1>
            <p className="mt-3 text-ink-muted">
              Explore {area.name}, save your favorite businesses, and discover Passport
              experiences before you&apos;re ready to purchase a Passport.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-tint-strong px-4 py-1.5 text-sm font-medium text-brand-primary">
              <CheckIcon />
              No Passport purchase required
            </span>

            <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              What you can do with a free profile
            </h2>
            <ul className="mt-4 space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted ring-1 ring-border">
                    <DotIcon />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-sm text-ink-muted">
              <LockIcon />
              <p>
                Passport promotions can be explored with a free profile, but an active Passport is
                required to redeem Passport offers.
              </p>
            </div>

            <div className="mt-10 border-t border-border pt-6">
              <p className="text-sm text-ink-muted">Ready for the full {area.name} Passport experience?</p>
              <Link href={`/${state.slug}/${area.slug}/passport`} className={`mt-3 ${buttonClasses("outline")}`}>
                Get the {area.name} Passport
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center px-6 py-16 sm:px-12 lg:py-24">
          <div className="mx-auto w-full max-w-md">
            <CreateProfileForm />
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
      <path d="M4 10.5 8 14.5 16 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted"
      aria-hidden
    >
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" strokeLinecap="round" />
    </svg>
  );
}
