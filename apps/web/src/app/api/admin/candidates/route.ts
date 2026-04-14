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
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.CANDIDATES_EDIT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const position = searchParams.get('position') || '';
    const verification = searchParams.get('verification') || '';
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('candidates')
      .select(`
        *,
        user:users!candidates_user_id_fkey(full_name, phone, email, profile_photo_url),
        party:political_parties(id, name, abbreviation),
        county:counties(name),
        constituency:constituencies(name),
        ward:wards(name)
      `, { count: 'exact' });

    if (search) {
      // Search in related user's name or phone
      const { data: userIds } = await adminClient
        .from('users')
        .select('id')
        .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds.map((u: any) => u.id));
      } else {
        return NextResponse.json({ candidates: [], total: 0, totalPages: 0, page });
      }
    }

    if (position) query = query.eq('position', position);
    if (verification === 'verified') query = query.eq('is_verified', true);
    if (verification === 'unverified') query = query.eq('is_verified', false);
    if (verification === 'active') query = query.eq('is_active', true);
    if (verification === 'inactive') query = query.eq('is_active', false);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Candidates fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }

    return NextResponse.json({
      candidates: data || [],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      page,
    });
  } catch (error) {
    console.error('Admin candidates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
