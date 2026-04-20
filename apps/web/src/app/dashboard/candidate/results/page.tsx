'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Vote,
  BarChart3,
  TrendingUp,
  Trophy,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface PollResult {
  id: string;
  title: string;
  position: string;
  status: string;
  start_time: string;
  end_time: string;
  total_votes: number;
  my_votes: number;
  my_rank: number;
  total_candidates: number;
}

interface ElectionResult {
  id: string;
  position: string;
  polling_station: { name: string } | null;
  ward: { name: string } | null;
  constituency: { name: string } | null;
  county: { name: string } | null;
  votes: number;
  total_votes_in_region: number;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Rep",
  mp: 'MP',
  mca: 'MCA',
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
  completed: { bg: 'bg-gray-100 dark:bg-gray-900', text: 'text-gray-800 dark:text-gray-200' },
  scheduled: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
};

export default function CandidateResultsPage() {
  const router = useRouter();
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [electionResults, setElectionResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'polls' | 'elections'>('polls');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Get candidate info first
      const meRes = await fetch('/api/candidates/me');
      if (!meRes.ok) {
        setError('Could not load candidate profile');
        setLoading(false);
        return;
      }

      const meData = await meRes.json();
      const candidate = meData.candidate;

      // Fetch polls for this candidate's position/region
      const pollParams = new URLSearchParams({
        position: candidate.position,
      });
      if (candidate.county_id) pollParams.set('county_id', candidate.county_id);
      if (candidate.constituency_id) pollParams.set('constituency_id', candidate.constituency_id);
      if (candidate.ward_id) pollParams.set('ward_id', candidate.ward_id);

      const pollsRes = await fetch(`/api/polls?${pollParams}`);
      if (pollsRes.ok) {
        const pollsData = await pollsRes.json();
        const polls = pollsData.polls || [];

        // Get vote counts for each poll
        const resultsWithVotes = await Promise.all(
          polls.slice(0, 20).map(async (poll: any) => {
            try {
              const voteRes = await fetch(`/api/polls/${poll.id}/results`);
              if (voteRes.ok) {
                const voteData = await voteRes.json();
                const results = voteData.results || [];
                const totalVotes = results.reduce((sum: number, r: any) => sum + (r.vote_count || 0), 0);
                const myResult = results.find((r: any) => r.candidate_id === candidate.id);
                const myRank = results.findIndex((r: any) => r.candidate_id === candidate.id) + 1;

                return {
                  id: poll.id,
                  title: poll.title,
                  position: poll.position,
                  status: poll.status,
                  start_time: poll.start_time,
                  end_time: poll.end_time,
                  total_votes: totalVotes,
                  my_votes: myResult?.vote_count || 0,
                  my_rank: myRank || 0,
                  total_candidates: results.length,
                };
              }
            } catch (e) {
              // Skip this poll
            }
            return {
              id: poll.id,
              title: poll.title,
              position: poll.position,
              status: poll.status,
              start_time: poll.start_time,
              end_time: poll.end_time,
              total_votes: 0,
              my_votes: 0,
              my_rank: 0,
              total_candidates: 0,
            };
          })
        );

        setPollResults(resultsWithVotes);
      }

      // Fetch election results
      const electionRes = await fetch(`/api/results?candidate_id=${candidate.id}`);
      if (electionRes.ok) {
        const electionData = await electionRes.json();
        setElectionResults(electionData.results || []);
      }
    } catch (e) {
      setError('Failed to load results');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/candidate')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold mt-2">Results</h1>
        <p className="text-muted-foreground">
          View your performance in opinion polls and elections
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'polls' ? 'default' : 'outline'}
          onClick={() => setTab('polls')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Opinion Polls ({pollResults.length})
        </Button>
        <Button
          variant={tab === 'elections' ? 'default' : 'outline'}
          onClick={() => setTab('elections')}
        >
          <Vote className="h-4 w-4 mr-2" />
          Election Results ({electionResults.length})
        </Button>
      </div>

      {/* Poll Results */}
      {tab === 'polls' && (
        <div className="space-y-4">
          {pollResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Poll Results Yet</p>
                <p className="text-sm">Results will appear here when polls are conducted in your region</p>
              </CardContent>
            </Card>
          ) : (
            pollResults.map((poll) => {
              const percentage =
                poll.total_votes > 0
                  ? ((poll.my_votes / poll.total_votes) * 100).toFixed(1)
                  : '0';

              return (
                <Card key={poll.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{poll.title}</h3>
                          <Badge
                            className={`text-xs ${
                              STATUS_STYLES[poll.status]?.bg || 'bg-gray-100'
                            } ${STATUS_STYLES[poll.status]?.text || 'text-gray-800'}`}
                          >
                            {poll.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(poll.start_time).toLocaleDateString()} —{' '}
                            {new Date(poll.end_time).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {poll.total_candidates} candidates
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{poll.my_votes}</p>
                          <p className="text-xs text-muted-foreground">Your Votes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{percentage}%</p>
                          <p className="text-xs text-muted-foreground">Share</p>
                        </div>
                        {poll.my_rank > 0 && (
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {poll.my_rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                              <p className="text-2xl font-bold">#{poll.my_rank}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Rank</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vote bar */}
                    {poll.total_votes > 0 && (
                      <div className="mt-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {poll.my_votes} of {poll.total_votes} total votes
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Election Results */}
      {tab === 'elections' && (
        <div className="space-y-4">
          {electionResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No Election Results Yet</p>
                <p className="text-sm">
                  Election results will appear here once agents submit tallies from polling stations
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-medium">Region</th>
                        <th className="text-left p-4 font-medium">Votes</th>
                        <th className="text-left p-4 font-medium">Total in Region</th>
                        <th className="text-left p-4 font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {electionResults.map((result) => {
                        const region =
                          result.polling_station?.name ||
                          result.ward?.name ||
                          result.constituency?.name ||
                          result.county?.name ||
                          'Unknown';
                        const pct =
                          result.total_votes_in_region > 0
                            ? ((result.votes / result.total_votes_in_region) * 100).toFixed(1)
                            : '0';

                        return (
                          <tr key={result.id} className="border-b hover:bg-muted/30">
                            <td className="p-4 font-medium">{region}</td>
                            <td className="p-4">{result.votes.toLocaleString()}</td>
                            <td className="p-4 text-muted-foreground">
                              {result.total_votes_in_region.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
