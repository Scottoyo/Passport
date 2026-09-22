import type { Offer } from "@/lib/types/domain";
import { buttonClasses } from "@/lib/ui-classes";

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function OfferForm({
  action,
  offer,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  offer?: Offer;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-3">
      <input
        name="title"
        required
        defaultValue={offer?.title}
        placeholder="Offer title, e.g. 20% off your bill"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
      <textarea
        name="description"
        defaultValue={offer?.description ?? ""}
        placeholder="Description"
        rows={2}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
      <textarea
        name="terms"
        defaultValue={offer?.terms ?? ""}
        placeholder="Restrictions / terms (optional)"
        rows={2}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <select
          name="discount_type"
          defaultValue={offer?.discount_type ?? "other"}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="percent_off">% off</option>
          <option value="amount_off">$ off</option>
          <option value="bogo">Buy one, get one</option>
          <option value="freebie">Freebie</option>
          <option value="other">Other</option>
        </select>
        <input
          name="discount_value"
          type="number"
          step="0.01"
          defaultValue={offer?.discount_value ?? ""}
          placeholder="Value"
          className="w-32 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <input
          name="redemptions_per_passport"
          type="number"
          min="1"
          placeholder="Redemptions per Passport"
          defaultValue={offer?.redemptions_per_passport ?? 1}
          className="w-48 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            name="unlimited_redemptions"
            defaultChecked={offer ? offer.redemptions_per_passport === null : false}
          />
          Unlimited redemptions
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Start date</span>
          <input
            name="starts_at"
            type="date"
            defaultValue={toDateInputValue(offer?.starts_at ?? null)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Expiration date</span>
          <input
            name="ends_at"
            type="date"
            defaultValue={toDateInputValue(offer?.ends_at ?? null)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>
      </div>
      <textarea
        name="redemption_instructions"
        defaultValue={offer?.redemption_instructions ?? ""}
        placeholder="Redemption instructions for staff (optional)"
        rows={2}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
      />
      <button className={buttonClasses("primary")}>
        {submitLabel}
      </button>
    </form>
  );
}
