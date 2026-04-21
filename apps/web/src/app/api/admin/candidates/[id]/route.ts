import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.CANDIDATES_EDIT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const adminClient = createAdminClient();

    const updates: any = {};
    if (typeof body.is_verified === 'boolean') updates.is_verified = body.is_verified;
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await (adminClient
      .from('candidates') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Candidate update error:', error);
      return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
    }

    return NextResponse.json({ candidate: data });
  } catch (error) {
    console.error('Admin candidate update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('candidates')
      .select(`
        *,
        user:users!candidates_user_id_fkey(full_name, phone, email, profile_photo_url, bio, gender, age_bracket, created_at),
        party:political_parties(id, name, abbreviation, symbol_url, primary_color, secondary_color),
        county:counties(name),
        constituency:constituencies(name),
        ward:wards(name)
      `)
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    return NextResponse.json({ candidate: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
