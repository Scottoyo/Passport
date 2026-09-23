import { emailShell, escapeHtml } from "./shell";
import type { BusinessApprovalStatus } from "@/lib/types/domain";

export function businessWelcomeEmail(data: {
  contactFirstName: string | null;
  businessName: string;
  regionName: string | null;
  approvalStatus: BusinessApprovalStatus;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = "Welcome to Local Perks Passport";
  const greeting = data.contactFirstName ? `Hi ${escapeHtml(data.contactFirstName)},` : "Hi there,";

  // approval_status is fully independent of a business's public status - a
  // self-service signup always lands here as 'pending_review' (the only
  // path this hook realistically ever observes); 'approved'/'rejected' are
  // defensive fallbacks for a future admin-created-and-pre-approved path,
  // not something this template needs to be elaborate about.
  const statusLine =
    data.approvalStatus === "approved"
      ? `<strong>${escapeHtml(data.businessName)}</strong> has been approved and is on Local Perks Passport${
          data.regionName ? ` for ${escapeHtml(data.regionName)}` : ""
        }.`
      : data.approvalStatus === "rejected"
        ? `Your submission for <strong>${escapeHtml(data.businessName)}</strong> needs a follow-up - our team will be in touch.`
        : `Thanks for submitting <strong>${escapeHtml(data.businessName)}</strong>${
            data.regionName ? ` for ${escapeHtml(data.regionName)}` : ""
          }. Your listing is <strong>under review</strong> and isn't publicly visible yet.`;

  const nextSteps =
    data.approvalStatus === "rejected"
      ? ""
      : `
    <tr><td style="padding-bottom:12px;">While you wait, get your profile ready to make a great first impression:</td></tr>
    <tr><td style="padding-bottom:16px;">
      <ul style="margin:0;padding-left:20px;">
        <li>Add your logo and a banner image</li>
        <li>Write a short business description</li>
        <li>Confirm your address and contact information</li>
        <li>Add your website and social links</li>
        <li>Create your first Passport promotion</li>
        <li>Add photos to your media gallery</li>
      </ul>
    </td></tr>`;

  const bodyHtml = `
    <tr><td style="padding-bottom:16px;">${greeting}</td></tr>
    <tr><td style="padding-bottom:16px;">${statusLine}</td></tr>
    ${nextSteps}`;

  const html = emailShell({
    previewText: "Welcome to Local Perks Passport - here's what to do next.",
    bodyHtml,
    ctaLabel: "Complete Your Business Profile",
    ctaUrl: data.portalUrl,
  });

  const text = [
    data.contactFirstName ? `Hi ${data.contactFirstName},` : "Hi there,",
    "",
    data.approvalStatus === "approved"
      ? `${data.businessName} has been approved and is on Local Perks Passport${data.regionName ? ` for ${data.regionName}` : ""}.`
      : data.approvalStatus === "rejected"
        ? `Your submission for ${data.businessName} needs a follow-up - our team will be in touch.`
        : `Thanks for submitting ${data.businessName}${data.regionName ? ` for ${data.regionName}` : ""}. Your listing is under review and isn't publicly visible yet.`,
    "",
    data.approvalStatus === "rejected"
      ? ""
      : "While you wait, complete your profile: logo, banner, description, address/contact, website/social links, a promotion, and gallery photos.",
    "",
    `Complete your business profile: ${data.portalUrl}`,
    "",
    "Questions? Contact us at admin@localperkspassport.com.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
