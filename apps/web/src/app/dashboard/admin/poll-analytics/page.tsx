'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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
  BarChart3,
  Loader2,
  AlertCircle,
  Users,
  Vote,
  MapPin,
  PieChart as PieIcon,
  Trophy,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
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
  president: 'Presidential',
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
const fmt = (n: number | undefined | null) => (n ?? 0).toLocaleString();

interface County {
  id: string;
  name: string;
}
interface Poll {
  id: string;
  title: string;
  position: string;
}

interface OverallResp {
  view: 'overall';
  summary: any;
  leaderboard: Array<{
    candidateId: string;
    name: string;
    party: string;
    position: string;
    votes: number;
    share: number;
  }>;
  votesPerDay: Array<{ date: string; votes: number }>;
  positions: Record<string, number>;
}
interface RegionResp {
  view: 'region';
  level: 'county' | 'constituency' | 'ward';
  summary: any;
  regions: Array<{
    regionId: string;
    regionName: string;
    totalVotes: number;
    registeredVoters: number;
    turnoutPct: number;
    candidates: Array<{
      candidateId: string;
      name: string;
      party: string;
      votes: number;
      share: number;
    }>;
  }>;
}
interface DemoResp {
  view: 'demographics';
  summary: any;
  gender: { totals: Record<string, number>; byCandidate: Array<any> };
  age: { totals: Record<string, number>; byCandidate: Array<any> };
}
interface CandResp {
  view: 'candidates';
  summary: any;
  candidate: { id: string; name: string; party: string; votes: number; share: number };
  regions: Array<{ regionId: string; regionName: string; votes: number }>;
  gender: Record<string, number>;
  age: Record<string, number>;
}

