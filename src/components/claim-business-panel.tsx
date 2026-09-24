"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpForClaim } from "@/app/claim-business/actions";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm";

// Shown to a signed-out visitor on /claim-business - deliberately generic,
// no business name or other invitation detail, since the caller isn't
// authenticated yet and every RPC in this codebase (including this
// invitation's own preview) is authenticated-only.
export function ClaimBusinessPanel({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await signUpForClaim(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.signedIn) {
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    });
  }

  if (checkEmail) {
    return (
      <div className={`p-8 text-center ${cardClasses()}`}>
        <h2 className="text-xl font-semibold text-ink">Check your email</h2>
        <p className="mt-2 text-ink-muted">
          Confirm your account, then come back to this same invitation link to accept it.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-8 ${cardClasses()}`}>
      <h1 className="font-display text-2xl font-bold text-ink">You&apos;ve been invited</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Sign in or create an account with the email this invitation was sent to, then you&apos;ll come
        right back here to accept it.
      </p>

      <p className="mt-6 text-sm">
        Already have an account?{" "}
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/claim-business?token=${token}`)}`}
          className="font-semibold text-brand-primary hover:underline"
        >
          Sign in
        </Link>
      </p>

      <div className="mt-6 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Create an account</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">First name</span>
              <input name="first_name" required className={inputClass} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-ink-muted">Last name</span>
              <input name="last_name" required className={inputClass} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block text-ink-muted">Email</span>
              <input name="email" type="email" required className={inputClass} />
            </label>
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
          <button type="submit" disabled={isPending} className={`w-full ${buttonClasses("primary")}`}>
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
