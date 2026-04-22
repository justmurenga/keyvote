import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';
import { resolveRegionScope, agentRegionOrClause, userRegionOrClause } from '@/lib/regions/scope';

const ADMIN_ROLES = ['admin', 'system_admin'];

// GET /api/messages/users
//   q?            - free-text search on name/phone/email
//   role?         - role filter (admin only)
//   countyId?     - region filter
//   constituencyId?
//   wardId?
//   pollingStationId?
//   limit?        - default 20, max 100
//
// Returns users that the current user is allowed to start a conversation with.
//   - Candidates can message their own active agents (filtered by agent assignment region).
//   - Agents can message the candidate they work for.
//   - Admins can message any user (filtered by user's home region).
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const roleFilter = (searchParams.get('role') || '').trim();
    const countyId = searchParams.get('countyId') || '';
    const constituencyId = searchParams.get('constituencyId') || '';
    const wardId = searchParams.get('wardId') || '';
    const pollingStationId = searchParams.get('pollingStationId') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const supabase = createAdminClient();

    // Resolve region filter into a full scope of descendant IDs.
    const regionScope = await resolveRegionScope(supabase, {
      countyId, constituencyId, wardId, pollingStationId,
    });

    // ---------- Admin: search any user ----------
    if (ADMIN_ROLES.includes(user.role)) {
      let query = supabase
        .from('users')
        .select('id, full_name, phone, role, county_id, constituency_id, ward_id, polling_station_id, avatar_url:profile_photo_url')
        .neq('id', user.id)
        .order('full_name', { ascending: true })
        .limit(limit);

      if (roleFilter) query = query.eq('role', roleFilter);
      if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
      const userOr = userRegionOrClause(regionScope);
      if (userOr) query = query.or(userOr);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ users: data || [] });
    }

    // ---------- Candidate: list own active agents (with assignment region) ----------
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (candidate?.id) {
      let agentQuery = supabase
        .from('agents')
        .select(`
          id,
          assigned_county_id,
          assigned_constituency_id,
          assigned_ward_id,
          assigned_polling_station_id,
          users!inner(id, full_name, phone, role, avatar_url:profile_photo_url)
        `)
        .eq('candidate_id', candidate.id)
        .eq('status', 'active')
        .limit(limit);

      const agentOr = agentRegionOrClause(regionScope);
      if (agentOr) agentQuery = agentQuery.or(agentOr);

      const { data, error } = await agentQuery;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const users = (data || [])
        .map((a: any) => ({
          ...a.users,
          assigned_county_id: a.assigned_county_id,
          assigned_constituency_id: a.assigned_constituency_id,
          assigned_ward_id: a.assigned_ward_id,
          assigned_polling_station_id: a.assigned_polling_station_id,
        }))
        .filter((u: any) => !q || u.full_name?.toLowerCase().includes(q.toLowerCase()));
      return NextResponse.json({ users });
    }

    // ---------- Agent: get the candidate they work for ----------
    const { data: agent } = await supabase
      .from('agents')
      .select('candidate_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (agent?.candidate_id) {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, users!inner(id, full_name, phone, role, avatar_url:profile_photo_url)')
        .eq('id', agent.candidate_id)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const u = (data as any)?.users;
      return NextResponse.json({ users: u ? [u] : [] });
    }

    return NextResponse.json({ users: [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 });
  }
}
