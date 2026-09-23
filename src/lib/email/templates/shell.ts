// Shared email layout: table-based, inline-styled HTML only - no JS, no
// external fonts, no CSS that Outlook/Gmail/Apple Mail strip. Colors are
// hardcoded to this site's own brand palette (globals.css's defaults,
// since email HTML can't read CSS custom properties). Functional with
// images disabled - the "logo" is text, not an image.
const NAVY = "#073451";
const INK = "#172e3d";
const INK_MUTED = "#57666f";
const BORDER = "#e4d9c4";
const SURFACE_ALT = "#fffbf2";

export function emailShell(params: { previewText: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const cta =
    params.ctaLabel && params.ctaUrl
      ? `
        <tr>
          <td style="padding: 24px 0 8px;">
            <a href="${params.ctaUrl}" style="display:inline-block;background-color:${NAVY};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:8px;">
              ${escapeHtml(params.ctaLabel)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 0 16px; font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${INK_MUTED};">
            Or copy this link into your browser: <a href="${params.ctaUrl}" style="color:${NAVY};">${params.ctaUrl}</a>
          </td>
        </tr>`
      : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local Perks Passport</title>
  </head>
  <body style="margin:0;padding:0;background-color:${SURFACE_ALT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.previewText)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE_ALT};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:${NAVY};padding:24px 32px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#ffffff;">Local Perks Passport</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${params.bodyHtml}
                  ${cta}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${INK_MUTED};">
                Questions? Contact us at
                <a href="mailto:admin@localperkspassport.com" style="color:${NAVY};">admin@localperkspassport.com</a>.
                <br />
                Local Perks Passport
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
