import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { 
  hasPermission, 
  PERMISSIONS, 
  ROLES, 
  getAvailableRolesForAssignment,
  canChangeRole,
  type Role 
} from '@/lib/auth/permissions';

// GET - List all users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_VIEW)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let query = supabase
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
        created_at,
        last_login
      `, { count: 'exact' });

    // Search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Role filter
    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    // Status filter
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    } else if (status === 'verified') {
      query = query.eq('is_verified', true);
    } else if (status === 'unverified') {
      query = query.eq('is_verified', false);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Users fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get role counts
    const roleCountsResult = await supabase
      .from('users')
      .select('role');
    
    const roleCounts: Record<string, number> = {};
    (roleCountsResult.data as any[] || []).forEach((u: any) => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      roleCounts,
      availableRoles: getAvailableRolesForAssignment(currentUser.role as Role),
    });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser || !hasPermission(currentUser.role as Role, PERMISSIONS.USERS_CREATE)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { phone, full_name, email, role, county_id, constituency_id, ward_id } = body;

    if (!phone || !full_name) {
      return NextResponse.json(
        { error: 'Phone and full name are required' },
        { status: 400 }
      );
    }

    // Check if user can assign this role
    if (role && !canChangeRole(currentUser.role as Role, role as Role)) {
      return NextResponse.json(
        { error: 'You cannot assign this role' },
        { status: 403 }
      );
    }

    // Check if phone already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create user
    const { data: user, error } = await (supabase as any)
      .from('users')
      .insert({
        phone,
        full_name,
        email,
        role: role || ROLES.VOTER,
        county_id,
        constituency_id,
        ward_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('User creation error:', error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({ user, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
