import { emailShell, escapeHtml } from "./shell";

export function contactNotificationEmail(data: {
  name: string;
  email: string;
  message: string;
  submittedAt: Date;
}): { subject: string; html: string; text: string } {
  const subject = `New contact form message from ${data.name}`;
  const submittedAt = data.submittedAt.toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" });

  const bodyHtml = `
    <tr><td style="padding-bottom:12px;">New message submitted through the website contact form.</td></tr>
    <tr><td style="padding-bottom:8px;"><strong>Name:</strong> ${escapeHtml(data.name)}</td></tr>
    <tr><td style="padding-bottom:8px;"><strong>Email:</strong> ${escapeHtml(data.email)}</td></tr>
    <tr><td style="padding-bottom:8px;"><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</td></tr>
    <tr><td style="padding:16px 0 8px;border-top:1px solid #e4d9c4;"><strong>Message:</strong></td></tr>
    <tr><td style="padding-bottom:8px;white-space:pre-wrap;">${escapeHtml(data.message)}</td></tr>`;

  const html = emailShell({
    previewText: `New contact form message from ${data.name}`,
    bodyHtml,
  });

  const text = [
    "New message submitted through the website contact form.",
    "",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Submitted: ${submittedAt}`,
    "",
    "Message:",
    data.message,
  ].join("\n");

  return { subject, html, text };
}
