"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2 pr-10 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // The recovery link's `code` was already exchanged for a session by
  // /auth/callback (PKCE, via a server-side cookie) before the browser ever
  // got here - this just confirms that session exists rather than trying
  // to parse tokens out of the URL itself.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasSession(Boolean(user));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("submitting");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    // Clear the fields and the temporary recovery session immediately - the
    // recovery link (and the session it granted) should not still work
    // after this point, and the password itself shouldn't linger in
    // component state any longer than it takes to submit.
    setPassword("");
    setConfirmPassword("");
    await supabase.auth.signOut();
    setStatus("success");
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className={`p-8 ${cardClasses()}`}>
          <p role="status" className="text-sm text-ink-muted">
            Verifying your reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!hasSession && status !== "success") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className={`p-8 ${cardClasses()}`}>
          <h1 className="font-display text-2xl font-bold text-ink">Link expired</h1>
          <p className="mt-2 text-sm text-ink-muted">
            This password reset link is invalid, has expired, or has already been used.
          </p>
          <p className="mt-6 text-sm text-ink-muted">
            <Link href="/forgot-password" className="font-semibold text-brand-primary hover:underline">
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className={`p-8 ${cardClasses()}`}>
          <h1 className="font-display text-2xl font-bold text-ink">Password updated</h1>
          <p role="status" className="mt-2 rounded-lg bg-surface-elevated p-4 text-sm text-ink">
            Your password has been updated. Please sign in with your new password.
          </p>
          <Link href="/sign-in" className={`mt-6 inline-flex w-full ${buttonClasses("primary")}`}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <div className={`p-8 ${cardClasses()}`}>
        <h1 className="font-display text-2xl font-bold text-ink">Set a new password</h1>
        <p className="mt-2 text-sm text-ink-muted">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">New password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <span className="mt-1 block text-xs text-ink-muted">Must be at least 8 characters.</span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-ink-muted">Confirm new password</span>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm-new-password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted hover:text-ink"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button type="submit" disabled={status === "submitting"} className={`w-full ${buttonClasses("primary")}`}>
            {status === "submitting" ? "Saving..." : "Save New Password"}
          </button>
          {status === "error" && (
            <p role="alert" className="text-sm text-error">
              {errorMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden>
      <path
        d="M2.5 2.5l15 15M8.3 8.4a2.5 2.5 0 0 0 3.4 3.4M6.3 6.2C3.9 7.4 1.5 10 1.5 10s3 6 8.5 6c1.4 0 2.6-.4 3.7-.9M15.6 14.1c1.8-1.4 2.9-3.1 2.9-4.1 0-1-3-6-8.5-6-.8 0-1.5.1-2.2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
