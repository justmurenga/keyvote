/**
 * GET /api/agents/me
 *
 * Returns the active agent record(s) for the current user, including the
 * candidate they are agenting for. Used by the agent dashboard banner.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth/get-user';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('agents')
      .select(`
        id, candidate_id, status, region_type, region_id, created_at,
        candidate:candidates!agents_candidate_id_fkey (
          id,
          position,
          is_verified,
          user:users!candidates_user_id_fkey (full_name, profile_photo_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[agents/me] error:', error);
      return NextResponse.json({ error: 'Failed to load agent records' }, { status: 500 });
    }

    const agents = (data || []) as Array<any>;
    const primary = agents.find((a) => a.status === 'active') || agents[0] || null;

    return NextResponse.json({
      agent: primary,
      agents,
    });
  } catch (error) {
    console.error('[agents/me] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
