"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContactForm, type ContactFormResult } from "./actions";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

const inputClass =
  "w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`w-full ${buttonClasses("primary")}`}>
      {pending ? "Sending…" : "Send Message"}
    </button>
  );
}

export default function ContactPage() {
  const [state, formAction] = useActionState<ContactFormResult | null, FormData>(submitContactForm, null);

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <div className={`p-8 ${cardClasses()}`}>
        <h1 className="font-display text-2xl font-bold text-ink">Contact Us</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Questions, feedback, or need help with your account? Send us a message and we&apos;ll get back to you.
        </p>

        {state?.ok ? (
          <p role="status" className="mt-6 rounded-lg bg-surface-elevated p-4 text-sm text-ink">
            Thanks for reaching out - we&apos;ve received your message and will get back to you soon.
          </p>
        ) : (
          <form action={formAction} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Name</span>
              <input type="text" name="name" autoComplete="name" required className={inputClass} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-ink-muted">Message</span>
              <textarea name="message" rows={5} required className={inputClass} />
            </label>

            {/* Honeypot - off-screen, not display:none (some bots skip
                display:none fields). A real visitor never sees or fills this. */}
            <div className="absolute left-[-9999px]" aria-hidden="true">
              <label htmlFor="company_website">Website</label>
              <input type="text" id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
            </div>

            <SubmitButton />

            {state && !state.ok && (
              <p role="alert" className="text-sm text-error">
                {state.error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
