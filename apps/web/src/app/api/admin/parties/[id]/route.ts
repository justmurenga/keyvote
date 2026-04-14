import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.PARTIES_EDIT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const adminClient = createAdminClient();

    const updates: any = {};
    if (body.name) updates.name = body.name;
    if (body.abbreviation) updates.abbreviation = body.abbreviation;
    if (body.registration_number !== undefined) updates.registration_number = body.registration_number || null;
    if (body.leader_name !== undefined) updates.leader_name = body.leader_name || null;
    if (body.primary_color) updates.primary_color = body.primary_color;

    const { data, error } = await (adminClient.from('political_parties') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Party update error:', error);
      return NextResponse.json({ error: 'Failed to update party' }, { status: 500 });
    }

    return NextResponse.json({ party: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.PARTIES_EDIT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const adminClient = createAdminClient();

    const updates: any = {};
    if (typeof body.is_verified === 'boolean') updates.is_verified = body.is_verified;
    if (body.verification_status) updates.verification_status = body.verification_status;

    const { data, error } = await (adminClient.from('political_parties') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update party' }, { status: 500 });

    return NextResponse.json({ party: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.PARTIES_DELETE)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const adminClient = createAdminClient();

    // Check if party has candidates
    const { count } = await (adminClient.from('candidates') as any)
      .select('*', { count: 'exact', head: true })
      .eq('party_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete party with active candidates. Remove candidates first.' },
        { status: 400 }
      );
    }

    const { error } = await (adminClient.from('political_parties') as any)
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
