import { emailShell, escapeHtml } from "./shell";

export function businessOwnerInvitationEmail(data: {
  businessName: string;
  isTransfer: boolean;
  claimUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = data.isTransfer
    ? `You've been invited to take over ${data.businessName} on Local Perks Passport`
    : `You've been invited to manage ${data.businessName} on Local Perks Passport`;

  const bodyLine = data.isTransfer
    ? `An administrator has started transferring ownership of <strong>${escapeHtml(data.businessName)}</strong> to you on Local Perks Passport.`
    : `An administrator has invited you to manage <strong>${escapeHtml(data.businessName)}</strong> on Local Perks Passport.`;

  const bodyHtml = `
    <tr><td style="padding-bottom:16px;">Hi there,</td></tr>
    <tr><td style="padding-bottom:16px;">${bodyLine}</td></tr>
    <tr><td style="padding-bottom:16px;">Sign in or create an account with this email address, then come back to accept the invitation. This link expires in 7 days and can only be used once.</td></tr>`;

  const html = emailShell({
    previewText: data.isTransfer
      ? `You've been invited to take over ${data.businessName}.`
      : `You've been invited to manage ${data.businessName}.`,
    bodyHtml,
    ctaLabel: "Accept invitation",
    ctaUrl: data.claimUrl,
  });

  const text = [
    "Hi there,",
    "",
    data.isTransfer
      ? `An administrator has started transferring ownership of ${data.businessName} to you on Local Perks Passport.`
      : `An administrator has invited you to manage ${data.businessName} on Local Perks Passport.`,
    "",
    "Sign in or create an account with this email address, then come back to accept the invitation. This link expires in 7 days and can only be used once.",
    "",
    `Accept invitation: ${data.claimUrl}`,
    "",
    "Questions? Contact us at admin@localperkspassport.com.",
  ].join("\n");

  return { subject, html, text };
}
