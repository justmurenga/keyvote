import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: counties, error } = await supabase
      .from('counties')
      .select('id, code, name, registered_voters')
      .order('name');

    if (error) {
      console.error('Counties fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch counties' }, { status: 500 });
    }

    return NextResponse.json({ counties: counties || [] });
  } catch (error) {
    console.error('Counties API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
