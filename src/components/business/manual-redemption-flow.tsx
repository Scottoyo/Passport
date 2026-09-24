"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { RedeemableOffer } from "@/lib/portal-queries";
import { formatPassportNumber } from "@/lib/format";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";
import { DISCOUNT_LABEL } from "@/components/offer-card";
import {
  lookupPassport,
  fetchRedeemableOffers,
  confirmManualRedemption,
} from "@/app/portal/[businessId]/redeem/actions";

type Step = "entry" | "found" | "offers" | "confirm" | "success";

type PassportStatus = "active" | "expired" | "revoked";
type IneligibleReason = "wrong_region" | "expired" | "revoked" | null;

const STATUS_LABEL: Record<PassportStatus, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
};

const STATUS_STYLE: Record<PassportStatus, string> = {
  active: "bg-success-bg text-success",
  expired: "bg-warning-bg text-warning",
  revoked: "bg-error-bg text-error",
};

const INELIGIBLE_MESSAGE: Record<Exclude<IneligibleReason, null>, string> = {
  wrong_region: "This Passport isn't valid for this business's region.",
  expired: "This Passport is expired.",
  revoked: "This Passport has been revoked.",
};

export function ManualRedemptionFlow({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [step, setStep] = useState<Step>("entry");
  const [isPending, startTransition] = useTransition();
  const [topLevelError, setTopLevelError] = useState<string | null>(null);

  const [passportNumberInput, setPassportNumberInput] = useState("");
  const [confirmedPassportNumber, setConfirmedPassportNumber] = useState("");

  const [passportId, setPassportId] = useState<string | null>(null);
  const [passportStatus, setPassportStatus] = useState<PassportStatus | null>(null);
  const [holderFirstName, setHolderFirstName] = useState<string | null>(null);
  const [eligible, setEligible] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState<IneligibleReason>(null);

  const [offers, setOffers] = useState<RedeemableOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<RedeemableOffer["offer"] | null>(null);
  const [holderAuthorized, setHolderAuthorized] = useState(false);

  function resetToEntry() {
    setStep("entry");
    setTopLevelError(null);
    setPassportNumberInput("");
    setConfirmedPassportNumber("");
    setPassportId(null);
    setPassportStatus(null);
    setHolderFirstName(null);
    setEligible(false);
    setIneligibleReason(null);
    setOffers([]);
    setSelectedOffer(null);
    setHolderAuthorized(false);
  }

  function handleFindPassport(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTopLevelError(null);
    const number = passportNumberInput.replace(/\s+/g, "");
    startTransition(async () => {
      const result = await lookupPassport(businessId, number);
      if (result.error) {
        setTopLevelError(result.error);
        return;
      }
      setConfirmedPassportNumber(number);
      setPassportId(result.passportId ?? null);
      setPassportStatus(result.status ?? null);
      setHolderFirstName(result.holderFirstName ?? null);
      setEligible(Boolean(result.eligible));
      setIneligibleReason(result.ineligibleReason ?? null);
      setStep("found");
    });
  }

  function handleContinueToOffers() {
    if (!passportId) return;
    setTopLevelError(null);
    startTransition(async () => {
      const result = await fetchRedeemableOffers(businessId, passportId);
      setOffers(result);
      setStep("offers");
    });
  }

  function handleConfirmRedemption() {
    if (!selectedOffer || !holderAuthorized) return;
    setTopLevelError(null);
    startTransition(async () => {
      const result = await confirmManualRedemption(
        businessId,
        confirmedPassportNumber,
        selectedOffer.id,
        holderAuthorized
      );
      if (result.error) {
        setTopLevelError(result.error);
        return;
      }
      setStep("success");
    });
  }

  return (
    <div>
      {topLevelError && (
        <p className="mb-4 rounded-lg bg-error-bg px-3 py-2 text-sm text-error">{topLevelError}</p>
      )}

      {step === "entry" && (
        <form onSubmit={handleFindPassport} className="space-y-4">
          <div className={`p-4 ${cardClasses()}`}>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">Enter Passport Number</span>
              <input
                inputMode="numeric"
                autoFocus
                required
                placeholder="E.G. 123456789012"
                value={passportNumberInput}
                onChange={(e) => setPassportNumberInput(e.target.value.replace(/\D/g, "").slice(0, 12))}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </label>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetToEntry}
              className={buttonClasses("outline")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || passportNumberInput.length === 0}
              className={buttonClasses("primary")}
            >
              {isPending ? "Searching..." : "Find Passport"}
            </button>
          </div>
        </form>
      )}

      {(step === "found" || step === "offers" || step === "confirm") && passportStatus && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between gap-4 p-4 ${cardClasses()}`}>
            <div>
              <p className="text-sm font-medium text-ink">Holder: {holderFirstName ?? "Passport Holder"}</p>
              <p className="text-xs text-ink-muted">{formatPassportNumber(confirmedPassportNumber)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[passportStatus]}`}>
              {STATUS_LABEL[passportStatus]}
            </span>
          </div>

          {step === "found" && (
            <>
              {!eligible && ineligibleReason && (
                <p className="text-sm text-error">{INELIGIBLE_MESSAGE[ineligibleReason]}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={resetToEntry} className={buttonClasses("outline")}>
                  Search another number
                </button>
                {eligible && (
                  <button
                    type="button"
                    onClick={handleContinueToOffers}
                    disabled={isPending}
                    className={buttonClasses("primary")}
                  >
                    {isPending ? "Loading..." : "Continue"}
                  </button>
                )}
              </div>
            </>
          )}

          {step === "offers" && (
            <div className="space-y-3">
              {offers.length === 0 && (
                <p className="text-sm text-ink-muted">This business doesn&apos;t have any offers yet.</p>
              )}
              {offers.map(({ offer, eligible: offerEligible, reason }) => (
                <div
                  key={offer.id}
                  className={`p-4 ${cardClasses()} ${offerEligible ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{offer.title}</h3>
                      {offer.description && (
                        <p className="mt-1 text-xs text-ink-muted">{offer.description}</p>
                      )}
                      {offer.terms && <p className="mt-1 text-xs text-ink-muted">{offer.terms}</p>}
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-accent-strong px-3 py-1 text-xs font-semibold text-white">
                      {DISCOUNT_LABEL[offer.discount_type](offer.discount_value)}
                    </span>
                  </div>
                  {offerEligible ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOffer(offer);
                        setHolderAuthorized(false);
                        setStep("confirm");
                      }}
                      className={`mt-3 ${buttonClasses("primary", "sm")}`}
                    >
                      Select
                    </button>
                  ) : (
                    <p className="mt-3 text-xs font-medium text-error">
                      {reason === "not_active"
                        ? "Not currently active"
                        : "Already redeemed the maximum number of times on this Passport"}
                    </p>
                  )}
                </div>
              ))}
              <button type="button" onClick={resetToEntry} className={buttonClasses("outline")}>
                Search another number
              </button>
            </div>
          )}

          {step === "confirm" && selectedOffer && (
            <div className="space-y-4">
              <div className={`space-y-2 p-4 text-sm ${cardClasses()}`}>
                <p>
                  <span className="text-ink-muted">Passport: </span>
                  {formatPassportNumber(confirmedPassportNumber)}
                </p>
                <p>
                  <span className="text-ink-muted">Holder: </span>
                  {holderFirstName ?? "Passport Holder"}
                </p>
                <p>
                  <span className="text-ink-muted">Business: </span>
                  {businessName}
                </p>
                <p>
                  <span className="text-ink-muted">Offer: </span>
                  {selectedOffer.title} ({DISCOUNT_LABEL[selectedOffer.discount_type](selectedOffer.discount_value)})
                </p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={holderAuthorized}
                  onChange={(e) => setHolderAuthorized(e.target.checked)}
                  className="mt-0.5"
                />
                <span>I confirm the Passport holder requested or authorized this redemption, including by phone.</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("offers")}
                  className={buttonClasses("outline")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedemption}
                  disabled={isPending || !holderAuthorized}
                  className={buttonClasses("primary")}
                >
                  {isPending ? "Redeeming..." : "Confirm Redemption"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "success" && (
        <div className="space-y-4">
          <p className="rounded-lg bg-success-bg px-3 py-2 text-sm font-semibold text-success">
            Redeemed - this appears in your redemption history and the Passport holder&apos;s history.
          </p>
          <button type="button" onClick={resetToEntry} className={buttonClasses("primary")}>
            Redeem another
          </button>
        </div>
      )}
    </div>
  );
}
