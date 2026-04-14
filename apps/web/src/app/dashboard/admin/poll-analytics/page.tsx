'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Loader2,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Eye,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PollStatusBadge, POSITION_LABELS } from '@/components/polls';

interface PollSummary {
  id: string;
  title: string;
  position: string;
  positionLabel: string;
  status: string;
  total_votes: number;
  start_time: string;
  end_time: string;
  is_party_nomination: boolean;
  party?: { id: string; name: string; abbreviation: string } | null;
  county?: { id: string; name: string } | null;
}

interface AnalyticsOverview {
  totalPolls: number;
  activePolls: number;
  completedPolls: number;
  totalVotes: number;
  pollsByPosition: Record<string, number>;
}

export default function PollAnalyticsPage() {
  const [polls, setPolls] = useState<PollSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview>({
    totalPolls: 0,
    activePolls: 0,
    completedPolls: 0,
    totalVotes: 0,
    pollsByPosition: {},
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/polls?limit=100');
      if (response.ok) {
        const data = await response.json();
        const pollList: PollSummary[] = data.polls || [];
        setPolls(pollList);

        // Compute analytics overview
        const active = pollList.filter((p) => p.status === 'active');
        const completed = pollList.filter((p) => p.status === 'completed');
        const totalVotes = pollList.reduce((sum, p) => sum + (p.total_votes || 0), 0);
        const byPosition: Record<string, number> = {};
        pollList.forEach((p) => {
          byPosition[p.position] = (byPosition[p.position] || 0) + 1;
        });

        setOverview({
          totalPolls: pollList.length,
          activePolls: active.length,
          completedPolls: completed.length,
          totalVotes,
          pollsByPosition: byPosition,
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const topPolls = [...polls]
    .filter((p) => p.status === 'active' || p.status === 'completed')
    .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Poll Analytics</h1>
        <p className="text-muted-foreground">
          Overview of all polls, vote distribution, and engagement metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Polls</p>
                <p className="text-2xl font-bold">{overview.totalPolls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Polls</p>
                <p className="text-2xl font-bold">{overview.activePolls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{overview.completedPolls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Votes</p>
                <p className="text-2xl font-bold">
                  {overview.totalVotes.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Polls by Position */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Polls by Position</CardTitle>
          <CardDescription>Distribution of polls across electoral positions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(overview.pollsByPosition).length === 0 ? (
            <p className="text-center py-4 text-muted-foreground text-sm">
              No polls created yet
            </p>
          ) : (
            Object.entries(overview.pollsByPosition)
              .sort(([, a], [, b]) => b - a)
              .map(([position, count]) => (
                <div key={position} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {POSITION_LABELS[position] || position}
                    </span>
                    <span className="text-muted-foreground">
                      {count} poll{count !== 1 ? 's' : ''} (
                      {overview.totalPolls > 0
                        ? ((count / overview.totalPolls) * 100).toFixed(0)
                        : 0}
                      %)
                    </span>
                  </div>
                  <Progress
                    value={
                      overview.totalPolls > 0
                        ? (count / overview.totalPolls) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>
              ))
          )}
        </CardContent>
      </Card>

      {/* Top Polls by Votes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Polls by Engagement</CardTitle>
          <CardDescription>
            Most voted polls (active and completed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPolls.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No active or completed polls yet
            </p>
          ) : (
            <div className="space-y-3">
              {topPolls.map((poll, index) => (
                <div
                  key={poll.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{poll.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {POSITION_LABELS[poll.position] || poll.position}
                        </Badge>
                        <PollStatusBadge status={poll.status} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        {(poll.total_votes || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">votes</p>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/admin/polls/${poll.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/dashboard/admin/polls">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Manage Polls</p>
                  <p className="text-sm text-muted-foreground">
                    Create, edit, and manage all polls
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/polls">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Public Polls View</p>
                  <p className="text-sm text-muted-foreground">
                    See polls as voters see them
                  </p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
