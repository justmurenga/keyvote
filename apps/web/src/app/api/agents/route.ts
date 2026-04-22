import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { sendSMS, normalizePhoneNumber, calculateSMSCost, getSMSSegments } from '@/lib/sms/airtouch';
import { sendEmail, isValidEmail } from '@/lib/email';
import { generateAgentInvitationEmailHTML } from '@/lib/email/templates/agent-invitation';
import { getOrCreateWallet, debitWallet } from '@/lib/wallet';

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
// Suppress unused-var warning when REGION_LABELS isn't referenced elsewhere yet.
void REGION_LABELS;

/**
 * GET /api/agents - List agents for the current candidate
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // Get the candidate record for this user
    const { data: candidate, error: candidateError } = await adminClient
      .from('candidates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidate) {
      // Check if user is system_admin - they can see all agents
      const { data: user } = await adminClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (user?.role === 'system_admin') {
        // System admin: return all agents
        const { data: agents, error } = await adminClient
          .from('agents')
          .select(`
            *,
            users:user_id (id, full_name, phone, profile_photo_url),
            candidates:candidate_id (id, position, users:user_id (full_name)),
            assigned_polling_station:assigned_polling_station_id (id, display_name),
            assigned_ward:assigned_ward_id (id, name),
            assigned_constituency:assigned_constituency_id (id, name),
            assigned_county:assigned_county_id (id, name)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
        }

        return NextResponse.json({ success: true, agents: agents || [] });
      }

      // Check if user is an agent themselves
      const { data: agentRecord } = await adminClient
        .from('agents')
        .select(`
          *,
          candidates:candidate_id (id, position, users:user_id (full_name))
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (agentRecord && agentRecord.length > 0) {
        return NextResponse.json({ success: true, agents: agentRecord, role: 'agent' });
      }

      return NextResponse.json({ error: 'No candidate profile found' }, { status: 403 });
    }

    // Use the RPC function to get agents with full info
    const { data: agents, error } = await (adminClient as any).rpc('get_candidate_agents', {
      p_candidate_id: candidate.id,
      p_status: status || null,
    });

    if (error) {
      // Graceful fallback if the RPC has not been migrated yet (PGRST202)
      // or otherwise fails — query the table directly so the dashboard
      // never appears blank because of an out-of-date schema cache.
      console.error('get_candidate_agents RPC failed, falling back to table query:', error);

      let q = (adminClient.from('agents') as any)
        .select(`
          *,
          users:user_id (id, full_name, phone, profile_photo_url),
          assigned_polling_station:assigned_polling_station_id (id, display_name),
          assigned_ward:assigned_ward_id (id, name),
          assigned_constituency:assigned_constituency_id (id, name),
          assigned_county:assigned_county_id (id, name)
        `)
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (status) q = q.eq('status', status);

      const { data: rows, error: fallbackError } = await q;
      if (fallbackError) {
        console.error('Fallback agents query failed:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
      }

      const flattened = (rows || []).map((a: any) => ({
        agent_id: a.id,
        user_id: a.user_id,
        full_name: a.users?.full_name || a.invited_name || 'Pending',
        phone_number: a.users?.phone || a.invited_phone || '',
        profile_photo_url: a.users?.profile_photo_url || null,
        assigned_region_type: a.assigned_region_type,
        region_name:
          a.assigned_polling_station?.display_name ||
          a.assigned_ward?.name ||
          a.assigned_constituency?.name ||
          a.assigned_county?.name ||
          'National',
        mpesa_number: a.mpesa_number,
        status: a.status,
        invited_phone: a.invited_phone,
        invited_name: a.invited_name,
        invitation_token: a.invitation_token,
        total_reports: a.total_reports || 0,
        total_results_submitted: a.total_results_submitted || 0,
        total_payments_received: a.total_payments_received || 0,
        invited_at: a.invited_at,
        accepted_at: a.accepted_at,
        revoked_at: a.revoked_at,
        revoke_reason: a.revoke_reason,
        created_at: a.created_at,
      }));

      return NextResponse.json({
        success: true,
        agents: flattened,
        candidateId: candidate.id,
        usedFallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      agents: agents || [],
      candidateId: candidate.id,
    });
  } catch (error) {
    console.error('Agents GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * POST /api/agents - Invite a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId: targetUserId,
      phone,
      name,
      regionType,
      pollingStationId,
      wardId,
      constituencyId,
      countyId,
      mpesaNumber,
    } = body;

    // Validate required fields. We now require either an existing platform
    // userId (preferred — selected from the auto-search), OR a phone+name
    // pair for the legacy invitation-link flow.
    if (!targetUserId && (!phone || !name)) {
      return NextResponse.json(
        { error: 'Select a registered user, or provide both phone number and name' },
        { status: 400 },
      );
    }

    if (!regionType) {
      return NextResponse.json({ error: 'Region type is required' }, { status: 400 });
    }

    // Validate region ID matches region type
    if (regionType === 'polling_station' && !pollingStationId) {
      return NextResponse.json({ error: 'Polling station is required for this region type' }, { status: 400 });
    }
    if (regionType === 'ward' && !wardId) {
      return NextResponse.json({ error: 'Ward is required for this region type' }, { status: 400 });
    }
    if (regionType === 'constituency' && !constituencyId) {
      return NextResponse.json({ error: 'Constituency is required for this region type' }, { status: 400 });
    }
    if (regionType === 'county' && !countyId) {
      return NextResponse.json({ error: 'County is required for this region type' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get candidate profile
    const { data: candidate, error: candidateError } = await adminClient
      .from('candidates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Only candidates can invite agents' }, { status: 403 });
    }

    // Normalize phone number (only used for legacy / fallback)
    let normalizedPhone: string | null = phone || null;
    if (normalizedPhone && normalizedPhone.startsWith('0')) {
      normalizedPhone = '+254' + normalizedPhone.slice(1);
    }

    // Resolve the target user. Prefer explicit userId from the auto-search.
    let targetUser: { id: string; full_name: string | null; phone_number: string | null; email: string | null } | null = null;

    if (targetUserId) {
      const { data: byId } = await (adminClient
        .from('users') as any)
        .select('id, full_name, phone, email, is_active')
        .eq('id', targetUserId)
        .single();
      if (!byId || byId.is_active === false) {
        return NextResponse.json({ error: 'Selected user was not found or is inactive' }, { status: 404 });
      }
      targetUser = {
        id: byId.id,
        full_name: byId.full_name,
        phone_number: byId.phone,
        email: byId.email,
      };
    } else if (normalizedPhone) {
      const { data: byPhone } = await (adminClient
        .from('users') as any)
        .select('id, full_name, phone, email, is_active')
        .eq('phone', normalizedPhone)
        .maybeSingle();
      if (byPhone) {
        targetUser = {
          id: byPhone.id,
          full_name: byPhone.full_name,
          phone_number: byPhone.phone,
          email: byPhone.email,
        };
      }
    }

    // Ensure no duplicate pending/active relationship with this candidate
    if (targetUser) {
      const { data: existingAgent } = await adminClient
        .from('agents')
        .select('id, status')
        .eq('user_id', targetUser.id)
        .eq('candidate_id', candidate.id)
        .in('status', ['pending', 'active'])
        .maybeSingle();

      if (existingAgent) {
        return NextResponse.json({
          error: `This person already has a ${existingAgent.status} agent relationship with you`,
        }, { status: 409 });
      }
    }

    // Create the agent invitation
    const invitationToken = crypto.randomUUID();

    const invitedName = targetUser?.full_name || name || 'Agent';
    const invitedPhoneFinal = targetUser?.phone_number || normalizedPhone;

    const { data: agent, error: insertError } = await (adminClient
      .from('agents') as any)
      .insert({
        user_id: targetUser?.id || '00000000-0000-0000-0000-000000000000',
        candidate_id: candidate.id,
        assigned_region_type: regionType,
        assigned_polling_station_id: pollingStationId || null,
        assigned_ward_id: wardId || null,
        assigned_constituency_id: constituencyId || null,
        assigned_county_id: countyId || null,
        mpesa_number: mpesaNumber || invitedPhoneFinal,
        status: 'pending',
        invitation_token: invitationToken,
        invited_phone: invitedPhoneFinal,
        invited_name: invitedName,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating agent invitation:', insertError);
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This person is already an agent for this candidate' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create agent invitation' }, { status: 500 });
    }

    // Build the acceptance URLs.
    // - `acceptUrl` is the public link (used in SMS / email — works for both
    //   registered and unregistered recipients; the public page redirects
    //   logged-in users into the dashboard automatically).
    // - `inAppUrl` is the in-app dashboard route, used for the in-app
    //   notification's action_url so the request opens *inside the system*.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
    const acceptUrl = `${baseUrl}/agents/accept/${invitationToken}`;
    const inAppPath = `/dashboard/agents/accept/${invitationToken}`;

    // Look up the inviting candidate + region info once for use across
    // in-app notification, SMS and email channels.
    let candidateName = 'A candidate';
    let candidatePosition = '';
    let candidateFollowerCount = 0;
    let candidatePartyName: string | null = null;
    try {
      const { data: candidateUser } = await (adminClient
        .from('candidates') as any)
        .select('position, follower_count, users:user_id (full_name), party:political_parties (name)')
        .eq('id', candidate.id)
        .single();
      candidateName = candidateUser?.users?.full_name || candidateName;
      candidatePosition = candidateUser?.position || '';
      candidateFollowerCount = candidateUser?.follower_count || 0;
      candidatePartyName = candidateUser?.party?.name || null;
    } catch {
      // best-effort; fall back to defaults
    }

    // Resolve a human-readable region name for the invited region
    let regionName = 'National';
    try {
      if (pollingStationId) {
        const { data: r } = await (adminClient.from('polling_stations') as any)
          .select('display_name').eq('id', pollingStationId).maybeSingle();
        regionName = r?.display_name || regionName;
      } else if (wardId) {
        const { data: r } = await (adminClient.from('wards') as any)
          .select('name').eq('id', wardId).maybeSingle();
        regionName = r?.name || regionName;
      } else if (constituencyId) {
        const { data: r } = await (adminClient.from('constituencies') as any)
          .select('name').eq('id', constituencyId).maybeSingle();
        regionName = r?.name || regionName;
      } else if (countyId) {
        const { data: r } = await (adminClient.from('counties') as any)
          .select('name').eq('id', countyId).maybeSingle();
        regionName = r?.name || regionName;
      }
    } catch {
      // ignore
    }

    const positionLabel = POSITION_LABELS[candidatePosition] || candidatePosition;

    // ----- In-app notification -----
    if (targetUser?.id) {
      try {
        const positionSuffix = candidatePosition ? ` (${positionLabel})` : '';
        await (adminClient.from('notifications') as any).insert({
          user_id: targetUser.id,
          type: 'agent_invitation',
          title: 'Campaign Agent Invitation',
          body: `${candidateName}${positionSuffix} has invited you to be their campaign agent for ${regionName}. Tap to review and accept.`,
          action_url: inAppPath,
          action_label: 'Review Invitation',
          metadata: {
            agent_id: agent.id,
            candidate_id: candidate.id,
            invitation_token: invitationToken,
            region_type: regionType,
            region_name: regionName,
            invited_by: candidateName,
          },
        });
      } catch (notifError) {
        console.error('Failed to create invitation notification:', notifError);
      }
    }

    // ----- SMS notification (Airtouch) -----
    // Charges are billed to the inviting candidate's wallet, mirroring the
    // bulk SMS flow. If the wallet has insufficient balance (or is frozen),
    // the SMS is skipped — the in-app notification + email still go out
    // and the response surfaces `smsError` so the UI can prompt a top-up.
    let smsSent = false;
    let smsError: string | undefined;
    let smsCost = 0;
    if (invitedPhoneFinal) {
      try {
        const smsBody =
          `myVote: ${candidateName}${positionLabel ? ` (${positionLabel})` : ''} has invited you ` +
          `to be a campaign agent for ${regionName}. ` +
          `Review & accept: ${acceptUrl}`;
        const normalizedTo = normalizePhoneNumber(invitedPhoneFinal);

        // Pull the candidate's SMS sender config to match per-segment cost
        // used everywhere else; default to KES 1.00 if not configured.
        let costPerSMS = 1.0;
        try {
          const { data: senderCfg } = await (adminClient
            .from('sms_sender_configs') as any)
            .select('cost_per_sms')
            .eq('user_id', userId)
            .maybeSingle();
          if (senderCfg?.cost_per_sms) costPerSMS = Number(senderCfg.cost_per_sms);
        } catch {
          // ignore — fall back to default cost
        }

        const segments = getSMSSegments(smsBody).segments;
        smsCost = calculateSMSCost(segments, costPerSMS);

        // Resolve / create the candidate user's wallet and pre-check balance.
        const wallet = (await getOrCreateWallet(userId)) as {
          id: string;
          balance: number;
          is_frozen: boolean;
        };

        if (wallet.is_frozen) {
          smsError = 'Wallet is frozen — SMS not sent';
        } else if ((wallet.balance ?? 0) < smsCost) {
          smsError = `Insufficient wallet balance for SMS (need KES ${smsCost.toFixed(2)}, have KES ${(wallet.balance || 0).toFixed(2)})`;
        } else {
          const smsRes = await sendSMS({ to: normalizedTo, message: smsBody });
          if (smsRes.success) {
            // Only debit on a confirmed send so failed dispatches don't
            // burn the candidate's balance.
            try {
              await debitWallet({
                walletId: wallet.id,
                type: 'sms_charge',
                amount: smsCost,
                description: `Agent invitation SMS to ${invitedName}`,
                reference: agent.id,
                metadata: {
                  source: 'agent_invitation_sms',
                  agent_id: agent.id,
                  candidate_id: candidate.id,
                  invited_name: invitedName,
                  invited_phone: normalizedTo,
                  segments,
                  cost_per_sms: costPerSMS,
                },
              });
              smsSent = true;
            } catch (chargeErr: any) {
              // SMS went out but billing failed — log loudly so admins can
              // reconcile, but still mark as sent for the recipient view.
              console.error('Agent invitation SMS wallet debit failed:', chargeErr);
              smsSent = true;
              smsError = `SMS sent but wallet debit failed: ${chargeErr?.message || 'unknown error'}`;
            }
          } else {
            smsError = smsRes.error;
          }
        }
      } catch (e) {
        smsError = e instanceof Error ? e.message : 'SMS dispatch failed';
        console.error('Agent invitation SMS error:', e);
      }
    }

    // ----- Email notification (Resend) -----
    let emailSent = false;
    let emailError: string | undefined;
    const recipientEmail = targetUser?.email;
    if (recipientEmail && isValidEmail(recipientEmail)) {
      try {
        const html = generateAgentInvitationEmailHTML({
          invitedName,
          candidateName,
          position: candidatePosition,
          regionType,
          regionName,
          acceptUrl,
          partyName: candidatePartyName,
          followerCount: candidateFollowerCount,
        });
        const emailRes = await sendEmail({
          to: recipientEmail,
          subject: `You're invited to be ${candidateName}'s campaign agent`,
          html,
        });
        emailSent = !!emailRes.success;
        if (!emailRes.success) emailError = emailRes.error;
      } catch (e) {
        emailError = e instanceof Error ? e.message : 'Email dispatch failed';
        console.error('Agent invitation email error:', e);
      }
    }

    const channels = [
      targetUser?.id ? 'in-app' : null,
      smsSent ? 'SMS' : null,
      emailSent ? 'email' : null,
    ].filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      agent,
      invitationToken,
      acceptUrl,
      userExists: !!targetUser,
      notified: !!targetUser?.id,
      smsSent,
      smsError,
      smsCost,
      emailSent,
      emailError,
      channels,
      message:
        channels.length > 0
          ? `Invitation sent to ${invitedName} via ${channels.join(', ')}.`
          : `Invitation created. Share this link: ${acceptUrl}`,
    });
  } catch (error) {
    console.error('Agents POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
