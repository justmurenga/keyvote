'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Users, MapPin, Globe2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CandidateCard, CandidateCardProps } from '@/components/candidates';
import { RegionPaywallDialog } from '@/components/paywall/region-paywall-dialog';
import { useToast } from '@/components/ui/use-toast';

const POSITIONS = [
  { value: 'all', label: 'All Positions' },
  { value: 'president', label: 'President' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'MP' },
  { value: 'mca', label: 'MCA' },
];

type RegionMode = 'own' | 'outside';

export default function DashboardCandidatesPage() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<CandidateCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('all');
  const [regionMode, setRegionMode] = useState<RegionMode>('own');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | undefined>();

  const fetchCandidates = useCallback(
    async (opts?: { searchQuery?: string; mode?: RegionMode }) => {
      const mode = opts?.mode || regionMode;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (position !== 'all') params.set('position', position);
        if (opts?.searchQuery || search) params.set('search', opts?.searchQuery || search);
        params.set('regionMode', mode);
        params.set('limit', '20');

        const response = await fetch(`/api/candidates?${params.toString()}`);
        const data = await response.json().catch(() => ({}));

        if (response.status === 402 && data?.error === 'paywall') {
          // Paid feature — show paywall and revert UI to "own"
          setCandidates([]);
          setRegionMode('own');
          setPaywallOpen(true);
          // Best-effort wallet balance fetch for the dialog
          fetch('/api/wallet/balance')
            .then((r) => r.json())
            .then((b) => setWalletBalance(Number(b?.balance ?? 0)))
            .catch(() => {});
          return;
        }

        if (response.ok) {
          setCandidates(data.candidates || []);
        } else {
          toast({
            title: 'Could not load candidates',
            description: data.error || 'Please try again',
            variant: 'destructive',
          });
          setCandidates([]);
        }
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
        setCandidates([]);
      } finally {
        setIsLoading(false);
      }
    },
    [position, regionMode, search, toast],
  );

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, regionMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates({ searchQuery: search });
  };

  const handleSwitchMode = (mode: RegionMode) => {
    if (mode === regionMode) return;
    setRegionMode(mode);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">
            Browse and follow candidates running for office
          </p>
        </div>

        {/* Region scope toggle */}
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
            Outside Region
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              Paid
            </Badge>
          </Button>
        </div>
      </div>

      {/* Mode banner */}
      {regionMode === 'own' ? (
        <div className="text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">
          Showing candidates for <strong>your home region</strong> plus all
          presidential candidates. Switch to <em>Outside Region</em> to browse
          candidates from other counties (paid feature).
        </div>
      ) : (
        <div className="text-xs text-muted-foreground rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          Showing candidates from <strong>outside your home county</strong>.
          Drill down by position and search to find specific candidates.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {POSITIONS.map((pos) => (
            <Button
              key={pos.value}
              variant={position === pos.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPosition(pos.value)}
              className="whitespace-nowrap"
            >
              {pos.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No candidates found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} {...candidate} />
          ))}
        </div>
      )}

      <RegionPaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        itemId="outside_region_candidates"
        title="Browse candidates outside your region"
        description="Unlock 30 days of access to candidates from any county, constituency or ward in Kenya."
        price={100}
        validityDays={30}
        walletBalance={walletBalance}
        onPurchased={() => {
          setRegionMode('outside');
          fetchCandidates({ mode: 'outside' });
        }}
      />
    </div>
  );
}
