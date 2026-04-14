'use client';

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UsePollRealtimeOptions {
  pollId?: string;
  onVoteUpdate?: (pollId: string, totalVotes: number) => void;
  enabled?: boolean;
}

export function usePollRealtime({ pollId, onVoteUpdate, enabled = true }: UsePollRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setupSubscription = useCallback(() => {
    if (!enabled) return;

    const supabase = createClient();
    
    // Channel name based on whether we're watching a single poll or all polls
    const channelName = pollId ? `poll-votes-${pollId}` : 'poll-votes-all';
    
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to poll_votes changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_votes',
          ...(pollId && { filter: `poll_id=eq.${pollId}` }),
        },
        async (payload) => {
          // When a new vote is recorded, fetch updated vote count
          const votePollId = payload.new.poll_id as string;
          
          // Get the updated total vote count
          const { count } = await supabase
            .from('poll_votes')
            .select('*', { count: 'exact', head: true })
            .eq('poll_id', votePollId);

          if (onVoteUpdate && count !== null) {
            onVoteUpdate(votePollId, count);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, onVoteUpdate, enabled]);

  useEffect(() => {
    const cleanup = setupSubscription();
    return cleanup;
  }, [setupSubscription]);

  return { channelRef };
}

// Hook to get live vote counts for multiple polls
export function usePollsRealtime(
  pollIds: string[],
  onUpdate: (pollId: string, data: { totalVotes: number; candidateVotes: Record<string, number> }) => void,
  enabled: boolean = true
) {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!enabled || pollIds.length === 0) return;

    const supabase = createClient();

    // Clean up existing subscriptions
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Create a single channel for all polls
    const channel = supabase
      .channel('polls-live-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_votes',
        },
        async (payload) => {
          const votePollId = payload.new.poll_id as string;
          const candidateId = payload.new.candidate_id as string;

          // Only process if we're tracking this poll
          if (!pollIds.includes(votePollId)) return;

          // Fetch updated counts
          const { data: votes } = await supabase
            .from('poll_votes')
            .select('candidate_id')
            .eq('poll_id', votePollId);

          if (votes) {
            const candidateVotes: Record<string, number> = {};
            votes.forEach(v => {
              candidateVotes[v.candidate_id] = (candidateVotes[v.candidate_id] || 0) + 1;
            });

            onUpdate(votePollId, {
              totalVotes: votes.length,
              candidateVotes,
            });
          }
        }
      )
      .subscribe();

    channelsRef.current.push(channel);

    return () => {
      channel && supabase.removeChannel(channel);
    };
  }, [pollIds.join(','), onUpdate, enabled]);
}
