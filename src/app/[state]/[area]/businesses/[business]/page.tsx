import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getBusinessBySlug,
  getOffersForBusiness,
} from "@/lib/queries";
import { OfferCard } from "@/components/offer-card";

interface Props {
  params: Promise<{ state: string; area: string; business: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, area: areaSlug, business: businessSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) return {};
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) return {};
  const business = await getBusinessBySlug(area.id, businessSlug);
  return { title: business ? business.name : "Business" };
}

export default async function BusinessPage({ params }: Props) {
  const { state: stateSlug, area: areaSlug, business: businessSlug } = await params;
  const state = await getStateBySlug(stateSlug);
  if (!state) notFound();
  const area = await getAreaBySlug(state.id, areaSlug);
  if (!area) notFound();
  const business = await getBusinessBySlug(area.id, businessSlug);
  if (!business) notFound();

  const offers = await getOffersForBusiness(business.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="text-sm text-slate-500">
        <Link href={`/${state.slug}`} className="hover:text-slate-700">
          {state.name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${state.slug}/${area.slug}`} className="hover:text-slate-700">
          {area.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{business.name}</span>
      </nav>

      <h1 className="mt-2 text-3xl font-bold text-slate-900">{business.name}</h1>
      <p className="mt-1 text-slate-500">
        {[business.address_line1, business.city, business.state_code]
          .filter(Boolean)
          .join(", ")}
      </p>
      {business.description && (
        <p className="mt-4 max-w-2xl text-slate-600">{business.description}</p>
      )}
      {business.website_url && (
        <a
          href={business.website_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          Visit website &rarr;
        </a>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Passport offers</h2>
        {offers.length === 0 ? (
          <p className="mt-2 text-slate-600">
            No active offers right now — check back soon.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
