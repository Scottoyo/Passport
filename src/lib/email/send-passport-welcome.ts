import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { passportWelcomeEmail } from "./templates/passport-welcome";
import type { SendEmailResult } from "./types";

// Called once, right after a passport row is inserted with status:'active'
// (src/app/passport/actions.ts) - the idempotency key is keyed on the
// passport's own id, so this can only ever fire once per passport row no
// matter how many times it's called.
export async function sendPassportWelcomeEmail(params: {
  passportId: string;
  userId: string;
  recipientEmail: string;
  areaId: string;
}): Promise<SendEmailResult> {
  const admin = createAdminClient();

  const [{ data: profile }, { data: area }] = await Promise.all([
    admin.from("profiles").select("first_name").eq("id", params.userId).maybeSingle(),
    admin.from("passport_areas").select("name").eq("id", params.areaId).maybeSingle(),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { subject, html, text } = passportWelcomeEmail({
    firstName: profile?.first_name ?? null,
    regionName: area?.name ?? null,
    accountUrl: `${siteUrl}/account/passport`,
  });

  return sendEmail({
    emailType: "passport_welcome",
    recipient: params.recipientEmail,
    subject,
    html,
    text,
    replyTo: process.env.EMAIL_REPLY_TO,
    idempotencyKey: `passport-welcome:${params.passportId}`,
    relatedUserId: params.userId,
    relatedPassportId: params.passportId,
    relatedRegionId: params.areaId,
  });
}
