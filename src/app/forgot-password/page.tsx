"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
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
          <p className="mt-6 rounded-lg bg-surface-elevated p-4 text-sm text-ink">
            Check {email} for a link to reset your password.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <button type="submit" disabled={status === "sending"} className={`w-full ${buttonClasses("primary")}`}>
              {status === "sending" ? "Sending..." : "Send reset link"}
            </button>
            {status === "error" && <p className="text-sm text-error">{errorMessage}</p>}
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
