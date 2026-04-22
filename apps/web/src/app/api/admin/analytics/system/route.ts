import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

const ADMIN_ROLES = ['system_admin', 'admin'];

/**
 * GET /api/admin/analytics/system
 *
 * Deep system-wide analytics for admins:
 *  - Headline KPIs (users, voters, candidates, agents, polls, votes, followers)
 *  - User growth over time
 *  - Demographic distribution (gender / age) of all registered users
 *  - Registered-voter coverage by county (from materialized view)
 *  - Candidate distribution by position / party
 *  - Engagement: votes per day, top followed candidates, top performing parties
 *  - Agent activity totals (reports, recruitment via follow-invites)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const me = await getApiCurrentUser(supabase);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const ago30 = new Date(now - 30 * day).toISOString();
    const ago90 = new Date(now - 90 * day).toISOString();

    // ---------------- Parallel base queries ----------------
    const [
      usersAll,
      usersActive,
      usersVerified,
      candidatesAll,
      candidatesVerified,
      partiesAll,
      pollsAll,
      pollsActive,
      pollsCompleted,
      pollVotesCount,
      followersActiveCount,
      agentsActiveCount,
      agentReportsCount,
      followInvitesCount,
      nationalVoterStats,
      countyVoterStats,
    ] = await Promise.all([
      admin.from('users').select('id, gender, age_bracket, role, created_at, county_id'),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('users').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      admin.from('candidates').select(`id, position, is_verified, follower_count,
        user_id, county_id, constituency_id, ward_id, party_id,
        party:political_parties(id, name, abbreviation),
        user:users(id, full_name)`),
      admin.from('candidates').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      admin.from('political_parties').select('id, name, abbreviation, is_verified'),
      admin.from('polls').select('id, status, position, total_votes, created_at'),
      admin.from('polls').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('polls').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      admin.from('poll_votes').select('id', { count: 'exact', head: true }),
      admin.from('followers').select('id', { count: 'exact', head: true }).eq('is_following', true),
      admin.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('agent_reports').select('id', { count: 'exact', head: true }),
      admin.from('follow_invites').select('id', { count: 'exact', head: true }),
      admin.from('mv_national_voter_stats').select('*').maybeSingle(),
      admin.from('mv_county_voter_stats').select('county_id, county_name, total_registered_voters'),
    ]);

    const users = (usersAll.data || []) as Array<any>;
    const candidates = (candidatesAll.data || []) as Array<any>;
    const polls = (pollsAll.data || []) as Array<any>;

    // ---------------- User demographics ----------------
    const tally = (rows: any[], key: string) => {
      const out: Record<string, number> = {};
      for (const r of rows) {
        const v = r[key];
        if (v) out[v] = (out[v] || 0) + 1;
      }
      return out;
    };
    const userGender = tally(users, 'gender');
    const userAge = tally(users, 'age_bracket');
    const userRoles = tally(users, 'role');

    // ---------------- User growth (last 90 days) ----------------
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 90; i++) {
      const d = new Date(now - (89 - i) * day);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    let usersLast30 = 0;
    for (const u of users) {
      if (!u.created_at) continue;
      const ts = new Date(u.created_at).getTime();
      const key = new Date(u.created_at).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key] += 1;
      if (ts >= now - 30 * day) usersLast30 += 1;
    }
    const userGrowthDaily = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      newUsers: count,
    }));
    // Cumulative line
    let runningUsers = users.length - usersLast30; // approximate baseline
    // Walk forward from earliest day
    const userGrowthCumulative = userGrowthDaily.map((d) => {
      runningUsers += d.newUsers;
      return { date: d.date, totalUsers: runningUsers };
    });

    // ---------------- Candidate distribution ----------------
    const candidateByPosition = tally(candidates, 'position');
    const candidateByParty: Record<
      string,
      { name: string; abbreviation: string; count: number; verified: number }
    > = { Independent: { name: 'Independent', abbreviation: 'IND', count: 0, verified: 0 } };
    for (const c of candidates) {
      const key = c.party?.name || 'Independent';
      if (!candidateByParty[key]) {
        candidateByParty[key] = {
          name: c.party?.name || 'Independent',
          abbreviation: c.party?.abbreviation || 'IND',
          count: 0,
          verified: 0,
        };
      }
      candidateByParty[key].count += 1;
      if (c.is_verified) candidateByParty[key].verified += 1;
    }

    const topCandidates = [...candidates]
      .sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        name: c.user?.full_name || 'Unknown',
        position: c.position,
        party: c.party?.abbreviation || 'IND',
        followers: c.follower_count || 0,
      }));

    // ---------------- Voter coverage by county ----------------
    const counties = (countyVoterStats.data || []) as Array<{
      county_id: string;
      county_name: string;
      total_registered_voters: number;
    }>;
    // followers per county (active)
    const { data: followerCountyRows } = await admin
      .from('followers')
      .select('county_id')
      .eq('is_following', true);
    const followersByCounty: Record<string, number> = {};
    for (const r of (followerCountyRows || []) as any[]) {
      if (r.county_id) {
        followersByCounty[r.county_id] = (followersByCounty[r.county_id] || 0) + 1;
      }
    }
    // users per county (engagement coverage)
    const usersByCounty: Record<string, number> = {};
    for (const u of users) {
      if (u.county_id) usersByCounty[u.county_id] = (usersByCounty[u.county_id] || 0) + 1;
    }

    const voterCoverage = counties
      .map((co) => {
        const registered = Number(co.total_registered_voters) || 0;
        const platformUsers = usersByCounty[co.county_id] || 0;
        const platformFollowers = followersByCounty[co.county_id] || 0;
        return {
          countyId: co.county_id,
          countyName: co.county_name,
          registeredVoters: registered,
          platformUsers,
          platformFollowers,
          coveragePct: registered > 0 ? (platformUsers / registered) * 100 : 0,
          followerPct: registered > 0 ? (platformFollowers / registered) * 100 : 0,
        };
      })
      .sort((a, b) => b.registeredVoters - a.registeredVoters);

    // ---------------- Engagement: votes per day (last 30) ----------------
    const { data: recentVotesRows } = await admin
      .from('poll_votes')
      .select('voted_at')
      .gte('voted_at', ago30);
    const votesDaily: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now - (29 - i) * day);
      votesDaily[d.toISOString().slice(0, 10)] = 0;
    }
    for (const v of (recentVotesRows || []) as any[]) {
      if (!v.voted_at) continue;
      const key = new Date(v.voted_at).toISOString().slice(0, 10);
      if (key in votesDaily) votesDaily[key] += 1;
    }
    const votesPerDay = Object.entries(votesDaily).map(([date, count]) => ({
      date,
      votes: count,
    }));

    // ---------------- Polls by position ----------------
    const pollsByPosition = tally(polls, 'position');
    const pollsByStatus = tally(polls, 'status');
    const totalPollVotes = polls.reduce((s, p) => s + (Number(p.total_votes) || 0), 0);

    // ---------------- Agent recruitment leaderboard ----------------
    const { data: invites } = await admin
      .from('follow_invites')
      .select('inviter_id, candidate_id, status')
      .gte('created_at', ago90);
    const inviterIds = Array.from(
      new Set(((invites || []) as any[]).map((i) => i.inviter_id)),
    );
    let agentRecruitment: Array<{
      agentId: string | null;
      agentName: string;
      candidate: string;
      invitesSent: number;
      delivered: number;
    }> = [];
    if (inviterIds.length) {
      const [{ data: invitingUsers }, { data: agentsRow }] = await Promise.all([
        admin.from('users').select('id, full_name').in('id', inviterIds),
        admin.from('agents').select('id, user_id, candidate_id').in('user_id', inviterIds),
      ]);
      const userMap = new Map(((invitingUsers || []) as any[]).map((u) => [u.id, u.full_name]));
      const agentMap = new Map(
        ((agentsRow || []) as any[]).map((a) => [`${a.user_id}|${a.candidate_id}`, a.id]),
      );
      const candIds = Array.from(
        new Set(((invites || []) as any[]).map((i) => i.candidate_id)),
      );
      const { data: candRows } = await admin
        .from('candidates')
        .select('id, user:users(full_name)')
        .in('id', candIds);
      const candMap = new Map(
        ((candRows || []) as any[]).map((c) => [c.id, c.user?.full_name || 'Unknown']),
      );

      const agg: Record<
        string,
        {
          agentId: string | null;
          agentName: string;
          candidate: string;
          invitesSent: number;
          delivered: number;
        }
      > = {};
      for (const inv of (invites || []) as any[]) {
        const k = `${inv.inviter_id}|${inv.candidate_id}`;
        if (!agg[k]) {
          agg[k] = {
            agentId: agentMap.get(k) ?? null,
            agentName: userMap.get(inv.inviter_id) || 'Unknown',
            candidate: candMap.get(inv.candidate_id) || 'Unknown',
            invitesSent: 0,
            delivered: 0,
          };
        }
        agg[k].invitesSent += 1;
        if (['delivered', 'sent', 'accepted', 'converted'].includes(String(inv.status))) {
          agg[k].delivered += 1;
        }
      }
      agentRecruitment = Object.values(agg)
        .sort((a, b) => b.invitesSent - a.invitesSent)
        .slice(0, 10);
    }

    // ---------------- Recent activity rate (engagement velocity) ----------------
    const { count: recentFollows } = await admin
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .gte('followed_at', ago30);
    const { count: recentUnfollows } = await admin
      .from('followers')
      .select('id', { count: 'exact', head: true })
      .gte('unfollowed_at', ago30)
      .eq('is_following', false);

    // ---------------- Candidates following candidates ----------------
    // Find followers rows whose voter is also a candidate's user.
    const candidateUserIds = candidates.map((c: any) => c.user_id).filter(Boolean);
    let candidateFollowsCandidates: Array<{
      followerCandidateId: string;
      followerName: string;
      followingCandidateId: string;
      followingName: string;
    }> = [];
    if (candidateUserIds.length) {
      // Need user_id from candidates select; ensure we have it
      // (we did select * effectively via specific field list, but follow-on
      // mapping uses user.full_name only — so fetch a quick map of user_id->candidate)
      const { data: candUsers } = await admin
        .from('candidates')
        .select('id, user_id, user:users(full_name)')
        .in('user_id', candidateUserIds);
      const userToCand = new Map(
        ((candUsers || []) as any[]).map((c) => [c.user_id, c]),
      );

      const { data: crossFollows } = await admin
        .from('followers')
        .select('voter_id, candidate_id')
        .eq('is_following', true)
        .in('voter_id', candidateUserIds);
      candidateFollowsCandidates = ((crossFollows || []) as any[])
        .map((r) => {
          const fr = userToCand.get(r.voter_id);
          if (!fr || fr.id === r.candidate_id) return null;
          return {
            followerCandidateId: fr.id,
            followerName: fr.user?.full_name || 'Unknown',
            followingCandidateId: r.candidate_id,
            followingName: '',
          };
        })
        .filter(Boolean) as any[];
      // resolve following names
      const targetIds = Array.from(
        new Set(candidateFollowsCandidates.map((r) => r.followingCandidateId)),
      );
      if (targetIds.length) {
        const { data: targets } = await admin
          .from('candidates')
          .select('id, user:users(full_name)')
          .in('id', targetIds);
        const tMap = new Map(
          ((targets || []) as any[]).map((c) => [c.id, c.user?.full_name || 'Unknown']),
        );
        candidateFollowsCandidates = candidateFollowsCandidates.map((r) => ({
          ...r,
          followingName: tMap.get(r.followingCandidateId) || 'Unknown',
        }));
      }
    }
    const followsByFollower: Record<string, { name: string; count: number }> = {};
    const followsByTarget: Record<string, { name: string; count: number }> = {};
    for (const r of candidateFollowsCandidates) {
      if (!followsByFollower[r.followerCandidateId])
        followsByFollower[r.followerCandidateId] = { name: r.followerName, count: 0 };
      followsByFollower[r.followerCandidateId].count += 1;
      if (!followsByTarget[r.followingCandidateId])
        followsByTarget[r.followingCandidateId] = { name: r.followingName, count: 0 };
      followsByTarget[r.followingCandidateId].count += 1;
    }
    const candidateNetwork = {
      totalRelationships: candidateFollowsCandidates.length,
      candidatesFollowing: Object.keys(followsByFollower).length,
      topFollowers: Object.entries(followsByFollower)
        .map(([id, v]) => ({ candidateId: id, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      mostFollowedByPeers: Object.entries(followsByTarget)
        .map(([id, v]) => ({ candidateId: id, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      kpis: {
        totalUsers: users.length,
        activeUsers: usersActive.count || 0,
        verifiedUsers: usersVerified.count || 0,
        usersLast30,
        totalCandidates: candidates.length,
        verifiedCandidates: candidatesVerified.count || 0,
        totalParties: (partiesAll.data || []).length,
        verifiedParties: ((partiesAll.data || []) as any[]).filter((p) => p.is_verified).length,
        totalPolls: polls.length,
        activePolls: pollsActive.count || 0,
        completedPolls: pollsCompleted.count || 0,
        totalPollVotes,
        recentVotes30d: (recentVotesRows || []).length,
        totalFollowers: followersActiveCount.count || 0,
        recentFollows30d: recentFollows || 0,
        recentUnfollows30d: recentUnfollows || 0,
        activeAgents: agentsActiveCount.count || 0,
        agentReports: agentReportsCount.count || 0,
        followInvitesSent: followInvitesCount.count || 0,
        registeredVotersNational:
          Number((nationalVoterStats.data as any)?.total_registered_voters) || 0,
        pollingStations:
          Number((nationalVoterStats.data as any)?.polling_station_count) || 0,
      },
      demographics: {
        gender: userGender,
        age: userAge,
        roles: userRoles,
      },
      growth: {
        daily: userGrowthDaily,
        cumulative: userGrowthCumulative,
      },
      candidates: {
        byPosition: candidateByPosition,
        byParty: Object.values(candidateByParty)
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
        top: topCandidates,
      },
      polls: {
        byPosition: pollsByPosition,
        byStatus: pollsByStatus,
      },
      voterCoverage,
      engagement: {
        votesPerDay,
      },
      agentRecruitment,
      candidateNetwork,
    });
  } catch (error) {
    console.error('System analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
