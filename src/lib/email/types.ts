export type EmailType = "passport_welcome" | "business_welcome" | "contact_notification";

export interface SendEmailParams {
  emailType: EmailType;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
  relatedUserId?: string | null;
  relatedBusinessId?: string | null;
  relatedPassportId?: string | null;
  relatedRegionId?: string | null;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };
