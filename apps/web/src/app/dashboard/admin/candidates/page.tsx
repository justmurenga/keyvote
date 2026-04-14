'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface Candidate {
  id: string;
  user_id: string;
  position: string;
  is_verified: boolean;
  is_active: boolean;
  is_independent: boolean;
  campaign_slogan: string | null;
  follower_count: number;
  created_at: string;
  user: {
    full_name: string;
    phone: string;
    email: string | null;
    profile_photo_url: string | null;
  };
  party: {
    id: string;
    name: string;
    abbreviation: string;
  } | null;
  county: { name: string } | null;
  constituency: { name: string } | null;
  ward: { name: string } | null;
}

const positions = [
  { value: '', label: 'All Positions' },
  { value: 'president', label: 'President' },
  { value: 'governor', label: 'Governor' },
  { value: 'senator', label: 'Senator' },
  { value: 'women_rep', label: 'Women Rep' },
  { value: 'mp', label: 'Member of Parliament' },
  { value: 'mca', label: 'MCA' },
];

export default function AdminCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [verification, setVerification] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (position) params.set('position', position);
      if (verification) params.set('verification', verification);

      const res = await fetch(`/api/admin/candidates?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, position, verification]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleVerify = async (candidateId: string, verify: boolean) => {
    setActionLoading(candidateId);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: verify }),
      });
      if (res.ok) {
        fetchCandidates();
        if (selectedCandidate?.id === candidateId) {
          setSelectedCandidate((prev) =>
            prev ? { ...prev, is_verified: verify } : null
          );
        }
      }
    } catch (error) {
      console.error('Failed to update candidate:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (candidateId: string, active: boolean) => {
    setActionLoading(candidateId);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active }),
      });
      if (res.ok) {
        fetchCandidates();
      }
    } catch (error) {
      console.error('Failed to toggle candidate status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getPositionColor = (pos: string) => {
    const colors: Record<string, string> = {
      president: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      governor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      senator: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      women_rep: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      mp: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      mca: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[pos] || 'bg-gray-100 text-gray-800';
  };

  return (
    <PermissionGuard permission="candidates:edit" fallback={
      <div className="text-center py-12">
        <p className="text-muted-foreground">You don&apos;t have permission to manage candidates.</p>
      </div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Candidate Management</h1>
            <p className="text-muted-foreground mt-1">
              {totalCount} candidate{totalCount !== 1 ? 's' : ''} registered
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCandidates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
              <select
                value={position}
                onChange={(e) => { setPosition(e.target.value); setPage(1); }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {positions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                value={verification}
                onChange={(e) => { setVerification(e.target.value); setPage(1); }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedCandidate(null)} />
            <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-lg border bg-background shadow-lg max-h-[80vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Candidate Details</h2>
                  <button onClick={() => setSelectedCandidate(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {selectedCandidate.user.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-semibold">{selectedCandidate.user.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCandidate.user.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Position:</span> <span className="capitalize font-medium">{selectedCandidate.position.replace('_', ' ')}</span></div>
                    <div><span className="text-muted-foreground">Party:</span> <span className="font-medium">{selectedCandidate.party?.abbreviation || 'Independent'}</span></div>
                    <div><span className="text-muted-foreground">Followers:</span> <span className="font-medium">{selectedCandidate.follower_count}</span></div>
                    <div><span className="text-muted-foreground">Status:</span> {selectedCandidate.is_active ? <Badge variant="default" className="text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">Inactive</Badge>}</div>
                    <div><span className="text-muted-foreground">County:</span> <span className="font-medium">{selectedCandidate.county?.name || '-'}</span></div>
                    <div><span className="text-muted-foreground">Constituency:</span> <span className="font-medium">{selectedCandidate.constituency?.name || '-'}</span></div>
                    <div><span className="text-muted-foreground">Ward:</span> <span className="font-medium">{selectedCandidate.ward?.name || '-'}</span></div>
                    <div><span className="text-muted-foreground">Verified:</span> {selectedCandidate.is_verified ? <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge> : <Badge variant="destructive" className="text-xs">No</Badge>}</div>
                  </div>
                  {selectedCandidate.campaign_slogan && (
                    <div>
                      <span className="text-sm text-muted-foreground">Slogan:</span>
                      <p className="text-sm italic">&quot;{selectedCandidate.campaign_slogan}&quot;</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  {!selectedCandidate.is_verified ? (
                    <Button size="sm" onClick={() => handleVerify(selectedCandidate.id, true)} disabled={actionLoading === selectedCandidate.id}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleVerify(selectedCandidate.id, false)} disabled={actionLoading === selectedCandidate.id}>
                      <XCircle className="h-4 w-4 mr-1" /> Revoke
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={selectedCandidate.is_active ? 'destructive' : 'default'}
                    onClick={() => handleToggleActive(selectedCandidate.id, !selectedCandidate.is_active)}
                    disabled={actionLoading === selectedCandidate.id}
                  >
                    {selectedCandidate.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Candidates Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Candidate</th>
                    <th className="text-left p-4 font-medium">Position</th>
                    <th className="text-left p-4 font-medium">Party</th>
                    <th className="text-left p-4 font-medium">Region</th>
                    <th className="text-left p-4 font-medium">Followers</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        {[...Array(7)].map((_, j) => (
                          <td key={j} className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                        ))}
                      </tr>
                    ))
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No candidates found
                      </td>
                    </tr>
                  ) : (
                    candidates.map((candidate) => (
                      <tr key={candidate.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {candidate.user.full_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="font-medium">{candidate.user.full_name}</p>
                              <p className="text-xs text-muted-foreground">{candidate.user.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPositionColor(candidate.position)}`}>
                            {candidate.position.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          {candidate.is_independent ? (
                            <Badge variant="outline" className="text-xs">Independent</Badge>
                          ) : (
                            <span className="text-sm">{candidate.party?.abbreviation || '-'}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {candidate.county?.name || candidate.constituency?.name || candidate.ward?.name || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium">{candidate.follower_count}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {candidate.is_verified ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Unverified</Badge>
                            )}
                            {!candidate.is_active && (
                              <Badge variant="destructive" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCandidate(candidate)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!candidate.is_verified ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleVerify(candidate.id, true)}
                                disabled={actionLoading === candidate.id}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600"
                                onClick={() => handleVerify(candidate.id, false)}
                                disabled={actionLoading === candidate.id}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
