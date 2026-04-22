'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Activity,
  Users,
  UserCheck,
  Vote,
  ClipboardList,
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Loader2,
  AlertCircle,
  Trophy,
  RefreshCw,
  Megaphone,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts';

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
const PIE = [
  COLORS.blue,
  COLORS.pink,
  COLORS.emerald,
  COLORS.amber,
  COLORS.purple,
  COLORS.cyan,
  COLORS.rose,
  COLORS.slate,
];

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'MP',
  mca: 'MCA',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
  other: 'Other',
};

interface SystemAnalytics {
  generatedAt: string;
  kpis: Record<string, number>;
  demographics: {
    gender: Record<string, number>;
    age: Record<string, number>;
    roles: Record<string, number>;
  };
  growth: {
    daily: Array<{ date: string; newUsers: number }>;
    cumulative: Array<{ date: string; totalUsers: number }>;
  };
  candidates: {
    byPosition: Record<string, number>;
    byParty: Array<{ name: string; abbreviation: string; count: number; verified: number }>;
    top: Array<{ id: string; name: string; position: string; party: string; followers: number }>;
  };
  polls: {
    byPosition: Record<string, number>;
    byStatus: Record<string, number>;
  };
  voterCoverage: Array<{
    countyId: string;
    countyName: string;
    registeredVoters: number;
    platformUsers: number;
    platformFollowers: number;
    coveragePct: number;
    followerPct: number;
  }>;
  engagement: { votesPerDay: Array<{ date: string; votes: number }> };
  agentRecruitment: Array<{
    agentName: string;
    candidate: string;
    invitesSent: number;
    delivered: number;
  }>;
  candidateNetwork?: {
    totalRelationships: number;
    candidatesFollowing: number;
    topFollowers: Array<{ candidateId: string; name: string; count: number }>;
    mostFollowedByPeers: Array<{ candidateId: string; name: string; count: number }>;
  };
}

const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();

