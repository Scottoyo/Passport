"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startPlaceholderPassport } from "@/app/passport/actions";
import { buttonClasses } from "@/lib/ui-classes";

export function PurchaseForm({
  passportProductId,
  isSignedIn,
  next,
  referralCode,
}: {
  passportProductId: string;
  isSignedIn: boolean;
  next: string;
  referralCode?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(referralCode ?? "");
  const [promoCode, setPromoCode] = useState("");

  if (!isSignedIn) {
    return (
      <button
        onClick={() => router.push(`/passport/create-profile?next=${encodeURIComponent(next)}`)}
        className={buttonClasses("primary")}
      >
        Get Your Passport
      </button>
    );
  }

  return (
    <div>
      <label className="mb-3 block max-w-xs text-sm">
        <span className="mb-1 block text-ink-muted">Referral code (optional)</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Business or friend's code"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </label>
      <label className="mb-3 block max-w-xs text-sm">
        <span className="mb-1 block text-ink-muted">Promo code (optional)</span>
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Discount code"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </label>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startPlaceholderPassport(passportProductId, code || undefined, promoCode || undefined);
            if (result.error) {
              setError(result.error);
            } else {
              router.push("/account");
            }
          })
        }
        className={buttonClasses("primary")}
      >
        {isPending ? "Setting up your Passport..." : "Get my Passport"}
      </button>
      <p className="mt-2 max-w-md text-xs text-ink-muted">
        Payments aren&apos;t connected yet in this environment, so this
        creates your Passport without charging anything. See the
        architecture doc for the open decision on a payment processor.
      </p>
      {error && <p className="mt-2 text-sm text-error">{error}</p>}
    </div>
  );
}
