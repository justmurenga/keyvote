import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const constituencyId = searchParams.get('constituency_id');

    if (!constituencyId) {
      return NextResponse.json(
        { error: 'constituency_id query parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('wards')
      .select('id, code, name, constituency_id, registered_voters')
      .eq('constituency_id', constituencyId)
      .order('name');

    const { data: wards, error } = await query;

    if (error) {
      console.error('Wards fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch wards' }, { status: 500 });
    }

    return NextResponse.json({ wards: wards || [] });
  } catch (error) {
    console.error('Wards API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
