import Image from "next/image";
import Link from "next/link";
import type { Business, Offer } from "@/lib/types/domain";
import { FavoriteButton } from "@/components/favorite-button";
import { BusinessPlaceholderIcon } from "@/components/business/business-placeholder-icon";
import { cardClasses } from "@/lib/ui-classes";

export interface BusinessCardFavorite {
  isSignedIn: boolean;
  isFavorited: boolean;
  toggleAction: () => Promise<void>;
  passportHref: string;
}

const CARD_IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

// Every card in a grid reserves the exact same cover/logo space whether or
// not a business has uploaded those images, so a mix of businesses with and
// without photos never staggers the grid or shifts "View Business" buttons
// out of alignment (the outer card is a flex column with this button
// pinned to the bottom via mt-auto in the content area below).
export function BusinessCard({
  business,
  href,
  offer,
  favorite,
  category,
}: {
  business: Business;
  href: string;
  offer?: Offer | null;
  favorite?: BusinessCardFavorite | null;
  category?: string | null;
}) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden ${cardClasses()} shadow-sm transition-colors hover:border-brand-primary`}
    >
      {favorite && (
        <div className="absolute right-3 top-3 z-20">
          <FavoriteButton variant="icon" {...favorite} />
        </div>
      )}

      <Link href={href} className="flex flex-1 flex-col">
        <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-elevated">
          {business.hero_image_url ? (
            <Image
              src={business.hero_image_url}
              alt=""
              fill
              sizes={CARD_IMAGE_SIZES}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-muted/40">
              <BusinessPlaceholderIcon className="h-10 w-10" />
            </div>
          )}
          {category && (
            <span className="absolute left-3 top-3 z-10 max-w-[75%] truncate rounded-md bg-ink/70 px-2 py-1 text-xs font-semibold text-white">
              {category}
            </span>
          )}
          <div className="absolute -bottom-6 left-4 z-10 h-14 w-14 overflow-hidden rounded-full border-4 border-surface bg-surface-elevated shadow-sm">
            {business.logo_url && (
              <Image
                src={business.logo_url}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-6 pb-6 pt-9">
          <h3 className="truncate text-lg font-semibold text-ink">{business.name}</h3>
          {business.city && (
            <p className="mt-1 truncate text-sm text-ink-muted">
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
              <p className="mt-0.5 line-clamp-2 text-sm font-medium text-ink">{offer.title}</p>
            </div>
          )}
          <div className="mt-auto pt-4">
            <span className="block w-full rounded-lg border border-border px-4 py-2 text-center text-sm font-semibold text-ink">
              View Business
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
