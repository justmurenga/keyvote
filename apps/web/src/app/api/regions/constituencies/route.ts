import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const countyId = searchParams.get('county_id');

    let query = supabase
      .from('constituencies')
      .select('id, code, name, county_id, registered_voters')
      .order('name');

    if (countyId) {
      query = query.eq('county_id', countyId);
    }

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
