import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/regions - Get regions for cascading dropdowns
 * Used by the RegionSelector component
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search');

    const adminClient = createAdminClient();

    if (type === 'counties') {
      let query = adminClient
        .from('counties')
        .select('id, name, code')
        .order('name');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'Failed to fetch counties' }, { status: 500 });
      return NextResponse.json({ success: true, regions: data || [] });
    }

    if (type === 'constituencies') {
      let query = adminClient
        .from('constituencies')
        .select('id, name, code, county_id')
        .order('name');

      if (parentId) query = query.eq('county_id', parentId);
      if (search) query = query.ilike('name', `%${search}%`);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'Failed to fetch constituencies' }, { status: 500 });
      return NextResponse.json({ success: true, regions: data || [] });
    }

    if (type === 'wards') {
      let query = adminClient
        .from('wards')
        .select('id, name, code, constituency_id')
        .order('name');

      if (parentId) query = query.eq('constituency_id', parentId);
      if (search) query = query.ilike('name', `%${search}%`);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'Failed to fetch wards' }, { status: 500 });
      return NextResponse.json({ success: true, regions: data || [] });
    }

    if (type === 'polling_stations') {
      let query = adminClient
        .from('polling_stations')
        .select('id, display_name, code, ward_id')
        .order('display_name');

      if (parentId) query = query.eq('ward_id', parentId);
      if (search) query = query.ilike('display_name', `%${search}%`);

      // Limit polling stations since there can be many
      query = query.limit(100);

      const { data, error } = await query;
      if (error) return NextResponse.json({ error: 'Failed to fetch polling stations' }, { status: 500 });
      return NextResponse.json({ success: true, regions: data || [] });
    }

    return NextResponse.json({ error: 'Invalid region type' }, { status: 400 });
  } catch (error) {
    console.error('Regions GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
