"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");

    // Trimmed/lowercased so "User@Example.com " and "user@example.com"
    // resolve to the same Supabase Auth account instead of silently
    // "succeeding" against an email that doesn't match any user.
    const normalizedEmail = email.trim().toLowerCase();

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    // Supabase's own resetPasswordForEmail never distinguishes "no such
    // account" from success (by design, to avoid email enumeration) - the
    // only errors it can return here are things like a malformed address
    // or a rate limit, never account existence, so surfacing error.message
    // is safe. Everything else always lands on the same neutral message.
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <div className={`p-8 ${cardClasses()}`}>
        <h1 className="font-display text-2xl font-bold text-ink">Reset your password</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {status === "sent" ? (
          <p role="status" className="mt-6 rounded-lg bg-surface-elevated p-4 text-sm text-ink">
            If an account exists for {email.trim()}, you&apos;ll receive a password reset link
            shortly.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </label>
            <button type="submit" disabled={status === "sending"} className={`w-full ${buttonClasses("primary")}`}>
              {status === "sending" ? "Sending..." : "Send Reset Link"}
            </button>
            {status === "error" && (
              <p role="alert" className="text-sm text-error">
                {errorMessage}
              </p>
            )}
          </form>
        )}

        <p className="mt-6 text-sm text-ink-muted">
          <Link href="/sign-in" className="font-semibold text-brand-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
