import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import type { UserRole } from '@myvote/database';
import { 
  hasPermission, 
  PERMISSIONS, 
  canChangeRole,
  type Role 
} from '@/lib/auth/permissions';

// GET - Get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_VIEW)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        phone,
        full_name,
        email,
        id_number,
        role,
        gender,
        age_bracket,
        is_verified,
        is_active,
        profile_photo_url,
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name),
        polling_station:polling_stations(id, name, code),
        created_at,
        last_login,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('User fetch error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
    }

    // Get user activity stats
    const [pollVotesResult, candidateResult, agentResult] = await Promise.all([
      supabase.from('poll_votes').select('id', { count: 'exact' }).eq('user_id', id),
      supabase.from('candidates').select('id, position, status').eq('user_id', id).single(),
      supabase.from('agents').select('id, agent_type, status').eq('user_id', id).single(),
    ]);

    return NextResponse.json({
      user,
      stats: {
        pollVotes: pollVotesResult.count || 0,
        isCandidate: !!candidateResult.data,
        candidateInfo: candidateResult.data,
        isAgent: !!agentResult.data,
        agentInfo: agentResult.data,
      },
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_EDIT)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      full_name, 
      email, 
      role, 
      is_active,
      county_id, 
      constituency_id, 
      ward_id,
      is_verified,
      gender,
      age_bracket,
      id_number,
      bio
    } = body;

    // Get target user's current role
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single() as { data: { role: string } | null; error: any };

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check role change permissions
    if (role && role !== targetUser.role) {
      if (!hasPermission(currentUser.role as Role, PERMISSIONS.USERS_CHANGE_ROLE)) {
        return NextResponse.json(
          { error: 'You do not have permission to change roles' },
          { status: 403 }
        );
      }
      if (!canChangeRole(currentUser.role as Role, role as Role)) {
        return NextResponse.json(
          { error: 'You cannot assign this role' },
          { status: 403 }
        );
      }
    }

    // Prevent self-demotion for last admin
    if (id === currentUser.id && role && role !== currentUser.role) {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .in('role', ['party_admin', 'system_admin'] as UserRole[]);
      
      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (county_id !== undefined) updateData.county_id = county_id;
    if (constituency_id !== undefined) updateData.constituency_id = constituency_id;
    if (ward_id !== undefined) updateData.ward_id = ward_id;
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (gender !== undefined) updateData.gender = gender;
    if (age_bracket !== undefined) updateData.age_bracket = age_bracket;
    if (id_number !== undefined) updateData.id_number = id_number;
    if (bio !== undefined) updateData.bio = bio;

    const { data: user, error } = await (supabase as any)
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('User update error:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ user, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE - Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_DELETE)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Check if this is the last admin
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single() as { data: { role: string } | null };

    if (targetUser && (targetUser.role === 'party_admin' || targetUser.role === 'system_admin')) {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .in('role', ['party_admin', 'system_admin'] as UserRole[])
        .eq('is_active', true);
      
      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last admin' },
          { status: 400 }
        );
      }
    }

    // Soft delete - just deactivate
    const { error } = await (supabase as any)
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('User deactivation error:', error);
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
