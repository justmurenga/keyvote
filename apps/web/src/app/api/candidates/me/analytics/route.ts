import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

/**
 * GET /api/candidates/me/analytics
 *
 * Comprehensive analytics for the current user's candidate profile, combining:
 *   - Follower demographics (gender / age / region)
 *   - Period-over-period demographic shifts ("most improved / dropped" cohorts)
 *   - Daily / weekly / monthly follow & unfollow trends
 *   - Unfollowing statistics by gender / age / region
 *   - Opinion poll performance (per-poll share, rank, totals)
 *   - Real election result performance (per region)
 *   - Linear-projection predictions for follower growth
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // ---- Candidate profile ----
    const { data: candidate, error: candErr } = await (admin
      .from('candidates') as any)
      .select(
        `
        id, position, follower_count, county_id, constituency_id, ward_id,
        county:counties(id, name),
        constituency:constituencies(id, name),
        ward:wards(id, name)
      `,
      )
      .eq('user_id', currentUser.id)
      .single();

    if (candErr || !candidate) {
      return NextResponse.json(
        { error: 'No candidate profile found' },
        { status: 404 },
      );
    }

    const candidateId = (candidate as any).id as string;
    const position = (candidate as any).position as string;

    // ---- Followers (every record, current + historical) ----
    const { data: followerRows } = await (admin.from('followers') as any)
      .select(
        `id, is_following, followed_at, unfollowed_at,
         voter_gender, voter_age_bracket, county_id, constituency_id, ward_id,
         county:counties(id, name),
         constituency:constituencies(id, name),
         ward:wards(id, name)`,
      )
      .eq('candidate_id', candidateId);

    const followers = (followerRows || []) as Array<any>;
    const active = followers.filter((f) => f.is_following);
    const unfollowed = followers.filter(
      (f) => !f.is_following && f.unfollowed_at,
    );

    // ---- Active agents ----
    const { count: agentCount } = await admin
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .eq('status', 'active');

    // ---- Agent recruitment performance ----
    // For each agent of this candidate: how many SMS follow-invites they sent,
    // how many of those phone numbers later became platform users, and of those
    // users, how many are currently following THIS candidate.
    const { data: agentRows } = await (admin.from('agents') as any)
      .select(
        `id, user_id, status, total_reports, total_results_submitted,
         user:users(id, full_name, phone),
         county:counties(name),
         constituency:constituencies(name),
         ward:wards(name)`,
      )
      .eq('candidate_id', candidateId);

    const agents = (agentRows || []) as Array<any>;
    const agentUserIds = agents.map((a) => a.user_id);
    let agentInvites: Array<any> = [];
    if (agentUserIds.length) {
      const { data: invs } = await admin
        .from('follow_invites')
        .select('id, inviter_id, phone, status, created_at')
        .eq('candidate_id', candidateId)
        .in('inviter_id', agentUserIds);
      agentInvites = (invs || []) as Array<any>;
    }
    // Map invitee phones -> user_id (for converted check)
    const invitedPhones = Array.from(new Set(agentInvites.map((i) => i.phone)));
    let phoneToUserId: Record<string, string> = {};
    if (invitedPhones.length) {
      const { data: matched } = await admin
        .from('users')
        .select('id, phone')
        .in('phone', invitedPhones);
      phoneToUserId = ((matched || []) as any[]).reduce((acc, u) => {
        acc[u.phone] = u.id;
        return acc;
      }, {} as Record<string, string>);
    }
    // For converted users, check if they are now following THIS candidate
    const matchedUserIds = Object.values(phoneToUserId);
    let followingUserSet = new Set<string>();
    if (matchedUserIds.length) {
      const { data: followsRows } = await admin
        .from('followers')
        .select('voter_id')
        .eq('candidate_id', candidateId)
        .eq('is_following', true)
        .in('voter_id', matchedUserIds);
      followingUserSet = new Set(((followsRows || []) as any[]).map((r) => r.voter_id));
    }
    const agentPerformance = agents.map((a) => {
      const myInvites = agentInvites.filter((i) => i.inviter_id === a.user_id);
      const delivered = myInvites.filter((i) =>
        ['delivered', 'sent', 'accepted', 'converted'].includes(String(i.status)),
      ).length;
      const converted = myInvites.filter((i) => {
        const uid = phoneToUserId[i.phone];
        return uid && followingUserSet.has(uid);
      }).length;
      return {
        agentId: a.id,
        name: a.user?.full_name || 'Unknown',
        status: a.status,
        region:
          a.ward?.name || a.constituency?.name || a.county?.name || 'National',
        invitesSent: myInvites.length,
        delivered,
        followersRecruited: converted,
        conversionRate:
          myInvites.length > 0 ? (converted / myInvites.length) * 100 : 0,
        reports: a.total_reports || 0,
        results: a.total_results_submitted || 0,
      };
    }).sort((a, b) => b.followersRecruited - a.followersRecruited);

    // ---- This candidate-as-user following other candidates ----
    // Use the candidate's user_id to check the followers table.
    const candidateUserId = currentUser.id;
    const { data: myFollowingRows } = await (admin.from('followers') as any)
      .select(
        `candidate_id, followed_at, is_following,
         candidate:candidates(
           id, position,
           user:users(full_name),
           party:political_parties(abbreviation, name),
           county:counties(name),
           constituency:constituencies(name),
           ward:wards(name)
         )`,
      )
      .eq('voter_id', candidateUserId)
      .eq('is_following', true);
    const myFollowing = (myFollowingRows || []) as Array<any>;
    const candidatesIFollow = myFollowing
      .filter((r) => r.candidate && r.candidate.id !== candidateId)
      .map((r) => ({
        candidateId: r.candidate.id,
        name: r.candidate.user?.full_name || 'Unknown',
        position: r.candidate.position,
        party: r.candidate.party?.abbreviation || 'IND',
        partyName: r.candidate.party?.name || 'Independent',
        region:
          r.candidate.ward?.name ||
          r.candidate.constituency?.name ||
          r.candidate.county?.name ||
          'National',
        followedAt: r.followed_at,
      }));
    const followingByPosition: Record<string, number> = {};
    const followingByParty: Record<string, number> = {};
    for (const f of candidatesIFollow) {
      followingByPosition[f.position] = (followingByPosition[f.position] || 0) + 1;
      followingByParty[f.partyName] = (followingByParty[f.partyName] || 0) + 1;
    }
    const candidateFollowing = {
      total: candidatesIFollow.length,
      list: candidatesIFollow,
      byPosition: followingByPosition,
      byParty: followingByParty,
    };

    // ---- Active polls (count) ----
    let activePollsQuery = admin
      .from('polls')
      .select('*', { count: 'exact', head: true })
      .eq('position', position)
      .eq('status', 'active');
    if ((candidate as any).county_id)
      activePollsQuery = activePollsQuery.eq(
        'county_id',
        (candidate as any).county_id,
      );
    if ((candidate as any).constituency_id)
      activePollsQuery = activePollsQuery.eq(
        'constituency_id',
        (candidate as any).constituency_id,
      );
    if ((candidate as any).ward_id)
      activePollsQuery = activePollsQuery.eq('ward_id', (candidate as any).ward_id);
    const { count: activePollCount } = await activePollsQuery;

    // ---- Polls (relevant to candidate) ----
    let pollsQuery = (admin.from('polls') as any)
      .select(
        `id, title, position, status, start_time, end_time, total_votes,
         county_id, constituency_id, ward_id,
         county:counties(name),
         constituency:constituencies(name),
         ward:wards(name)`,
      )
      .eq('position', position)
      .in('status', ['active', 'completed', 'scheduled'])
      .order('start_time', { ascending: false })
      .limit(20);
    if ((candidate as any).county_id)
      pollsQuery = pollsQuery.eq('county_id', (candidate as any).county_id);
    if ((candidate as any).constituency_id)
      pollsQuery = pollsQuery.eq(
        'constituency_id',
        (candidate as any).constituency_id,
      );
    if ((candidate as any).ward_id)
      pollsQuery = pollsQuery.eq('ward_id', (candidate as any).ward_id);

    const { data: pollsRaw } = await pollsQuery;
    const polls = (pollsRaw || []) as Array<any>;

    // Per-poll vote counts
    const pollPerformance: Array<{
      id: string;
      title: string;
      status: string;
      startTime: string | null;
      endTime: string | null;
      region: string;
      myVotes: number;
      totalVotes: number;
      share: number;
      rank: number;
      totalCandidates: number;
    }> = [];

    for (const p of polls) {
      const { data: votes } = await admin
        .from('poll_votes')
        .select('candidate_id')
        .eq('poll_id', p.id) as { data: Array<{ candidate_id: string }> | null };
      const counts: Record<string, number> = {};
      (votes || []).forEach((v) => {
        counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1;
      });
      const total = (votes || []).length;
      const myVotes = counts[candidateId] || 0;
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const rank = sorted.findIndex(([cid]) => cid === candidateId) + 1;
      pollPerformance.push({
        id: p.id,
        title: p.title,
        status: p.status,
        startTime: p.start_time,
        endTime: p.end_time,
        region:
          p.ward?.name || p.constituency?.name || p.county?.name || 'National',
        myVotes,
        totalVotes: total,
        share: total > 0 ? (myVotes / total) * 100 : 0,
        rank,
        totalCandidates: sorted.length,
      });
    }

    // ---- Election results (real submissions) ----
    const { data: electionRows } = await (admin
      .from('election_result_submissions') as any)
      .select(
        `votes, candidate_id, is_verified,
         polling_station:polling_stations(
           id, name,
           ward:wards(id, name,
             constituency:constituencies(id, name,
               county:counties(id, name)))
         )`,
      )
      .eq('position', position)
      .eq('is_verified', true);

    type RegionAgg = { region: string; level: string; mine: number; total: number };
    const byRegion: Record<string, RegionAgg> = {};
    (electionRows || []).forEach((r: any) => {
      const ps = r.polling_station;
      const ward = ps?.ward;
      const county = ward?.constituency?.county;
      const constituency = ward?.constituency;
      // Aggregate at the most relevant level for the candidate's seat
      let regionKey = 'National';
      let level = 'national';
      if (
        position === 'governor' ||
        position === 'senator' ||
        position === 'women_rep'
      ) {
        regionKey = county?.name || 'Unknown County';
        level = 'county';
      } else if (position === 'mp') {
        regionKey = constituency?.name || 'Unknown Constituency';
        level = 'constituency';
      } else if (position === 'mca') {
        regionKey = ward?.name || 'Unknown Ward';
        level = 'ward';
      }
      if (!byRegion[regionKey]) {
        byRegion[regionKey] = { region: regionKey, level, mine: 0, total: 0 };
      }
      byRegion[regionKey].total += Number(r.votes) || 0;
      if (r.candidate_id === candidateId) {
        byRegion[regionKey].mine += Number(r.votes) || 0;
      }
    });
    const electionResults = Object.values(byRegion)
      .map((r) => ({
        ...r,
        share: r.total > 0 ? (r.mine / r.total) * 100 : 0,
      }))
      .sort((a, b) => b.mine - a.mine);

    const electionTotals = electionResults.reduce(
      (acc, r) => {
        acc.mine += r.mine;
        acc.total += r.total;
        return acc;
      },
      { mine: 0, total: 0 },
    );

    // ---- Demographics: current followers ----
    const tally = (rows: any[], key: string) => {
      const out: Record<string, number> = {};
      rows.forEach((r) => {
        const v = r[key];
        if (v) out[v] = (out[v] || 0) + 1;
      });
      return out;
    };
    const tallyRegion = (rows: any[]) => {
      const out: Record<string, number> = {};
      rows.forEach((r) => {
        const name =
          r.ward?.name || r.constituency?.name || r.county?.name || 'Unknown';
        out[name] = (out[name] || 0) + 1;
      });
      return out;
    };

    const demographics = {
      gender: tally(active, 'voter_gender'),
      age: tally(active, 'voter_age_bracket'),
      region: tallyRegion(active),
    };

    // ---- Unfollow demographics ----
    const unfollowDemographics = {
      gender: tally(unfollowed, 'voter_gender'),
      age: tally(unfollowed, 'voter_age_bracket'),
      region: tallyRegion(unfollowed),
    };
    // Unfollow rate by cohort = unfollowed / (unfollowed + still following) for that cohort
    const unfollowRates = {
      gender: {} as Record<string, { rate: number; lost: number; remaining: number }>,
      age: {} as Record<string, { rate: number; lost: number; remaining: number }>,
    };
    (['gender', 'age'] as const).forEach((dim) => {
      const key = dim === 'gender' ? 'voter_gender' : 'voter_age_bracket';
      const all = new Set<string>([
        ...Object.keys(demographics[dim]),
        ...Object.keys(unfollowDemographics[dim]),
      ]);
      all.forEach((cohort) => {
        const lost = unfollowed.filter((f) => f[key] === cohort).length;
        const remaining = active.filter((f) => f[key] === cohort).length;
        const denom = lost + remaining;
        unfollowRates[dim][cohort] = {
          lost,
          remaining,
          rate: denom > 0 ? (lost / denom) * 100 : 0,
        };
      });
    });

    // ---- Period-over-period: most improved / most dropped cohorts ----
    // Compare last 30 days of NET follow activity vs prior 30 days
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const cur0 = now - 30 * day;
    const prev0 = now - 60 * day;

    const netForCohort = (
      dim: 'voter_gender' | 'voter_age_bracket' | 'region',
      from: number,
      to: number,
    ) => {
      const map: Record<string, number> = {};
      const apply = (rows: any[], delta: 1 | -1, dateField: string) => {
        rows.forEach((r) => {
          const t = r[dateField] ? new Date(r[dateField]).getTime() : 0;
          if (t < from || t >= to) return;
          let key: string | undefined;
          if (dim === 'region') {
            key =
              r.ward?.name ||
              r.constituency?.name ||
              r.county?.name ||
              undefined;
          } else {
            key = r[dim];
          }
          if (!key) return;
          map[key] = (map[key] || 0) + delta;
        });
      };
      apply(followers, 1, 'followed_at');
      apply(unfollowed, -1, 'unfollowed_at');
      return map;
    };

    const computeMovers = (
      dim: 'voter_gender' | 'voter_age_bracket' | 'region',
    ) => {
      const cur = netForCohort(dim, cur0, now);
      const prev = netForCohort(dim, prev0, cur0);
      const allKeys = new Set([...Object.keys(cur), ...Object.keys(prev)]);
      const rows = Array.from(allKeys).map((k) => ({
        cohort: k,
        current: cur[k] || 0,
        previous: prev[k] || 0,
        change: (cur[k] || 0) - (prev[k] || 0),
      }));
      return {
        improved: [...rows].sort((a, b) => b.change - a.change).slice(0, 5),
        dropped: [...rows].sort((a, b) => a.change - b.change).slice(0, 5),
      };
    };

    const movers = {
      gender: computeMovers('voter_gender'),
      age: computeMovers('voter_age_bracket'),
      region: computeMovers('region'),
    };

    // ---- Time-series trends (daily for 90 days) ----
    const days = 90;
    const start = now - (days - 1) * day;
    const dailyMap: Record<
      string,
      { date: string; follows: number; unfollows: number; net: number }
    > = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start + i * day);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { date: key, follows: 0, unfollows: 0, net: 0 };
    }
    followers.forEach((f) => {
      if (!f.followed_at) return;
      const key = new Date(f.followed_at).toISOString().slice(0, 10);
      if (dailyMap[key]) dailyMap[key].follows += 1;
    });
    unfollowed.forEach((f) => {
      if (!f.unfollowed_at) return;
      const key = new Date(f.unfollowed_at).toISOString().slice(0, 10);
      if (dailyMap[key]) dailyMap[key].unfollows += 1;
    });
    const daily = Object.values(dailyMap).map((d) => ({
      ...d,
      net: d.follows - d.unfollows,
    }));

    // Cumulative followers across the 90 days (back-compute from current count)
    let runningTotal = active.length;
    // We have the *future* cumulative; walk backwards
    const cumulative: Array<{ date: string; followers: number }> = [];
    for (let i = daily.length - 1; i >= 0; i--) {
      cumulative.unshift({ date: daily[i].date, followers: runningTotal });
      runningTotal -= daily[i].net;
    }

    // Aggregate weekly / monthly
    const aggregate = (
      grouper: (date: string) => string,
    ): Array<{ period: string; follows: number; unfollows: number; net: number }> => {
      const m: Record<
        string,
        { period: string; follows: number; unfollows: number; net: number }
      > = {};
      daily.forEach((d) => {
        const p = grouper(d.date);
        if (!m[p]) m[p] = { period: p, follows: 0, unfollows: 0, net: 0 };
        m[p].follows += d.follows;
        m[p].unfollows += d.unfollows;
        m[p].net += d.net;
      });
      return Object.values(m).sort((a, b) => a.period.localeCompare(b.period));
    };
    const weekly = aggregate((dateStr) => {
      const d = new Date(dateStr);
      // ISO week-ish bucket: yyyy-Www
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((d.getTime() - onejan.getTime()) / day + onejan.getDay() + 1) / 7,
      );
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
    });
    const monthly = aggregate((dateStr) => dateStr.slice(0, 7));

    // ---- Predictions (linear regression on cumulative followers, last 30d) ----
    const tail = cumulative.slice(-30);
    const n = tail.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    tail.forEach((p, i) => {
      sumX += i;
      sumY += p.followers;
      sumXY += i * p.followers;
      sumXX += i * i;
    });
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;
    const predictAt = (offsetDaysFromTodayInclusive: number) =>
      Math.max(
        0,
        Math.round(intercept + slope * (n - 1 + offsetDaysFromTodayInclusive)),
      );

    const predictions = {
      slopePerDay: Number(slope.toFixed(3)),
      // Confidence is a rough heuristic based on data volume + variance
      confidence: Math.min(1, n / 30),
      forecast: [
        { label: '7 days', days: 7, value: predictAt(7) },
        { label: '14 days', days: 14, value: predictAt(14) },
        { label: '30 days', days: 30, value: predictAt(30) },
        { label: '60 days', days: 60, value: predictAt(60) },
        { label: '90 days', days: 90, value: predictAt(90) },
      ],
      forecastSeries: Array.from({ length: 30 }, (_, i) => {
        const d = new Date(now + (i + 1) * day);
        return {
          date: d.toISOString().slice(0, 10),
          predicted: predictAt(i + 1),
        };
      }),
    };

    // ---- Recent poll votes count (for the summary card) ----
    const { data: recentPollVotes } = await admin
      .from('poll_votes')
      .select('id, created_at')
      .eq('candidate_id', candidateId)
      .gte('created_at', new Date(now - 30 * day).toISOString());

    const summary = {
      followerCount: active.length,
      totalEverFollowed: followers.length,
      unfollowCount: unfollowed.length,
      churnRate:
        followers.length > 0
          ? (unfollowed.length / followers.length) * 100
          : 0,
      net30d: daily.slice(-30).reduce((s, d) => s + d.net, 0),
      follows30d: daily.slice(-30).reduce((s, d) => s + d.follows, 0),
      unfollows30d: daily.slice(-30).reduce((s, d) => s + d.unfollows, 0),
      agentCount: agentCount || 0,
      activePollCount: activePollCount || 0,
      recentPollVotes: recentPollVotes?.length || 0,
      totalPollVotes: pollPerformance.reduce((s, p) => s + p.myVotes, 0),
      totalElectionVotes: electionTotals.mine,
      regionsReporting: electionResults.length,
    };

    return NextResponse.json({
      candidate,
      summary,
      demographics,
      unfollowDemographics,
      unfollowRates,
      movers,
      trends: {
        daily,
        weekly,
        monthly,
        cumulative,
      },
      polls: pollPerformance,
      electionResults,
      electionTotals,
      predictions,
      agentPerformance,
      candidateFollowing,
    });
  } catch (error) {
    console.error('Candidate analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
