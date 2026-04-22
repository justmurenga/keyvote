/**
 * Email sent to a candidate once an admin has approved / verified their
 * candidate profile. Encourages them to begin engaging voters, lobbying,
 * and inviting agents.
 */
export interface CandidateApprovedEmailParams {
  candidateName: string;
  position: string;
  regionLabel: string;
  partyLabel: string;
  dashboardUrl: string;
  inviteAgentsUrl: string;
  publicProfileUrl: string;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

export function generateCandidateApprovedEmailHTML(
  params: CandidateApprovedEmailParams,
): string {
  const positionLabel = POSITION_LABELS[params.position] || params.position;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Candidate Profile is Approved</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:#16a34a;padding:32px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">✅ You're Verified!</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;text-align:center;">
              Congratulations, ${params.candidateName}!
            </h1>
            <p style="margin:0 0 22px;font-size:15px;color:#52525b;text-align:center;line-height:1.55;">
              Your candidate profile for <strong style="color:#18181b;">${positionLabel}</strong>
              (${params.regionLabel} · ${params.partyLabel}) has been
              <strong style="color:#15803d;">approved</strong> by the myVote Kenya admin team.
            </p>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
              <p style="margin:0 0 8px;font-size:13px;color:#166534;font-weight:600;">You can now:</p>
              <ul style="margin:0;padding-left:18px;color:#15803d;font-size:14px;line-height:1.7;">
                <li>Engage voters across your constituency</li>
                <li>Lobby supporters &amp; share your manifesto</li>
                <li>Invite campaign agents to mobilize on the ground</li>
                <li>Run polls &amp; track real-time analytics</li>
              </ul>
            </div>

            <div style="text-align:center;margin:24px 0 12px;">
              <a href="${params.dashboardUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;margin:4px;">Open Dashboard</a>
              <a href="${params.inviteAgentsUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;margin:4px;">Invite Agents</a>
            </div>
            <p style="margin:14px 0 0;font-size:13px;color:#71717a;text-align:center;">
              Share your public profile: <a href="${params.publicProfileUrl}" style="color:#0ea5e9;">${params.publicProfileUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#fafafa;padding:18px 40px;text-align:center;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;">myVote Kenya · Empowering Kenya's Democracy</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
