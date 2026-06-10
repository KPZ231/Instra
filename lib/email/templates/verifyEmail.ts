export interface VerifyEmailOptions {
  code: string
  expiryMinutes?: number
}

/**
 * Generates the HTML body for the email verification message.
 * Styled to match the Executive Precision design system (dark, mono, minimal).
 * @param options - 6-digit verification code and optional expiry duration
 * @returns HTML string for the email body
 */
export function buildVerifyEmail({ code, expiryMinutes = 10 }: VerifyEmailOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Instra email</title>
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
                Verify your email address
              </p>
              <p style="margin:0 0 28px;font-size:14px;color:#8e9192;line-height:1.6;">
                Enter the code below to complete your Instra registration.
                The code expires in ${expiryMinutes} minutes.
              </p>

              <!-- Code block -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:24px;">
                    <p style="margin:0 0 6px;font-size:11px;font-family:'Courier New',Courier,monospace;font-weight:600;color:#8e9192;text-transform:uppercase;letter-spacing:0.06em;">
                      Verification code
                    </p>
                    <p style="margin:0;font-size:40px;font-family:'Courier New',Courier,monospace;font-weight:700;color:#ffffff;letter-spacing:0.18em;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-family:'Courier New',Courier,monospace;font-weight:600;color:#8e9192;text-transform:uppercase;letter-spacing:0.06em;">
                      Security notice
                    </p>
                    <p style="margin:0;font-size:13px;color:#8e9192;line-height:1.5;">
                      This code expires in <strong style="color:#c4c7c8;">${expiryMinutes} minutes</strong>.
                      If you did not create an Instra account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#444748;line-height:1.5;">
                Instra · Your Marketing Companion<br />
                You're receiving this email because a registration was initiated with this address.
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
 * Generates the plain-text fallback body for the email verification message.
 * @param code - The 6-digit verification code
 * @returns Plain-text string for the email body
 */
export function buildVerifyEmailText(code: string): string {
  return `Verify your Instra email\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not create an Instra account, ignore this email.`
}
