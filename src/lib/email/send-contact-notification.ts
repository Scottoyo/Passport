import "server-only";

import { sendEmail } from "./send";
import { contactNotificationEmail } from "./templates/contact-notification";
import type { SendEmailResult } from "./types";

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Idempotency key is a hash of the normalized email + trimmed message, so
// an exact resubmission (double-click, browser back-button resubmit) is a
// guaranteed no-op through the same unique-constraint mechanism every
// other email type uses - no separate "duplicate submission" table needed.
export async function sendContactNotificationEmail(params: {
  name: string;
  email: string;
  message: string;
}): Promise<SendEmailResult> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const trimmedMessage = params.message.trim();
  const key = await sha256Hex(`${normalizedEmail}|${trimmedMessage}`);

  const { subject, html, text } = contactNotificationEmail({
    name: params.name.trim(),
    email: normalizedEmail,
    message: trimmedMessage,
    submittedAt: new Date(),
  });

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { ok: false, error: "ADMIN_EMAIL is not configured." };

  return sendEmail({
    emailType: "contact_notification",
    recipient: adminEmail,
    subject,
    html,
    text,
    replyTo: normalizedEmail,
    idempotencyKey: `contact:${key}`,
  });
}
