'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Pencil,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User,
  DollarSign,
  ShieldCheck,
  MapPin,
  Wallet as WalletIcon,
  X,
  Phone,
  Building2,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { useToast } from '@/components/ui/use-toast';
import { getElectoralPositionLabel } from '@/lib/utils';

interface SenderIdRecord {
  id: string;
  candidate_id: string;
  sender_id: string;
  is_active: boolean;
  is_approved: boolean;
  cost_per_sms: number;
  notes: string | null;
  created_at: string;
  candidates: {
    id: string;
    users: { full_name: string; phone: string };
  };
}

interface CandidateSearchResult {
  id: string;
  position: string;
  is_verified: boolean;
  is_active: boolean;
  user?: {
    full_name: string;
    phone: string;
    email?: string;
    profile_photo_url?: string;
  } | null;
  party?: {
    id: string;
    name: string;
    abbreviation: string;
    symbol_url?: string;
    primary_color?: string;
  } | null;
  county?: { name: string } | null;
  constituency?: { name: string } | null;
  ward?: { name: string } | null;
}

interface SelectedCandidate extends CandidateSearchResult {
  walletBalance?: number | null;
  existingSenderIds?: { sender_id: string; is_active: boolean }[];
}

const SENDER_ID_RE = /^[A-Za-z][A-Za-z0-9]{2,10}$/;

function getRegionLabel(c: CandidateSearchResult | null | undefined) {
  if (!c) return '';
  return [c.ward?.name, c.constituency?.name, c.county?.name].filter(Boolean).join(', ');
}

