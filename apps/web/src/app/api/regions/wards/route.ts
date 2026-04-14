import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const constituencyId = searchParams.get('constituency_id');

    let query = supabase
      .from('wards')
      .select('id, code, name, constituency_id, registered_voters')
      .order('name');

    if (constituencyId) {
      query = query.eq('constituency_id', constituencyId);
    }

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
