import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

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

    // Build the acceptance URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || '';
    const acceptUrl = `${baseUrl}/agents/accept/${invitationToken}`;

    // ----- In-app notification -----
    // If we have a registered target user, push a notification so the
    // mobile / web app can alert them in real-time.
    if (targetUser?.id) {
      try {
        // Look up the inviting candidate's display name for a friendlier message
        const { data: candidateUser } = await (adminClient
          .from('candidates') as any)
          .select('position, users:user_id (full_name)')
          .eq('id', candidate.id)
          .single();

        const candidateName = candidateUser?.users?.full_name || 'A candidate';
        const position = candidateUser?.position ? ` (${candidateUser.position})` : '';

        await (adminClient.from('notifications') as any).insert({
          user_id: targetUser.id,
          type: 'agent_invitation',
          title: 'Campaign Agent Invitation',
          body: `${candidateName}${position} has invited you to be their campaign agent. Tap to review and accept.`,
          action_url: `/agents/accept/${invitationToken}`,
          action_label: 'Review Invitation',
          metadata: {
            agent_id: agent.id,
            candidate_id: candidate.id,
            invitation_token: invitationToken,
            region_type: regionType,
            invited_by: candidateName,
          },
        });
      } catch (notifError) {
        // Notification failure should not break the invite flow
        console.error('Failed to create invitation notification:', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      agent,
      invitationToken,
      acceptUrl,
      userExists: !!targetUser,
      notified: !!targetUser?.id,
      message: targetUser
        ? `Invitation sent to ${invitedName}. They will be alerted in-app.`
        : `Invitation created. Share this link: ${acceptUrl}`,
    });
  } catch (error) {
    console.error('Agents POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
