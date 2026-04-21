'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Users, Loader2, Eye, Lock } from 'lucide-react';
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

  // Show real percentages only when the poll is officially closed.
  // While the poll is still open we keep the count private to avoid
  // influencing other voters — even after the user has voted themselves.
  const pollClosed = poll.status === 'completed';
  const showResults = pollClosed;
  const votedAndWaiting = poll.hasVoted && poll.status === 'active';
  const canVote = poll.status === 'active' && !poll.hasVoted;
  const selectedCandidate = poll.options.find((o) => o.id === selectedOption) || null;
  const voting = isVoting || localVoting;
  const endsAtLabel = poll.endsAt
    ? new Date(poll.endsAt).toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

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
      <Card
        className={`overflow-hidden ${votedAndWaiting ? 'opacity-75' : ''}`}
      >
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
          {votedAndWaiting && (
            <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3 text-sm flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  Thanks for voting!
                </p>
                <p className="text-muted-foreground">
                  Results stay private until the poll closes
                  {endsAtLabel ? ` on ${endsAtLabel}` : ''}.
                  We&apos;ll send you an in-app notification the moment it
                  ends.
                </p>
              </div>
            </div>
          )}
          {poll.options.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No candidates available for this poll
            </p>
          ) : (
            poll.options.map((option) => {
              const isUserPick = poll.userVote === option.id;
              if (showResults) {
                return (
                  <div key={option.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={isUserPick ? 'font-semibold' : ''}>
                        {option.candidateName} ({option.party})
                        {isUserPick && (
                          <CheckCircle2 className="inline h-4 w-4 ml-1 text-primary" />
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {option.percentage.toFixed(1)}% ({option.votes})
                      </span>
                    </div>
                    <Progress value={option.percentage} className="h-2" />
                  </div>
                );
              }

              if (votedAndWaiting) {
                // Read-only "voted" view: show each option dimmed with the
                // user's pick highlighted, but no vote counts / progress.
                return (
                  <div
                    key={option.id}
                    className={`w-full p-3 rounded-lg border flex items-center gap-2 ${
                      isUserPick
                        ? 'border-primary bg-primary/5'
                        : 'border-input bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                        isUserPick
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40'
                      }`}
                    >
                      {isUserPick && (
                        <div className="h-full w-full flex items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium">{option.candidateName}</span>
                    <span className="ml-1 text-muted-foreground">
                      ({option.party})
                    </span>
                    {isUserPick && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Your vote
                      </Badge>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={option.id}
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
              );
            })
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
            {votedAndWaiting && (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-amber-500/40 text-amber-600"
              >
                <Lock className="h-3 w-3" />
                Results locked
              </Badge>
            )}
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
