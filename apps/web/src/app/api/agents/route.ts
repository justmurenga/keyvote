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
            users:user_id (id, full_name, phone_number, profile_photo_url),
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
      console.error('Error fetching agents:', error);
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
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
      phone,
      name,
      regionType,
      pollingStationId,
      wardId,
      constituencyId,
      countyId,
      mpesaNumber,
    } = body;

    // Validate required fields
    if (!phone || !name) {
      return NextResponse.json({ error: 'Phone number and name are required' }, { status: 400 });
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

    // Normalize phone number
    let normalizedPhone = phone;
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+254' + normalizedPhone.slice(1);
    }

    // Check for existing agent
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single();

    if (existingUser) {
      const { data: existingAgent } = await adminClient
        .from('agents')
        .select('id, status')
        .eq('user_id', existingUser.id)
        .eq('candidate_id', candidate.id)
        .in('status', ['pending', 'active'])
        .single();

      if (existingAgent) {
        return NextResponse.json({
          error: `This person already has a ${existingAgent.status} agent relationship with you`,
        }, { status: 409 });
      }
    }

    // Create the agent invitation
    const invitationToken = crypto.randomUUID();

    const { data: agent, error: insertError } = await (adminClient
      .from('agents') as any)
      .insert({
        user_id: existingUser?.id || '00000000-0000-0000-0000-000000000000',
        candidate_id: candidate.id,
        assigned_region_type: regionType,
        assigned_polling_station_id: pollingStationId || null,
        assigned_ward_id: wardId || null,
        assigned_constituency_id: constituencyId || null,
        assigned_county_id: countyId || null,
        mpesa_number: mpesaNumber || normalizedPhone,
        status: 'pending',
        invitation_token: invitationToken,
        invited_phone: normalizedPhone,
        invited_name: name,
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

    return NextResponse.json({
      success: true,
      agent,
      invitationToken,
      acceptUrl,
      userExists: !!existingUser,
      message: `Agent invitation created. Share this link: ${acceptUrl}`,
    });
  } catch (error) {
    console.error('Agents POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
