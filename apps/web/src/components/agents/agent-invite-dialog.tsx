'use client';

import { useState } from 'react';
import { Plus, Loader2, Copy, Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RegionSelector } from './region-selector';
import type { InviteAgentPayload } from '@/hooks/use-agents';

interface AgentInviteDialogProps {
  onInvite: (payload: InviteAgentPayload) => Promise<{ success: boolean; error?: string; acceptUrl?: string }>;
}

export function AgentInviteDialog({ onInvite }: AgentInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [regionType, setRegionType] = useState('polling_station');
  const [countyId, setCountyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');
  const [pollingStationId, setPollingStationId] = useState('');

  const resetForm = () => {
    setName('');
    setPhone('');
    setMpesaNumber('');
    setRegionType('polling_station');
    setCountyId('');
    setConstituencyId('');
    setWardId('');
    setPollingStationId('');
    setError(null);
    setAcceptUrl(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: InviteAgentPayload = {
        phone,
        name,
        regionType,
        mpesaNumber: mpesaNumber || undefined,
      };

      if (regionType === 'polling_station') payload.pollingStationId = pollingStationId;
      if (regionType === 'ward') payload.wardId = wardId;
      if (regionType === 'constituency') payload.constituencyId = constituencyId;
      if (regionType === 'county') payload.countyId = countyId;

      // For cascading: polling_station also needs ward, constituency, county set
      if (['polling_station', 'ward', 'constituency'].includes(regionType) && countyId) {
        payload.countyId = undefined; // Only set the specific level
      }

      const result = await onInvite(payload);

      if (result.success) {
        setAcceptUrl(result.acceptUrl || null);
      } else {
        setError(result.error || 'Failed to invite agent');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (acceptUrl) {
      await navigator.clipboard.writeText(acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  // Validate form
  const isValid = name.trim() && phone.trim() && regionType &&
    (regionType === 'national' ||
     (regionType === 'county' && countyId) ||
     (regionType === 'constituency' && constituencyId) ||
     (regionType === 'ward' && wardId) ||
     (regionType === 'polling_station' && pollingStationId));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Invite Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New Agent
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a person to become your polling agent.
            They will receive a link to accept the invitation.
          </DialogDescription>
        </DialogHeader>

        {acceptUrl ? (
          // Success state - show the invitation link
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-medium text-green-800 mb-2">
                ✅ Invitation created successfully!
              </p>
              <p className="text-sm text-green-700">
                Share this link with <strong>{name}</strong> to accept the invitation:
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={acceptUrl}
                readOnly
                className="text-xs font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can also send this link via SMS or WhatsApp to {phone}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Done</Button>
              <Button onClick={() => { resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="agent-name">Full Name *</Label>
              <Input
                id="agent-name"
                placeholder="e.g. James Mwangi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-phone">Phone Number *</Label>
              <Input
                id="agent-phone"
                placeholder="e.g. 0712345678 or +254712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-mpesa">M-Pesa Number (for payments)</Label>
              <Input
                id="agent-mpesa"
                placeholder="Same as phone if left blank"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Region Assignment</h4>
              <RegionSelector
                regionType={regionType}
                onRegionTypeChange={setRegionType}
                countyId={countyId}
                onCountyChange={setCountyId}
                constituencyId={constituencyId}
                onConstituencyChange={setConstituencyId}
                wardId={wardId}
                onWardChange={setWardId}
                pollingStationId={pollingStationId}
                onPollingStationChange={setPollingStationId}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
