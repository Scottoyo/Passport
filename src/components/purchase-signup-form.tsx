"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProfile } from "@/app/create-profile/actions";
import { buttonClasses } from "@/lib/ui-classes";

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm";

export function PurchaseSignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createProfile(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.signedIn) {
        router.push(next);
        router.refresh();
      } else {
        setNeedsEmailConfirmation(true);
      }
    });
  }

  if (needsEmailConfirmation) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-ink">Profile created</h2>
        <p className="mt-2 text-ink-muted">
          Check your email to confirm your account, then sign in to continue getting your Passport.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(next)}`}
          className="mt-4 inline-block font-semibold text-ink hover:underline"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-ink">Create your profile to continue</h2>
      <p className="mt-1 text-sm text-ink-muted">One quick step before you get your Passport.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">First name</span>
            <input name="first_name" required className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Last name</span>
            <input name="last_name" required className={inputClass} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Email</span>
          <input name="email" type="email" required className={inputClass} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-ink-muted">Phone</span>
          <input name="phone" type="tel" placeholder="123-456-7890" className={inputClass} />
        </label>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Password</span>
            <input name="password" type="password" required minLength={8} className={inputClass} />
            <span className="mt-1 block text-xs text-ink-muted">Must be at least 8 characters.</span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Confirm password</span>
            <input name="confirm_password" type="password" required minLength={8} className={inputClass} />
          </label>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className={`w-full ${buttonClasses("primary")}`}
        >
          {isPending ? "Creating your profile..." : "Continue"}
        </button>

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link
            href={`/sign-in?next=${encodeURIComponent(next)}`}
            className="font-semibold text-brand-primary hover:underline"
          >
            Log In
          </Link>
        </p>
      </form>
    </>
  );
}
