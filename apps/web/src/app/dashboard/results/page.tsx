'use client';

import { useState, useEffect } from 'react';
import { Vote, MapPin, TrendingUp, Loader2, BarChart2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ResultCandidate {
  id: string;
  name: string;
  photoUrl?: string;
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
  candidates: ResultCandidate[];
  totalVotes: number;
  stationsReporting: number;
  totalStations: number;
  reportingPercentage: number;
  status: 'live' | 'final';
  lastUpdated: string;
}

const POSITIONS = [
  { value: 'president', label: 'Presidential' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'mp', label: 'MP' },
  { value: 'mca', label: 'MCA' },
];

// Demo results
const DEMO_RESULTS: ElectionResult[] = [
  {
    id: '1',
    position: 'president',
    positionLabel: 'Presidential',
    region: 'National',
    candidates: [
      { id: '1', name: 'John Kamau', partyAbbreviation: 'ODM', partyColor: '#FF6B00', votes: 2456789, percentage: 45.2, isLeading: true },
      { id: '2', name: 'Mary Wanjiku', partyAbbreviation: 'UDA', partyColor: '#FFD700', votes: 2234567, percentage: 41.1, isLeading: false },
      { id: '3', name: 'Peter Ochieng', partyAbbreviation: 'FORD-K', partyColor: '#006400', votes: 456789, percentage: 8.4, isLeading: false },
    ],
    totalVotes: 5435799,
    stationsReporting: 42567,
    totalStations: 46229,
    reportingPercentage: 92.1,
    status: 'live',
    lastUpdated: new Date().toISOString(),
  },
];

export default function DashboardResultsPage() {
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState('president');

  useEffect(() => {
    fetchResults();
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
        setResults(DEMO_RESULTS.filter(r => r.position === position));
      }
    } catch (error) {
      setResults(DEMO_RESULTS.filter(r => r.position === position));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Election Results</h1>
          <p className="text-muted-foreground">
            Real-time results from polling stations
          </p>
        </div>
        <Badge className="bg-red-500 animate-pulse">
          LIVE - Auto-refreshing
        </Badge>
      </div>

      {/* Position Tabs */}
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

      {/* Results */}
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
        <div className="grid gap-6">
          {results.map((result) => (
            <Card key={result.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{result.positionLabel}</Badge>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {result.region}
                    </CardTitle>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{result.reportingPercentage.toFixed(1)}% reporting</div>
                    <div className="text-xs">
                      {result.stationsReporting.toLocaleString()} / {result.totalStations.toLocaleString()} stations
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.candidates.map((candidate, index) => (
                  <div key={candidate.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-muted-foreground">{index + 1}</span>
                        <span className={candidate.isLeading ? 'font-semibold' : ''}>
                          {candidate.name}
                        </span>
                        {candidate.partyAbbreviation && (
                          <span style={{ color: candidate.partyColor }}>
                            ({candidate.partyAbbreviation})
                          </span>
                        )}
                        {candidate.isLeading && <TrendingUp className="h-4 w-4 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{candidate.votes.toLocaleString()}</span>
                        <span className="w-16 text-right text-muted-foreground">
                          {candidate.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={candidate.percentage} className="h-1.5" />
                  </div>
                ))}
                <div className="pt-3 border-t flex items-center text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  {result.totalVotes.toLocaleString()} total votes
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
