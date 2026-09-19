import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getStateBySlug,
  getAreaBySlug,
  getBusinessBySlug,
  getOffersForBusiness,
  getActivePassportForArea,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { OfferCard, type OfferCta } from "@/components/offer-card";
import { toggleFavorite } from "./actions";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isFavorited = false;
  if (user) {
    const { data: favorite } = await supabase
      .from("business_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("business_id", business.id)
      .maybeSingle();
    isFavorited = Boolean(favorite);
  }
  const currentPath = `/${state.slug}/${area.slug}/businesses/${business.slug}`;

  const activePassport = user ? await getActivePassportForArea(user.id, area.id) : null;
  const cta: OfferCta = activePassport
    ? { type: "redeem", passportNumber: activePassport.id }
    : { type: "get-passport", href: `/${state.slug}/${area.slug}/passport` };

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

      {business.hero_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={business.hero_image_url}
          alt=""
          className="mt-4 h-48 w-full rounded-2xl object-cover sm:h-64"
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {business.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt={`${business.name} logo`}
            className="h-12 w-12 rounded-full object-cover"
          />
        )}
        <h1 className="text-3xl font-bold text-slate-900">{business.name}</h1>
        {user ? (
          <form action={toggleFavorite.bind(null, business.id, currentPath)}>
            <button
              className={
                isFavorited
                  ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                  : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
              }
            >
              {isFavorited ? "Saved ★" : "Save business"}
            </button>
          </form>
        ) : (
          <Link
            href={`/sign-in?next=${encodeURIComponent(currentPath)}`}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Sign in to save
          </Link>
        )}
      </div>
      <p className="mt-1 text-slate-500">
        {[business.address_line1, business.city, business.state_code]
          .filter(Boolean)
          .join(", ")}
      </p>
      {business.short_description && (
        <p className="mt-2 max-w-2xl font-medium text-slate-700">{business.short_description}</p>
      )}
      {business.description && (
        <p className="mt-4 max-w-2xl text-slate-600">{business.description}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-slate-700">
        {business.website_url && (
          <a href={business.website_url} target="_blank" rel="noreferrer" className="hover:text-slate-900">
            Visit website &rarr;
          </a>
        )}
        {business.phone && <span className="text-slate-500">{business.phone}</span>}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">Passport offers</h2>
        {offers.length === 0 ? (
          <p className="mt-2 text-slate-600">
            No active offers right now — check back soon.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} cta={cta} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
