import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStateBySlug, getAreaBySlug, getActivePassportProductForArea } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PurchaseForm } from "@/components/purchase-form";
import { fraunces, dmSans, StampStat } from "@/components/editorial-kit";

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
    <div className={`${fraunces.variable} ${dmSans.variable}`}>
      {/* Hero */}
      <section className="bg-brand-primary">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            {area.name} Passport
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-4xl font-bold tracking-tight text-white sm:text-5xl">
            The {area.name} Passport
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-dm-sans)] text-lg text-white/90">
            One purchase unlocks every participating business in {area.name} - this Passport is
            only valid in {area.name}. Exploring another region too? You&apos;ll need a separate
            Passport for it.
          </p>
        </div>
      </section>

      {/* Product / pricing */}
      <section className="bg-[#FFF7E8]">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
          {product ? (
            <div className="rounded-[24px] border border-dashed border-brand-primary/40 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">
                {area.name} Passport
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-bold text-[#102F3B]">
                {product.name}
              </h2>
              {product.description && (
                <p className="mt-2 text-[#102F3B]/70">{product.description}</p>
              )}
              <p className="mt-4 font-[family-name:var(--font-fraunces)] text-4xl font-bold text-[#102F3B]">
                ${(product.price_cents / 100).toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-[#102F3B]/60">Valid for {product.duration_days} days</p>
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
            <p className="text-center text-[#102F3B]/70">
              {area.name} Passport pricing isn&apos;t published yet - check back soon.
            </p>
          )}
        </div>
      </section>

      {/* Facts */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 sm:grid-cols-3">
            <StampStat title="How it works">
              Buy once, then browse {area.name} to find participating businesses and their
              offers.
            </StampStat>
            <StampStat title="Redeeming offers">
              Show your digital Passport at checkout. Each offer can be redeemed the number of
              times its business sets, per Passport.
            </StampStat>
            <StampStat title={`Valid in ${area.name}`}>
              Works at any participating business in {area.name}.
            </StampStat>
          </div>
        </div>
      </section>
    </div>
  );
}
