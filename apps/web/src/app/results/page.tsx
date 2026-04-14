'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Vote, MapPin, TrendingUp, Loader2, BarChart2, Users, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SiteHeader, SiteFooter } from '@/components/layout';

interface ResultCandidate {
  id: string;
  name: string;
  photoUrl?: string;
  partyName?: string;
  partyAbbreviation?: string;
  partyColor?: string;
  votes: number;
  percentage: number;
  isLeading: boolean;
}

interface ElectionResult {
  id: string;
  position: string;
  positionLabel: string;
  region: string;
  regionType: 'national' | 'county' | 'constituency' | 'ward' | 'polling_station';
  candidates: ResultCandidate[];
  totalVotes: number;
  stationsReporting: number;
  totalStations: number;
  reportingPercentage: number;
  status: 'live' | 'final' | 'preliminary';
  lastUpdated: string;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'Presidential',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Rep',
  mp: 'Member of Parliament',
  mca: 'MCA',
};

const POSITIONS = [
  { value: 'president', label: 'Presidential' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'MP' },
  { value: 'mca', label: 'MCA' },
];

function ResultCard({ result }: { result: ElectionResult }) {
  const leader = result.candidates.find(c => c.isLeading);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">{result.positionLabel}</Badge>
              {result.status === 'live' && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  LIVE
                </Badge>
              )}
              {result.status === 'final' && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Final
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {result.region}
            </CardTitle>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              {result.reportingPercentage.toFixed(1)}% reporting
            </div>
            <div className="text-xs">
              {result.stationsReporting.toLocaleString()} / {result.totalStations.toLocaleString()} stations
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.candidates.slice(0, 5).map((candidate, index) => (
          <div key={candidate.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 text-center text-muted-foreground font-medium">
                  {index + 1}
                </span>
                {candidate.photoUrl ? (
                  <img
                    src={candidate.photoUrl}
                    alt={candidate.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {candidate.name.charAt(0)}
                  </div>
                )}
                <div>
                  <span className={candidate.isLeading ? 'font-semibold' : ''}>
                    {candidate.name}
                  </span>
                  {candidate.partyAbbreviation && (
                    <span 
                      className="ml-1 text-xs"
                      style={{ color: candidate.partyColor || 'inherit' }}
                    >
                      ({candidate.partyAbbreviation})
                    </span>
                  )}
                </div>
                {candidate.isLeading && (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {candidate.votes.toLocaleString()}
                </span>
                <span className="w-16 text-right text-muted-foreground">
                  {candidate.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <Progress 
              value={candidate.percentage} 
              className="h-1.5"
              style={{
                '--progress-color': candidate.partyColor || (candidate.isLeading ? 'hsl(var(--primary))' : 'hsl(var(--secondary))')
              } as React.CSSProperties}
            />
          </div>
        ))}

        {result.candidates.length > 5 && (
          <p className="text-sm text-muted-foreground text-center">
            +{result.candidates.length - 5} more candidates
          </p>
        )}

        <div className="pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {result.totalVotes.toLocaleString()} total votes
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Updated {new Date(result.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Demo results data for when API is not available
const DEMO_RESULTS: ElectionResult[] = [
  {
    id: '1',
    position: 'president',
    positionLabel: 'Presidential',
    region: 'National',
    regionType: 'national',
    candidates: [
      { id: '1', name: 'John Kamau', partyAbbreviation: 'ODM', partyColor: '#FF6B00', votes: 2456789, percentage: 45.2, isLeading: true },
      { id: '2', name: 'Mary Wanjiku', partyAbbreviation: 'UDA', partyColor: '#FFD700', votes: 2234567, percentage: 41.1, isLeading: false },
      { id: '3', name: 'Peter Ochieng', partyAbbreviation: 'FORD-K', partyColor: '#006400', votes: 456789, percentage: 8.4, isLeading: false },
      { id: '4', name: 'Jane Muthoni', partyAbbreviation: 'IND', votes: 287654, percentage: 5.3, isLeading: false },
    ],
    totalVotes: 5435799,
    stationsReporting: 42567,
    totalStations: 46229,
    reportingPercentage: 92.1,
    status: 'live',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    position: 'governor',
    positionLabel: 'Governor',
    region: 'Nairobi County',
    regionType: 'county',
    candidates: [
      { id: '5', name: 'Samuel Mwangi', partyAbbreviation: 'UDA', partyColor: '#FFD700', votes: 567890, percentage: 52.3, isLeading: true },
      { id: '6', name: 'Grace Akinyi', partyAbbreviation: 'ODM', partyColor: '#FF6B00', votes: 456789, percentage: 42.1, isLeading: false },
      { id: '7', name: 'David Kipruto', partyAbbreviation: 'IND', votes: 60789, percentage: 5.6, isLeading: false },
    ],
    totalVotes: 1085468,
    stationsReporting: 2456,
    totalStations: 2800,
    reportingPercentage: 87.7,
    status: 'live',
    lastUpdated: new Date().toISOString(),
  },
];

export default function ResultsPage() {
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState('president');

  useEffect(() => {
    fetchResults();

    // Auto-refresh for live results
    const interval = setInterval(fetchResults, 30000);
    return () => clearInterval(interval);
  }, [position]);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/results?position=${position}`);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        // Use demo data if API not available
        setResults(DEMO_RESULTS.filter(r => r.position === position));
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
      // Use demo data
      setResults(DEMO_RESULTS.filter(r => r.position === position));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b bg-muted/30 py-12">
          <div className="container">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Vote className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Election Results</h1>
                <p className="text-muted-foreground">
                  Real-time election results from polling stations across Kenya
                </p>
              </div>
            </div>

            {/* Live indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-full text-red-600 text-sm">
              <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              Results update automatically every 30 seconds
            </div>
          </div>
        </section>

        {/* Position Tabs */}
        <section className="border-b py-4">
          <div className="container">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {POSITIONS.map((pos) => (
                <Button
                  key={pos.value}
                  variant={position === pos.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPosition(pos.value)}
                >
                  {pos.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Results Grid */}
        <section className="py-8">
          <div className="container">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-20">
                <Vote className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No results available</h3>
                <p className="text-muted-foreground">
                  Results will appear here once voting begins
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {results.map((result) => (
                  <ResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Info Section */}
        <section className="border-t bg-muted/30 py-8">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="font-semibold mb-2">About These Results</h3>
              <p className="text-sm text-muted-foreground">
                Results shown are provisional tallies from our network of polling agents. 
                Official results are announced by the Independent Electoral and Boundaries Commission (IEBC). 
                Refresh the page or wait 30 seconds for the latest updates.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
