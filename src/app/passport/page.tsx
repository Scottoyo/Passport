import Link from "next/link";
import type { Metadata } from "next";
import { getActiveStates } from "@/lib/queries";

export const metadata: Metadata = { title: "Get the Passport" };

// Passports are purchased per state (see docs/ARCHITECTURE.md) — this page
// is just the picker that routes into /[state]/passport, where pricing is
// actually shown.
export default async function PassportChooserPage() {
  const states = await getActiveStates();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Get the Passport</h1>
      <p className="mt-4 text-lg text-slate-600">
        Each state has its own Passport, priced and sized for that state.
        Pick the state you want savings in to see pricing and buy.
      </p>

      <ul className="mt-10 divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {states.map((state) => (
          <li key={state.id}>
            <Link
              href={`/${state.slug}/passport`}
              className="flex items-center justify-between px-6 py-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {state.name}
              <span aria-hidden className="text-slate-400">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
        {states.length === 0 && (
          <li className="px-6 py-4 text-sm text-slate-500">No states are live yet — check back soon.</li>
        )}
      </ul>

      <p className="mt-6 text-sm text-slate-500">
        Visiting more than one state? You&apos;ll need a separate Passport
        for each &mdash; each one only unlocks offers in its own state.
      </p>
    </div>
  );
}
