import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { businessWelcomeEmail } from "./templates/business-welcome";
import type { BusinessApprovalStatus } from "@/lib/types/domain";
import type { SendEmailResult } from "./types";

// Called once, right after a business row is inserted (src/app/register-business/actions.ts)
// - fires at registration completion regardless of approval_status, since
// there's no payment gate and admin approval can take days; the copy
// itself reflects current approvalStatus. Idempotency key is keyed on the
// business's own id.
export async function sendBusinessWelcomeEmail(params: {
  businessId: string;
  approvalStatus: BusinessApprovalStatus;
  ownerUserId: string;
  ownerEmail: string;
  ownerFirstName: string | null;
  businessName: string;
  areaId: string;
}): Promise<SendEmailResult> {
  const admin = createAdminClient();
  const { data: area } = await admin.from("passport_areas").select("name").eq("id", params.areaId).maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { subject, html, text } = businessWelcomeEmail({
    contactFirstName: params.ownerFirstName,
    businessName: params.businessName,
    regionName: area?.name ?? null,
    approvalStatus: params.approvalStatus,
    portalUrl: `${siteUrl}/portal/${params.businessId}/profile`,
  });

  return sendEmail({
    emailType: "business_welcome",
    recipient: params.ownerEmail,
    subject,
    html,
    text,
    replyTo: process.env.EMAIL_REPLY_TO,
    idempotencyKey: `business-welcome:${params.businessId}`,
    relatedUserId: params.ownerUserId,
    relatedBusinessId: params.businessId,
    relatedRegionId: params.areaId,
  });
}
