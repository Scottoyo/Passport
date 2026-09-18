import Link from "next/link";
import type { Metadata } from "next";
import { CreateProfileForm } from "@/components/create-profile-form";

export const metadata: Metadata = { title: "Create a Profile" };

const BENEFITS = [
  "Explore participating businesses",
  "Save your favorite businesses",
  "Discover Passport promotions and experiences",
  "Manage your profile",
  "Upgrade to a Passport anytime",
];

export default function CreateProfilePage() {
  return (
    <div className="grid min-h-[calc(100vh-73px)] lg:grid-cols-2">
      <div className="bg-slate-50 px-6 py-16 sm:px-12 lg:py-24">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold text-slate-900">Create Your Free Profile</h1>
          <p className="mt-3 text-slate-600">
            Explore states across the country, save your favorite businesses,
            and discover Passport experiences before you&apos;re ready to
            purchase a Passport.
          </p>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700">
            <CheckIcon />
            No Passport purchase required
          </span>

          <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-slate-500">
            What you can do with a free profile
          </h2>
          <ul className="mt-4 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200">
                  <DotIcon />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <LockIcon />
            <p>
              Passport promotions can be explored with a free profile, but an
              active Passport is required to redeem Passport offers.
            </p>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-600">Ready for the full Passport experience?</p>
            <Link
              href="/passport"
              className="mt-3 inline-block rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
            >
              Get the Passport
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
      className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
      aria-hidden
    >
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" strokeLinecap="round" />
    </svg>
  );
}
