export interface NotificationEmailOptions {
  title: string
  message: string
  link?: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeHref(u?: string): string | null {
  if (!u) return null
  try {
    const p = new URL(u)
    return p.protocol === 'http:' || p.protocol === 'https:' ? p.toString() : null
  } catch {
    return null
  }
}

/**
 * Generates the HTML body for a notification email.
 * Styled to match the Executive Precision design system (dark, mono, minimal).
 * All interpolated values are HTML-escaped; link is validated to http(s) only.
 * @param options - title, message, optional CTA link
 * @returns HTML string
 */
export function buildNotificationEmail({ title, message, link }: NotificationEmailOptions): string {
  const safeLink = safeHref(link)
  const ctaBlock = safeLink
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
        <tr>
          <td>
            <a href="${esc(safeLink)}" style="display:inline-block;padding:10px 20px;background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;font-size:13px;color:#ffffff;text-decoration:none;font-family:'Courier New',Courier,monospace;letter-spacing:0.04em;">
              View details →
            </a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0f0b;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0f0b;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#121410;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.03em;">Instra</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.025em;line-height:1.2;">
                ${esc(title)}
              </p>
              <p style="margin:0;font-size:14px;color:#8e9192;line-height:1.6;">
                ${esc(message)}
              </p>
              ${ctaBlock}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#444748;line-height:1.5;">
                Instra · Your Marketing Companion<br />
                You're receiving this because notifications are enabled for your account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Generates the plain-text fallback for a notification email.
 * @param options - title, message, optional link
 * @returns Plain-text string
 */
export function buildNotificationText({ title, message, link }: NotificationEmailOptions): string {
  return `${title}\n\n${message}${link ? `\n\nView details: ${link}` : ''}\n\n Instra`
}
