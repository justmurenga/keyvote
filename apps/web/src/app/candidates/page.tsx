'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CandidateCard, CandidateCardProps } from '@/components/candidates';
import { SiteHeader, SiteFooter } from '@/components/layout';

const POSITIONS = [
  { value: 'all', label: 'All Positions' },
  { value: 'president', label: 'President' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'MP' },
  { value: 'mca', label: 'MCA' },
];

interface CandidatesResponse {
  candidates: CandidateCardProps[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CandidatesPage() {
  const searchParams = useSearchParams();
  
  const [candidates, setCandidates] = useState<CandidateCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [position, setPosition] = useState(searchParams.get('position') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  useEffect(() => {
    fetchCandidates();
  }, [position, page]);

  const fetchCandidates = async (searchQuery?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (position !== 'all') params.set('position', position);
      if (searchQuery || search) params.set('search', searchQuery || search);
      params.set('page', page.toString());
      params.set('limit', '12');

      const response = await fetch(`/api/candidates?${params.toString()}`);
      const data: CandidatesResponse = await response.json();

      if (response.ok) {
        setCandidates(data.candidates);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates(search);
  };

  const handlePositionChange = (newPosition: string) => {
    setPosition(newPosition);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b bg-muted/30 py-12">
          <div className="container">
            <h1 className="text-3xl font-bold mb-2">Candidates</h1>
            <p className="text-muted-foreground">
              Browse and follow candidates running for various positions across Kenya
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b py-6">
          <div className="container">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search candidates by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>

              {/* Position Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                {POSITIONS.map((pos) => (
                  <Button
                    key={pos.value}
                    variant={position === pos.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePositionChange(pos.value)}
                    className="whitespace-nowrap"
                  >
                    {pos.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="container">
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                <Users className="inline h-4 w-4 mr-1" />
                {total.toLocaleString()} candidate{total !== 1 ? 's' : ''} found
              </p>
            </div>

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
              <>
                {/* Candidates Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {candidates.map((candidate) => (
                    <CandidateCard key={candidate.id} {...candidate} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}