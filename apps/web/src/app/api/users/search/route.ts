import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by name or phone number
    // Exclude the current user from results
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, phone_number, role')
      .neq('id', user.id)
      .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('User search error:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: users || [],
    });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
