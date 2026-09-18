import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getActivePassportProductForState } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "@/components/purchase-form";

export async function generateMetadata({
  params,
}: PageProps<"/[state]/passport">): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  return { title: state ? `${state.name} Passport` : "Passport" };
}

export default async function StatePassportPage({ params }: PageProps<"/[state]/passport">) {
  const { state: stateSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();

  const [product, supabase] = await Promise.all([
    getActivePassportProductForState(state.id),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">The {state.name} Passport</h1>
      <p className="mt-4 text-lg text-slate-600">
        One purchase unlocks every participating business in {state.name} —
        this Passport is only valid in {state.name}. Exploring another state
        too? You&apos;ll need a separate Passport for it.
      </p>

      {product ? (
        <div className="mt-10 rounded-2xl border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900">{product.name}</h2>
          {product.description && (
            <p className="mt-2 text-slate-600">{product.description}</p>
          )}
          <p className="mt-4 text-3xl font-bold text-slate-900">
            ${(product.price_cents / 100).toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Valid for {product.duration_days} days · covers up to{" "}
            {product.max_members} {product.max_members === 1 ? "person" : "people"}
          </p>
          <div className="mt-6">
            <PurchaseForm
              passportProductId={product.id}
              isSignedIn={Boolean(user)}
              next={`/${state.slug}/passport`}
            />
          </div>
        </div>
      ) : (
        <p className="mt-10 text-slate-600">
          {state.name} Passport pricing isn&apos;t published yet — check back soon.
        </p>
      )}

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="font-semibold text-slate-900">How it works</h3>
          <p className="mt-1 text-sm text-slate-600">
            Buy once, then browse {state.name}&apos;s Passport Areas to find
            participating businesses and their offers.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Redeeming offers</h3>
          <p className="mt-1 text-sm text-slate-600">
            Show your digital Passport at checkout. Each offer can be
            redeemed the number of times its business sets, per Passport.
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Valid statewide</h3>
          <p className="mt-1 text-sm text-slate-600">
            Works at any participating business anywhere in {state.name} —
            not just the area you bought it in.
          </p>
        </div>
      </div>
    </div>
  );
}
