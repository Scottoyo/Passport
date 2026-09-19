"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startPlaceholderPassport } from "@/app/passport/actions";

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

  if (!isSignedIn) {
    return (
      <button
        onClick={() => router.push(`/sign-in?next=${encodeURIComponent(next)}`)}
        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Sign in to get your Passport
      </button>
    );
  }

  return (
    <div>
      <label className="mb-3 block max-w-xs text-sm">
        <span className="mb-1 block text-slate-600">Referral code (optional)</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Business or friend's code"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startPlaceholderPassport(passportProductId, code || undefined);
            if (result.error) {
              setError(result.error);
            } else {
              router.push("/account");
            }
          })
        }
        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Setting up your Passport..." : "Get my Passport"}
      </button>
      <p className="mt-2 max-w-md text-xs text-slate-400">
        Payments aren&apos;t connected yet in this environment, so this
        creates your Passport without charging anything. See the
        architecture doc for the open decision on a payment processor.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
