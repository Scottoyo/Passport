import "server-only";

import { sendEmail } from "./send";
import { businessOwnerInvitationEmail } from "./templates/business-owner-invitation";
import type { SendEmailResult } from "./types";

// Keyed on the invitation row's own id - every fresh invite/resend/transfer
// is a new row (inviteBusinessOwner always revokes any existing pending row
// first), so this never gets deduped against a prior send.
export async function sendBusinessOwnerInvitationEmail(params: {
  invitationId: string;
  businessId: string;
  businessName: string;
  recipientEmail: string;
  claimUrl: string;
  isTransfer: boolean;
}): Promise<SendEmailResult> {
  const { subject, html, text } = businessOwnerInvitationEmail({
    businessName: params.businessName,
    isTransfer: params.isTransfer,
    claimUrl: params.claimUrl,
  });

  return sendEmail({
    emailType: "business_owner_invitation",
    recipient: params.recipientEmail,
    subject,
    html,
    text,
    replyTo: process.env.EMAIL_REPLY_TO,
    idempotencyKey: `business-owner-invitation:${params.invitationId}`,
    relatedBusinessId: params.businessId,
  });
}
