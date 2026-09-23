"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendContactNotificationEmail } from "@/lib/email/send-contact-notification";

export type ContactFormResult = { ok: true } | { ok: false; error: string };

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitContactForm(
  _prevState: ContactFormResult | null,
  formData: FormData
): Promise<ContactFormResult> {
  // Honeypot: a real visitor never fills this in (it's kept off-screen,
  // not display:none, since some bots skip display:none fields). If it's
  // filled, silently pretend success - never reveal the trap.
  const honeypot = String(formData.get("company_website") ?? "").trim();
  if (honeypot) return { ok: true };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email, and message." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (message.length > 5000) {
    return { ok: false, error: "Message is too long - please keep it under 5000 characters." };
  }

  // Coarse, global circuit breaker rather than a new rate-limit table -
  // reuses the email_log table this task already builds. Not per-visitor
  // throttling, just a brake against a flood of submissions.
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await admin
    .from("email_log")
    .select("id", { count: "exact", head: true })
    .eq("email_type", "contact_notification")
    .gte("created_at", windowStart);
  if ((count ?? 0) >= RATE_LIMIT_MAX_SUBMISSIONS) {
    // Still shown as success to the visitor - don't reveal rate limiting,
    // and the message is genuinely queued-equivalent from their POV.
    return { ok: true };
  }

  const result = await sendContactNotificationEmail({ name, email, message });
  if (!result.ok) {
    return { ok: false, error: "Something went wrong sending your message. Please try again shortly." };
  }
  return { ok: true };
}
