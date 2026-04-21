'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Users,
  Clock,
  MapPin,
  ChevronRight,
  UserCircle,
  Calendar as CalendarIcon,
  BarChart3,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PollStatusBadge,
  PollResultsChart,
  DemographicBreakdown,
  POSITION_LABELS,
} from '@/components/polls';
import type { PollResultsByRegion } from '@/components/polls';
import { usePollRealtime } from '@/hooks/use-poll-realtime';

interface PollDetail {
  id: string;
  title: string;
  description: string | null;
  position: string;
  status: string;
  start_time: string;
  end_time: string;
  total_votes: number;
  is_party_nomination: boolean;
  county?: { id: string; name: string } | null;
  constituency?: { id: string; name: string } | null;
  ward?: { id: string; name: string } | null;
  party?: { id: string; name: string; abbreviation: string } | null;
  creator?: { id: string; full_name: string } | null;
}

interface CandidateResult {
  id: string;
  name: string;
  avatar?: string;
  party: string;
  votes: number;
  percentage: number;
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

export default function AdminPollResultsPage() {
  const params = useParams();
  const pollId = params?.id as string;

  const [poll, setPoll] = useState<PollDetail | null>(null);
  const [candidateResults, setCandidateResults] = useState<CandidateResult[]>([]);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('county');
  const [selectedCounty, setSelectedCounty] = useState<{ id: string; name: string } | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<{ id: string; name: string } | null>(null);
  const [drillData, setDrillData] = useState<PollResultsByRegion[]>([]);

  const [liveVoteCount, setLiveVoteCount] = useState<number>(0);

  usePollRealtime({
    pollId,
    onVoteUpdate: (_id, count) => {
      setLiveVoteCount(count);
      // Refresh data on new votes
      fetchPollDetails();
      fetchResults();
    },
    enabled: poll?.status === 'active',
  });

  const fetchPollDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/polls/${pollId}`);
      if (response.ok) {
        const data = await response.json();
        setPoll(data.poll);
        setCandidateResults(data.candidateResults || []);
        setLiveVoteCount(data.totalVotes);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to load poll');
      }
    } catch (err) {
      setError('Failed to load poll details');
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

      const response = await fetch(`/api/admin/polls/${pollId}/results?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (!regionType) {
          setResults(data);
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setIsLoadingResults(false);
    }
    return null;
  }, [pollId]);

  useEffect(() => {
    fetchPollDetails();
    fetchResults();
  }, [fetchPollDetails, fetchResults]);

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

  const handleRefresh = () => {
    fetchPollDetails();
    fetchResults();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/admin/polls">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Poll Management
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {error || 'Poll not found'}
            </h3>
            <Button asChild>
              <Link href="/dashboard/admin/polls">Return to Polls</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayVotes = liveVoteCount || poll.total_votes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2" asChild>
            <Link href="/dashboard/admin/polls">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Poll Management
            </Link>
          </Button>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline">{POSITION_LABELS[poll.position] || poll.position}</Badge>
            <PollStatusBadge status={poll.status} />
            {poll.is_party_nomination && poll.party && (
              <Badge variant="secondary">{poll.party.abbreviation} Nomination</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold">{poll.title}</h1>
          {poll.description && (
            <p className="text-muted-foreground mt-1">{poll.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Votes</p>
                <p className="text-2xl font-bold">{displayVotes.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Candidates</p>
                <p className="text-2xl font-bold">{candidateResults.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Started</p>
                <p className="text-sm font-medium">
                  {new Date(poll.start_time).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {poll.status === 'active' ? 'Ends' : 'Ended'}
                </p>
                <p className="text-sm font-medium">
                  {new Date(poll.end_time).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Candidate Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Candidate Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidateResults.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No votes recorded yet
            </p>
          ) : (
            candidateResults.map((candidate, index) => (
              <div key={candidate.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {candidate.name.charAt(0)}
                    </div>
                    <div>
                      <span className={index === 0 ? 'font-semibold' : 'font-medium'}>
                        {candidate.name}
                      </span>
                      <span className="text-muted-foreground ml-2">({candidate.party})</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{candidate.percentage.toFixed(1)}%</span>
                    <span className="text-muted-foreground ml-2">
                      ({candidate.votes.toLocaleString()} votes)
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
              title="Votes by Gender"
              data={results.byGender.map((g) => ({
                label: g.gender,
                votes: g.votes,
                percentage: g.percentage,
              }))}
              totalVotes={results.totalVotes}
              icon={<UserCircle className="h-5 w-5" />}
            />
            <DemographicBreakdown
              title="Votes by Age Bracket"
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

      {/* Region scope info */}
      {(poll.county || poll.constituency || poll.ward) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                Regional scope:{' '}
                {[poll.county?.name, poll.constituency?.name, poll.ward?.name]
                  .filter(Boolean)
                  .join(' → ') || 'National'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
