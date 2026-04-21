'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Copy, Check, UserPlus, Search, CheckCircle2, X } from 'lucide-react';
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
  onInvite: (payload: InviteAgentPayload) => Promise<{ success: boolean; error?: string; acceptUrl?: string; notified?: boolean }>;
}

interface LookupUser {
  id: string;
  full_name: string;
  phone_number: string | null;
  email: string | null;
  role: string;
  profile_photo_url: string | null;
  is_verified: boolean;
}

export function AgentInviteDialog({ onInvite }: AgentInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);
  const [copied, setCopied] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LookupUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LookupUser | null>(null);

  // Region & extras
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [regionType, setRegionType] = useState('polling_station');
  const [countyId, setCountyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');
  const [pollingStationId, setPollingStationId] = useState('');

  // Auto-search debounce
  useEffect(() => {
    if (!open) return;
    if (selectedUser) return;
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/lookup?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
        } else {
          setResults([]);
        }
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [query, open, selectedUser]);

  const resetForm = () => {
    setQuery('');
    setResults([]);
    setSelectedUser(null);
    setMpesaNumber('');
    setRegionType('polling_station');
    setCountyId('');
    setConstituencyId('');
    setWardId('');
    setPollingStationId('');
    setError(null);
    setAcceptUrl(null);
    setNotified(false);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Search and select a registered user first');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: InviteAgentPayload = {
        userId: selectedUser.id,
        phone: selectedUser.phone_number || undefined,
        name: selectedUser.full_name,
        regionType,
        mpesaNumber: mpesaNumber || undefined,
      };

      if (regionType === 'polling_station') payload.pollingStationId = pollingStationId;
      if (regionType === 'ward') payload.wardId = wardId;
      if (regionType === 'constituency') payload.constituencyId = constituencyId;
      if (regionType === 'county') payload.countyId = countyId;

      const result = await onInvite(payload);

      if (result.success) {
        setAcceptUrl(result.acceptUrl || null);
        setNotified(!!result.notified);
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

  const isValid = !!selectedUser && regionType &&
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
            Search for an existing myVote user by phone number, email, or name. The
            person you invite will receive an in-app notification.
          </DialogDescription>
        </DialogHeader>

        {acceptUrl ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-medium text-green-800 mb-2">
                ✅ Invitation sent successfully!
              </p>
              <p className="text-sm text-green-700">
                {notified
                  ? <>An in-app notification has been delivered to <strong>{selectedUser?.full_name}</strong>.</>
                  : <>Share this link with <strong>{selectedUser?.full_name}</strong> to accept the invitation:</>}
              </p>
            </div>
            {!notified && (
              <div className="flex items-center gap-2">
                <Input value={acceptUrl} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Done</Button>
              <Button onClick={() => { resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {selectedUser ? (
              <div className="flex items-center gap-3 p-3 rounded-md border bg-primary/5">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {selectedUser.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedUser.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedUser.phone_number || selectedUser.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedUser(null); setQuery(''); }}
                >
                  <X className="h-4 w-4 mr-1" /> Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="agent-search">Search Agent *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="agent-search"
                    autoFocus
                    placeholder="Phone, email, or name (min 3 chars)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {query.trim().length >= 3 && (
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    {results.length === 0 && !searching ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No registered users match &ldquo;{query}&rdquo;. They must sign up first.
                      </div>
                    ) : (
                      results.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 border-b last:border-b-0"
                        >
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.full_name?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.phone_number || u.email || u.role}
                            </p>
                          </div>
                          {u.is_verified && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

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
