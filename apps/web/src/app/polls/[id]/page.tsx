'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  MapPin,
  ChevronRight,
  UserCircle,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SiteHeader, SiteFooter } from '@/components/layout';
import {
  PollStatusBadge,
  PollResultsChart,
  DemographicBreakdown,
} from '@/components/polls';
import type { Poll, PollResultsByRegion } from '@/components/polls';
import { usePollRealtime } from '@/hooks/use-poll-realtime';

interface PollDetail extends Poll {
  candidateResults: {
    id: string;
    name: string;
    avatar?: string;
    party: string;
    votes: number;
    percentage: number;
  }[];
}

interface ResultsResponse {
  pollId: string;
  pollTitle: string;
  totalVotes: number;
  byCounty: PollResultsByRegion[];
  byConstituency: PollResultsByRegion[];
  byWard: PollResultsByRegion[];
  byGender: { gender: string; votes: number; percentage: number }[];
  byAge: { age: string; votes: number; percentage: number }[];
}

type DrillLevel = 'county' | 'constituency' | 'ward';

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params?.id as string;

  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Drill-down state
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('county');
  const [selectedCounty, setSelectedCounty] = useState<{ id: string; name: string } | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<{ id: string; name: string } | null>(null);
  const [drillData, setDrillData] = useState<PollResultsByRegion[]>([]);

  // Real-time vote updates
  const [liveVoteCount, setLiveVoteCount] = useState<number>(0);

  usePollRealtime({
    pollId,
    onVoteUpdate: (_id, count) => {
      setLiveVoteCount(count);
    },
    enabled: poll?.status === 'active',
  });

  const fetchPoll = useCallback(async () => {
    try {
      const response = await fetch(`/api/polls?status=all`);
      if (response.ok) {
        const data = await response.json();
        const found = data.polls?.find((p: any) => p.id === pollId);
        if (found) {
          setPoll(found);
          setLiveVoteCount(found.totalVotes);
        }
      }
    } catch (error) {
      console.error('Failed to fetch poll:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pollId]);

  const fetchResults = useCallback(async (regionType?: string, regionId?: string) => {
    setIsLoadingResults(true);
    try {
      const params = new URLSearchParams();
      if (regionType) params.set('region_type', regionType);
      if (regionId) params.set('region_id', regionId);

      const response = await fetch(`/api/polls/${pollId}/results?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (!regionType) {
          setResults(data);
        }
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setIsLoadingResults(false);
    }
    return null;
  }, [pollId]);

  useEffect(() => {
    fetchPoll();
    fetchResults();
  }, [fetchPoll, fetchResults]);

  const handleCountyDrillDown = async (countyId: string, countyName: string) => {
    setSelectedCounty({ id: countyId, name: countyName });
    setSelectedConstituency(null);
    setDrillLevel('constituency');
    const data = await fetchResults('county', countyId);
    if (data?.byConstituency) {
      setDrillData(data.byConstituency);
    }
  };

  const handleConstituencyDrillDown = async (constituencyId: string, constituencyName: string) => {
    setSelectedConstituency({ id: constituencyId, name: constituencyName });
    setDrillLevel('ward');
    const data = await fetchResults('constituency', constituencyId);
    if (data?.byWard) {
      setDrillData(data.byWard);
    }
  };

  const resetDrillDown = () => {
    setDrillLevel('county');
    setSelectedCounty(null);
    setSelectedConstituency(null);
    setDrillData([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 flex flex-col items-center justify-center py-20">
          <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-bold mb-2">Poll Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The poll you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button asChild>
            <Link href="/polls">Back to Polls</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const displayVotes = liveVoteCount || poll.totalVotes;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Header */}
        <section className="border-b bg-muted/30 py-8">
          <div className="container">
            <Button variant="ghost" size="sm" className="mb-4" asChild>
              <Link href="/polls">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Polls
              </Link>
            </Button>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{poll.positionLabel}</Badge>
                  <PollStatusBadge status={poll.status} />
                  {poll.hasVoted && (
                    <Badge variant="secondary">✓ You voted</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold">{poll.question}</h1>
                {poll.description && (
                  <p className="text-muted-foreground">{poll.description}</p>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {displayVotes.toLocaleString()} votes
                {poll.status === 'active' && (
                  <span className="ml-1 text-xs text-green-600">(live)</span>
                )}
              </span>
              {poll.endsAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {poll.status === 'active' ? 'Ends' : 'Ended'}{' '}
                  {new Date(poll.endsAt).toLocaleDateString('en-KE', {
                    dateStyle: 'medium',
                  })}
                </span>
              )}
              {poll.startsAt && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Started{' '}
                  {new Date(poll.startsAt).toLocaleDateString('en-KE', {
                    dateStyle: 'medium',
                  })}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Results Content */}
        <section className="py-8">
          <div className="container space-y-8">
            {/* Overall Results */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Overall Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {poll.options.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No candidates or votes recorded yet
                  </p>
                ) : (
                  poll.options.map((candidate, index) => (
                    <div key={candidate.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center text-muted-foreground font-bold">
                            {index + 1}
                          </span>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {candidate.candidateName.charAt(0)}
                          </div>
                          <div>
                            <span className={index === 0 ? 'font-semibold' : 'font-medium'}>
                              {candidate.candidateName}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ({candidate.party})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">
                            {candidate.percentage.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({candidate.votes.toLocaleString()})
                          </span>
                        </div>
                      </div>
                      <Progress value={candidate.percentage} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Regional Drill-Down */}
            {results && (
              <>
                {/* Breadcrumbs */}
                {drillLevel !== 'county' && (
                  <div className="flex items-center gap-2 text-sm">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={resetDrillDown}
                    >
                      All Counties
                    </Button>
                    {selectedCounty && (
                      <>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto"
                          onClick={() => {
                            setDrillLevel('constituency');
                            setSelectedConstituency(null);
                            handleCountyDrillDown(selectedCounty.id, selectedCounty.name);
                          }}
                        >
                          {selectedCounty.name}
                        </Button>
                      </>
                    )}
                    {selectedConstituency && (
                      <>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{selectedConstituency.name}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Regional results */}
                {isLoadingResults ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <PollResultsChart
                    title={
                      drillLevel === 'county'
                        ? 'Results by County'
                        : drillLevel === 'constituency'
                        ? `Results by Constituency — ${selectedCounty?.name}`
                        : `Results by Ward — ${selectedConstituency?.name}`
                    }
                    regions={drillLevel === 'county' ? results.byCounty : drillData}
                    totalVotes={results.totalVotes}
                    onRegionClick={
                      drillLevel === 'county'
                        ? handleCountyDrillDown
                        : drillLevel === 'constituency'
                        ? handleConstituencyDrillDown
                        : undefined
                    }
                    emptyMessage="No regional data available for this poll"
                  />
                )}

                {/* Demographics */}
                <div className="grid gap-6 md:grid-cols-2">
                  <DemographicBreakdown
                    title="By Gender"
                    data={results.byGender.map((g) => ({
                      label: g.gender,
                      votes: g.votes,
                      percentage: g.percentage,
                    }))}
                    totalVotes={results.totalVotes}
                    icon={<UserCircle className="h-5 w-5" />}
                  />
                  <DemographicBreakdown
                    title="By Age Bracket"
                    data={results.byAge.map((a) => ({
                      label: a.age,
                      votes: a.votes,
                      percentage: a.percentage,
                    }))}
                    totalVotes={results.totalVotes}
                    icon={<Users className="h-5 w-5" />}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
