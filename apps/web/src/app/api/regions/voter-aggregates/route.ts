import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

interface VoterAggregate {
  level: string;
  region_id: string | null;
  region_name: string;
  registered_voters: number;
  polling_station_count: number;
  sub_region_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    // Get current user (Supabase auth or custom OTP session)
    const { data: { user } } = await supabase.auth.getUser();
    
    let currentUserId: string | null = user?.id ?? null;

    // Fallback to custom session cookie (OTP login)
    if (!currentUserId) {
      const sessionCookie = cookieStore.get('myvote-session')?.value;
      if (sessionCookie) {
        try {
          const session = JSON.parse(sessionCookie);
          if (session.expiresAt > Date.now()) {
            currentUserId = session.userId;
          }
        } catch {
          // Invalid session cookie
        }
      }
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use supabase as any to bypass strict typing for custom RPC/views
    const db = supabase as any;

    // Try RPC first (uses materialized views, very fast)
    const { data: aggregates, error } = await db
      .rpc('get_user_voter_aggregates', { p_user_id: currentUserId }) as {
        data: VoterAggregate[] | null;
        error: any;
      };

    if (!error && aggregates && aggregates.length > 0) {
      return NextResponse.json({ aggregates });
    }

    // Fallback: build aggregates manually from base tables
    if (error) {
      console.error('Voter aggregates RPC error:', error);
    }

    const { data: userData } = await db
      .from('users')
      .select('polling_station_id, ward_id, constituency_id, county_id')
      .eq('id', currentUserId)
      .single();

    if (!userData || !userData.polling_station_id) {
      return NextResponse.json({ 
        aggregates: [],
        message: 'No polling station assigned. Please update your profile.' 
      });
    }

    const manualAggregates: VoterAggregate[] = [];

    // Polling station
    const { data: ps } = await db
      .from('polling_stations')
      .select('id, display_name, registered_voters')
      .eq('id', userData.polling_station_id)
      .single();
    if (ps) {
      manualAggregates.push({
        level: 'polling_station',
        region_id: ps.id,
        region_name: ps.display_name,
        registered_voters: ps.registered_voters || 0,
        polling_station_count: 1,
        sub_region_count: 0,
      });
    }

    // Ward
    if (userData.ward_id) {
      const { data: ward } = await db
        .from('wards')
        .select('id, name, registered_voters')
        .eq('id', userData.ward_id)
        .single();
      const { count: psCount } = await db
        .from('polling_stations')
        .select('*', { count: 'exact', head: true })
        .eq('ward_id', userData.ward_id);
      if (ward) {
        manualAggregates.push({
          level: 'ward',
          region_id: ward.id,
          region_name: ward.name,
          registered_voters: ward.registered_voters || 0,
          polling_station_count: psCount || 0,
          sub_region_count: psCount || 0,
        });
      }
    }

    // Constituency
    if (userData.constituency_id) {
      const { data: constituency } = await db
        .from('constituencies')
        .select('id, name, registered_voters')
        .eq('id', userData.constituency_id)
        .single();
      const { count: wardCount } = await db
        .from('wards')
        .select('*', { count: 'exact', head: true })
        .eq('constituency_id', userData.constituency_id);
      if (constituency) {
        manualAggregates.push({
          level: 'constituency',
          region_id: constituency.id,
          region_name: constituency.name,
          registered_voters: constituency.registered_voters || 0,
          polling_station_count: 0,
          sub_region_count: wardCount || 0,
        });
      }
    }

    // County
    if (userData.county_id) {
      const { data: county } = await db
        .from('counties')
        .select('id, name, registered_voters')
        .eq('id', userData.county_id)
        .single();
      const { count: constCount } = await db
        .from('constituencies')
        .select('*', { count: 'exact', head: true })
        .eq('county_id', userData.county_id);
      if (county) {
        manualAggregates.push({
          level: 'county',
          region_id: county.id,
          region_name: county.name,
          registered_voters: county.registered_voters || 0,
          polling_station_count: 0,
          sub_region_count: constCount || 0,
        });
      }
    }

    // National
    const { data: allCounties } = await db
      .from('counties')
      .select('registered_voters');
    if (allCounties && allCounties.length > 0) {
      const nationalTotal = allCounties.reduce(
        (sum: number, c: any) => sum + (c.registered_voters || 0), 0
      );
      manualAggregates.push({
        level: 'national',
        region_id: null,
        region_name: 'Kenya',
        registered_voters: nationalTotal,
        polling_station_count: 0,
        sub_region_count: allCounties.length,
      });
    }

    return NextResponse.json({ aggregates: manualAggregates });
  } catch (error) {
    console.error('Voter aggregates API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}