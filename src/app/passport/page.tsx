import type { Metadata } from "next";
import { getActivePassportProduct } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "@/components/purchase-form";

export const metadata: Metadata = { title: "Get the Passport" };

export default async function PassportPage() {
  const [product, supabase] = await Promise.all([
    getActivePassportProduct(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">The National Passport</h1>
      <p className="mt-4 text-lg text-slate-600">
        One Passport. One purchase. Use it at every participating business,
        in every state and Passport Area we&apos;re live in — there&apos;s no
        such thing as a &ldquo;local&rdquo; Passport here.
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
            <PurchaseForm passportProductId={product.id} isSignedIn={Boolean(user)} />
          </div>
        </div>
      ) : (
        <p className="mt-10 text-slate-600">
          Passport pricing isn&apos;t published yet — check back soon.
        </p>
      )}

      <div className="mt-16 grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="font-semibold text-slate-900">How it works</h3>
          <p className="mt-1 text-sm text-slate-600">
            Buy once, then browse states and Passport Areas to find
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
          <h3 className="font-semibold text-slate-900">Nationwide, always</h3>
          <p className="mt-1 text-sm text-slate-600">
            Your Passport isn&apos;t tied to the state or area you bought it
            in — it works everywhere we&apos;re live.
          </p>
        </div>
      </div>
    </div>
  );
}
