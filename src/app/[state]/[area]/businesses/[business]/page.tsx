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
import { ShareButton } from "@/components/share-button";
import type { BusinessHoursDay } from "@/lib/types/domain";
import { toggleFavorite } from "./actions";

interface Props {
  params: Promise<{ state: string; area: string; business: string }>;
}

const DAY_LABELS: Record<BusinessHoursDay["day"], string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};
const DAY_ORDER: BusinessHoursDay["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatTime(value: string | null) {
  if (!value) return "?";
  const [hourStr, minute] = value.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
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

  const { data: category } = business.category_id
    ? await supabase.from("categories").select("name").eq("id", business.category_id).maybeSingle()
    : { data: null };

  const activePassport = user ? await getActivePassportForArea(user.id, area.id) : null;
  const cta: OfferCta = activePassport
    ? { type: "redeem", passportNumber: activePassport.id }
    : { type: "get-passport", href: `/${state.slug}/${area.slug}/passport` };

  const address = [business.address_line1, business.address_line2, business.city, business.state_code, business.postal_code]
    .filter(Boolean)
    .join(", ");
  const directionsHref =
    business.latitude != null && business.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
      : address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : null;

  const socialLinks: { label: string; url: string | null }[] = [
    { label: "Facebook", url: business.facebook_url },
    { label: "Instagram", url: business.instagram_url },
    { label: "TikTok", url: business.tiktok_url },
    { label: "YouTube", url: business.youtube_url },
    { label: "X / Twitter", url: business.twitter_url },
    { label: "LinkedIn", url: business.linkedin_url },
  ].filter((s) => s.url);

  const hoursByDay = new Map((business.business_hours ?? []).map((h) => [h.day, h]));

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

      <div className="mt-4 flex items-start gap-4">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt={`${business.name} logo`}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8" aria-hidden>
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <div>
          <div className="flex flex-wrap gap-2">
            {category && (
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                {category.name}
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {area.name}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{business.name}</h1>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {directionsHref && (
          <a
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Directions
          </a>
        )}
        {business.phone && (
          <a
            href={`tel:${business.phone}`}
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            Call
          </a>
        )}
        {business.website_url && (
          <a
            href={business.website_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            Website
          </a>
        )}
        {socialLinks.map((s) => (
          <a
            key={s.label}
            href={s.url!}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
          >
            {s.label}
          </a>
        ))}
        <ShareButton path={currentPath} title={business.name} />
        {user && (
          <form action={toggleFavorite.bind(null, business.id, currentPath)}>
            <button
              className={
                isFavorited
                  ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
                  : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
              }
            >
              {isFavorited ? "Saved ★" : "Save"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {(business.short_description || business.description) && (
            <section>
              <h2 className="text-xl font-semibold text-slate-900">About</h2>
              {business.short_description && (
                <p className="mt-2 font-medium text-slate-700">{business.short_description}</p>
              )}
              {business.description && <p className="mt-2 text-slate-600">{business.description}</p>}
            </section>
          )}

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-slate-900">Passport offers</h2>
            {offers.length === 0 ? (
              <p className="mt-2 text-slate-600">No active offers right now — check back soon.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} cta={cta} />
                ))}
              </div>
            )}
          </section>

          {business.gallery_image_urls.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">Gallery</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {business.gallery_image_urls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-32 w-full rounded-xl object-cover" />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          {(address || business.phone || business.email || business.website_url) && (
            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">Information</h3>
              <dl className="mt-3 space-y-3 text-sm">
                {address && (
                  <div>
                    <dt className="text-slate-500">Address</dt>
                    <dd className="text-slate-900">{address}</dd>
                    {directionsHref && (
                      <a
                        href={directionsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Get Directions &rarr;
                      </a>
                    )}
                  </div>
                )}
                {business.phone && (
                  <div>
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="text-slate-900">{business.phone}</dd>
                  </div>
                )}
                {business.email && (
                  <div>
                    <dt className="text-slate-500">Email</dt>
                    <dd className="text-slate-900">{business.email}</dd>
                  </div>
                )}
                {business.website_url && (
                  <div>
                    <dt className="text-slate-500">Website</dt>
                    <dd className="truncate text-slate-900">{business.website_url}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {(business.business_hours || business.weather_permitting || business.call_for_appointment) && (
            <section className="rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900">Hours</h3>
              {business.business_hours && (
                <dl className="mt-3 space-y-1 text-sm">
                  {DAY_ORDER.map((day) => {
                    const h = hoursByDay.get(day);
                    return (
                      <div key={day} className="flex justify-between">
                        <dt className="text-slate-500">{DAY_LABELS[day]}</dt>
                        <dd className="text-slate-900">
                          {h?.is_open ? `${formatTime(h.opens_at)} – ${formatTime(h.closes_at)}` : "Closed"}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              {business.weather_permitting && (
                <p className="mt-3 text-xs text-slate-500">Weather permitting.</p>
              )}
              {business.call_for_appointment && (
                <p className="mt-1 text-xs text-slate-500">By appointment only — please call ahead.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
