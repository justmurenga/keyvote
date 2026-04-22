/**
 * Generates a styled HTML email template for an agent invitation.
 */
export interface AgentInvitationEmailParams {
  invitedName: string;
  candidateName: string;
  position: string;
  regionType: string;
  regionName: string;
  acceptUrl: string;
  partyName?: string | null;
  followerCount?: number | null;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

const REGION_LABELS: Record<string, string> = {
  national: 'National',
  county: 'County',
  constituency: 'Constituency',
  ward: 'Ward',
  polling_station: 'Polling Station',
};

export function generateAgentInvitationEmailHTML(params: AgentInvitationEmailParams): string {
  const positionLabel = POSITION_LABELS[params.position] || params.position;
  const regionLabel = REGION_LABELS[params.regionType] || params.regionType;
  const partyLine = params.partyName
    ? `<p style="margin:4px 0 0;font-size:13px;color:#71717a;">Party: <strong style="color:#18181b;">${params.partyName}</strong></p>`
    : '';
  const followersLine =
    params.followerCount && params.followerCount > 0
      ? `<p style="margin:4px 0 0;font-size:13px;color:#71717a;">Followers: <strong style="color:#18181b;">${params.followerCount.toLocaleString()}</strong></p>`
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Campaign Agent Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#16a34a;padding:32px 40px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">🛡️ myVote Kenya</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;text-align:center;">Campaign Agent Invitation</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#71717a;text-align:center;line-height:1.5;">
                Hello <strong style="color:#18181b;">${params.invitedName}</strong>,<br/>
                You have been invited to serve as a polling agent.
              </p>

              <!-- Candidate card -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
                <p style="margin:0;font-size:12px;color:#15803d;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Candidate</p>
                <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#14532d;">${params.candidateName}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Running for <strong>${positionLabel}</strong></p>
                ${partyLine}
                ${followersLine}
              </div>

              <!-- Region card -->
              <div style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;color:#52525b;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Assigned Region</p>
                <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#18181b;">${params.regionName}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#71717a;">${regionLabel}</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:8px 0 24px;">
                <a href="${params.acceptUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;">Review &amp; Accept Invitation</a>
              </div>

              <p style="margin:0;font-size:13px;color:#71717a;text-align:center;line-height:1.6;">
                Or copy this link into your browser:<br/>
                <a href="${params.acceptUrl}" style="color:#16a34a;word-break:break-all;">${params.acceptUrl}</a>
              </p>

              <div style="border-top:1px solid #e4e4e7;margin-top:28px;padding-top:20px;">
                <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;line-height:1.6;">
                  As a polling agent you will help track results and report incidents from your assigned region.
                  If you did not expect this invitation, you can safely ignore this email.
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
