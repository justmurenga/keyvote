'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { Poll, PollCandidate } from './types';

interface VoteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll: Poll;
  selectedCandidate: PollCandidate | null;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function VoteConfirmationDialog({
  open,
  onOpenChange,
  poll,
  selectedCandidate,
  onConfirm,
  isSubmitting,
}: VoteConfirmationDialogProps) {
  if (!selectedCandidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Your Vote
          </DialogTitle>
          <DialogDescription>
            Please review your selection carefully. Once submitted, your vote
            cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Poll Info */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{poll.positionLabel}</Badge>
            </div>
            <p className="font-medium">{poll.question}</p>
          </div>

          {/* Selected Candidate */}
          <div className="rounded-lg border border-primary bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Your selection:</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {selectedCandidate.candidateName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{selectedCandidate.candidateName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCandidate.party}
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              This action is <strong>irreversible</strong>. You can only vote
              once per poll. Make sure this is your final choice.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Vote
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
