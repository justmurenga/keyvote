import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const countyId = searchParams.get('county_id');

    if (!countyId) {
      return NextResponse.json(
        { error: 'county_id query parameter is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('constituencies')
      .select('id, code, name, county_id, registered_voters')
      .eq('county_id', countyId)
      .order('name');

    const { data: constituencies, error } = await query;

    if (error) {
      console.error('Constituencies fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch constituencies' }, { status: 500 });
    }

    return NextResponse.json({ constituencies: constituencies || [] });
  } catch (error) {
    console.error('Constituencies API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
