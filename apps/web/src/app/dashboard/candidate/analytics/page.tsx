'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  MapPin,
  Loader2,
  AlertCircle,
  UserMinus,
  Vote,
  Trophy,
  Sparkles,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Activity,
  Crosshair,
  Megaphone,
  UserPlus,
  Network,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

// ---------------- Types ----------------
interface Mover {
  cohort: string;
  current: number;
  previous: number;
  change: number;
}

interface AnalyticsResponse {
  candidate: any;
  summary: {
    followerCount: number;
    totalEverFollowed: number;
    unfollowCount: number;
    churnRate: number;
    net30d: number;
    follows30d: number;
    unfollows30d: number;
    agentCount: number;
    activePollCount: number;
    recentPollVotes: number;
    totalPollVotes: number;
    totalElectionVotes: number;
    regionsReporting: number;
  };
  demographics: {
    gender: Record<string, number>;
    age: Record<string, number>;
    region: Record<string, number>;
  };
  unfollowDemographics: {
    gender: Record<string, number>;
    age: Record<string, number>;
    region: Record<string, number>;
  };
  unfollowRates: {
    gender: Record<string, { rate: number; lost: number; remaining: number }>;
    age: Record<string, { rate: number; lost: number; remaining: number }>;
  };
  movers: {
    gender: { improved: Mover[]; dropped: Mover[] };
    age: { improved: Mover[]; dropped: Mover[] };
    region: { improved: Mover[]; dropped: Mover[] };
  };
  trends: {
    daily: Array<{ date: string; follows: number; unfollows: number; net: number }>;
    weekly: Array<{ period: string; follows: number; unfollows: number; net: number }>;
    monthly: Array<{ period: string; follows: number; unfollows: number; net: number }>;
    cumulative: Array<{ date: string; followers: number }>;
  };
  polls: Array<{
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
  }>;
  electionResults: Array<{
    region: string;
    level: string;
    mine: number;
    total: number;
    share: number;
  }>;
  electionTotals: { mine: number; total: number };
  predictions: {
    slopePerDay: number;
    confidence: number;
    forecast: Array<{ label: string; days: number; value: number }>;
    forecastSeries: Array<{ date: string; predicted: number }>;
  };
  agentPerformance?: Array<{
    agentId: string;
    name: string;
    status: string;
    region: string;
    invitesSent: number;
    delivered: number;
    followersRecruited: number;
    conversionRate: number;
    reports: number;
    results: number;
  }>;
  candidateFollowing?: {
    total: number;
    list: Array<{
      candidateId: string;
      name: string;
      position: string;
      party: string;
      partyName: string;
      region: string;
      followedAt: string;
    }>;
    byPosition: Record<string, number>;
    byParty: Record<string, number>;
  };
}

// ---------------- Display helpers ----------------
const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
  other: 'Other',
};

const COLORS = {
  blue: '#3b82f6',
  pink: '#ec4899',
  emerald: '#10b981',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  slate: '#64748b',
};

const PIE_PALETTE = [
  COLORS.blue,
  COLORS.pink,
  COLORS.emerald,
  COLORS.amber,
  COLORS.purple,
  COLORS.cyan,
  COLORS.rose,
  COLORS.slate,
];

const fmtNum = (n: number) => (n ?? 0).toLocaleString();

