'use client';

import { useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  User,
  DollarSign,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

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

export default function AdminSMSPage() {
  const [senderIds, setSenderIds] = useState<SenderIdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // New sender ID form
  const [showForm, setShowForm] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [newSenderId, setNewSenderId] = useState('');
  const [costPerSms, setCostPerSms] = useState('1.00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchSenderIds();
  }, []);

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

  const searchCandidates = async (q: string) => {
    setCandidateSearch(q);
    if (q.length < 2) { setCandidates([]); return; }
    try {
      const res = await fetch(`/api/admin/candidates?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch {}
  };

  const handleCreate = async () => {
    if (!selectedCandidate || !newSenderId.trim()) return;
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
          notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setSuccess('Sender ID created successfully');
      setShowForm(false);
      setSelectedCandidate(null);
      setNewSenderId('');
      setCostPerSms('1.00');
      setNotes('');
      fetchSenderIds();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to create sender ID');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this sender ID?')) return;
    try {
      await fetch(`/api/sms/sender-ids?id=${id}`, { method: 'DELETE' });
      fetchSenderIds();
      setSuccess('Sender ID deactivated');
      setTimeout(() => setSuccess(''), 3000);
    } catch {}
  };

  return (
    <PermissionGuard permission="settings:system" fallback={
      <div className="text-center py-12"><p className="text-muted-foreground">Access denied.</p></div>
    }>
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
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" /> Assign Sender ID
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign Sender ID to Candidate</CardTitle>
              <CardDescription>The candidate will use this sender ID for bulk SMS. Costs are deducted from their wallet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Candidate Search */}
              <div>
                <Label>Search Candidate</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or phone..."
                    value={candidateSearch}
                    onChange={(e) => searchCandidates(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {candidates.length > 0 && !selectedCandidate && (
                  <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                    {candidates.map((c: any) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-2"
                        onClick={() => {
                          setSelectedCandidate(c);
                          setCandidateSearch(c.users?.full_name || c.full_name || '');
                          setCandidates([]);
                        }}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        {c.users?.full_name || c.full_name} — {c.position}
                      </button>
                    ))}
                  </div>
                )}
                {selectedCandidate && (
                  <Badge className="mt-2" variant="secondary">
                    Selected: {selectedCandidate.users?.full_name || selectedCandidate.full_name}
                    <button onClick={() => { setSelectedCandidate(null); setCandidateSearch(''); }} className="ml-2">×</button>
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Sender ID (max 11 chars)</Label>
                  <Input
                    value={newSenderId}
                    onChange={(e) => setNewSenderId(e.target.value.slice(0, 11))}
                    placeholder="e.g. WANJIKU2027"
                    maxLength={11}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{newSenderId.length}/11 characters</p>
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
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className="mt-1" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} disabled={saving || !selectedCandidate || !newSenderId.trim()}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  {saving ? 'Creating...' : 'Create & Approve'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
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
              <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
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
                            <p className="text-xs text-muted-foreground">{s.candidates?.users?.phone || ''}</p>
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
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
      </div>
    </PermissionGuard>
  );
}
