"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPostSignInRedirect } from "@/app/auth/actions";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.history.replaceState(null, "", window.location.pathname);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(Boolean(user));
      setChecking(false);
    }

    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    router.push(await getPostSignInRedirect());
    router.refresh();
  }

  if (checking) {
    return <div className="mx-auto max-w-sm px-4 py-16 sm:px-6" />;
  }

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className={`p-8 ${cardClasses()}`}>
          <h1 className="font-display text-2xl font-bold text-ink">Link expired</h1>
          <p className="mt-2 text-sm text-ink-muted">
            This password reset link is invalid or has expired.
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

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <div className={`p-8 ${cardClasses()}`}>
        <h1 className="font-display text-2xl font-bold text-ink">Set a new password</h1>
        <p className="mt-2 text-sm text-ink-muted">Choose a new password for your account.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
          <button type="submit" disabled={status === "submitting"} className={`w-full ${buttonClasses("primary")}`}>
            {status === "submitting" ? "Saving..." : "Save new password"}
          </button>
          {status === "error" && <p className="text-sm text-error">{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
}
