import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug, getActivePassportProductForArea } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "@/components/purchase-form";

interface Props {
  params: Promise<{ state: string; area: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return { title: "Passport" };
  const area = await getAreaBySlug(state.id, areaSlug);
  return { title: area ? `${area.name} Passport` : "Passport" };
}

export default async function AreaPassportPage({ params, searchParams }: Props) {
  const { state: stateSlug, area: areaSlug } = await params;
  const { ref } = await searchParams;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();

  const [product, supabase] = await Promise.all([
    getActivePassportProductForArea(area.id),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">The {area.name} Passport</h1>
      <p className="mt-4 text-lg text-slate-600">
        One purchase unlocks every participating business in {area.name} —
        this Passport is only valid in {area.name}. Exploring another
        region too? You&apos;ll need a separate Passport for it.
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
          <p className="mt-1 text-sm text-slate-500">Valid for {product.duration_days} days</p>
          <div className="mt-6">
            <PurchaseForm
              passportProductId={product.id}
              isSignedIn={Boolean(user)}
              next={`/${state.slug}/${area.slug}/passport${ref ? `?ref=${ref}` : ""}`}
              referralCode={ref}
            />
          </div>
        </div>
      ) : (
        <p className="mt-10 text-slate-600">
          {area.name} Passport pricing isn&apos;t published yet — check back soon.
        </p>
      )}

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="font-semibold text-slate-900">How it works</h3>
          <p className="mt-1 text-sm text-slate-600">
            Buy once, then browse {area.name} to find participating
            businesses and their offers.
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
          <h3 className="font-semibold text-slate-900">Valid in {area.name}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Works at any participating business in {area.name}.
          </p>
        </div>
      </div>
    </div>
  );
}
