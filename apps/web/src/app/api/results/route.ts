import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth/get-user';
import { hasActiveEntitlement } from '@/lib/entitlements';
import { requireNationalEntitlement } from '@/lib/entitlements/national';
import type { ElectoralPosition } from '@myvote/database';

const POSITION_LABELS: Record<string, string> = {
  president: 'Presidential',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'Member of Parliament',
  mca: 'MCA',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const position = searchParams.get('position') || 'president';
    const regionType = searchParams.get('regionType');
    const regionId = searchParams.get('regionId');
    // regionMode:
    //   "own"     (default) — restrict aggregation to current user's county
    //                         (or national for presidential).
    //   "outside" — allow other regions. Requires `outside_region_results`.
    const regionMode = (searchParams.get('regionMode') || 'own').toLowerCase();

    // Auth + role / region context
    const currentUserId = await resolveUserId(supabase);
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const admin = createAdminClient();
    const { data: meRow } = await admin
      .from('users')
      .select('county_id, role')
      .eq('id', currentUserId)
      .single() as { data: { county_id: string | null; role: string } | null; error: any };
    const myCountyId = meRow?.county_id || null;
    const myRole = meRow?.role || 'voter';
    const bypassPaywall = ['system_admin', 'admin', 'staff'].includes(myRole);

    // ---- National / presidential paywall ----
    // Presidential results are national-tier content. Require an active
    // `national_results_access` subscription (admins / staff bypass).
    if (position === 'president' && !bypassPaywall) {
      const gate = await requireNationalEntitlement(
        currentUserId,
        myRole,
        'national_results_access',
      );
      if (gate) return gate;
    }

    if (regionMode === 'outside') {
      if (!bypassPaywall) {
        const allowed = await hasActiveEntitlement(
          currentUserId,
          'outside_region_results',
        );
        if (!allowed) {
          return NextResponse.json(
            {
              error: 'paywall',
              message:
                'Viewing election results outside your region is a paid feature.',
              paywall: {
                itemId: 'outside_region_results',
                title: 'View results outside your region',
                description:
                  'Unlock 30 days of access to election results, opinion polls and followership analytics for any region in Kenya.',
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

    // Get election result submissions grouped by position and region
    let query = supabase
      .from('election_result_submissions')
      .select(`
        id,
        position,
        votes,
        is_verified,
        created_at,
        candidate:candidates (
          id,
          user:users (
            full_name,
            profile_photo_url
          ),
          party:political_parties (
            name,
            abbreviation,
            primary_color
          )
        ),
        polling_station:polling_stations (
          id,
          name,
          ward:wards (
            id,
            name,
            constituency:constituencies (
              id,
              name,
              county:counties (
                id,
                name
              )
            )
          )
        )
      `)
      .eq('position', position as ElectoralPosition)
      .eq('is_verified', true)
      .order('created_at', { ascending: false });

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Results fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      );
    }

    // Filter submissions client-side by region scope (data is small / paginated server-side later)
    const inOwnCounty = (sub: any) =>
      sub?.polling_station?.ward?.constituency?.county?.id === myCountyId;
    const filteredSubmissions = (submissions || []).filter((sub: any) => {
      // Presidential is always national — no region scoping needed.
      if (position === 'president') return true;

      if (regionMode === 'own') {
        if (!myCountyId) return true; // user has no region — show all (rare)
        return inOwnCounty(sub);
      }
      // outside
      if (!myCountyId) return true;
      return !inOwnCounty(sub);
    });

    // Get total polling stations for the position
    let totalStationsQuery = supabase
      .from('polling_stations')
      .select('id', { count: 'exact', head: true });

    const { count: totalStations } = await totalStationsQuery;

    // Aggregate results by candidate
    const candidateVotes: Record<string, {
      id: string;
      name: string;
      photoUrl?: string;
      partyName?: string;
      partyAbbreviation?: string;
      partyColor?: string;
      votes: number;
    }> = {};

    const reportingStations = new Set<string>();

    filteredSubmissions?.forEach((submission: any) => {
      const candidate = submission.candidate;
      const pollingStation = submission.polling_station;

      if (!candidate) return;

      reportingStations.add(pollingStation.id);

      const candidateId = candidate.id;
      if (!candidateVotes[candidateId]) {
        candidateVotes[candidateId] = {
          id: candidateId,
          name: candidate.user?.full_name || 'Unknown',
          photoUrl: candidate.user?.profile_photo_url,
          partyName: candidate.party?.name,
          partyAbbreviation: candidate.party?.abbreviation,
          partyColor: candidate.party?.primary_color,
          votes: 0,
        };
      }
      candidateVotes[candidateId].votes += submission.votes || 0;
    });

    // Convert to array and sort by votes
    const candidatesArray = Object.values(candidateVotes).sort((a, b) => b.votes - a.votes);
    const totalVotes = candidatesArray.reduce((sum, c) => sum + c.votes, 0);

    // Mark leader and calculate percentages
    const candidatesWithStats = candidatesArray.map((c, index) => ({
      ...c,
      percentage: totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0,
      isLeading: index === 0,
    }));

    // Determine region name based on position
    let regionName = 'National';
    if (position === 'governor' || position === 'senator' || position === 'women_rep') {
      regionName = 'County Level';
    } else if (position === 'mp') {
      regionName = 'Constituency Level';
    } else if (position === 'mca') {
      regionName = 'Ward Level';
    }

    const stationsReporting = reportingStations.size;
    const reportingPercentage = totalStations ? (stationsReporting / totalStations) * 100 : 0;

    // Format the result
    const result = {
      id: `${position}-national`,
      position,
      positionLabel: POSITION_LABELS[position] || position,
      region: regionName,
      regionType: 'national' as const,
      candidates: candidatesWithStats,
      totalVotes,
      stationsReporting,
      totalStations: totalStations || 0,
      reportingPercentage,
      status: reportingPercentage < 100 ? 'live' as const : 'final' as const,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      results: [result],
      regionMode,
      myCountyId,
    });
  } catch (error) {
    console.error('Results API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
