import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: parties, error } = await supabase
      .from('political_parties')
      .select('id, name, abbreviation')
      .order('name');

    if (error) {
      console.error('Parties fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 });
    }

    return NextResponse.json({ parties: parties || [] });
  } catch (error) {
    console.error('Parties API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
