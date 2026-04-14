import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const wardId = searchParams.get('ward_id');

    if (!wardId) {
      return NextResponse.json(
        { error: 'ward_id query parameter is required' },
        { status: 400 }
      );
    }

    const { data: pollingStations, error } = await supabase
      .from('polling_stations')
      .select('id, code, name, stream, display_name, reg_centre_code, reg_centre_name, registered_voters')
      .eq('ward_id', wardId)
      .order('display_name');

    if (error) {
      console.error('Polling stations fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch polling stations' }, { status: 500 });
    }

    return NextResponse.json({ polling_stations: pollingStations || [] });
  } catch (error) {
    console.error('Polling stations API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
