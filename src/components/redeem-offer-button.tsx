"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Offer } from "@/lib/types/domain";
import { redeemOffer } from "@/app/[state]/[area]/businesses/[business]/actions";

export function RedeemOfferButton({
  offer,
  passportNumber,
}: {
  offer: Offer;
  passportNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setCode("");
    setError(null);
    setSuccess(false);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await redeemOffer(offer.id, code);
      if (result.error) {
        setError(result.error);
        setCode("");
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Redeem Perk
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-slate-900">{offer.title}</h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-xl leading-none text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Please hand your device to a staff member. The participating business must enter
              its private redemption code to complete this redemption.
            </p>
            {offer.terms && <p className="mt-2 text-xs text-slate-500">{offer.terms}</p>}

            {success ? (
              <p className="mt-4 text-sm font-semibold text-green-700">
                Redeemed - enjoy your perk!
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <span className="mb-1 block text-xs text-slate-500">Your Passport number</span>
                  <input
                    readOnly
                    value={passportNumber}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                </div>
                <label className="block text-sm">
                  <span className="mb-1 block text-slate-600">
                    Staff: enter the business&apos;s 6-digit redemption code
                  </span>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
                  />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={isPending || code.length !== 6}
                  className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {isPending ? "Checking..." : "Confirm redemption"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
