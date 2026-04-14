'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PollCard, PollFilters } from '@/components/polls';
import type { Poll } from '@/components/polls';
import { usePollsRealtime } from '@/hooks/use-poll-realtime';

export default function DashboardPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('position', filter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/polls?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setPolls(data.polls || []);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to fetch polls');
      }
    } catch (err) {
      console.error('Failed to fetch polls:', err);
      setError('Failed to fetch polls');
    } finally {
      setIsLoading(false);
    }
  }, [filter, statusFilter]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Wire in real-time updates for active polls
  const activePollIds = polls.filter((p) => p.status === 'active').map((p) => p.id);

  usePollsRealtime(
    activePollIds,
    useCallback((pollId, data) => {
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const newTotal = data.totalVotes;
          const updatedOptions = p.options.map((opt) => {
            const newVotes = data.candidateVotes[opt.id] || opt.votes;
            return {
              ...opt,
              votes: newVotes,
              percentage: newTotal > 0 ? (newVotes / newTotal) * 100 : 0,
            };
          });
          return { ...p, totalVotes: newTotal, options: updatedOptions };
        })
      );
    }, []),
    activePollIds.length > 0
  );

  const handleVote = async (pollId: string, candidateId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionId: candidateId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Your vote has been recorded!');
        await fetchPolls();
      } else {
        setError(data.error || 'Failed to vote');
      }
    } catch (err) {
      console.error('Failed to vote:', err);
      setError('Failed to submit vote');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Opinion Polls</h1>
          <p className="text-muted-foreground">
            Participate in polls and share your opinion on candidates
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPolls}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 bg-green-500/10 text-green-600 rounded-md text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Filters */}
      <PollFilters
        positionFilter={filter}
        statusFilter={statusFilter}
        onPositionChange={setFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Polls */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-20">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No polls available</h3>
          <p className="text-muted-foreground">
            Check back later for new opinion polls
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onVote={handleVote}
              showDetailsLink={true}
              detailsBasePath="/polls"
            />
          ))}
        </div>
      )}
    </div>
  );
}
