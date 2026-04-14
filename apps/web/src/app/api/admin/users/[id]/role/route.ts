import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { 
  hasPermission, 
  PERMISSIONS, 
  canChangeRole,
  getAvailableRolesForAssignment,
  type Role 
} from '@/lib/auth/permissions';

// PUT - Change user role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_CHANGE_ROLE)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role: newRole } = body;

    if (!newRole) {
      return NextResponse.json({ error: 'New role is required' }, { status: 400 });
    }

    // Get target user
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role, full_name')
      .eq('id', id)
      .single() as { data: { id: string; role: string; full_name: string } | null; error: any };

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if can assign this role
    if (!canChangeRole(currentUser.role as Role, newRole as Role)) {
      return NextResponse.json(
        { error: `You cannot assign the ${newRole} role` },
        { status: 403 }
      );
    }

    // Prevent self-demotion for last admin
    if (id === currentUser.id) {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .in('role', ['admin', 'system_admin']);
      
      if ((count || 0) <= 1 && !['admin', 'system_admin'].includes(newRole)) {
        return NextResponse.json(
          { error: 'Cannot demote the last administrator' },
          { status: 400 }
        );
      }
    }

    // Update the role
    const { data: user, error } = await (supabase as any)
      .from('users')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Role change error:', error);
      return NextResponse.json({ error: 'Failed to change role' }, { status: 500 });
    }

    return NextResponse.json({ 
      user, 
      message: `${targetUser.full_name}'s role changed to ${newRole}`,
      previousRole: targetUser.role,
      newRole
    });
  } catch (error) {
    console.error('Change role API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// GET - Get available roles for assignment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_CHANGE_ROLE)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    // Get target user
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role, full_name')
      .eq('id', id)
      .single() as { data: { id: string; role: string; full_name: string } | null; error: any };

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const availableRoles = getAvailableRolesForAssignment(currentUser.role as Role);

    return NextResponse.json({
      currentRole: targetUser.role,
      availableRoles,
      canChangeRole: hasPermission(currentUser.role as Role, PERMISSIONS.USERS_CHANGE_ROLE),
    });
  } catch (error) {
    console.error('Get available roles error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