// ---------------- Section wrapper ----------------
function Section({
  title,
  description,
  icon: Icon,
  accent = 'slate',
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: 'slate' | 'emerald' | 'blue' | 'rose' | 'amber' | 'purple';
  children: React.ReactNode;
}) {
  const accentMap: Record<string, string> = {
    slate: 'from-slate-50 to-transparent border-slate-300 dark:from-slate-900/30 dark:border-slate-700',
    emerald: 'from-emerald-50 to-transparent border-emerald-400 dark:from-emerald-900/20 dark:border-emerald-700',
    blue: 'from-blue-50 to-transparent border-blue-400 dark:from-blue-900/20 dark:border-blue-700',
    rose: 'from-rose-50 to-transparent border-rose-400 dark:from-rose-900/20 dark:border-rose-700',
    amber: 'from-amber-50 to-transparent border-amber-400 dark:from-amber-900/20 dark:border-amber-700',
    purple: 'from-purple-50 to-transparent border-purple-400 dark:from-purple-900/20 dark:border-purple-700',
  };
  const iconAccent: Record<string, string> = {
    slate: 'bg-slate-500/10 text-slate-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue: 'bg-blue-500/10 text-blue-600',
    rose: 'bg-rose-500/10 text-rose-600',
    amber: 'bg-amber-500/10 text-amber-600',
    purple: 'bg-purple-500/10 text-purple-600',
  };
  return (
    <section
      className={`rounded-xl border-l-4 bg-gradient-to-r ${accentMap[accent]} p-4 sm:p-6 space-y-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${iconAccent[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

// ---------------- Page ----------------
export default function CandidateAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendGranularity, setTrendGranularity] =
    useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [moverDim, setMoverDim] = useState<'gender' | 'age' | 'region'>('gender');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/candidates/me/analytics');
        if (!res.ok) {
          if (!cancelled) setError('Failed to load analytics');
        } else {
          const json = await res.json();
          if (!cancelled) setData(json);
        }
      } catch {
        if (!cancelled) setError('Network error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trendSeries = useMemo(() => {
    if (!data) return [] as Array<{ label: string; follows: number; unfollows: number; net: number }>;
    if (trendGranularity === 'daily')
      return data.trends.daily.map((d) => ({
        label: d.date.slice(5),
        follows: d.follows,
        unfollows: d.unfollows,
        net: d.net,
      }));
    if (trendGranularity === 'weekly')
      return data.trends.weekly.map((d) => ({
        label: d.period,
        follows: d.follows,
        unfollows: d.unfollows,
        net: d.net,
      }));
    return data.trends.monthly.map((d) => ({
      label: d.period,
      follows: d.follows,
      unfollows: d.unfollows,
      net: d.net,
    }));
  }, [data, trendGranularity]);

  const cumulativeWithForecast = useMemo(() => {
    if (!data) return [] as Array<{ date: string; followers: number | null; predicted: number | null }>;
    const past = data.trends.cumulative.map((p) => ({
      date: p.date,
      followers: p.followers as number | null,
      predicted: null as number | null,
    }));
    const last = past[past.length - 1];
    const future = data.predictions.forecastSeries.map((p) => ({
      date: p.date,
      followers: null as number | null,
      predicted: p.predicted as number | null,
    }));
    if (last) {
      future.unshift({
        date: last.date,
        followers: null,
        predicted: last.followers,
      });
    }
    return [...past, ...future];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p className="text-destructive">{error || 'No data'}</p>
      </div>
    );
  }

  const {
    summary,
    demographics,
    unfollowDemographics,
    unfollowRates,
    movers,
    polls,
    electionResults,
    electionTotals,
    predictions,
  } = data;

  // Pie / chart data builders
  const toPie = (record: Record<string, number>, labelMap?: Record<string, string>) =>
    Object.entries(record).map(([k, v]) => ({
      name: labelMap?.[k] || k,
      value: v,
    }));

  const genderPie = toPie(demographics.gender, GENDER_LABELS);
  const agePie = toPie(demographics.age);
  const regionBars = Object.entries(demographics.region)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const unfollowGenderBars = Object.entries(unfollowRates.gender)
    .map(([k, v]) => ({
      cohort: GENDER_LABELS[k] || k,
      lost: v.lost,
      remaining: v.remaining,
      rate: Number(v.rate.toFixed(1)),
    }))
    .sort((a, b) => b.rate - a.rate);

  const unfollowAgeBars = Object.entries(unfollowRates.age)
    .map(([k, v]) => ({
      cohort: k,
      lost: v.lost,
      remaining: v.remaining,
      rate: Number(v.rate.toFixed(1)),
    }))
    .sort((a, b) => b.rate - a.rate);

  const unfollowRegionBars = Object.entries(unfollowDemographics.region)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const pollBars = polls
    .filter((p) => p.totalVotes > 0)
    .slice(0, 10)
    .map((p) => ({
      name: p.title.length > 24 ? p.title.slice(0, 24) + '…' : p.title,
      myVotes: p.myVotes,
      otherVotes: Math.max(0, p.totalVotes - p.myVotes),
      share: Number(p.share.toFixed(1)),
      rank: p.rank,
    }));

  const electionBars = electionResults.slice(0, 12).map((r) => ({
    region: r.region,
    mine: r.mine,
    others: Math.max(0, r.total - r.mine),
    share: Number(r.share.toFixed(1)),
  }));

  const moverData = movers[moverDim];
  const overallElectionShare =
    electionTotals.total > 0 ? (electionTotals.mine / electionTotals.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/candidate')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="mt-2 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Followership, opinion polls and real election performance — combined.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {data.candidate?.ward?.name ||
                data.candidate?.constituency?.name ||
                data.candidate?.county?.name ||
                'National'}
            </Badge>
            <Badge variant="secondary">{data.candidate?.position}</Badge>
          </div>
        </div>
      </div>

      {/* ============ OVERVIEW ============ */}
      <Section
        title="Overview"
        description="At-a-glance KPIs across followers, polls and elections"
        icon={Activity}
        accent="slate"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Users}
            color="blue"
            label="Total Followers"
            value={fmtNum(summary.followerCount)}
            sub={
              <span className={summary.net30d >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {summary.net30d >= 0 ? '+' : ''}
                {fmtNum(summary.net30d)} net (30d)
              </span>
            }
          />
          <KpiCard
            icon={UserMinus}
            color="rose"
            label="Unfollows (all-time)"
            value={fmtNum(summary.unfollowCount)}
            sub={`Churn rate ${summary.churnRate.toFixed(1)}%`}
          />
          <KpiCard
            icon={BarChart3}
            color="purple"
            label="Poll Votes (mine)"
            value={fmtNum(summary.totalPollVotes)}
            sub={`${summary.activePollCount} active poll${summary.activePollCount === 1 ? '' : 's'}`}
          />
          <KpiCard
            icon={Vote}
            color="emerald"
            label="Election Votes"
            value={fmtNum(summary.totalElectionVotes)}
            sub={`${overallElectionShare.toFixed(1)}% across ${summary.regionsReporting} region${summary.regionsReporting === 1 ? '' : 's'}`}
          />
        </div>
      </Section>

      {/* ============ FOLLOWER DEMOGRAPHICS ============ */}
      <Section
        title="Follower Demographics"
        description="Who your active followers are — by gender, age and region"
        icon={PieIcon}
        accent="blue"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gender</CardTitle>
              <CardDescription>Active followers</CardDescription>
            </CardHeader>
            <CardContent>
              {genderPie.length === 0 ? (
                <EmptyHint label="No follower data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={genderPie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {genderPie.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            genderPie[i].name === 'Female'
                              ? COLORS.pink
                              : genderPie[i].name === 'Male'
                              ? COLORS.blue
                              : PIE_PALETTE[i % PIE_PALETTE.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Age Brackets</CardTitle>
              <CardDescription>Distribution of followers</CardDescription>
            </CardHeader>
            <CardContent>
              {agePie.length === 0 ? (
                <EmptyHint label="No age data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={agePie} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={70} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {agePie.map((_, i) => (
                        <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Regions</CardTitle>
              <CardDescription>Where followers live</CardDescription>
            </CardHeader>
            <CardContent>
              {regionBars.length === 0 ? (
                <EmptyHint label="No region data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={regionBars} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="region" type="category" width={90} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.emerald} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ============ FOLLOWERSHIP TRENDS ============ */}
      <Section
        title="Followership Trends"
        description="Daily, weekly and monthly follow vs unfollow activity (last 90 days)"
        icon={LineIcon}
        accent="emerald"
      >
        <div className="flex items-center gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((g) => (
            <Button
              key={g}
              variant={trendGranularity === g ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTrendGranularity(g)}
            >
              {g[0].toUpperCase() + g.slice(1)}
            </Button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Follows vs Unfollows</CardTitle>
              <CardDescription>
                Bar chart of new follows and unfollows per period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendSeries.length === 0 ? (
                <EmptyHint label="No trend data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={trendSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="follows" name="Follows" fill={COLORS.emerald} />
                    <Bar dataKey="unfollows" name="Unfollows" fill={COLORS.rose} />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net change"
                      stroke={COLORS.blue}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cumulative Followers</CardTitle>
              <CardDescription>Total followers over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data.trends.cumulative.length === 0 ? (
                <EmptyHint label="No cumulative data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.trends.cumulative}>
                    <defs>
                      <linearGradient id="colF" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(d) => d.slice(5)}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="followers"
                      stroke={COLORS.blue}
                      fillOpacity={1}
                      fill="url(#colF)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ============ MOST IMPROVED / DROPPED ============ */}
      <Section
        title="Most Improved & Dropped Cohorts"
        description="Net follower change last 30 days vs prior 30 days"
        icon={TrendingUp}
        accent="amber"
      >
        <div className="flex items-center gap-2">
          {(['gender', 'age', 'region'] as const).map((d) => (
            <Button
              key={d}
              variant={moverDim === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMoverDim(d)}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </Button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <MoversCard
            title="Most improved"
            tone="positive"
            icon={TrendingUp}
            rows={moverData.improved.filter((r) => r.change > 0)}
          />
          <MoversCard
            title="Biggest drops"
            tone="negative"
            icon={TrendingDown}
            rows={moverData.dropped.filter((r) => r.change < 0)}
          />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Period-over-period comparison</CardTitle>
            <CardDescription>
              Previous 30d (grey) vs current 30d ({moverDim})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {moverData.improved.length + moverData.dropped.length === 0 ? (
              <EmptyHint label="Not enough activity yet to compare periods" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    ...moverData.improved.slice(0, 5),
                    ...moverData.dropped.slice(0, 5),
                  ].filter(
                    (v, i, arr) =>
                      arr.findIndex((x) => x.cohort === v.cohort) === i,
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0} stroke="#888" />
                  <Bar dataKey="previous" name="Prev 30d" fill={COLORS.slate} />
                  <Bar dataKey="current" name="Current 30d" fill={COLORS.blue} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ============ UNFOLLOWING STATISTICS ============ */}
      <Section
        title="Unfollowing Statistics"
        description="Where you're losing followers — broken down by cohort"
        icon={UserMinus}
        accent="rose"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Gender</CardTitle>
              <CardDescription>Unfollow rate per gender cohort</CardDescription>
            </CardHeader>
            <CardContent>
              {unfollowGenderBars.length === 0 ? (
                <EmptyHint label="No unfollows yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={unfollowGenderBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="rate" fill={COLORS.rose} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Age Bracket</CardTitle>
              <CardDescription>Unfollow rate per age group</CardDescription>
            </CardHeader>
            <CardContent>
              {unfollowAgeBars.length === 0 ? (
                <EmptyHint label="No unfollows yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={unfollowAgeBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohort" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="rate" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Region</CardTitle>
              <CardDescription>Top regions by absolute unfollows</CardDescription>
            </CardHeader>
            <CardContent>
              {unfollowRegionBars.length === 0 ? (
                <EmptyHint label="No unfollows yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={unfollowRegionBars} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="region" type="category" width={90} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.rose} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ============ POLL PERFORMANCE ============ */}
      <Section
        title="Opinion Polls Performance"
        description="Your votes vs total per poll, with rank and share"
        icon={BarChart3}
        accent="purple"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Votes per poll</CardTitle>
              <CardDescription>Yours vs other candidates</CardDescription>
            </CardHeader>
            <CardContent>
              {pollBars.length === 0 ? (
                <EmptyHint label="No poll votes yet" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pollBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="myVotes" stackId="a" name="My votes" fill={COLORS.purple} />
                    <Bar dataKey="otherVotes" stackId="a" name="Others" fill={COLORS.slate} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vote share trend</CardTitle>
              <CardDescription>Your share (%) across polls over time</CardDescription>
            </CardHeader>
            <CardContent>
              {pollBars.length === 0 ? (
                <EmptyHint label="No poll data yet" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[...pollBars].reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Line
                      type="monotone"
                      dataKey="share"
                      stroke={COLORS.purple}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        {polls.length > 0 && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Poll</th>
                    <th className="text-left p-3 font-medium">Region</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">My votes</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium">Share</th>
                    <th className="text-right p-3 font-medium">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {polls.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{p.title}</td>
                      <td className="p-3 text-muted-foreground">{p.region}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{fmtNum(p.myVotes)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {fmtNum(p.totalVotes)}
                      </td>
                      <td className="p-3 text-right">{p.share.toFixed(1)}%</td>
                      <td className="p-3 text-right">
                        {p.rank > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            {p.rank === 1 && (
                              <Trophy className="h-3 w-3 text-amber-500" />
                            )}
                            #{p.rank} / {p.totalCandidates}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </Section>

      {/* ============ ELECTION RESULTS ============ */}
      <Section
        title="Real Election Performance"
        description="Verified election submissions broken down by region"
        icon={Vote}
        accent="emerald"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <KpiCard
            icon={Vote}
            color="emerald"
            label="My election votes"
            value={fmtNum(electionTotals.mine)}
            sub={`${overallElectionShare.toFixed(1)}% overall share`}
          />
          <KpiCard
            icon={MapPin}
            color="blue"
            label="Regions reporting"
            value={fmtNum(summary.regionsReporting)}
            sub="From verified submissions"
          />
          <KpiCard
            icon={Trophy}
            color="amber"
            label="Strongest region"
            value={electionResults[0]?.region || '—'}
            sub={
              electionResults[0]
                ? `${electionResults[0].share.toFixed(1)}% • ${fmtNum(
                    electionResults[0].mine,
                  )} votes`
                : 'No data yet'
            }
          />
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Region performance</CardTitle>
            <CardDescription>
              Your votes vs others, per region (top 12)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {electionBars.length === 0 ? (
              <EmptyHint label="No verified election submissions yet" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={electionBars}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="region"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mine" stackId="a" name="My votes" fill={COLORS.emerald} />
                  <Bar dataKey="others" stackId="a" name="Others" fill={COLORS.slate} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* ============ PREDICTIONS ============ */}
      <Section
        title="Predictions"
        description="Linear projection of follower growth based on the last 30 days"
        icon={Sparkles}
        accent="purple"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {predictions.forecast.map((f) => (
            <Card key={f.label}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground">In {f.label}</p>
                <p className="text-2xl font-bold">{fmtNum(f.value)}</p>
                <p className="text-xs text-muted-foreground">followers (projected)</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projection vs actuals</CardTitle>
            <CardDescription>
              Solid = historical • Dashed = projected next 30 days • Slope:{' '}
              {predictions.slopePerDay >= 0 ? '+' : ''}
              {predictions.slopePerDay} followers/day • Confidence:{' '}
              {(predictions.confidence * 100).toFixed(0)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cumulativeWithForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="followers"
                  name="Actual"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Projected"
                  stroke={COLORS.purple}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Section>

      {/* ============ AGENT RECRUITMENT PERFORMANCE ============ */}
      <Section
        title="Agent Recruitment Performance"
        description="How each of your agents is converting follow-invitations into real followers"
        icon={Megaphone}
        accent="amber"
      >
        {!data.agentPerformance || data.agentPerformance.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No agents recruited yet — invite agents from the agents page to start tracking
              recruitment performance.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <KpiCard
                icon={Megaphone}
                color="amber"
                label="Active agents"
                value={fmtNum(
                  data.agentPerformance.filter((a) => a.status === 'active').length,
                )}
                sub={`${fmtNum(data.agentPerformance.length)} total`}
              />
              <KpiCard
                icon={UserPlus}
                color="emerald"
                label="Followers recruited"
                value={fmtNum(
                  data.agentPerformance.reduce((s, a) => s + a.followersRecruited, 0),
                )}
                sub="From agent invites"
              />
              <KpiCard
                icon={BarChart3}
                color="blue"
                label="Invites sent"
                value={fmtNum(
                  data.agentPerformance.reduce((s, a) => s + a.invitesSent, 0),
                )}
                sub={`${fmtNum(
                  data.agentPerformance.reduce((s, a) => s + a.delivered, 0),
                )} delivered`}
              />
              <KpiCard
                icon={Trophy}
                color="purple"
                label="Top recruiter"
                value={data.agentPerformance[0]?.name || '—'}
                sub={
                  data.agentPerformance[0]
                    ? `${fmtNum(data.agentPerformance[0].followersRecruited)} followers`
                    : 'No data yet'
                }
              />
            </div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recruitment by agent</CardTitle>
                <CardDescription>Followers recruited via SMS invitations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.agentPerformance.slice(0, 12).map((a) => ({
                      name: a.name.length > 16 ? a.name.slice(0, 16) + '…' : a.name,
                      invites: a.invitesSent,
                      recruited: a.followersRecruited,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="invites" name="Invites sent" fill={COLORS.slate} />
                    <Bar
                      dataKey="recruited"
                      name="Followers recruited"
                      fill={COLORS.emerald}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Agent</th>
                      <th className="text-left p-3 font-medium">Region</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Invites</th>
                      <th className="text-right p-3 font-medium">Delivered</th>
                      <th className="text-right p-3 font-medium">Recruited</th>
                      <th className="text-right p-3 font-medium">Conv.</th>
                      <th className="text-right p-3 font-medium">Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.agentPerformance.map((a, i) => (
                      <tr key={a.agentId} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">
                          {i === 0 && a.followersRecruited > 0 && (
                            <Trophy className="inline h-3 w-3 text-amber-500 mr-1" />
                          )}
                          {a.name}
                        </td>
                        <td className="p-3 text-muted-foreground">{a.region}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {a.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{fmtNum(a.invitesSent)}</td>
                        <td className="p-3 text-right">{fmtNum(a.delivered)}</td>
                        <td className="p-3 text-right font-semibold">
                          {fmtNum(a.followersRecruited)}
                        </td>
                        <td className="p-3 text-right">
                          {a.invitesSent > 0
                            ? `${a.conversionRate.toFixed(0)}%`
                            : '—'}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">
                          {fmtNum(a.reports)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </Section>

      {/* ============ FOLLOWING OTHER CANDIDATES ============ */}
      <Section
        title="Candidates You Follow"
        description="Your network across other candidates — distribution by position and party"
        icon={Network}
        accent="blue"
      >
        {!data.candidateFollowing || data.candidateFollowing.total === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You aren&apos;t following any other candidates yet.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <KpiCard
                icon={Network}
                color="blue"
                label="Following"
                value={fmtNum(data.candidateFollowing.total)}
                sub="Other candidates"
              />
              <KpiCard
                icon={Users}
                color="purple"
                label="Distinct positions"
                value={fmtNum(Object.keys(data.candidateFollowing.byPosition).length)}
              />
              <KpiCard
                icon={Trophy}
                color="amber"
                label="Distinct parties"
                value={fmtNum(Object.keys(data.candidateFollowing.byParty).length)}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">By position</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={Object.entries(data.candidateFollowing.byPosition).map(
                        ([k, v]) => ({ name: k, count: v }),
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">By party</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={Object.entries(data.candidateFollowing.byParty).map(
                          ([k, v]) => ({ name: k, value: v }),
                        )}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {Object.entries(data.candidateFollowing.byParty).map((_, i) => (
                          <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Candidate</th>
                      <th className="text-left p-3 font-medium">Position</th>
                      <th className="text-left p-3 font-medium">Party</th>
                      <th className="text-left p-3 font-medium">Region</th>
                      <th className="text-left p-3 font-medium">Followed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.candidateFollowing.list.map((c) => (
                      <tr key={c.candidateId} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {c.position}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{c.party}</td>
                        <td className="p-3 text-muted-foreground">{c.region}</td>
                        <td className="p-3 text-muted-foreground">
                          {c.followedAt
                            ? new Date(c.followedAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </Section>

      {/* ============ INSIGHTS ============ */}
      <Section
        title="Campaign Insights"
        description="Auto-generated takeaways from your data"
        icon={Crosshair}
        accent="slate"
      >
        <Insights data={data} />
      </Section>
    </div>
  );
}

// ---------------- Sub-components ----------------
function KpiCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'rose' | 'purple' | 'amber';
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    rose: 'bg-rose-500/10 text-rose-600',
    purple: 'bg-purple-500/10 text-purple-600',
    amber: 'bg-amber-500/10 text-amber-600',
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function MoversCard({
  title,
  rows,
  tone,
  icon: Icon,
}: {
  title: string;
  rows: Mover[];
  tone: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className={`h-4 w-4 ${tone === 'positive' ? 'text-emerald-600' : 'text-rose-600'}`}
          />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyHint label="Not enough movement to report" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.cohort}
                className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
              >
                <span className="font-medium truncate">
                  {GENDER_LABELS[r.cohort] || r.cohort}
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    prev {r.previous >= 0 ? '+' : ''}
                    {r.previous}
                  </span>
                  <span>
                    cur {r.current >= 0 ? '+' : ''}
                    {r.current}
                  </span>
                  <span
                    className={`font-semibold ${tone === 'positive' ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {r.change > 0 ? '+' : ''}
                    {r.change}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Insights({ data }: { data: AnalyticsResponse }) {
  const items: { icon: any; tone: string; text: React.ReactNode }[] = [];
  const { summary, demographics, predictions, movers, electionResults } = data;
  const totalGender = Object.values(demographics.gender).reduce((a, b) => a + b, 0);
  const totalAge = Object.values(demographics.age).reduce((a, b) => a + b, 0);

  if (totalGender > 0) {
    const top = Object.entries(demographics.gender).sort((a, b) => b[1] - a[1])[0];
    items.push({
      icon: Users,
      tone: 'blue',
      text: (
        <>
          <strong>{((top[1] / totalGender) * 100).toFixed(0)}%</strong> of your
          followers are <strong>{GENDER_LABELS[top[0]] || top[0]}</strong>.
        </>
      ),
    });
  }
  if (totalAge > 0) {
    const top = Object.entries(demographics.age).sort((a, b) => b[1] - a[1])[0];
    items.push({
      icon: Users,
      tone: 'purple',
      text: (
        <>
          Your largest age group is <strong>{top[0]}</strong> at{' '}
          {((top[1] / totalAge) * 100).toFixed(0)}% of followers.
        </>
      ),
    });
  }
  if (summary.churnRate > 15) {
    items.push({
      icon: UserMinus,
      tone: 'rose',
      text: (
        <>
          Churn rate is high (<strong>{summary.churnRate.toFixed(1)}%</strong>).
          Investigate the cohorts in the unfollow section.
        </>
      ),
    });
  }
  if (predictions.slopePerDay > 0) {
    items.push({
      icon: TrendingUp,
      tone: 'emerald',
      text: (
        <>
          You&apos;re growing at{' '}
          <strong>+{predictions.slopePerDay.toFixed(2)}</strong> followers/day.
          Projected to reach{' '}
          <strong>
            {predictions.forecast[predictions.forecast.length - 1].value.toLocaleString()}
          </strong>{' '}
          in 90 days.
        </>
      ),
    });
  } else if (predictions.slopePerDay < 0) {
    items.push({
      icon: TrendingDown,
      tone: 'rose',
      text: (
        <>
          Trend is negative (<strong>{predictions.slopePerDay.toFixed(2)}</strong>{' '}
          followers/day). Re-engage your dropping cohorts.
        </>
      ),
    });
  }
  const topImproved = movers.region.improved.find((r) => r.change > 0);
  if (topImproved) {
    items.push({
      icon: MapPin,
      tone: 'emerald',
      text: (
        <>
          Strongest momentum region: <strong>{topImproved.cohort}</strong> (+
          {topImproved.change} net followers vs prior 30d).
        </>
      ),
    });
  }
  const topDropped = movers.region.dropped.find((r) => r.change < 0);
  if (topDropped) {
    items.push({
      icon: MapPin,
      tone: 'rose',
      text: (
        <>
          Region needing attention: <strong>{topDropped.cohort}</strong> (
          {topDropped.change} net followers vs prior 30d).
        </>
      ),
    });
  }
  if (electionResults[0]) {
    items.push({
      icon: Trophy,
      tone: 'amber',
      text: (
        <>
          You lead/perform best in <strong>{electionResults[0].region}</strong> with{' '}
          {electionResults[0].share.toFixed(1)}% share.
        </>
      ),
    });
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Start building followers and running polls to unlock insights here.
      </p>
    );
  }

  const toneMap: Record<string, string> = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <it.icon className={`h-5 w-5 mt-0.5 shrink-0 ${toneMap[it.tone]}`} />
          <p className="text-sm">{it.text}</p>
        </div>
      ))}
    </div>
  );
}
