/**
 * Email sent to platform admins when a voter applies to become a candidate
 * and is awaiting verification approval.
 */
export interface CandidatePendingApprovalEmailParams {
  candidateName: string;
  candidatePhone?: string | null;
  candidateEmail?: string | null;
  position: string;
  regionLabel: string;
  partyLabel: string;
  reviewUrl: string;
  appliedAt: string; // ISO or human-readable
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

export function generateCandidatePendingApprovalEmailHTML(
  params: CandidatePendingApprovalEmailParams,
): string {
  const positionLabel = POSITION_LABELS[params.position] || params.position;
  const contactBits: string[] = [];
  if (params.candidatePhone) contactBits.push(`📞 ${params.candidatePhone}`);
  if (params.candidateEmail) contactBits.push(`✉️ ${params.candidateEmail}`);
  const contactLine = contactBits.length
    ? `<p style="margin:6px 0 0;font-size:13px;color:#71717a;">${contactBits.join('  ·  ')}</p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Candidate Pending Approval</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:#0f172a;padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">🛡️ myVote Kenya — Admin</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 8px;font-size:21px;font-weight:700;color:#18181b;">New Candidate Awaiting Approval</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.55;">
              A new candidate application has been submitted and requires admin review.
            </p>

            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:18px 20px;margin-bottom:18px;">
              <p style="margin:0;font-size:12px;color:#92400e;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Pending Candidate</p>
              <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#1c1917;">${params.candidateName}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#78716c;">
                Running for <strong style="color:#1c1917;">${positionLabel}</strong>
                · ${params.regionLabel}
                · ${params.partyLabel}
              </p>
              ${contactLine}
              <p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;">Submitted: ${params.appliedAt}</p>
            </div>

            <div style="text-align:center;margin:24px 0 8px;">
              <a href="${params.reviewUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Review Candidate</a>
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
              Approve verified candidates promptly so they can begin engaging voters and inviting agents.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#fafafa;padding:18px 40px;text-align:center;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;">myVote Kenya · Admin Notifications</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
