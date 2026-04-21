import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth/get-user';
import { hasActiveEntitlement } from '@/lib/entitlements';
import {
  bypassesNationalPaywall,
  requireNationalEntitlement,
} from '@/lib/entitlements/national';
import type { ElectoralPosition } from '@myvote/database';

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'Member of Parliament',
  mca: 'MCA',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require an authenticated user (Supabase auth or OTP session) to browse
    // the candidates directory. We don't expose this list publicly.
    const currentUserId = await resolveUserId(supabase);
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const position = searchParams.get('position');
    const countyId = searchParams.get('countyId');
    const constituencyId = searchParams.get('constituencyId');
    const wardId = searchParams.get('wardId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // ---- Region scoping ----
    // regionMode:
    //   "own"      (default) — restrict to current user's county.
    //   "outside"  — show candidates from regions other than the user's
    //                county. Requires an active `outside_region_candidates`
    //                entitlement; without it we 402 with paywall info.
    //   "all"      — admin-style unrestricted (kept for back-compat / search)
    const regionMode = (searchParams.get('regionMode') || 'own').toLowerCase();

    const admin = createAdminClient();
    const { data: meRow } = await admin
      .from('users')
      .select('county_id, constituency_id, ward_id, role')
      .eq('id', currentUserId)
      .single() as { data: { county_id: string | null; constituency_id: string | null; ward_id: string | null; role: string } | null; error: any };

    const myCountyId = meRow?.county_id || null;
    const myRole = meRow?.role || 'voter';

    // Admin-style roles bypass the paywall entirely.
    const bypassPaywall = ['system_admin', 'admin', 'staff'].includes(myRole);

    // ---- National / presidential paywall ----
    // Presidential candidates are national-tier content. Anyone explicitly
    // filtering for the presidential race must hold an active
    // `national_candidates_access` subscription (admins / staff bypass).
    const wantsNational = position === 'president';
    const hasNationalAccess = bypassesNationalPaywall(myRole)
      ? true
      : await hasActiveEntitlement(currentUserId, 'national_candidates_access');

    if (wantsNational && !hasNationalAccess) {
      const gate = await requireNationalEntitlement(
        currentUserId,
        myRole,
        'national_candidates_access',
      );
      if (gate) return gate;
    }

    if (regionMode === 'outside') {
      if (!myCountyId) {
        return NextResponse.json(
          {
            error:
              'We could not determine your home region. Please update your profile before browsing outside-region candidates.',
          },
          { status: 400 },
        );
      }
      if (!bypassPaywall) {
        const allowed = await hasActiveEntitlement(
          currentUserId,
          'outside_region_candidates',
        );
        if (!allowed) {
          return NextResponse.json(
            {
              error: 'paywall',
              message:
                'Browsing candidates outside your region is a paid feature.',
              paywall: {
                itemId: 'outside_region_candidates',
                title: 'Browse candidates outside your region',
                description:
                  'Unlock 30 days of access to candidates from any county, constituency or ward in Kenya.',
                price: 100,
                validity_days: 30,
                topup_url: '/dashboard/wallet',
              },
            },
            { status: 402 },
          );
        }
      }
    }

    // Build query
    let query = supabase
      .from('candidates')
      .select(`
        id,
        position,
        campaign_slogan,
        follower_count,
        is_verified,
        is_independent,
        county_id,
        constituency_id,
        ward_id,
        party:political_parties (
          id,
          name,
          abbreviation,
          primary_color,
          symbol_url
        ),
        user:users!inner (
          id,
          full_name,
          profile_photo_url
        ),
        county:counties (
          id,
          name
        ),
        constituency:constituencies (
          id,
          name
        ),
        ward:wards (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('is_active', true);

    // Filter by position
    if (position && position !== 'all') {
      query = query.eq('position', position as ElectoralPosition);
    }

    // Apply region scoping based on regionMode
    if (regionMode === 'own' && myCountyId) {
      // Show: anyone in the user's county. Presidential (national) candidates
      // are national-tier and only included if the voter holds an active
      // `national_candidates_access` entitlement.
      if (hasNationalAccess) {
        query = query.or(
          `county_id.eq.${myCountyId},position.eq.president`,
        );
      } else {
        query = query
          .eq('county_id', myCountyId)
          .neq('position', 'president');
      }
    } else if (regionMode === 'outside' && myCountyId) {
      // Show: candidates outside the user's county (still excluding presidential
      // — which is national and free to view via "own").
      query = query
        .neq('county_id', myCountyId)
        .neq('position', 'president');
    }

    // Filter by location based on position (explicit drilldown overrides regionMode)
    if (countyId) {
      query = query.eq('county_id', countyId);
    }
    if (constituencyId) {
      query = query.eq('constituency_id', constituencyId);
    }
    if (wardId) {
      query = query.eq('ward_id', wardId);
    }

    // Search by name
    if (search) {
      query = query.ilike('user.full_name', `%${search}%`);
    }

    // Order by follower count
    query = query
      .order('follower_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: candidates, error, count } = await query as { data: any[] | null; error: any; count: number | null };

    if (error) {
      console.error('Candidates fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    // Get current user's follows.
    // Use admin client to bypass RLS — followers RLS requires
    // voter_id = auth.uid() which is null for OTP-session users.
    let followedIds: string[] = [];
    {
      const admin = createAdminClient();
      const { data: follows } = await admin
        .from('followers')
        .select('candidate_id')
        .eq('voter_id', currentUserId)
        .eq('is_following', true) as { data: Array<{ candidate_id: string }> | null; error: any };

      followedIds = follows?.map(f => f.candidate_id) || [];
    }

    // Format response
    const formattedCandidates = candidates?.map(candidate => {
      // Determine location string
      let location = '';
      if (candidate.ward) {
        location = (candidate.ward as any).name;
      } else if (candidate.constituency) {
        location = (candidate.constituency as any).name;
      } else if (candidate.county) {
        location = (candidate.county as any).name;
      } else if (candidate.position === 'president') {
        location = 'National';
      }

      const party = candidate.party as any;
      const userData = candidate.user as any;

      return {
        id: candidate.id,
        name: userData?.full_name || 'Unknown',
        position: candidate.position,
        positionLabel: POSITION_LABELS[candidate.position] || candidate.position,
        photoUrl: userData?.profile_photo_url,
        partyName: party?.name,
        partyAbbreviation: party?.abbreviation,
        partyColor: party?.primary_color,
        isIndependent: candidate.is_independent,
        isVerified: candidate.is_verified,
        followerCount: candidate.follower_count || 0,
        isFollowing: followedIds.includes(candidate.id),
        location,
        slogan: candidate.campaign_slogan,
      };
    }) || [];

    return NextResponse.json({
      candidates: formattedCandidates,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      regionMode,
      myCountyId,
    });
  } catch (error) {
    console.error('Candidates API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
