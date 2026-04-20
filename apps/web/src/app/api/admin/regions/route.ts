import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'system_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || 'counties';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const countyId = searchParams.get('county_id') || '';
    const constituencyId = searchParams.get('constituency_id') || '';
    const wardId = searchParams.get('ward_id') || '';
    const offset = (page - 1) * limit;

    let data: any[] = [];
    let count = 0;

    switch (level) {
      case 'counties': {
        let query = (adminClient.from('counties') as any).select('*', { count: 'exact' });
        if (search) query = query.ilike('name', `%${search}%`);
        const result = await query.order('name').range(offset, offset + limit - 1);
        data = result.data || [];
        count = result.count || 0;
        break;
      }
      case 'constituencies': {
        let query = (adminClient.from('constituencies') as any).select('*, county:counties(name)', { count: 'exact' });
        if (search) query = query.ilike('name', `%${search}%`);
        if (countyId) query = query.eq('county_id', countyId);
        const result = await query.order('name').range(offset, offset + limit - 1);
        data = result.data || [];
        count = result.count || 0;
        break;
      }
      case 'wards': {
        let query = (adminClient.from('wards') as any).select('*, constituency:constituencies(name, county:counties(name))', { count: 'exact' });
        if (search) query = query.ilike('name', `%${search}%`);
        if (constituencyId) query = query.eq('constituency_id', constituencyId);
        if (countyId) {
          const { data: constIds } = await (adminClient.from('constituencies') as any).select('id').eq('county_id', countyId);
          if (constIds && constIds.length > 0) {
            query = query.in('constituency_id', constIds.map((c: any) => c.id));
          }
        }
        const result = await query.order('name').range(offset, offset + limit - 1);
        data = result.data || [];
        count = result.count || 0;
        break;
      }
      case 'polling_stations': {
        let query = (adminClient.from('polling_stations') as any).select('*, ward:wards(name, constituency:constituencies(name, county:counties(name)))', { count: 'exact' });
        if (search) query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%,code.ilike.%${search}%`);
        if (wardId) query = query.eq('ward_id', wardId);
        if (constituencyId) {
          const { data: wardIds } = await (adminClient.from('wards') as any).select('id').eq('constituency_id', constituencyId);
          if (wardIds && wardIds.length > 0) {
            query = query.in('ward_id', wardIds.map((w: any) => w.id));
          }
        }
        const result = await query.order('display_name').range(offset, offset + limit - 1);
        data = result.data || [];
        count = result.count || 0;
        break;
      }
    }

    // Get overall stats
    const [countiesCount, constCount, wardsCount, psCount] = await Promise.all([
      (adminClient.from('counties') as any).select('*', { count: 'exact', head: true }),
      (adminClient.from('constituencies') as any).select('*', { count: 'exact', head: true }),
      (adminClient.from('wards') as any).select('*', { count: 'exact', head: true }),
      (adminClient.from('polling_stations') as any).select('*', { count: 'exact', head: true }),
    ]);

    // Get total voters from national view
    let totalVoters = 0;
    try {
      const { data: nationalStats } = await (adminClient as any).from('mv_national_voter_stats').select('total_registered_voters').single();
      totalVoters = nationalStats?.total_registered_voters || 0;
    } catch {
      // Materialized view may not exist
    }

    return NextResponse.json({
      regions: data,
      total: count,
      totalPages: Math.ceil(count / limit),
      page,
      stats: {
        counties: countiesCount.count || 0,
        constituencies: constCount.count || 0,
        wards: wardsCount.count || 0,
        pollingStations: psCount.count || 0,
        totalVoters,
      },
    });
  } catch (error) {
    console.error('Admin regions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
