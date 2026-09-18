import type { Metadata } from "next";
import { getActiveStates } from "@/lib/queries";
import { StatesBrowser } from "@/components/states-browser";

export const metadata: Metadata = {
  title: "Explore States",
};

export default async function StatesPage() {
  const states = await getActiveStates();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Explore by state</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Your Passport works everywhere it&apos;s accepted. States and
        Passport Areas below are here to help you find participating
        businesses near you.
      </p>
      <div className="mt-8">
        <StatesBrowser states={states} />
      </div>
    </div>
  );
}
