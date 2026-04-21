'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  BarChart3, 
  MapPin, 
  Users, 
  Clock,
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CandidateResult {
  id?: string;
  candidateId?: string;
  name: string;
  avatar?: string | null;
  party: string;
  votes: number;
  percentage: number;
}

interface CountyResult {
  countyId: string;
  countyName: string;
  totalVotes: number;
  candidates: CandidateResult[];
}

interface GenderResult {
  gender: string;
  votes: number;
  percentage: number;
}

interface AgeResult {
  age: string;
  votes: number;
  percentage: number;
}

interface PollDetails {
  id: string;
  title: string;
  description: string | null;
  position: string;
  status: string;
  start_time: string;
  end_time: string;
  total_votes: number;
  county?: { id: string; name: string } | null;
  constituency?: { id: string; name: string } | null;
  ward?: { id: string; name: string } | null;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'Presidential',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'Member of Parliament',
  mca: 'MCA',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-500', text: 'text-gray-500', label: 'Draft' },
  scheduled: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Scheduled' },
  active: { bg: 'bg-green-500', text: 'text-green-500', label: 'Active' },
  completed: { bg: 'bg-purple-500', text: 'text-purple-500', label: 'Completed' },
  cancelled: { bg: 'bg-red-500', text: 'text-red-500', label: 'Cancelled' },
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not Specified',
};

export default function PollResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [poll, setPoll] = useState<PollDetails | null>(null);
  const [candidateResults, setCandidateResults] = useState<CandidateResult[]>([]);
  const [countyResults, setCountyResults] = useState<CountyResult[]>([]);
  const [genderResults, setGenderResults] = useState<GenderResult[]>([]);
  const [ageResults, setAgeResults] = useState<AgeResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (resolvedParams?.id) {
      fetchPollData();
    }
  }, [resolvedParams?.id]);

  // Auto-refresh for active polls
  useEffect(() => {
    if (autoRefresh && poll?.status === 'active') {
      const interval = setInterval(fetchResults, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, poll?.status]);

  const fetchPollData = async () => {
    if (!resolvedParams?.id) return;
    setIsLoading(true);
    try {
      // Fetch poll details and overall results
      const pollRes = await fetch(`/api/admin/polls/${resolvedParams.id}`);
      if (pollRes.ok) {
        const data = await pollRes.json();
        setPoll(data.poll);
        setCandidateResults(data.candidateResults || []);
        setTotalVotes(data.totalVotes || 0);
      }

      // Fetch regional breakdown
      await fetchResults();
    } catch (error) {
      console.error('Failed to fetch poll data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!resolvedParams?.id) return;
    try {
      const resultsRes = await fetch(`/api/admin/polls/${resolvedParams.id}/results`);
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setCountyResults(data.byCounty || []);
        setGenderResults(data.byGender || []);
        setAgeResults(data.byAge || []);
        setTotalVotes(data.totalVotes || 0);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-medium mb-2">Poll not found</h3>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[poll.status] || STATUS_STYLES.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{POSITION_LABELS[poll.position]}</Badge>
              <Badge className={`${statusStyle.bg} text-white`}>
                {statusStyle.label}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold">{poll.title}</h1>
            {poll.description && (
              <p className="text-muted-foreground mt-1">{poll.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {poll.status === 'active' && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
          )}
          <Button variant="outline" onClick={fetchPollData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Votes
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVotes.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Counties Reached
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countyResults.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Candidates
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{candidateResults.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time Remaining
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {poll.status === 'active' 
                ? Math.max(0, Math.ceil((new Date(poll.end_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) + ' days'
                : poll.status === 'completed' ? 'Ended' : 'Not Started'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="regions">By Region</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overall Results</CardTitle>
              <CardDescription>
                Current standings based on {totalVotes.toLocaleString()} votes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidateResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No votes recorded yet
                </p>
              ) : (
                candidateResults.map((candidate, index) => (
                  <div key={candidate.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">{candidate.party}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{candidate.votes.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={candidate.percentage} 
                      className={`h-3 ${index === 0 ? '' : 'opacity-70'}`}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Poll Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="font-medium">{formatDate(poll.start_time)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">{formatDate(poll.end_time)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Results Tab */}
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Results by County</CardTitle>
              <CardDescription>
                Vote breakdown across {countyResults.length} counties
              </CardDescription>
            </CardHeader>
            <CardContent>
              {countyResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No regional data available yet
                </p>
              ) : (
                <div className="space-y-6">
                  {countyResults.map((county) => (
                    <div key={county.countyId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold">{county.countyName}</h4>
                        </div>
                        <Badge variant="outline">
                          {county.totalVotes.toLocaleString()} votes
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {county.candidates.slice(0, 3).map((candidate, idx) => (
                          <div key={candidate.candidateId || candidate.id || idx} className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                              {idx + 1}.
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between text-sm">
                                <span>{candidate.name} ({candidate.party})</span>
                                <span className="font-medium">
                                  {candidate.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <Progress value={candidate.percentage} className="h-1.5 mt-1" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gender Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>By Gender</CardTitle>
              </CardHeader>
              <CardContent>
                {genderResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No demographic data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {genderResults.map((item) => (
                      <div key={item.gender} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{GENDER_LABELS[item.gender] || item.gender}</span>
                          <span className="font-medium">
                            {item.votes.toLocaleString()} ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Age Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>By Age Group</CardTitle>
              </CardHeader>
              <CardContent>
                {ageResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No demographic data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {ageResults.map((item) => (
                      <div key={item.age} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{item.age}</span>
                          <span className="font-medium">
                            {item.votes.toLocaleString()} ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
