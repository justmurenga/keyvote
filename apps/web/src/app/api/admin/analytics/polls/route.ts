import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

const ADMIN_ROLES = ['system_admin', 'admin', 'party_admin'];

/**
 * GET /api/admin/analytics/polls
 *
 * Aggregate analytics across ALL polls (or a single poll), supporting drill-downs:
 *   ?view=overall|region|demographics|candidates  (default: overall)
 *   ?poll_id=<uuid>                               restrict to one poll
 *   ?position=president|governor|...              restrict to a position
 *   ?region_type=county|constituency|ward         level for regional rollup
 *   ?region_id=<id>                               drill down to a single region
 *   ?candidate_id=<uuid>                          isolate one candidate's performance
 *
 * Always returns:
 *   summary (totals + turnout vs registered voters where applicable)
 *   plus the requested view payload.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const me = await getApiCurrentUser(supabase);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const view = (url.searchParams.get('view') || 'overall') as
      | 'overall'
      | 'region'
      | 'demographics'
      | 'candidates';
    const pollId = url.searchParams.get('poll_id');
    const position = url.searchParams.get('position');
    const regionType = url.searchParams.get('region_type'); // county | constituency | ward
    const regionId = url.searchParams.get('region_id');
    const candidateId = url.searchParams.get('candidate_id');

    const admin = createAdminClient();

    // ---------------- Build vote query ----------------
    let votesQ = admin
      .from('poll_votes')
      .select(
        `id, poll_id, candidate_id, voted_at,
         county_id, constituency_id, ward_id,
         voter_gender, voter_age_bracket,
         county:counties(id, name),
         constituency:constituencies(id, name),
         ward:wards(id, name),
         poll:polls(id, title, position, status)`,
      );
    if (pollId) votesQ = votesQ.eq('poll_id', pollId);
    if (regionType === 'county' && regionId) votesQ = votesQ.eq('county_id', regionId);
    if (regionType === 'constituency' && regionId) votesQ = votesQ.eq('constituency_id', regionId);
    if (regionType === 'ward' && regionId) votesQ = votesQ.eq('ward_id', regionId);
    if (candidateId) votesQ = votesQ.eq('candidate_id', candidateId);

    const { data: votesRaw, error: votesErr } = await votesQ;
    if (votesErr) {
      console.error('votes fetch error', votesErr);
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }
    let votes = (votesRaw || []) as Array<any>;
    if (position) votes = votes.filter((v) => v.poll?.position === position);

    // ---------------- Candidate metadata ----------------
    const candidateIds = Array.from(new Set(votes.map((v) => v.candidate_id)));
    let candidatesById: Record<
      string,
      { id: string; name: string; party: string; position: string }
    > = {};
    if (candidateIds.length) {
      const { data: cands } = await admin
        .from('candidates')
        .select('id, position, user:users(id, full_name), party:political_parties(id, abbreviation, name)')
        .in('id', candidateIds);
      candidatesById = ((cands || []) as any[]).reduce((acc, c) => {
        acc[c.id] = {
          id: c.id,
          name: c.user?.full_name || 'Unknown',
          party: c.party?.abbreviation || 'IND',
          position: c.position,
        };
        return acc;
      }, {} as Record<string, any>);
    }

    // ---------------- Registered voters context ----------------
    let registeredVoters = 0;
    let regionLabel = 'National';
    if (regionType && regionId) {
      const { data: rv } = await (regionType === 'county'
        ? admin.from('mv_county_voter_stats').select('county_name, total_registered_voters').eq('county_id', regionId).maybeSingle()
        : regionType === 'constituency'
        ? admin.from('mv_constituency_voter_stats').select('constituency_name, total_registered_voters').eq('constituency_id', regionId).maybeSingle()
        : admin.from('mv_ward_voter_stats').select('ward_name, total_registered_voters').eq('ward_id', regionId).maybeSingle());
      registeredVoters = Number((rv as any)?.total_registered_voters) || 0;
      regionLabel =
        (rv as any)?.county_name ||
        (rv as any)?.constituency_name ||
        (rv as any)?.ward_name ||
        regionLabel;
    } else {
      const { data: rv } = await admin
        .from('mv_national_voter_stats')
        .select('total_registered_voters')
        .maybeSingle();
      registeredVoters = Number((rv as any)?.total_registered_voters) || 0;
    }

    const totalVotes = votes.length;
    const uniqueVoters = new Set(votes.map((v) => `${v.poll_id}|${v.candidate_id}|${v.voted_at}`)).size;

    // ---------------- Tally helpers ----------------
    const tally = (rows: any[], key: string) => {
      const out: Record<string, number> = {};
      for (const r of rows) {
        const v = r[key];
        if (v) out[v] = (out[v] || 0) + 1;
      }
      return out;
    };

    // ---------------- OVERALL view (default) ----------------
    const candidateLeaderboard = (() => {
      const counts: Record<string, number> = {};
      for (const v of votes) counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
      return Object.entries(counts)
        .map(([cid, c]) => ({
          candidateId: cid,
          name: candidatesById[cid]?.name || 'Unknown',
          party: candidatesById[cid]?.party || 'IND',
          position: candidatesById[cid]?.position,
          votes: c,
          share: totalVotes > 0 ? (c / totalVotes) * 100 : 0,
        }))
        .sort((a, b) => b.votes - a.votes);
    })();

    const summary = {
      totalVotes,
      uniqueVoters,
      registeredVoters,
      regionLabel,
      turnoutPct: registeredVoters > 0 ? (totalVotes / registeredVoters) * 100 : 0,
      pollsCovered: new Set(votes.map((v) => v.poll_id)).size,
      candidatesCovered: candidateLeaderboard.length,
    };

    if (view === 'overall') {
      // votes per day
      const byDay: Record<string, number> = {};
      for (const v of votes) {
        if (!v.voted_at) continue;
        const k = new Date(v.voted_at).toISOString().slice(0, 10);
        byDay[k] = (byDay[k] || 0) + 1;
      }
      const votesPerDay = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, votes: count }));

      const positions = (() => {
        const out: Record<string, number> = {};
        for (const v of votes) {
          const p = v.poll?.position;
          if (p) out[p] = (out[p] || 0) + 1;
        }
        return out;
      })();

      return NextResponse.json({
        view,
        summary,
        leaderboard: candidateLeaderboard,
        votesPerDay,
        positions,
      });
    }

    // ---------------- REGION view ----------------
    if (view === 'region') {
      const level = (regionType as 'county' | 'constituency' | 'ward') || 'county';
      const idKey =
        level === 'county' ? 'county_id' : level === 'constituency' ? 'constituency_id' : 'ward_id';
      const labelGetter = (v: any) =>
        level === 'county' ? v.county?.name : level === 'constituency' ? v.constituency?.name : v.ward?.name;

      // Aggregate
      const regionAgg: Record<
        string,
        {
          regionId: string;
          regionName: string;
          totalVotes: number;
          candidates: Record<string, number>;
        }
      > = {};
      for (const v of votes) {
        const id = v[idKey];
        if (!id) continue;
        const key = String(id);
        if (!regionAgg[key]) {
          regionAgg[key] = {
            regionId: key,
            regionName: labelGetter(v) || 'Unknown',
            totalVotes: 0,
            candidates: {},
          };
        }
        regionAgg[key].totalVotes += 1;
        regionAgg[key].candidates[v.candidate_id] = (regionAgg[key].candidates[v.candidate_id] || 0) + 1;
      }

      // Pull registered voters per region for turnout calc
      const ids = Object.keys(regionAgg);
      const rvMap: Record<string, number> = {};
      if (ids.length) {
        const table =
          level === 'county'
            ? 'mv_county_voter_stats'
            : level === 'constituency'
            ? 'mv_constituency_voter_stats'
            : 'mv_ward_voter_stats';
        const idCol =
          level === 'county' ? 'county_id' : level === 'constituency' ? 'constituency_id' : 'ward_id';
        const { data: rvRows } = await admin
          .from(table)
          .select(`${idCol}, total_registered_voters`)
          .in(idCol, ids);
        for (const r of (rvRows || []) as any[]) {
          rvMap[String(r[idCol])] = Number(r.total_registered_voters) || 0;
        }
      }

      const regions = Object.values(regionAgg)
        .map((r) => {
          const rv = rvMap[r.regionId] || 0;
          return {
            regionId: r.regionId,
            regionName: r.regionName,
            totalVotes: r.totalVotes,
            registeredVoters: rv,
            turnoutPct: rv > 0 ? (r.totalVotes / rv) * 100 : 0,
            candidates: Object.entries(r.candidates)
              .map(([cid, c]) => ({
                candidateId: cid,
                name: candidatesById[cid]?.name || 'Unknown',
                party: candidatesById[cid]?.party || 'IND',
                votes: c,
                share: r.totalVotes > 0 ? (c / r.totalVotes) * 100 : 0,
              }))
              .sort((a, b) => b.votes - a.votes),
          };
        })
        .sort((a, b) => b.totalVotes - a.totalVotes);

      return NextResponse.json({ view, level, summary, regions });
    }

    // ---------------- DEMOGRAPHICS view ----------------
    if (view === 'demographics') {
      const genderTotals = tally(votes, 'voter_gender');
      const ageTotals = tally(votes, 'voter_age_bracket');

      // Per-cohort candidate breakdown
      const byCohort = (
        cohortKey: 'voter_gender' | 'voter_age_bracket',
      ): Array<{
        cohort: string;
        votes: number;
        candidates: Array<{
          candidateId: string;
          name: string;
          party: string;
          votes: number;
          share: number;
        }>;
      }> => {
        const map: Record<string, Record<string, number>> = {};
        const totals: Record<string, number> = {};
        for (const v of votes) {
          const c = v[cohortKey];
          if (!c) continue;
          if (!map[c]) map[c] = {};
          map[c][v.candidate_id] = (map[c][v.candidate_id] || 0) + 1;
          totals[c] = (totals[c] || 0) + 1;
        }
        return Object.entries(map)
          .map(([cohort, candCounts]) => ({
            cohort,
            votes: totals[cohort] || 0,
            candidates: Object.entries(candCounts)
              .map(([cid, c]) => ({
                candidateId: cid,
                name: candidatesById[cid]?.name || 'Unknown',
                party: candidatesById[cid]?.party || 'IND',
                votes: c,
                share: totals[cohort] > 0 ? (c / totals[cohort]) * 100 : 0,
              }))
              .sort((a, b) => b.votes - a.votes),
          }))
          .sort((a, b) => b.votes - a.votes);
      };

      return NextResponse.json({
        view,
        summary,
        gender: { totals: genderTotals, byCandidate: byCohort('voter_gender') },
        age: { totals: ageTotals, byCandidate: byCohort('voter_age_bracket') },
      });
    }

    // ---------------- CANDIDATES drill-down view ----------------
    // For a single candidate, mirror the candidate analytics shape but scoped to the
    // current filter (poll/position/region).
    if (view === 'candidates' && candidateId) {
      const myVotes = votes.length;
      // Need totals across ALL candidates in the same scope to compute share
      let scopedTotalQ = admin.from('poll_votes').select('id', { count: 'exact', head: true });
      if (pollId) scopedTotalQ = scopedTotalQ.eq('poll_id', pollId);
      if (regionType === 'county' && regionId) scopedTotalQ = scopedTotalQ.eq('county_id', regionId);
      if (regionType === 'constituency' && regionId) scopedTotalQ = scopedTotalQ.eq('constituency_id', regionId);
      if (regionType === 'ward' && regionId) scopedTotalQ = scopedTotalQ.eq('ward_id', regionId);
      const { count: scopedTotal } = await scopedTotalQ;

      const byRegionCounty = (() => {
        const out: Record<string, { name: string; votes: number }> = {};
        for (const v of votes) {
          if (!v.county_id) continue;
          const k = String(v.county_id);
          if (!out[k]) out[k] = { name: v.county?.name || 'Unknown', votes: 0 };
          out[k].votes += 1;
        }
        return Object.entries(out)
          .map(([id, r]) => ({ regionId: id, regionName: r.name, votes: r.votes }))
          .sort((a, b) => b.votes - a.votes);
      })();

      return NextResponse.json({
        view,
        summary: {
          ...summary,
          totalVotes: scopedTotal || 0,
          turnoutPct: registeredVoters > 0 ? ((scopedTotal || 0) / registeredVoters) * 100 : 0,
        },
        candidate: {
          ...(candidatesById[candidateId] || { id: candidateId, name: 'Unknown', party: 'IND' }),
          votes: myVotes,
          share: scopedTotal && scopedTotal > 0 ? (myVotes / scopedTotal) * 100 : 0,
        },
        regions: byRegionCounty,
        gender: tally(votes, 'voter_gender'),
        age: tally(votes, 'voter_age_bracket'),
      });
    }

    return NextResponse.json({ error: 'Invalid view or missing candidate_id' }, { status: 400 });
  } catch (error) {
    console.error('Polls analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
