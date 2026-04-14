/**
 * Generates a styled HTML email template for OTP verification
 */
export function generateOTPEmailHTML(otp: string): string {
  const digits = otp.split('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#16a34a;padding:32px 40px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <div style="width:36px;height:36px;background-color:rgba(255,255,255,0.2);border-radius:8px;text-align:center;line-height:36px;font-size:20px;">🗳️</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">myVote Kenya</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;text-align:center;">Verification Code</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#71717a;text-align:center;line-height:1.5;">
                Enter this code to verify your identity. It expires in <strong style="color:#18181b;">10 minutes</strong>.
              </p>

              <!-- OTP Digits -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  ${digits
                    .map(
                      (d) =>
                        `<td style="padding:0 4px;"><div style="width:48px;height:56px;background-color:#f4f4f5;border:2px solid #e4e4e7;border-radius:10px;text-align:center;line-height:56px;font-size:26px;font-weight:700;color:#18181b;font-family:'Courier New',monospace;">${d}</div></td>`
                    )
                    .join('')}
                </tr>
              </table>

              <!-- Copy-friendly code -->
              <div style="text-align:center;margin-bottom:32px;">
                <span style="display:inline-block;background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 20px;font-size:24px;font-weight:700;letter-spacing:6px;color:#16a34a;font-family:'Courier New',monospace;">${otp}</span>
              </div>

              <div style="border-top:1px solid #e4e4e7;padding-top:24px;">
                <p style="margin:0;font-size:13px;color:#a1a1aa;text-align:center;line-height:1.6;">
                  If you did not request this code, you can safely ignore this email.<br />
                  Never share this code with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:24px 40px;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.5;">
                © ${new Date().getFullYear()} myVote Kenya. All rights reserved.<br />
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
