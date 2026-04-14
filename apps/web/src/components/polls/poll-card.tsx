'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Users, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PollStatusBadge } from './poll-status-badge';
import { VoteConfirmationDialog } from './vote-confirmation-dialog';
import type { Poll, PollCandidate } from './types';

interface PollCardProps {
  poll: Poll;
  onVote: (pollId: string, candidateId: string) => Promise<void>;
  isVoting?: boolean;
  showDetailsLink?: boolean;
  detailsBasePath?: string;
}

export function PollCard({
  poll,
  onVote,
  isVoting = false,
  showDetailsLink = true,
  detailsBasePath = '/polls',
}: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [localVoting, setLocalVoting] = useState(false);

  const showResults = poll.hasVoted || poll.status === 'completed';
  const canVote = poll.status === 'active' && !poll.hasVoted;
  const selectedCandidate = poll.options.find((o) => o.id === selectedOption) || null;
  const voting = isVoting || localVoting;

  const handleVoteClick = () => {
    if (!selectedOption || !canVote) return;
    setShowConfirmation(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedOption) return;
    setLocalVoting(true);
    try {
      await onVote(poll.id, selectedOption);
    } finally {
      setLocalVoting(false);
      setShowConfirmation(false);
      setSelectedOption(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline">{poll.positionLabel}</Badge>
                <PollStatusBadge status={poll.status} />
                {poll.hasVoted && (
                  <Badge variant="secondary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Voted
                  </Badge>
                )}
                {poll.isPartyNomination && poll.party && (
                  <Badge variant="secondary">{poll.party.abbreviation} Nomination</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{poll.question}</CardTitle>
              {poll.description && (
                <CardDescription className="mt-1">{poll.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {poll.options.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No candidates available for this poll
            </p>
          ) : (
            poll.options.map((option) => (
              <div key={option.id} className="space-y-1">
                {showResults ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={poll.userVote === option.id ? 'font-semibold' : ''}>
                        {option.candidateName} ({option.party})
                        {poll.userVote === option.id && (
                          <CheckCircle2 className="inline h-4 w-4 ml-1 text-primary" />
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {option.percentage.toFixed(1)}% ({option.votes})
                      </span>
                    </div>
                    <Progress value={option.percentage} className="h-2" />
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedOption(option.id)}
                    disabled={!canVote}
                    className={`w-full p-3 text-left rounded-lg border transition-all ${
                      selectedOption === option.id
                        ? 'border-primary bg-primary/5'
                        : 'border-input hover:border-primary/50'
                    } ${!canVote ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                          selectedOption === option.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {selectedOption === option.id && (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium">{option.candidateName}</span>
                        <span className="text-muted-foreground ml-2">({option.party})</span>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {poll.totalVotes.toLocaleString()} votes
            </span>
            {poll.endsAt && poll.status === 'active' && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Ends {new Date(poll.endsAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showDetailsLink && (showResults || poll.status === 'completed') && (
              <Button size="sm" variant="ghost" asChild>
                <Link href={`${detailsBasePath}/${poll.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  Details
                </Link>
              </Button>
            )}
            {canVote && poll.options.length > 0 && (
              <Button
                size="sm"
                disabled={!selectedOption || voting}
                onClick={handleVoteClick}
              >
                {voting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Submit Vote'
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <VoteConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        poll={poll}
        selectedCandidate={selectedCandidate}
        onConfirm={handleConfirmVote}
        isSubmitting={voting}
      />
    </>
  );
}