export default function AdminSMSPage() {
  const { toast } = useToast();
  const [senderIds, setSenderIds] = useState<SenderIdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // New sender ID form
  const [showForm, setShowForm] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState<CandidateSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<SelectedCandidate | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newSenderId, setNewSenderId] = useState('');
  const [costPerSms, setCostPerSms] = useState('1.00');
  const [notes, setNotes] = useState('');
  const [deactivatePrevious, setDeactivatePrevious] = useState(true);

  // Edit dialog state
  const [editing, setEditing] = useState<SenderIdRecord | null>(null);
  const [editSenderId, setEditSenderId] = useState('');
  const [editCost, setEditCost] = useState('1.00');
  const [editNotes, setEditNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // Delete / deactivate confirm
  const [pendingDelete, setPendingDelete] = useState<SenderIdRecord | null>(null);
  const [deleteMode, setDeleteMode] = useState<'deactivate' | 'hard'>('deactivate');
  const [deleting, setDeleting] = useState(false);

  // Airtouch provider balance (admin-only)
  const [providerBalance, setProviderBalance] = useState<{
    balance: number | null;
    currency: string;
    fetchedAt: string | null;
    error: string | null;
  }>({ balance: null, currency: 'KES', fetchedAt: null, error: null });
  const [balanceLoading, setBalanceLoading] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProviderBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch('/api/admin/sms/balance', { cache: 'no-store' });
      const data = await res.json();
      setProviderBalance({
        balance: typeof data.balance === 'number' ? data.balance : null,
        currency: data.currency || 'KES',
        fetchedAt: data.fetchedAt || new Date().toISOString(),
        error: data.success ? null : data.error || 'Failed to fetch balance',
      });
    } catch (e) {
      setProviderBalance((prev) => ({
        ...prev,
        error: e instanceof Error ? e.message : 'Network error',
        fetchedAt: new Date().toISOString(),
      }));
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSenderIds();
    fetchProviderBalance();
  }, [fetchProviderBalance]);

  const fetchSenderIds = async () => {
    try {
      const res = await fetch('/api/sms/sender-ids');
      const data = await res.json();
      setSenderIds(data.senderIds || []);
    } catch {
      setError('Failed to load sender IDs');
    } finally {
      setLoading(false);
    }
  };

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCandidates([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/candidates?search=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch {
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (q: string) => {
    setCandidateSearch(q);
    if (selectedCandidate) setSelectedCandidate(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(q), 300);
  };

  const selectCandidate = async (c: CandidateSearchResult) => {
    setSelectedCandidate({ ...c });
    setCandidateSearch(c.user?.full_name || '');
    setCandidates([]);
    setLoadingDetails(true);

    // Suggest a default sender ID derived from candidate name (preserve case-friendly default)
    const suggestion = (c.user?.full_name || '')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 11);
    if (!newSenderId && suggestion.length >= 3) setNewSenderId(suggestion);

    try {
      // Fetch existing sender IDs for this candidate (admin endpoint returns all)
      const existingRes = await fetch('/api/sms/sender-ids').catch(() => null);
      const existing = existingRes ? await existingRes.json().catch(() => null) : null;
      const existingForCandidate = (existing?.senderIds || []).filter(
        (s: SenderIdRecord) => s.candidate_id === c.id,
      );

      // Wallet balance — try admin candidate wallet endpoint, fall back gracefully
      let walletBalance: number | null = null;
      try {
        const wRes = await fetch(`/api/admin/candidates/${c.id}/wallet`);
        if (wRes.ok) {
          const w = await wRes.json();
          walletBalance = w?.balance ?? w?.wallet?.balance ?? null;
        }
      } catch {}

      setSelectedCandidate((prev) =>
        prev
          ? {
              ...prev,
              walletBalance,
              existingSenderIds: existingForCandidate.map((s: SenderIdRecord) => ({
                sender_id: s.sender_id,
                is_active: s.is_active && s.is_approved,
              })),
            }
          : prev,
      );
    } catch {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  };

  const clearSelection = () => {
    setSelectedCandidate(null);
    setCandidateSearch('');
    setNewSenderId('');
  };

  const handleCreate = async () => {
    if (!selectedCandidate || !newSenderId.trim()) return;

    if (!SENDER_ID_RE.test(newSenderId.trim())) {
      const msg =
        'Sender ID must be 3–11 characters, start with a letter, and contain only letters and digits (no spaces or symbols).';
      setError(msg);
      toast({ title: 'Invalid sender ID', description: msg, variant: 'destructive' });
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/sms/sender-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          senderId: newSenderId.trim(),
          costPerSms: parseFloat(costPerSms) || 1.0,
          notes: notes || null,
          deactivatePrevious,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create sender ID');
      }
      const successMsg = `Sender ID "${newSenderId.trim()}" assigned to ${
        selectedCandidate.user?.full_name || 'candidate'
      }`;
      setSuccess(successMsg);
      toast({ title: 'Sender ID assigned', description: successMsg });
      setShowForm(false);
      clearSelection();
      setCostPerSms('1.00');
      setNotes('');
      fetchSenderIds();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create sender ID';
      setError(msg);
      toast({ title: 'Failed to assign sender ID', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: SenderIdRecord) => {
    setEditing(s);
    setEditSenderId(s.sender_id);
    setEditCost((s.cost_per_sms ?? 1).toFixed(2));
    setEditNotes(s.notes || '');
    setEditIsActive(Boolean(s.is_active && s.is_approved));
  };

  const closeEdit = () => {
    setEditing(null);
    setEditSaving(false);
  };

  const handleEditSave = async () => {
    if (!editing) return;

    const trimmed = editSenderId.trim();
    if (!SENDER_ID_RE.test(trimmed)) {
      toast({
        title: 'Invalid sender ID',
        description:
          'Sender ID must be 3–11 characters, start with a letter, and contain only letters and digits.',
        variant: 'destructive',
      });
      return;
    }
    const cost = parseFloat(editCost);
    if (!Number.isFinite(cost) || cost < 0.5 || cost > 100) {
      toast({
        title: 'Invalid cost',
        description: 'Cost per SMS must be between 0.50 and 100.00 KES',
        variant: 'destructive',
      });
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch('/api/sms/sender-ids', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          senderId: trimmed,
          costPerSms: cost,
          notes: editNotes,
          isActive: editIsActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update sender ID');
      }
      toast({
        title: 'Sender ID updated',
        description: `Changes saved for ${editing.candidates?.users?.full_name || 'candidate'}.`,
      });
      closeEdit();
      fetchSenderIds();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update sender ID';
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
    } finally {
      setEditSaving(false);
    }
  };

  const openDelete = (s: SenderIdRecord, mode: 'deactivate' | 'hard' = 'deactivate') => {
    setPendingDelete(s);
    setDeleteMode(mode);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const url =
        `/api/sms/sender-ids?id=${encodeURIComponent(pendingDelete.id)}` +
        (deleteMode === 'hard' ? '&hard=true' : '');
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to remove sender ID');
      }
      toast({
        title: deleteMode === 'hard' ? 'Sender ID deleted' : 'Sender ID deactivated',
        description:
          deleteMode === 'hard'
            ? `"${pendingDelete.sender_id}" permanently removed.`
            : `"${pendingDelete.sender_id}" is no longer active.`,
      });
      setPendingDelete(null);
      fetchSenderIds();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to remove sender ID';
      toast({ title: 'Action failed', description: msg, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const senderIdValid = SENDER_ID_RE.test(newSenderId.trim());
  const conflictingActive = selectedCandidate?.existingSenderIds?.find(
    (s) => s.is_active && s.sender_id.toLowerCase() === newSenderId.trim().toLowerCase(),
  );

  return (
    <PermissionGuard
      permission="settings:system"
      fallback={
        <div className="text-center py-12">
          <p className="text-muted-foreground">Access denied.</p>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SMS Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage Airtouch SMS sender IDs for candidates. Each candidate pays per SMS from their wallet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {success && (
              <Badge className="bg-green-100 text-green-800 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {success}
              </Badge>
            )}
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" /> Assign Sender ID
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Airtouch Provider Balance (admin-only) */}
        <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-background">
          <CardContent className="py-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <WalletIcon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    Airtouch SMS Balance
                    <ShieldCheck className="h-3 w-3" />
                    <span className="text-[10px]">Admin only</span>
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    {balanceLoading && providerBalance.balance === null ? (
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
                    ) : providerBalance.error ? (
                      <span className="text-base font-semibold text-red-600">Unavailable</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                          {providerBalance.currency}{' '}
                          {(providerBalance.balance ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                  {providerBalance.error ? (
                    <p className="text-xs text-red-600 mt-1 max-w-md break-all">
                      {providerBalance.error}
                    </p>
                  ) : providerBalance.fetchedAt ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {new Date(providerBalance.fetchedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProviderBalance}
                disabled={balanceLoading}
              >
                {balanceLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign Sender ID to Candidate</CardTitle>
              <CardDescription>
                The candidate will use this sender ID for bulk SMS. Costs are deducted from their wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Candidate Search */}
              <div>
                <Label>Search Candidate</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone (min 2 chars)..."
                    value={candidateSearch}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!searching && candidateSearch && !selectedCandidate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCandidateSearch('');
                        setCandidates([]);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!selectedCandidate && candidateSearch.length >= 2 && (
                  <div className="mt-2 border rounded-lg max-h-80 overflow-y-auto bg-background shadow-sm">
                    {searching ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Searching candidates…
                      </div>
                    ) : candidates.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No candidates match &quot;{candidateSearch}&quot;.
                      </div>
                    ) : (
                      candidates.map((c) => {
                        const region = getRegionLabel(c);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm flex items-start gap-3 border-b last:border-b-0"
                            onClick={() => selectCandidate(c)}
                          >
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                              {c.user?.profile_photo_url ? (
                                <Image
                                  src={c.user.profile_photo_url}
                                  alt={c.user?.full_name || 'Candidate'}
                                  width={36}
                                  height={36}
                                  className="h-9 w-9 object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">
                                  {c.user?.full_name || 'Unnamed candidate'}
                                </span>
                                {c.is_verified && (
                                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                )}
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {getElectoralPositionLabel(c.position)}
                                </Badge>
                                {c.party?.abbreviation && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                    style={
                                      c.party.primary_color
                                        ? {
                                            backgroundColor: `${c.party.primary_color}20`,
                                            color: c.party.primary_color,
                                          }
                                        : undefined
                                    }
                                  >
                                    {c.party.abbreviation}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                                {c.user?.phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {c.user.phone}
                                  </span>
                                )}
                                {region && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <MapPin className="h-3 w-3" /> {region}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected candidate detail card */}
              {selectedCandidate && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-full bg-background border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedCandidate.user?.profile_photo_url ? (
                        <Image
                          src={selectedCandidate.user.profile_photo_url}
                          alt={selectedCandidate.user?.full_name || 'Candidate'}
                          width={56}
                          height={56}
                          className="h-14 w-14 object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">
                          {selectedCandidate.user?.full_name || 'Unnamed candidate'}
                        </h3>
                        {selectedCandidate.is_verified ? (
                          <Badge className="bg-green-100 text-green-800 text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Unverified
                          </Badge>
                        )}
                        {!selectedCandidate.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <div className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {getElectoralPositionLabel(selectedCandidate.position)}
                          {selectedCandidate.party?.name && (
                            <span className="ml-1">• {selectedCandidate.party.name}</span>
                          )}
                        </div>
                        {selectedCandidate.user?.phone && (
                          <div className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> {selectedCandidate.user.phone}
                          </div>
                        )}
                        {getRegionLabel(selectedCandidate) && (
                          <div className="inline-flex items-center gap-1.5 sm:col-span-2">
                            <MapPin className="h-3.5 w-3.5" /> {getRegionLabel(selectedCandidate)}
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1.5">
                          <WalletIcon className="h-3.5 w-3.5" />
                          {loadingDetails ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> Loading wallet…
                            </span>
                          ) : selectedCandidate.walletBalance != null ? (
                            <span>
                              Wallet: <strong>KES {selectedCandidate.walletBalance.toFixed(2)}</strong>
                            </span>
                          ) : (
                            <span className="italic">Wallet info unavailable</span>
                          )}
                        </div>
                      </div>

                      {/* Existing sender IDs warning */}
                      {selectedCandidate.existingSenderIds &&
                        selectedCandidate.existingSenderIds.length > 0 && (
                          <div className="mt-3 p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2">
                            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <div>
                              This candidate already has{' '}
                              {selectedCandidate.existingSenderIds.length} sender ID(s):{' '}
                              {selectedCandidate.existingSenderIds.map((s, i) => (
                                <span key={s.sender_id}>
                                  <span className="font-mono font-semibold">{s.sender_id}</span>
                                  {s.is_active ? ' (active)' : ' (inactive)'}
                                  {i < (selectedCandidate.existingSenderIds?.length || 0) - 1 ? ', ' : ''}
                                </span>
                              ))}
                              .
                            </div>
                          </div>
                        )}
                    </div>
                    <button
                      onClick={clearSelection}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Sender ID (max 11 chars)</Label>
                  <Input
                    value={newSenderId}
                    onChange={(e) =>
                      setNewSenderId(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 11))
                    }
                    placeholder="e.g. Wanjiku2027"
                    maxLength={11}
                    className="mt-1 font-mono normal-case"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <p
                    className={`text-xs mt-1 ${
                      newSenderId && !senderIdValid ? 'text-red-600' : 'text-muted-foreground'
                    }`}
                  >
                    {newSenderId.length}/11 characters · letters and digits, must start with a letter
                  </p>
                  {conflictingActive && (
                    <p className="text-xs text-amber-600 mt-1">
                      This sender ID is already active for this candidate.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Cost per SMS (KES)</Label>
                  <Input
                    type="number"
                    step="0.10"
                    min="0.50"
                    value={costPerSms}
                    onChange={(e) => setCostPerSms(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="mt-1"
                  />
                </div>
              </div>

              {selectedCandidate?.existingSenderIds?.some((s) => s.is_active) && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={deactivatePrevious}
                    onChange={(e) => setDeactivatePrevious(e.target.checked)}
                    className="rounded"
                  />
                  Deactivate this candidate&apos;s previously active sender IDs
                </label>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleCreate}
                  disabled={
                    saving ||
                    !selectedCandidate ||
                    !senderIdValid ||
                    Boolean(conflictingActive)
                  }
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {saving ? 'Creating...' : 'Create & Approve'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    clearSelection();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sender IDs List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> Active Sender IDs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : senderIds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No sender IDs configured yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Candidate</th>
                      <th className="text-left py-3 px-2 font-medium">Sender ID</th>
                      <th className="text-left py-3 px-2 font-medium">Cost/SMS</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Created</th>
                      <th className="text-right py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {senderIds.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{s.candidates?.users?.full_name || '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.candidates?.users?.phone || ''}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono font-bold">{s.sender_id}</td>
                        <td className="py-3 px-2">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> KES {s.cost_per_sms?.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          {s.is_active && s.is_approved ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="inline-flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(s)}
                              aria-label="Edit sender ID"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {s.is_active && s.is_approved ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDelete(s, 'deactivate')}
                                aria-label="Deactivate sender ID"
                                title="Deactivate"
                              >
                                <Power className="h-4 w-4 text-amber-600" />
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDelete(s, 'hard')}
                              aria-label="Delete sender ID"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Airtouch Config Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Airtouch Configuration</CardTitle>
            <CardDescription>SMS Provider: Airtouch Kenya</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">API Endpoint</p>
                <p className="font-mono text-xs mt-1">https://client.airtouch.co.ke:9012/sms/api/</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Username</p>
                <p className="font-medium mt-1">{process.env.NEXT_PUBLIC_SMS_USERNAME || '••••••'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground">Default Sender ID</p>
                <p className="font-medium mt-1">{process.env.NEXT_PUBLIC_SMS_SENDER_ID || 'myVote'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Sender ID Dialog */}
        <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Sender ID</DialogTitle>
              <DialogDescription>
                {editing?.candidates?.users?.full_name
                  ? `Update the sender ID for ${editing.candidates.users.full_name}.`
                  : 'Update sender ID details.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sender ID</Label>
                <Input
                  value={editSenderId}
                  onChange={(e) =>
                    setEditSenderId(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 11))
                  }
                  maxLength={11}
                  className="mt-1 font-mono"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p
                  className={`text-xs mt-1 ${
                    editSenderId && !SENDER_ID_RE.test(editSenderId.trim())
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {editSenderId.length}/11 · letters and digits, must start with a letter
                </p>
              </div>
              <div>
                <Label>Cost per SMS (KES)</Label>
                <Input
                  type="number"
                  step="0.10"
                  min="0.50"
                  max="100"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Admin Notes</Label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="mt-1"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded"
                />
                Active (candidate can send SMS with this sender ID)
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEdit} disabled={editSaving}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete / Deactivate confirm */}
        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteMode === 'hard' ? 'Delete sender ID?' : 'Deactivate sender ID?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteMode === 'hard' ? (
                  <>
                    This permanently removes sender ID{' '}
                    <span className="font-mono font-semibold">
                      {pendingDelete?.sender_id}
                    </span>{' '}
                    for {pendingDelete?.candidates?.users?.full_name || 'this candidate'}. This
                    cannot be undone.
                  </>
                ) : (
                  <>
                    Sender ID{' '}
                    <span className="font-mono font-semibold">
                      {pendingDelete?.sender_id}
                    </span>{' '}
                    will stop working immediately for{' '}
                    {pendingDelete?.candidates?.users?.full_name || 'this candidate'}. You can
                    reactivate it later from the Edit dialog.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmDelete();
                }}
                disabled={deleting}
                className={
                  deleteMode === 'hard'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : undefined
                }
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : deleteMode === 'hard' ? (
                  <Trash2 className="h-4 w-4 mr-2" />
                ) : (
                  <Power className="h-4 w-4 mr-2" />
                )}
                {deleteMode === 'hard' ? 'Delete permanently' : 'Deactivate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionGuard>
  );
}
