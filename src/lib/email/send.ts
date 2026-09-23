import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaResend } from "./resend-client";
import type { SendEmailParams, SendEmailResult } from "./types";

// The one place every application email passes through. Never throws - a
// failed send must never roll back whatever succeeded before it triggered
// this (a passport purchase, a business registration). Dedup is race-safe
// insert-first / catch-unique-violation on email_log.idempotency_key,
// rather than check-then-insert, which has a TOCTOU window under
// concurrent calls (e.g. a double-click submit firing two requests).
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const admin = createAdminClient();

  const { data: logRow, error: insertError } = await admin
    .from("email_log")
    .insert({
      email_type: params.emailType,
      recipient: params.recipient,
      related_user_id: params.relatedUserId ?? null,
      related_business_id: params.relatedBusinessId ?? null,
      related_passport_id: params.relatedPassportId ?? null,
      related_region_id: params.relatedRegionId ?? null,
      idempotency_key: params.idempotencyKey,
      delivery_status: "pending",
      attempt_count: 1,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      // Already attempted for this idempotency key - silent no-op, not an
      // error. This is the entire dedup mechanism.
      return { ok: true };
    }
    console.error("email_log insert failed", insertError.message);
    return { ok: false, error: insertError.message };
  }

  try {
    const { id: providerMessageId } = await sendViaResend({
      to: params.recipient,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
    });
    await admin
      .from("email_log")
      .update({
        delivery_status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
    return { ok: true };
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await admin.from("email_log").update({ delivery_status: "failed", failure_reason: message }).eq("id", logRow.id);
    return { ok: false, error: "send failed" };
  }
}
