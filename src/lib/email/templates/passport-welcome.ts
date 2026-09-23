import { emailShell, escapeHtml } from "./shell";

export function passportWelcomeEmail(data: {
  firstName: string | null;
  regionName: string | null;
  accountUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Welcome to Local Perks Passport";
  const greeting = data.firstName ? `Hi ${escapeHtml(data.firstName)},` : "Hi there,";
  const regionLine = data.regionName
    ? `Your <strong>${escapeHtml(data.regionName)} Passport</strong> is active and ready to use.`
    : "Your Passport is active and ready to use.";

  const bodyHtml = `
    <tr><td style="padding-bottom:16px;">${greeting}</td></tr>
    <tr><td style="padding-bottom:16px;">${regionLine}</td></tr>
    <tr><td style="padding-bottom:16px;">
      Browse participating businesses in your area, and show your Passport at checkout to redeem
      exclusive offers, discounts, and freebies - no fine print designed to make it unusable.
    </td></tr>`;

  const html = emailShell({
    previewText: "Your Local Perks Passport is active - start exploring local offers.",
    bodyHtml,
    ctaLabel: "Explore Your Passport",
    ctaUrl: data.accountUrl,
  });

  const text = [
    data.firstName ? `Hi ${data.firstName},` : "Hi there,",
    "",
    data.regionName
      ? `Your ${data.regionName} Passport is active and ready to use.`
      : "Your Passport is active and ready to use.",
    "",
    "Browse participating businesses in your area, and show your Passport at checkout to redeem exclusive offers, discounts, and freebies.",
    "",
    `Explore your Passport: ${data.accountUrl}`,
    "",
    "Questions? Contact us at admin@localperkspassport.com.",
  ].join("\n");

  return { subject, html, text };
}
