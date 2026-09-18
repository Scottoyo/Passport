import Link from "next/link";
import { getActiveStates, getActivePassportProduct } from "@/lib/queries";
import { StateMap } from "@/components/state-map";

export default async function HomePage() {
  const [states, product] = await Promise.all([
    getActiveStates(),
    getActivePassportProduct(),
  ]);

  return (
    <div>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            One Passport. Savings everywhere.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Buy the National Passport once and unlock exclusive offers at
            participating restaurants, attractions, shops, and experiences in
            every state we&apos;re live in &mdash; no separate local passport
            required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/passport"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              {product
                ? `Get the Passport — $${(product.price_cents / 100).toFixed(2)}`
                : "Get the Passport"}
            </Link>
            <Link
              href="/states"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Explore states
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <HowItWorksStep
            step="1"
            title="Buy one Passport"
            body="A single purchase covers you nationwide — no separate Passport per city or state."
          />
          <HowItWorksStep
            step="2"
            title="Find participating spots"
            body="Browse by state, then by Passport Area, to discover local businesses and offers near you."
          />
          <HowItWorksStep
            step="3"
            title="Show it and save"
            body="Present your digital Passport at checkout to redeem each business's offer."
          />
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Explore by state
              </h2>
              <p className="mt-1 text-slate-600">
                Select a state to see its participating Passport Areas.
              </p>
            </div>
            <Link href="/states" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              View all states &rarr;
            </Link>
          </div>
          <StateMap states={states} />
        </div>
      </section>
    </div>
  );
}

function HowItWorksStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
