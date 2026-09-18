"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProfile } from "@/app/create-profile/actions";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function CreateProfileForm() {
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
        router.push("/account");
      } else {
        setNeedsEmailConfirmation(true);
      }
    });
  }

  if (needsEmailConfirmation) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900">Profile created</h2>
        <p className="mt-2 text-slate-600">Check your email to confirm your account before signing in.</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900">Create Your Free Profile</h2>
      <p className="mt-1 text-sm text-slate-600">No Passport purchase required. Upgrade anytime.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">First name</span>
            <input name="first_name" required className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Last name</span>
            <input name="last_name" required className={inputClass} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Email</span>
          <input name="email" type="email" required className={inputClass} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Phone</span>
          <input name="phone" type="tel" placeholder="123-456-7890" className={inputClass} />
        </label>

        <div className="grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Password</span>
            <input name="password" type="password" required minLength={8} className={inputClass} />
            <span className="mt-1 block text-xs text-slate-400">Must be at least 8 characters.</span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Confirm password</span>
            <input name="confirm_password" type="password" required minLength={8} className={inputClass} />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? "Creating your profile..." : "Create Free Profile"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-slate-700 hover:text-slate-900">
            Log In
          </Link>
        </p>
      </form>
    </>
  );
}
