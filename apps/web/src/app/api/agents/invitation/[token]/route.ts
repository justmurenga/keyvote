import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/agents/invitation/[token] - Get invitation details (public, no auth required)
 * Used to display invitation info before the user accepts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const adminClient = createAdminClient();

    const { data: agent, error } = await adminClient
      .from('agents')
      .select(`
        id,
        status,
        invited_name,
        invited_phone,
        assigned_region_type,
        invited_at,
        candidates:candidate_id (
          id,
          position,
          users:user_id (full_name, profile_photo_url)
        ),
        assigned_polling_station:assigned_polling_station_id (display_name),
        assigned_ward:assigned_ward_id (name),
        assigned_constituency:assigned_constituency_id (name),
        assigned_county:assigned_county_id (name)
      `)
      .eq('invitation_token', token)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    if (agent.status !== 'pending') {
      return NextResponse.json({
        error: `This invitation has already been ${agent.status}`,
        status: agent.status,
      }, { status: 400 });
    }

    // Build region name
    const regionName =
      (agent.assigned_polling_station as any)?.display_name ||
      (agent.assigned_ward as any)?.name ||
      (agent.assigned_constituency as any)?.name ||
      (agent.assigned_county as any)?.name ||
      'National';

    return NextResponse.json({
      success: true,
      invitation: {
        id: agent.id,
        invitedName: agent.invited_name,
        invitedPhone: agent.invited_phone,
        regionType: agent.assigned_region_type,
        regionName,
        invitedAt: agent.invited_at,
        candidate: agent.candidates,
      },
    });
  } catch (error) {
    console.error('Invitation GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
