'use client';

import Link from 'next/link';
import { Lock, Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export interface RegionPaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Billable item id, e.g. `outside_region_candidates` */
  itemId: string;
  /** Heading for the paywall, e.g. "Browse candidates outside your region" */
  title: string;
  /** Subheading explaining the value proposition */
  description: string;
  /** Price in KES (display-only) */
  price: number;
  /** Validity in days (display-only) */
  validityDays?: number;
  /** Current wallet balance (display-only). Pass -1 if unknown. */
  walletBalance?: number;
  /** Called after a successful purchase so the parent can refresh. */
  onPurchased?: () => void;
}

/**
 * Modal that explains a paid feature and lets the user either purchase the
 * entitlement directly from their wallet or jump to the wallet top-up page
 * if they don't have enough balance.
 */
export function RegionPaywallDialog({
  open,
  onOpenChange,
  itemId,
  title,
  description,
  price,
  validityDays = 30,
  walletBalance,
  onPurchased,
}: RegionPaywallDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const insufficient = walletBalance != null && walletBalance >= 0 && walletBalance < price;

  const handlePurchase = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet/entitlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast({
            title: 'Insufficient balance',
            description: `You need KES ${data.required?.toFixed?.(2) ?? price.toFixed(2)} but only have KES ${data.available?.toFixed?.(2) ?? '0.00'}. Top up your wallet to continue.`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Purchase failed',
            description: data.error || 'Could not complete purchase',
            variant: 'destructive',
          });
        }
        return;
      }
      toast({
        title: 'Access unlocked',
        description: `You now have access for ${validityDays} days.`,
      });
      onOpenChange(false);
      onPurchased?.();
    } catch (err) {
      toast({
        title: 'Purchase failed',
        description: 'Network error. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-2xl font-bold">
              KES {price.toLocaleString()}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Valid for</span>
            <span className="font-medium">{validityDays} days</span>
          </div>
          {walletBalance != null && walletBalance >= 0 && (
            <div className="flex items-baseline justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">
                Wallet balance
              </span>
              <span
                className={`font-medium ${insufficient ? 'text-destructive' : ''}`}
              >
                KES {walletBalance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Top up your wallet via M-Pesa if your balance is low.</li>
          <li>Confirm the one-tap purchase below.</li>
          <li>
            Access unlocks instantly and stays active for {validityDays} days.
          </li>
        </ol>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/dashboard/wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Top up wallet
            </Link>
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={submitting || insufficient}
            className="w-full sm:w-auto"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {insufficient ? 'Top up first' : `Pay KES ${price}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