export default function PollAnalyticsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [counties, setCounties] = useState<County[]>([]);

  // Filters
  const [pollId, setPollId] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [regionType, setRegionType] = useState<'' | 'county' | 'constituency' | 'ward'>('');
  const [regionId, setRegionId] = useState<string>('');

  // Drill-down candidate
  const [drillCandidate, setDrillCandidate] = useState<string | null>(null);

  // Tab / view
  const [view, setView] = useState<'overall' | 'region' | 'demographics'>('overall');

  // Data buckets
  const [overall, setOverall] = useState<OverallResp | null>(null);
  const [regional, setRegional] = useState<RegionResp | null>(null);
  const [demo, setDemo] = useState<DemoResp | null>(null);
  const [drill, setDrill] = useState<CandResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // load polls + counties for filters
  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch('/api/admin/polls?limit=200'),
          fetch('/api/regions/counties'),
        ]);
        if (pRes.ok) {
          const d = await pRes.json();
          setPolls(
            (d.polls || []).map((p: any) => ({
              id: p.id,
              title: p.title,
              position: p.position,
            })),
          );
        }
        if (cRes.ok) {
          const d = await cRes.json();
          setCounties(d.counties || []);
        }
      } catch (e) {
        // non-fatal
      }
    })();
  }, []);

  const buildQs = useCallback(
    (extra: Record<string, string> = {}) => {
      const q = new URLSearchParams();
      if (pollId) q.set('poll_id', pollId);
      if (position) q.set('position', position);
      if (regionType && regionId) {
        q.set('region_type', regionType);
        q.set('region_id', regionId);
      }
      Object.entries(extra).forEach(([k, v]) => v && q.set(k, v));
      return q.toString();
    },
    [pollId, position, regionType, regionId],
  );

  const fetchView = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildQs({ view });
      // For region view, default level to county if regionType not set
      const finalQs =
        view === 'region' && !regionType
          ? `${qs}&region_type=county`
          : qs;
      const res = await fetch(`/api/admin/analytics/polls?${finalQs}`);
      if (!res.ok) {
        setError('Failed to load analytics');
        return;
      }
      const data = await res.json();
      if (view === 'overall') setOverall(data);
      if (view === 'region') setRegional(data);
      if (view === 'demographics') setDemo(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [buildQs, view, regionType]);

  useEffect(() => {
    fetchView();
  }, [fetchView]);

  const fetchDrill = useCallback(
    async (candidateId: string) => {
      setLoading(true);
      try {
        const qs = buildQs({ view: 'candidates', candidate_id: candidateId });
        const res = await fetch(`/api/admin/analytics/polls?${qs}`);
        if (res.ok) setDrill(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [buildQs],
  );

  const openDrill = (cid: string) => {
    setDrillCandidate(cid);
    fetchDrill(cid);
  };
  const closeDrill = () => {
    setDrillCandidate(null);
    setDrill(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Poll Analytics</h1>
          <p className="text-muted-foreground">
            Deep view across polls — overall, regional and demographic, with candidate drill-down.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchView}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">Poll</label>
            <select
              value={pollId}
              onChange={(e) => setPollId(e.target.value)}
              className="w-full mt-1 border rounded-md px-2 py-1.5 bg-background text-sm"
            >
              <option value="">All polls</option>
              {polls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Position</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full mt-1 border rounded-md px-2 py-1.5 bg-background text-sm"
            >
              <option value="">All positions</option>
              {Object.entries(POSITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Region level</label>
            <select
              value={regionType}
              onChange={(e) => {
                setRegionType(e.target.value as any);
                setRegionId('');
              }}
              className="w-full mt-1 border rounded-md px-2 py-1.5 bg-background text-sm"
            >
              <option value="">National</option>
              <option value="county">County</option>
              <option value="constituency">Constituency</option>
              <option value="ward">Ward</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {regionType ? regionType[0].toUpperCase() + regionType.slice(1) : 'County'}
            </label>
            <select
              value={regionId}
              disabled={regionType !== 'county'}
              onChange={(e) => setRegionId(e.target.value)}
              className="w-full mt-1 border rounded-md px-2 py-1.5 bg-background text-sm disabled:opacity-50"
            >
              <option value="">— any —</option>
              {regionType === 'county' &&
                counties.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <SummaryKpis
        summary={overall?.summary || regional?.summary || demo?.summary}
      />

      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Drill-down overlay */}
      {drillCandidate && drill && (
        <CandidateDrillDown drill={drill} onClose={closeDrill} loading={loading} />
      )}

      {/* Tabbed view */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="region">Regional</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4">
          {loading && !overall ? (
            <Spinner />
          ) : overall ? (
            <OverallView data={overall} onDrill={openDrill} />
          ) : (
            <Empty />
          )}
        </TabsContent>

        <TabsContent value="region" className="space-y-4">
          {loading && !regional ? (
            <Spinner />
          ) : regional ? (
            <RegionView data={regional} onDrill={openDrill} />
          ) : (
            <Empty />
          )}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          {loading && !demo ? (
            <Spinner />
          ) : demo ? (
            <DemographicsView data={demo} onDrill={openDrill} />
          ) : (
            <Empty />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- Sub views ----------------
function SummaryKpis({ summary }: { summary: any }) {
  if (!summary) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <KpiCard icon={Vote} color="emerald" label="Total votes" value={fmt(summary.totalVotes)} />
      <KpiCard
        icon={Users}
        color="blue"
        label="Registered voters"
        value={fmt(summary.registeredVoters)}
        sub={summary.regionLabel}
      />
      <KpiCard
        icon={BarChart3}
        color="purple"
        label="Turnout"
        value={`${(summary.turnoutPct ?? 0).toFixed(2)}%`}
        sub="Votes / registered"
      />
      <KpiCard
        icon={MapPin}
        color="amber"
        label="Polls covered"
        value={fmt(summary.pollsCovered)}
      />
      <KpiCard
        icon={Trophy}
        color="rose"
        label="Candidates"
        value={fmt(summary.candidatesCovered)}
      />
    </div>
  );
}

function OverallView({
  data,
  onDrill,
}: {
  data: OverallResp;
  onDrill: (cid: string) => void;
}) {
  const top = data.leaderboard.slice(0, 12);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top candidates by votes</CardTitle>
            <CardDescription>Across the current filter</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="votes" fill={COLORS.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Votes per day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.votesPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="votes" stroke={COLORS.emerald} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Leaderboard</CardTitle>
          <CardDescription>Click a row to drill down</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Candidate</th>
                <th className="text-left p-3">Party</th>
                <th className="text-left p-3">Position</th>
                <th className="text-right p-3">Votes</th>
                <th className="text-right p-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((r, i) => (
                <tr
                  key={r.candidateId}
                  onClick={() => onDrill(r.candidateId)}
                  className="border-b hover:bg-muted/40 cursor-pointer"
                >
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium">
                    {i === 0 && <Trophy className="inline h-3 w-3 text-amber-500 mr-1" />}
                    {r.name}
                  </td>
                  <td className="p-3 text-muted-foreground">{r.party}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {POSITION_LABELS[r.position] || r.position}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">{fmt(r.votes)}</td>
                  <td className="p-3 text-right">{r.share.toFixed(1)}%</td>
                </tr>
              ))}
              {data.leaderboard.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No votes recorded for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function RegionView({
  data,
  onDrill,
}: {
  data: RegionResp;
  onDrill: (cid: string) => void;
}) {
  const chartData = data.regions.slice(0, 15).map((r) => ({
    region: r.regionName,
    votes: r.totalVotes,
    registered: r.registeredVoters,
    turnout: Number(r.turnoutPct.toFixed(2)),
  }));
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Votes vs registered voters by {data.level}
          </CardTitle>
          <CardDescription>
            Bars: votes &amp; registered • Line: turnout %
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="region"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                unit="%"
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="registered" name="Registered" fill={COLORS.slate} />
              <Bar yAxisId="left" dataKey="votes" name="Votes" fill={COLORS.emerald} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="turnout"
                name="Turnout %"
                stroke={COLORS.purple}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By {data.level} (top candidate per region)</CardTitle>
          <CardDescription>Click a candidate to drill down</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">{data.level}</th>
                <th className="text-right p-3">Registered</th>
                <th className="text-right p-3">Votes</th>
                <th className="text-right p-3">Turnout</th>
                <th className="text-left p-3">Leader</th>
                <th className="text-right p-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.regions.map((r) => {
                const leader = r.candidates[0];
                return (
                  <tr key={r.regionId} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.regionName}</td>
                    <td className="p-3 text-right">{fmt(r.registeredVoters)}</td>
                    <td className="p-3 text-right">{fmt(r.totalVotes)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="text-xs">
                        {r.turnoutPct.toFixed(2)}%
                      </Badge>
                    </td>
                    <td className="p-3">
                      {leader ? (
                        <button
                          onClick={() => onDrill(leader.candidateId)}
                          className="hover:underline text-primary text-left"
                        >
                          {leader.name} <span className="text-muted-foreground">({leader.party})</span>
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {leader ? `${leader.share.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
              {data.regions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No regional vote data for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function DemographicsView({
  data,
  onDrill,
}: {
  data: DemoResp;
  onDrill: (cid: string) => void;
}) {
  const genderPie = Object.entries(data.gender.totals).map(([k, v]) => ({
    name: GENDER_LABELS[k] || k,
    value: v,
  }));
  const agePie = Object.entries(data.age.totals).map(([k, v]) => ({
    name: k,
    value: v,
  }));
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Votes by gender</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={genderPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {genderPie.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Votes by age bracket</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agePie}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top candidate per gender cohort</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">Cohort</th>
                <th className="text-right p-3">Cohort votes</th>
                <th className="text-left p-3">Top candidate</th>
                <th className="text-right p-3">Votes</th>
                <th className="text-right p-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.gender.byCandidate.map((c: any) => {
                const top = c.candidates[0];
                return (
                  <tr key={c.cohort} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{GENDER_LABELS[c.cohort] || c.cohort}</td>
                    <td className="p-3 text-right">{fmt(c.votes)}</td>
                    <td className="p-3">
                      {top ? (
                        <button
                          onClick={() => onDrill(top.candidateId)}
                          className="hover:underline text-primary"
                        >
                          {top.name} ({top.party})
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">{top ? fmt(top.votes) : '—'}</td>
                    <td className="p-3 text-right">{top ? `${top.share.toFixed(1)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top candidate per age cohort</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">Age</th>
                <th className="text-right p-3">Cohort votes</th>
                <th className="text-left p-3">Top candidate</th>
                <th className="text-right p-3">Votes</th>
                <th className="text-right p-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {data.age.byCandidate.map((c: any) => {
                const top = c.candidates[0];
                return (
                  <tr key={c.cohort} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{c.cohort}</td>
                    <td className="p-3 text-right">{fmt(c.votes)}</td>
                    <td className="p-3">
                      {top ? (
                        <button
                          onClick={() => onDrill(top.candidateId)}
                          className="hover:underline text-primary"
                        >
                          {top.name} ({top.party})
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right">{top ? fmt(top.votes) : '—'}</td>
                    <td className="p-3 text-right">{top ? `${top.share.toFixed(1)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function CandidateDrillDown({
  drill,
  onClose,
  loading,
}: {
  drill: CandResp;
  onClose: () => void;
  loading: boolean;
}) {
  const c = drill.candidate;
  const regionData = drill.regions.slice(0, 12);
  const genderData = Object.entries(drill.gender).map(([k, v]) => ({
    name: GENDER_LABELS[k] || k,
    value: v,
  }));
  const ageData = Object.entries(drill.age).map(([k, v]) => ({ name: k, value: v }));
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Drill-down: {c.name}{' '}
              <Badge variant="outline" className="text-xs">
                {c.party}
              </Badge>
            </CardTitle>
            <CardDescription>
              {fmt(c.votes)} votes • {c.share.toFixed(1)}% share of scope •
              registered: {fmt(drill.summary.registeredVoters)} • turnout:{' '}
              {drill.summary.turnoutPct.toFixed(2)}%
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Top counties</p>
              {regionData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No regional data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={regionData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="regionName" type="category" width={90} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="votes" fill={COLORS.emerald} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">By gender</p>
              {genderData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No gender data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75}>
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={PIE[i % PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">By age</p>
              {ageData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No age data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
            {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
function Empty() {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <PieIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No data</p>
    </div>
  );
}
