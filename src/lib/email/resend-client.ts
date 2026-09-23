import "server-only";

// Thin wrapper around Resend's REST API - a single JSON POST, so the
// official SDK buys little over raw fetch (matches this repo's near-zero
// dependency posture; see src/lib/storage.ts for the same "thin wrapper
// around one external concern" shape). From/reply-to are resolved here,
// from env vars, and never accepted as parameters from callers outside
// this module - nothing outside src/lib/email/ can choose a sender.
export async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  const fromName = process.env.EMAIL_FROM_NAME;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  if (!fromAddress) throw new Error("EMAIL_FROM_ADDRESS is not configured.");

  const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo ? [params.replyTo] : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}
