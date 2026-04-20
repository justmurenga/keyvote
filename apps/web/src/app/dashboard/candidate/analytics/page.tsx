'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';

interface AnalyticsData {
  stats: {
    followerCount: number;
    agentCount: number;
    activePollCount: number;
    recentVotes: number;
  };
  demographics: {
    gender: Record<string, number>;
    age: Record<string, number>;
  };
  candidate: {
    position: string;
    follower_count: number;
    county: { name: string } | null;
    constituency: { name: string } | null;
    ward: { name: string } | null;
  };
}

const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  prefer_not_to_say: 'bg-gray-400',
  other: 'bg-gray-400',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not Specified',
  other: 'Other',
};

const AGE_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-pink-500',
];

export default function CandidateAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/candidates/me');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to load analytics');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

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
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const { stats, demographics } = data;
  const totalGender = Object.values(demographics.gender).reduce((a, b) => a + b, 0);
  const totalAge = Object.values(demographics.age).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/candidate')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold mt-2">Follower Analytics</h1>
        <p className="text-muted-foreground">
          Understand your voter base and campaign reach
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.followerCount}</p>
                <p className="text-xs text-muted-foreground">Total Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.recentVotes}</p>
                <p className="text-xs text-muted-foreground">Recent Poll Votes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activePollCount}</p>
                <p className="text-xs text-muted-foreground">Active Polls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <MapPin className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.agentCount}</p>
                <p className="text-xs text-muted-foreground">Active Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gender Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Breakdown</CardTitle>
            <CardDescription>Follower distribution by gender</CardDescription>
          </CardHeader>
          <CardContent>
            {totalGender === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No follower data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Bar visualization */}
                <div className="flex rounded-full h-6 overflow-hidden">
                  {Object.entries(demographics.gender).map(([gender, count]) => (
                    <div
                      key={gender}
                      className={`${GENDER_COLORS[gender] || 'bg-gray-400'} transition-all`}
                      style={{ width: `${(count / totalGender) * 100}%` }}
                      title={`${GENDER_LABELS[gender] || gender}: ${count}`}
                    />
                  ))}
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {Object.entries(demographics.gender).map(([gender, count]) => (
                    <div key={gender} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${GENDER_COLORS[gender] || 'bg-gray-400'}`} />
                        <span className="text-sm">{GENDER_LABELS[gender] || gender}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground">
                          ({((count / totalGender) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Age Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
            <CardDescription>Follower distribution by age bracket</CardDescription>
          </CardHeader>
          <CardContent>
            {totalAge === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No age data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(demographics.age).map(([bracket, count], idx) => (
                  <div key={bracket} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{bracket} years</span>
                      <span className="font-medium">
                        {count} ({((count / totalAge) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${AGE_COLORS[idx % AGE_COLORS.length]}`}
                        style={{ width: `${(count / totalAge) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Insights</CardTitle>
          <CardDescription>Key takeaways from your follower data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.followerCount === 0 ? (
              <p className="text-muted-foreground text-sm">
                Start building your follower base to see insights here. Share your profile
                and engage with voters in your region.
              </p>
            ) : (
              <>
                {/* Find dominant gender */}
                {Object.entries(demographics.gender).length > 0 && (() => {
                  const sorted = Object.entries(demographics.gender).sort((a, b) => b[1] - a[1]);
                  const dominant = sorted[0];
                  return (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-sm">
                        <strong>{((dominant[1] / totalGender) * 100).toFixed(0)}%</strong> of your
                        followers are <strong>{GENDER_LABELS[dominant[0]] || dominant[0]}</strong>.
                        Consider tailoring messaging for broader appeal.
                      </p>
                    </div>
                  );
                })()}

                {/* Find dominant age group */}
                {Object.entries(demographics.age).length > 0 && (() => {
                  const sorted = Object.entries(demographics.age).sort((a, b) => b[1] - a[1]);
                  const dominant = sorted[0];
                  return (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <BarChart3 className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                      <p className="text-sm">
                        Your largest age group is <strong>{dominant[0]}</strong> years
                        ({((dominant[1] / totalAge) * 100).toFixed(0)}% of followers).
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
