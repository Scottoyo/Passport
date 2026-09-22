"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPostSignInRedirect } from "@/app/auth/actions";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    // No explicit `next` (e.g. a deep-linked redirect back to whatever page
    // required sign-in) - land managers on /admin, everyone else on
    // /account, instead of always assuming a passport holder.
    const destination = explicitNext || (await getPostSignInRedirect());
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <div className={`p-8 ${cardClasses()}`}>
        <h1 className="font-display text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter your email and password to sign in.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button type="submit" disabled={status === "submitting"} className={`w-full ${buttonClasses("primary")}`}>
            {status === "submitting" ? "Signing in..." : "Sign in"}
          </button>
          {status === "error" && (
            <p className="text-sm text-error">{errorMessage}</p>
          )}
        </form>

        <p className="mt-4 text-sm">
          <Link href="/forgot-password" className="font-semibold text-brand-primary hover:underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-2 text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/create-profile" className="font-semibold text-brand-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export function SignInFormWithSuspense() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
