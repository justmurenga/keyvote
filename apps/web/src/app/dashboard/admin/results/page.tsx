'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Vote,
  Eye,
  CheckCircle2,
  XCircle,
  Download,
  BarChart3,
  MapPin,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface ResultSubmission {
  id: string;
  polling_station_id: string;
  position: string;
  status: string;
  created_at: string;
  polling_station: {
    display_name: string;
    code: string;
    ward?: { name: string; constituency?: { name: string; county?: { name: string } } };
  };
  results: {
    id: string;
    votes: number;
    candidate: {
      id: string;
      user: { full_name: string };
      party?: { abbreviation: string };
    };
  }[];
  result_sheets: {
    id: string;
    image_url: string;
    is_verified: boolean;
  }[];
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

export default function AdminResultsPage() {
  const [submissions, setSubmissions] = useState<ResultSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<ResultSubmission | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resultStats, setResultStats] = useState<{
    total: number;
    pending: number;
    verified: number;
    rejected: number;
  } | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (position) params.set('position', position);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/results?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        if (data.stats) setResultStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  }, [page, position, statusFilter]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const handleVerify = async (submissionId: string, status: 'verified' | 'rejected') => {
    setActionLoading(submissionId);
    try {
      const res = await fetch(`/api/admin/results/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchResults();
        if (selectedSubmission?.id === submissionId) {
          setSelectedSubmission(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update result:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Verified</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Pending</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <PermissionGuard permission="results:verify" fallback={
      <div className="text-center py-12"><p className="text-muted-foreground">You don&apos;t have permission to manage election results.</p></div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Election Results</h1>
            <p className="text-muted-foreground mt-1">Review and verify submitted results</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchResults}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Stats */}
        {resultStats && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {[
              { label: 'Total Submissions', value: resultStats.total, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Pending Review', value: resultStats.pending, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
              { label: 'Verified', value: resultStats.verified, color: 'text-green-500', bg: 'bg-green-500/10' },
              { label: 'Rejected', value: resultStats.rejected, color: 'text-red-500', bg: 'bg-red-500/10' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.color}`}>
                    {s.label}
                  </div>
                  <p className="text-2xl font-bold mt-2">{s.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <select value={position} onChange={(e) => { setPosition(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm flex-1">
                {positions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Submission Detail Modal */}
        {selectedSubmission && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedSubmission(null)} />
            <div className="fixed inset-x-4 top-[5%] z-50 mx-auto max-w-2xl rounded-lg border bg-background shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Result Submission Details</h2>
                  <button onClick={() => setSelectedSubmission(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Station:</span> <span className="font-medium">{selectedSubmission.polling_station?.display_name}</span></div>
                  <div><span className="text-muted-foreground">Position:</span> <span className="font-medium capitalize">{selectedSubmission.position.replace('_', ' ')}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> {getStatusBadge(selectedSubmission.status)}</div>
                  <div><span className="text-muted-foreground">Submitted:</span> <span className="font-medium">{new Date(selectedSubmission.created_at).toLocaleString()}</span></div>
                </div>

                {/* Vote Tally */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Vote Tally</h3>
                  <div className="space-y-2">
                    {selectedSubmission.results?.sort((a, b) => b.votes - a.votes).map((result, idx) => {
                      const totalVotes = selectedSubmission.results.reduce((sum, r) => sum + r.votes, 0);
                      const pct = totalVotes > 0 ? (result.votes / totalVotes * 100) : 0;
                      return (
                        <div key={result.id} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{result.candidate?.user?.full_name}</span>
                              <span className="text-sm">{result.votes.toLocaleString()} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{result.candidate?.party?.abbreviation || 'IND'}</Badge>
                        </div>
                      );
                    })}
                    {(!selectedSubmission.results || selectedSubmission.results.length === 0) && (
                      <p className="text-sm text-muted-foreground">No results data</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {selectedSubmission.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" onClick={() => handleVerify(selectedSubmission.id, 'verified')} disabled={actionLoading === selectedSubmission.id}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleVerify(selectedSubmission.id, 'rejected')} disabled={actionLoading === selectedSubmission.id}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Submissions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Polling Station</th>
                    <th className="text-left p-4 font-medium">Position</th>
                    <th className="text-left p-4 font-medium">Location</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Submitted</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">{[...Array(6)].map((_, j) => (<td key={j} className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>))}</tr>
                    ))
                  ) : submissions.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><Vote className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />No result submissions found</td></tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{sub.polling_station?.display_name}</p>
                              <p className="text-xs text-muted-foreground">{sub.polling_station?.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 capitalize">{sub.position.replace('_', ' ')}</td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {sub.polling_station?.ward?.constituency?.county?.name && (
                            <span>{sub.polling_station.ward.constituency.county.name} → {sub.polling_station.ward.constituency.name} → {sub.polling_station.ward.name}</span>
                          )}
                        </td>
                        <td className="p-4">{getStatusBadge(sub.status)}</td>
                        <td className="p-4 text-muted-foreground text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(sub)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {sub.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleVerify(sub.id, 'verified')} disabled={actionLoading === sub.id}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleVerify(sub.id, 'rejected')} disabled={actionLoading === sub.id}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
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
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} total)</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
