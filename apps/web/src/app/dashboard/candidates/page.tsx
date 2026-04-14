'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CandidateCard, CandidateCardProps } from '@/components/candidates';

const POSITIONS = [
  { value: 'all', label: 'All Positions' },
  { value: 'president', label: 'President' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'MP' },
  { value: 'mca', label: 'MCA' },
];

export default function DashboardCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('all');

  useEffect(() => {
    fetchCandidates();
  }, [position]);

  const fetchCandidates = async (searchQuery?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (position !== 'all') params.set('position', position);
      if (searchQuery || search) params.set('search', searchQuery || search);
      params.set('limit', '20');

      const response = await fetch(`/api/candidates?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates(search);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Candidates</h1>
        <p className="text-muted-foreground">
          Browse and follow candidates running for office
        </p>
      </div>

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
    </div>
  );
}
