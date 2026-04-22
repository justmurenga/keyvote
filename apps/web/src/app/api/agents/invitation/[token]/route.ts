import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/agents/invitation/[token] - Get invitation details (public, no auth required)
 * Used to display invitation info before the user accepts.
 *
 * Returns enriched candidate profile (party, photo, follower count, slogan, bio,
 * social links, location) plus region statistics (registered voters,
 * polling station count, sub-region count) so the recipient can make an
 * informed decision.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const adminClient = createAdminClient();

    const { data: agent, error } = await (adminClient
      .from('agents') as any)
      .select(`
        id,
        status,
        invited_name,
        invited_phone,
        assigned_region_type,
        assigned_polling_station_id,
        assigned_ward_id,
        assigned_constituency_id,
        assigned_county_id,
        invited_at,
        candidates:candidate_id (
          id,
          position,
          campaign_slogan,
          manifesto_text,
          follower_count,
          is_verified,
          is_independent,
          facebook_url,
          twitter_url,
          instagram_url,
          tiktok_url,
          users:user_id (full_name, profile_photo_url, bio),
          party:political_parties (id, name, abbreviation, primary_color, symbol_url),
          county:counties (id, name),
          constituency:constituencies (id, name),
          ward:wards (id, name)
        ),
        assigned_polling_station:assigned_polling_station_id (id, display_name, registered_voters, ward_id),
        assigned_ward:assigned_ward_id (id, name, registered_voters, constituency_id),
        assigned_constituency:assigned_constituency_id (id, name, registered_voters, county_id),
        assigned_county:assigned_county_id (id, name, registered_voters)
      `)
      .eq('invitation_token', token)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    if (agent.status !== 'pending') {
      return NextResponse.json({
        error: `This invitation has already been ${agent.status}`,
        status: agent.status,
      }, { status: 400 });
    }

    const db = adminClient as any;

    // Build region name + statistics
    let regionName = 'National';
    let registeredVoters = 0;
    let pollingStationCount = 0;
    let subRegionCount = 0;
    let subRegionLabel = '';
    let parentRegionName: string | null = null;

    const ps = agent.assigned_polling_station as any;
    const ward = agent.assigned_ward as any;
    const constituency = agent.assigned_constituency as any;
    const county = agent.assigned_county as any;

    if (ps) {
      regionName = ps.display_name;
      registeredVoters = ps.registered_voters || 0;
      pollingStationCount = 1;
      if (ps.ward_id) {
        const { data: w } = await db.from('wards').select('name').eq('id', ps.ward_id).maybeSingle();
        parentRegionName = w?.name || null;
      }
    } else if (ward) {
      regionName = ward.name;
      registeredVoters = ward.registered_voters || 0;
      const { count } = await db
        .from('polling_stations')
        .select('*', { count: 'exact', head: true })
        .eq('ward_id', ward.id);
      pollingStationCount = count || 0;
      subRegionCount = pollingStationCount;
      subRegionLabel = 'Polling Stations';
      if (ward.constituency_id) {
        const { data: c } = await db.from('constituencies').select('name').eq('id', ward.constituency_id).maybeSingle();
        parentRegionName = c?.name || null;
      }
    } else if (constituency) {
      regionName = constituency.name;
      registeredVoters = constituency.registered_voters || 0;
      const [{ count: wardCount }, { count: psCount }] = await Promise.all([
        db.from('wards').select('*', { count: 'exact', head: true }).eq('constituency_id', constituency.id),
        db.from('polling_stations').select('*', { count: 'exact', head: true }).eq('constituency_id', constituency.id),
      ]);
      subRegionCount = wardCount || 0;
      subRegionLabel = 'Wards';
      pollingStationCount = psCount || 0;
      if (constituency.county_id) {
        const { data: c } = await db.from('counties').select('name').eq('id', constituency.county_id).maybeSingle();
        parentRegionName = c?.name || null;
      }
    } else if (county) {
      regionName = county.name;
      registeredVoters = county.registered_voters || 0;
      const [{ count: constCount }, { count: psCount }] = await Promise.all([
        db.from('constituencies').select('*', { count: 'exact', head: true }).eq('county_id', county.id),
        db.from('polling_stations').select('*', { count: 'exact', head: true }).eq('county_id', county.id),
      ]);
      subRegionCount = constCount || 0;
      subRegionLabel = 'Constituencies';
      pollingStationCount = psCount || 0;
    } else if (agent.assigned_region_type === 'national') {
      regionName = 'Kenya';
      const { data: allCounties } = await db.from('counties').select('registered_voters');
      registeredVoters = (allCounties || []).reduce((s: number, c: any) => s + (c.registered_voters || 0), 0);
      subRegionCount = (allCounties || []).length;
      subRegionLabel = 'Counties';
    }

    // Reshape candidate
    const c = agent.candidates as any;
    const candidate = c
      ? {
          id: c.id,
          position: c.position,
          slogan: c.campaign_slogan,
          bio: c.users?.bio || null,
          followerCount: c.follower_count || 0,
          isVerified: !!c.is_verified,
          isIndependent: !!c.is_independent,
          users: {
            full_name: c.users?.full_name || 'Candidate',
            profile_photo_url: c.users?.profile_photo_url || null,
          },
          party: c.party
            ? {
                id: c.party.id,
                name: c.party.name,
                abbreviation: c.party.abbreviation,
                primaryColor: c.party.primary_color,
                symbolUrl: c.party.symbol_url,
              }
            : null,
          location:
            (c.ward as any)?.name ||
            (c.constituency as any)?.name ||
            (c.county as any)?.name ||
            (c.position === 'president' ? 'National' : ''),
          socialLinks: {
            facebook: c.facebook_url || null,
            twitter: c.twitter_url || null,
            instagram: c.instagram_url || null,
            tiktok: c.tiktok_url || null,
          },
        }
      : null;

    return NextResponse.json({
      success: true,
      invitation: {
        id: agent.id,
        invitedName: agent.invited_name,
        invitedPhone: agent.invited_phone,
        regionType: agent.assigned_region_type,
        regionName,
        parentRegionName,
        invitedAt: agent.invited_at,
        candidate,
        regionStats: {
          registeredVoters,
          pollingStationCount,
          subRegionCount,
          subRegionLabel,
        },
      },
    });
  } catch (error) {
    console.error('Invitation GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
