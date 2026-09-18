import type { Offer } from "@/lib/types/domain";

const DISCOUNT_LABEL: Record<Offer["discount_type"], (value: number | null) => string> = {
  percent_off: (v) => `${v}% off`,
  amount_off: (v) => `$${v} off`,
  bogo: () => "Buy one, get one",
  freebie: () => "Free with purchase",
  other: () => "Special offer",
};

export function OfferCard({ offer }: { offer: Offer }) {
  const label = DISCOUNT_LABEL[offer.discount_type](offer.discount_value);

  return (
    <div className="rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">{offer.title}</h3>
        <span className="whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          {label}
        </span>
      </div>
      {offer.description && (
        <p className="mt-2 text-sm text-slate-600">{offer.description}</p>
      )}
      {offer.terms && <p className="mt-2 text-xs text-slate-400">{offer.terms}</p>}
      <p className="mt-3 text-xs text-slate-400">
        {offer.redemptions_per_passport === 1
          ? "One redemption per Passport"
          : `Up to ${offer.redemptions_per_passport} redemptions per Passport`}
      </p>
    </div>
  );
}
