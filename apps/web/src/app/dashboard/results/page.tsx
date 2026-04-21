'use client';

import { useState, useEffect, useCallback } from 'react';
import { Vote, MapPin, TrendingUp, Loader2, Users, Globe2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RegionPaywallDialog } from '@/components/paywall/region-paywall-dialog';
import { useToast } from '@/components/ui/use-toast';

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

type RegionMode = 'own' | 'outside';

export default function DashboardResultsPage() {
  const { toast } = useToast();
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState('president');
  const [regionMode, setRegionMode] = useState<RegionMode>('own');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | undefined>();

  const fetchResults = useCallback(
    async (mode?: RegionMode) => {
      const m = mode || regionMode;
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/results?position=${position}&regionMode=${m}`,
        );
        const data = await response.json().catch(() => ({}));

        if (response.status === 402 && data?.error === 'paywall') {
          setResults([]);
          setRegionMode('own');
          setPaywallOpen(true);
          fetch('/api/wallet/balance')
            .then((r) => r.json())
            .then((b) => setWalletBalance(Number(b?.balance ?? 0)))
            .catch(() => {});
          return;
        }

        if (response.ok) {
          setResults(data.results || []);
        } else {
          toast({
            title: 'Could not load results',
            description: data.error || 'Please try again',
            variant: 'destructive',
          });
          setResults([]);
        }
      } catch (error) {
        console.error(error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [position, regionMode, toast],
  );

  useEffect(() => {
    fetchResults();
    const interval = setInterval(() => fetchResults(), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, regionMode]);

  const handleSwitchMode = (mode: RegionMode) => {
    if (mode === regionMode) return;
    setRegionMode(mode);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Election Results</h1>
          <p className="text-muted-foreground">
            Real-time results from polling stations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
          <div className="inline-flex rounded-lg border bg-muted/30 p-1">
            <Button
              size="sm"
              variant={regionMode === 'own' ? 'default' : 'ghost'}
              onClick={() => handleSwitchMode('own')}
              className="gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5" />
              My Region
            </Button>
            <Button
              size="sm"
              variant={regionMode === 'outside' ? 'default' : 'ghost'}
              onClick={() => handleSwitchMode('outside')}
              className="gap-1.5"
            >
              <Globe2 className="h-3.5 w-3.5" />
              Other Locations
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                Paid
              </Badge>
            </Button>
          </div>
        </div>
      </div>

      {/* Mode banner */}
      {regionMode === 'own' ? (
        <div className="text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">
          Showing results for <strong>your home region</strong> (free).
          Switch to <em>Other Locations</em> to view results from other
          counties — including opinion polls and followership analytics — as
          a paid add-on.
        </div>
      ) : (
        <div className="text-xs text-muted-foreground rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          Showing results from <strong>regions outside your home county</strong>.
        </div>
      )}

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
                      {result.stationsReporting.toLocaleString()} /{' '}
                      {result.totalStations.toLocaleString()} stations
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.candidates.map((candidate, index) => (
                  <div key={candidate.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className={candidate.isLeading ? 'font-semibold' : ''}>
                          {candidate.name}
                        </span>
                        {candidate.partyAbbreviation && (
                          <span style={{ color: candidate.partyColor }}>
                            ({candidate.partyAbbreviation})
                          </span>
                        )}
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

      <RegionPaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        itemId="outside_region_results"
        title="View results outside your region"
        description="Unlock 30 days of access to election results, opinion polls and followership analytics for any region in Kenya."
        price={100}
        validityDays={30}
        walletBalance={walletBalance}
        onPurchased={() => {
          setRegionMode('outside');
          fetchResults('outside');
        }}
      />
    </div>
  );
}
