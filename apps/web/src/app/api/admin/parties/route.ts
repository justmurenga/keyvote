import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.PARTIES_EDIT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    let query = (adminClient.from('political_parties') as any).select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,abbreviation.ilike.%${search}%`);
    }
    if (status === 'verified') query = query.eq('is_verified', true);
    if (status === 'pending') query = query.eq('verification_status', 'pending');
    if (status === 'rejected') query = query.eq('verification_status', 'rejected');

    const { data, count, error } = await query
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Parties fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 });
    }

    // Get member/candidate counts per party
    const partiesWithCounts = await Promise.all(
      (data || []).map(async (party: any) => {
        const [memberResult, candidateResult] = await Promise.all([
          (adminClient.from('party_members') as any).select('*', { count: 'exact', head: true }).eq('party_id', party.id),
          (adminClient.from('candidates') as any).select('*', { count: 'exact', head: true }).eq('party_id', party.id),
        ]);
        return {
          ...party,
          member_count: memberResult.count || 0,
          candidate_count: candidateResult.count || 0,
        };
      })
    );

    return NextResponse.json({
      parties: partiesWithCounts,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
    });
  } catch (error) {
    console.error('Admin parties error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.PARTIES_CREATE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, abbreviation, registration_number, leader_name, primary_color } = body;

    if (!name || !abbreviation) {
      return NextResponse.json({ error: 'Name and abbreviation are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await (adminClient.from('political_parties') as any)
      .insert({
        name,
        abbreviation,
        registration_number: registration_number || null,
        leader_name: leader_name || null,
        primary_color: primary_color || null,
        verification_status: 'pending',
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Party creation error:', error);
      return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
    }

    return NextResponse.json({ party: data }, { status: 201 });
  } catch (error) {
    console.error('Admin party creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
