'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CreditCard, Phone, CheckCircle2, XCircle } from 'lucide-react';

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type TopUpStatus = 'idle' | 'initiated' | 'polling' | 'success' | 'failed';

export interface QuickTopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suggest a minimum amount (e.g. amount needed to cover a pending action) */
  suggestedAmount?: number;
  /** Default phone (M-Pesa) prefilled in the form */
  defaultPhone?: string;
  /** Called after a successful top-up so caller can refetch balance */
  onSuccess?: (amount: number) => void;
  title?: string;
  description?: string;
}

export function QuickTopUpDialog({
  open,
  onOpenChange,
  suggestedAmount,
  defaultPhone = '',
  onSuccess,
  title = 'Top Up Wallet',
  description = 'Add funds to your myVote Kenya wallet via M-Pesa',
}: QuickTopUpDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>(defaultPhone);
  const [status, setStatus] = useState<TopUpStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Prefill suggested amount and phone when opened
  useEffect(() => {
    if (open) {
      if (suggestedAmount && suggestedAmount > 0) {
        // Round up to nearest 10 and at least KES 10
        const rounded = Math.max(10, Math.ceil(suggestedAmount / 10) * 10);
        setAmount(String(rounded));
      }
      if (defaultPhone) setPhone(defaultPhone);
    } else {
      // Reset on close
      setAmount('');
      setError(null);
      setStatus('idle');
      setIsProcessing(false);
    }
  }, [open, suggestedAmount, defaultPhone]);

  const reset = () => {
    setError(null);
    setStatus('idle');
    setIsProcessing(false);
  };

  const handleClose = () => {
    if (status === 'polling' || status === 'initiated') return; // don't allow close mid-flight
    onOpenChange(false);
  };

  const pollStatus = useCallback(async (checkoutRequestId: string) => {
    setStatus('polling');
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      attempts++;
      try {
        const res = await fetch('/api/wallet/topup/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutRequestId }),
        });
        const data = await res.json();

        if (data.status === 'success') {
          setStatus('success');
          const paid = parseFloat(amount);
          if (!Number.isNaN(paid)) onSuccess?.(paid);
          return;
        }
        if (data.status === 'failed' || data.status === 'cancelled') {
          setStatus('failed');
          setError(data.resultDescription || 'Payment was cancelled or failed');
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setStatus('failed');
          setError('Payment timeout. Please check your wallet balance.');
        }
      } catch (err) {
        console.error('Poll error:', err);
        if (attempts < maxAttempts) setTimeout(poll, 5000);
      }
    };

    poll();
  }, [amount, onSuccess]);

  const handleTopUp = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) { setError('Minimum top-up amount is KES 10'); return; }
    if (amt > 150000) { setError('Maximum top-up amount is KES 150,000'); return; }
    if (!phone || phone.length < 10) { setError('Please enter a valid phone number'); return; }

    setIsProcessing(true);
    setError(null);
    setStatus('idle');

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate payment');

      setStatus('initiated');
      pollStatus(data.checkoutRequestId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate payment';
      setError(msg);
      setStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {status === 'initiated' || status === 'polling' ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Check Your Phone</h3>
            <p className="text-muted-foreground mb-4">
              Enter your M-Pesa PIN on the prompt sent to <strong>{phone}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for payment confirmation...
            </div>
          </div>
        ) : status === 'success' ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground mb-4">
              KES {parseFloat(amount).toLocaleString()} has been added to your wallet.
            </p>
            <Button onClick={() => onOpenChange(false)}>Continue</Button>
          </div>
        ) : status === 'failed' ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Payment Failed</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The payment could not be completed. Please try again.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={reset}>Try Again</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              {suggestedAmount && suggestedAmount > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You need at least <strong>KES {suggestedAmount.toLocaleString()}</strong> to complete your action.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">Quick Select</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {PRESET_AMOUNTS.map((a) => (
                    <Button
                      key={a}
                      variant={amount === String(a) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAmount(String(a))}
                    >
                      KES {a.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="qt-amount">Amount (KES)</Label>
                <Input
                  id="qt-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={10}
                  max={150000}
                />
                <p className="text-xs text-muted-foreground mt-1">Min: KES 10 • Max: KES 150,000</p>
              </div>

              <div>
                <Label htmlFor="qt-phone">M-Pesa Phone Number</Label>
                <Input
                  id="qt-phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleTopUp} disabled={isProcessing || !amount || !phone}>
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Pay KES {amount ? parseFloat(amount).toLocaleString() : '0'}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