export default function AdminSystemAnalyticsPage() {
  const [data, setData] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/analytics/system');
      if (!res.ok) {
        setError('Failed to load analytics');
      } else {
        setData(await res.json());
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

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

  const { kpis, demographics, growth, candidates, polls, voterCoverage, engagement, agentRecruitment } = data;
  const genderPie = Object.entries(demographics.gender).map(([k, v]) => ({
    name: GENDER_LABELS[k] || k,
    value: v,
  }));
  const agePie = Object.entries(demographics.age).map(([k, v]) => ({
    name: k,
    value: v,
  }));
  const rolePie = Object.entries(demographics.roles).map(([k, v]) => ({
    name: k.replace('_', ' '),
    value: v,
  }));
  const positionBars = Object.entries(candidates.byPosition).map(([k, v]) => ({
    position: POSITION_LABELS[k] || k,
    candidates: v,
  }));
  const pollPositionBars = Object.entries(polls.byPosition).map(([k, v]) => ({
    position: POSITION_LABELS[k] || k,
    polls: v,
  }));
  const pollStatusBars = Object.entries(polls.byStatus).map(([k, v]) => ({
    status: k,
    count: v,
  }));

  const totalCoverage =
    kpis.registeredVotersNational > 0
      ? (kpis.totalUsers / kpis.registeredVotersNational) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">System Analytics</h1>
          <p className="text-muted-foreground">
            Deep, system-wide view of users, candidates, polls and engagement.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Headline KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Users}
          color="blue"
          label="Total Users"
          value={fmt(kpis.totalUsers)}
          sub={`${fmt(kpis.usersLast30)} new in last 30d`}
        />
        <Kpi
          icon={UserCheck}
          color="purple"
          label="Candidates"
          value={fmt(kpis.totalCandidates)}
          sub={`${fmt(kpis.verifiedCandidates)} verified • ${fmt(kpis.totalParties)} parties`}
        />
        <Kpi
          icon={ClipboardList}
          color="amber"
          label="Polls"
          value={fmt(kpis.totalPolls)}
          sub={`${fmt(kpis.activePolls)} active • ${fmt(kpis.completedPolls)} completed`}
        />
        <Kpi
          icon={Vote}
          color="emerald"
          label="Poll Votes"
          value={fmt(kpis.totalPollVotes)}
          sub={`${fmt(kpis.recentVotes30d)} in last 30d`}
        />
        <Kpi
          icon={Activity}
          color="rose"
          label="Active Followers"
          value={fmt(kpis.totalFollowers)}
          sub={
            <span>
              <span className="text-emerald-600">+{fmt(kpis.recentFollows30d)}</span>
              {' / '}
              <span className="text-rose-600">-{fmt(kpis.recentUnfollows30d)}</span> (30d)
            </span>
          }
        />
        <Kpi
          icon={MapPin}
          color="blue"
          label="Registered Voters"
          value={fmt(kpis.registeredVotersNational)}
          sub={`${fmt(kpis.pollingStations)} polling stations`}
        />
        <Kpi
          icon={Megaphone}
          color="amber"
          label="Active Agents"
          value={fmt(kpis.activeAgents)}
          sub={`${fmt(kpis.agentReports)} reports • ${fmt(kpis.followInvitesSent)} invites sent`}
        />
        <Kpi
          icon={Sparkles}
          color="emerald"
          label="Platform Coverage"
          value={`${totalCoverage.toFixed(2)}%`}
          sub="Users / registered voters (national)"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="growth">Growth & Engagement</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="candidates">Candidates & Parties</TabsTrigger>
          <TabsTrigger value="polls">Polls</TabsTrigger>
          <TabsTrigger value="coverage">Voter Coverage</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        {/* GROWTH */}
        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">User Growth (90 days)</CardTitle>
              <CardDescription>New sign-ups per day vs cumulative total</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={growth.daily.map((d, i) => ({ ...d, total: growth.cumulative[i]?.totalUsers }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="newUsers" name="New users" fill={COLORS.blue} />
                  <Line yAxisId="right" type="monotone" dataKey="total" name="Cumulative" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Poll Voting Activity (30 days)</CardTitle>
              <CardDescription>Votes cast across all polls per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={engagement.votesPerDay}>
                  <defs>
                    <linearGradient id="vG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="votes" stroke={COLORS.emerald} fill="url(#vG)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DEMOGRAPHICS */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <PieCard title="Gender (all users)" data={genderPie} />
            <PieCard title="Age brackets" data={agePie} />
            <PieCard title="By role" data={rolePie} />
          </div>
        </TabsContent>

        {/* CANDIDATES */}
        <TabsContent value="candidates" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Candidates by position</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={positionBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="position" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="candidates" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top parties (by candidate count)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={candidates.byParty} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="abbreviation" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any, _name, p: any) => [
                        `${value} (${p?.payload?.verified ?? 0} verified)`,
                        p?.payload?.name,
                      ]}
                    />
                    <Bar dataKey="count" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top candidates by followers</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Position</th>
                    <th className="text-left p-3">Party</th>
                    <th className="text-right p-3">Followers</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.top.map((c, i) => (
                    <tr key={c.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {POSITION_LABELS[c.position] || c.position}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{c.party}</td>
                      <td className="p-3 text-right font-semibold">{fmt(c.followers)}</td>
                    </tr>
                  ))}
                  {candidates.top.length === 0 && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                        No candidates yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Candidate-to-candidate network */}
          {data.candidateNetwork && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Candidates following other candidates
                  </CardTitle>
                  <CardDescription>
                    {fmt(data.candidateNetwork.candidatesFollowing)} candidates have{' '}
                    {fmt(data.candidateNetwork.totalRelationships)} follow relationships with
                    peers
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Candidate</th>
                        <th className="text-right p-3">Follows # peers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.candidateNetwork.topFollowers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-6 text-center text-muted-foreground">
                            No candidate-to-candidate follows yet
                          </td>
                        </tr>
                      ) : (
                        data.candidateNetwork.topFollowers.map((r) => (
                          <tr key={r.candidateId} className="border-b">
                            <td className="p-3 font-medium">{r.name}</td>
                            <td className="p-3 text-right">{fmt(r.count)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Most followed by peers</CardTitle>
                  <CardDescription>
                    Candidates other candidates choose to follow
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Candidate</th>
                        <th className="text-right p-3">Followed by # peers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.candidateNetwork.mostFollowedByPeers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-6 text-center text-muted-foreground">
                            No data
                          </td>
                        </tr>
                      ) : (
                        data.candidateNetwork.mostFollowedByPeers.map((r) => (
                          <tr key={r.candidateId} className="border-b">
                            <td className="p-3 font-medium">{r.name}</td>
                            <td className="p-3 text-right">{fmt(r.count)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* POLLS */}
        <TabsContent value="polls" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Polls by position</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pollPositionBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="position" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="polls" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Polls by status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pollStatusBars}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {pollStatusBars.map((_, i) => (
                        <Cell key={i} fill={PIE[i % PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* COVERAGE */}
        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top counties by registered voters</CardTitle>
              <CardDescription>
                Platform reach (users & followers) compared to registered voter rolls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={voterCoverage.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="countyName"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="registeredVoters" name="Registered voters" fill={COLORS.slate} />
                  <Bar dataKey="platformUsers" name="Platform users" fill={COLORS.blue} />
                  <Bar dataKey="platformFollowers" name="Followers" fill={COLORS.emerald} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coverage table</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">County</th>
                    <th className="text-right p-3">Registered voters</th>
                    <th className="text-right p-3">Platform users</th>
                    <th className="text-right p-3">Coverage</th>
                    <th className="text-right p-3">Followers</th>
                    <th className="text-right p-3">Follower %</th>
                  </tr>
                </thead>
                <tbody>
                  {voterCoverage.map((c) => (
                    <tr key={c.countyId} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.countyName}</td>
                      <td className="p-3 text-right">{fmt(c.registeredVoters)}</td>
                      <td className="p-3 text-right">{fmt(c.platformUsers)}</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="text-xs">
                          {c.coveragePct.toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{fmt(c.platformFollowers)}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {c.followerPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENTS */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Top recruiters (last 90 days)
              </CardTitle>
              <CardDescription>
                Agents (and other inviters) ranked by SMS follow invitations sent and delivered.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Inviter</th>
                    <th className="text-left p-3">For candidate</th>
                    <th className="text-right p-3">Invites sent</th>
                    <th className="text-right p-3">Delivered</th>
                    <th className="text-right p-3">Conv. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRecruitment.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        No recruitment activity yet.
                      </td>
                    </tr>
                  ) : (
                    agentRecruitment.map((a, i) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-medium">
                          {i === 0 && (
                            <Trophy className="inline h-3 w-3 text-amber-500 mr-1" />
                          )}
                          {a.agentName}
                        </td>
                        <td className="p-3 text-muted-foreground">{a.candidate}</td>
                        <td className="p-3 text-right">{fmt(a.invitesSent)}</td>
                        <td className="p-3 text-right">{fmt(a.delivered)}</td>
                        <td className="p-3 text-right">
                          {a.invitesSent > 0
                            ? `${((a.delivered / a.invitesSent) * 100).toFixed(0)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground text-right">
        Generated {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------- helpers ----------
function Kpi({
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
  const map: Record<string, string> = {
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
          <div className={`p-2 rounded-lg ${map[color]}`}>
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

function PieCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE[i % PIE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
