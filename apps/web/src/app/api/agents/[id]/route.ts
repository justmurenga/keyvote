import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

/**
 * GET /api/agents/[id] - Get a specific agent's details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: agent, error } = await adminClient
      .from('agents')
      .select(`
        *,
        users:user_id (id, full_name, phone_number, profile_photo_url, email),
        candidates:candidate_id (id, position, users:user_id (full_name)),
        assigned_polling_station:assigned_polling_station_id (id, display_name, code),
        assigned_ward:assigned_ward_id (id, name, code),
        assigned_constituency:assigned_constituency_id (id, name, code),
        assigned_county:assigned_county_id (id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify access: must be the candidate owner, the agent themselves, or system admin
    const { data: user } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const isOwner = await adminClient
      .from('candidates')
      .select('id')
      .eq('id', agent.candidate_id)
      .eq('user_id', userId)
      .single();

    const isAgent = agent.user_id === userId;
    const isAdmin = user?.role === 'system_admin';

    if (!isOwner.data && !isAgent && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Agent GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * PATCH /api/agents/[id] - Update an agent
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const adminClient = createAdminClient();

    // Verify ownership
    const { data: agent } = await adminClient
      .from('agents')
      .select('id, candidate_id')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id')
      .eq('id', agent.candidate_id)
      .eq('user_id', userId)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update object - only allow specific fields
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.regionType) {
      updateData.assigned_region_type = body.regionType;
      // Reset all region IDs then set the correct one
      updateData.assigned_polling_station_id = null;
      updateData.assigned_ward_id = null;
      updateData.assigned_constituency_id = null;
      updateData.assigned_county_id = null;

      if (body.regionType === 'polling_station') updateData.assigned_polling_station_id = body.pollingStationId;
      if (body.regionType === 'ward') updateData.assigned_ward_id = body.wardId;
      if (body.regionType === 'constituency') updateData.assigned_constituency_id = body.constituencyId;
      if (body.regionType === 'county') updateData.assigned_county_id = body.countyId;
    }

    if (body.mpesaNumber) updateData.mpesa_number = body.mpesaNumber;
    if (body.status && ['active', 'suspended'].includes(body.status)) {
      updateData.status = body.status;
    }

    const { data: updated, error } = await adminClient
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    return NextResponse.json({ success: true, agent: updated });
  } catch (error) {
    console.error('Agent PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/[id] - Delete an agent record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: agent } = await adminClient
      .from('agents')
      .select('id, candidate_id, status')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const { data: candidate } = await adminClient
      .from('candidates')
      .select('id')
      .eq('id', agent.candidate_id)
      .eq('user_id', userId)
      .single();

    if (!candidate) {
      // Check system admin
      const { data: user } = await adminClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (user?.role !== 'system_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const { error } = await adminClient
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Agent deleted' });
  } catch (error) {
    console.error('Agent DELETE error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
