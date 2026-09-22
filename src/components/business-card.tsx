import Link from "next/link";
import type { Business, Offer } from "@/lib/types/domain";
import { FavoriteButton } from "@/components/favorite-button";
import { cardClasses } from "@/lib/ui-classes";

export interface BusinessCardFavorite {
  isSignedIn: boolean;
  isFavorited: boolean;
  toggleAction: () => Promise<void>;
  passportHref: string;
}

export function BusinessCard({
  business,
  href,
  offer,
  favorite,
}: {
  business: Business;
  href: string;
  offer?: Offer | null;
  favorite?: BusinessCardFavorite | null;
}) {
  return (
    <div className={`relative ${cardClasses()} shadow-sm transition-colors hover:border-brand-primary`}>
      {favorite && (
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton variant="icon" {...favorite} />
        </div>
      )}

      <Link href={href} className="block">
        {business.hero_image_url && (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={business.hero_image_url}
              alt=""
              className="h-32 w-full rounded-t-2xl object-cover"
            />
            {business.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={`${business.name} logo`}
                className="absolute -bottom-4 left-4 h-10 w-10 rounded-full border-2 border-white object-cover shadow"
              />
            )}
          </div>
        )}

        <div className={`p-6 ${business.hero_image_url && business.logo_url ? "pt-6" : ""}`}>
          <h3 className="text-lg font-semibold text-ink">{business.name}</h3>
          {business.city && (
            <p className="mt-1 text-sm text-ink-muted">
              {business.city}
              {business.state_code ? `, ${business.state_code}` : ""}
            </p>
          )}
          {business.description && (
            <p className="mt-2 line-clamp-2 text-sm text-ink-muted">
              {business.description}
            </p>
          )}
          {offer && (
            <div className="mt-3 rounded-lg bg-accent-tint p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
                Passport promotion
              </p>
              <p className="mt-0.5 text-sm font-medium text-ink">{offer.title}</p>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
