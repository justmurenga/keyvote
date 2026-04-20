'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Trash2,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface Party {
  id: string;
  name: string;
  abbreviation: string;
  symbol_url: string | null;
  primary_color: string | null;
  registration_number: string | null;
  leader_name: string | null;
  is_verified: boolean;
  verification_status: string;
  created_at: string;
  member_count?: number;
  candidate_count?: number;
}

interface FormData {
  name: string;
  abbreviation: string;
  registration_number: string;
  leader_name: string;
  primary_color: string;
}

function PartyFormModal({ title, onSubmit, submitLabel, formData, setFormData, onClose, actionLoading }: {
  title: string;
  onSubmit: () => void;
  submitLabel: string;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onClose: () => void;
  actionLoading: string | null;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-lg border bg-background shadow-lg">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="space-y-3">
            <div>
              <Label>Party Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Orange Democratic Movement" />
            </div>
            <div>
              <Label>Abbreviation *</Label>
              <Input value={formData.abbreviation} onChange={(e) => setFormData(prev => ({ ...prev, abbreviation: e.target.value }))} placeholder="e.g., ODM" />
            </div>
            <div>
              <Label>Registration Number</Label>
              <Input value={formData.registration_number} onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))} placeholder="ORPP registration number" />
            </div>
            <div>
              <Label>Party Leader</Label>
              <Input value={formData.leader_name} onChange={(e) => setFormData(prev => ({ ...prev, leader_name: e.target.value }))} placeholder="Leader full name" />
            </div>
            <div>
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={formData.primary_color} onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))} className="h-10 w-10 rounded cursor-pointer" />
                <Input value={formData.primary_color} onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))} placeholder="#008000" className="flex-1" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSubmit} disabled={!formData.name || !formData.abbreviation || actionLoading !== null}>
              {actionLoading ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminPartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    abbreviation: '',
    registration_number: '',
    leader_name: '',
    primary_color: '#008000',
  });

  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (searchRef.current) params.set('search', searchRef.current);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/parties?${params}`);
      if (res.ok) {
        const data = await res.json();
        setParties(data.parties || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch parties:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParties();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = async () => {
    setActionLoading('create');
    try {
      const res = await fetch('/api/admin/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', abbreviation: '', registration_number: '', leader_name: '', primary_color: '#008000' });
        fetchParties();
      }
    } catch (error) {
      console.error('Failed to create party:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedParty) return;
    setActionLoading(selectedParty.id);
    try {
      const res = await fetch(`/api/admin/parties/${selectedParty.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowEditModal(false);
        setSelectedParty(null);
        fetchParties();
      }
    } catch (error) {
      console.error('Failed to update party:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (partyId: string, verify: boolean) => {
    setActionLoading(partyId);
    try {
      const res = await fetch(`/api/admin/parties/${partyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_verified: verify,
          verification_status: verify ? 'verified' : 'rejected',
        }),
      });
      if (res.ok) fetchParties();
    } catch (error) {
      console.error('Failed to update party verification:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (partyId: string) => {
    if (!confirm('Are you sure you want to delete this party? This cannot be undone.')) return;
    setActionLoading(partyId);
    try {
      const res = await fetch(`/api/admin/parties/${partyId}`, { method: 'DELETE' });
      if (res.ok) fetchParties();
    } catch (error) {
      console.error('Failed to delete party:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const openEdit = (party: Party) => {
    setSelectedParty(party);
    setFormData({
      name: party.name,
      abbreviation: party.abbreviation,
      registration_number: party.registration_number || '',
      leader_name: party.leader_name || '',
      primary_color: party.primary_color || '#008000',
    });
    setShowEditModal(true);
  };

  const getVerificationBadge = (status: string, verified: boolean) => {
    if (verified) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Verified</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    if (status === 'pending') return <Badge variant="outline" className="text-xs text-yellow-600">Pending</Badge>;
    return <Badge variant="outline" className="text-xs">Unverified</Badge>;
  };

  const closeModals = useCallback(() => { setShowCreateModal(false); setShowEditModal(false); }, []);

  return (
    <PermissionGuard permission="parties:edit" fallback={
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don&apos;t have permission to manage political parties.</p>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Political Parties</h1>
            <p className="text-muted-foreground mt-1">{totalCount} parties registered</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchParties}>
              <RefreshCw className="h-4 w-4 mr-2" />Refresh
            </Button>
            <Button size="sm" onClick={() => {
              setFormData({ name: '', abbreviation: '', registration_number: '', leader_name: '', primary_color: '#008000' });
              setShowCreateModal(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />Add Party
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search parties..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Modals */}
        {(showCreateModal || showEditModal) && (
          <PartyFormModal
            title={showCreateModal ? "Create Political Party" : "Edit Political Party"}
            onSubmit={showCreateModal ? handleCreate : handleUpdate}
            submitLabel={showCreateModal ? "Create Party" : "Save Changes"}
            formData={formData}
            setFormData={setFormData}
            onClose={closeModals}
            actionLoading={actionLoading}
          />
        )}

        {/* Parties Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6"><div className="h-20 bg-muted rounded" /></CardContent>
              </Card>
            ))}
          </div>
        ) : parties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No parties found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {parties.map((party) => (
              <Card key={party.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: party.primary_color || '#666' }}
                      >
                        {party.abbreviation?.slice(0, 2)}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{party.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{party.abbreviation}</p>
                      </div>
                    </div>
                    {getVerificationBadge(party.verification_status, party.is_verified)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Leader:</span> <span className="font-medium">{party.leader_name || '-'}</span></div>
                    <div><span className="text-muted-foreground">Reg#:</span> <span className="font-medium">{party.registration_number || '-'}</span></div>
                    <div><span className="text-muted-foreground">Members:</span> <span className="font-medium">{party.member_count || 0}</span></div>
                    <div><span className="text-muted-foreground">Candidates:</span> <span className="font-medium">{party.candidate_count || 0}</span></div>
                  </div>
                  <div className="flex items-center gap-1 pt-1 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(party)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    {!party.is_verified ? (
                      <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleVerify(party.id, true)} disabled={actionLoading === party.id}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Verify
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-orange-600" onClick={() => handleVerify(party.id, false)} disabled={actionLoading === party.id}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Revoke
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => handleDelete(party.id)} disabled={actionLoading === party.id}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} total)</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
