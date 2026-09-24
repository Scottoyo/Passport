import Link from "next/link";
import type { Offer } from "@/lib/types/domain";
import { RedeemOfferButton } from "@/components/redeem-offer-button";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

export const DISCOUNT_LABEL: Record<Offer["discount_type"], (value: number | null) => string> = {
  percent_off: (v) => `${v}% off`,
  amount_off: (v) => `$${v} off`,
  bogo: () => "Buy one, get one",
  freebie: () => "Free with purchase",
  other: () => "Special offer",
};

export type OfferCta =
  | { type: "get-passport"; href: string }
  | { type: "redeem"; passportNumber: string };

export function OfferCard({ offer, cta }: { offer: Offer; cta: OfferCta }) {
  const label = DISCOUNT_LABEL[offer.discount_type](offer.discount_value);

  return (
    <div className={`p-6 ${cardClasses()}`}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-ink">{offer.title}</h3>
        <span className="whitespace-nowrap rounded-full bg-accent-strong px-3 py-1 text-xs font-semibold text-white">
          {label}
        </span>
      </div>
      {offer.description && (
        <p className="mt-2 text-sm text-ink-muted">{offer.description}</p>
      )}
      {offer.terms && <p className="mt-2 text-xs text-ink-muted">{offer.terms}</p>}
      <p className="mt-3 text-xs text-ink-muted">
        {offer.redemptions_per_passport === null
          ? "Unlimited redemptions per Passport"
          : `${offer.redemptions_per_passport} redemption${offer.redemptions_per_passport === 1 ? "" : "s"} per Passport`}
      </p>

      <div className="mt-4">
        {cta.type === "get-passport" ? (
          <Link href={cta.href} className={buttonClasses("primary")}>
            Get Your Passport
          </Link>
        ) : (
          <RedeemOfferButton offer={offer} passportNumber={cta.passportNumber} />
        )}
      </div>
    </div>
  );
}
