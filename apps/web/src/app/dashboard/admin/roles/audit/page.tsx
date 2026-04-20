'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  target_user_id: string;
  role_name: string;
  party_id: string | null;
  performed_by: string;
  details: Record<string, any> | null;
  created_at: string;
  // Joined
  target_user: { id: string; full_name: string; phone: string } | null;
  performer: { id: string; full_name: string } | null;
  party: { id: string; name: string; abbreviation: string } | null;
}

export default function RoleAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const limit = 25;

  const loadAudit = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from('role_audit_log')
      .select(`
        *,
        target_user:users!role_audit_log_target_user_id_fkey(id, full_name, phone),
        performer:users!role_audit_log_performed_by_fkey(id, full_name),
        party:political_parties(id, name, abbreviation)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (filterAction !== 'all') {
      query = query.eq('action', filterAction);
    }

    const { data, count, error } = await query;

    if (!error) {
      let results = (data as unknown as AuditLogEntry[]) || [];
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        results = results.filter(
          (e) =>
            e.target_user?.full_name?.toLowerCase().includes(q) ||
            e.performer?.full_name?.toLowerCase().includes(q) ||
            e.role_name?.toLowerCase().includes(q)
        );
      }
      setEntries(results);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [page, filterAction, filterSearch]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const totalPages = Math.ceil(total / limit);

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      assign: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      revoke: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      expire: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return styles[action] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Role Audit Log</h1>
        <p className="text-muted-foreground">Track all role assignment and revocation actions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user or role..."
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">All Actions</option>
          <option value="assign">Assign</option>
          <option value="revoke">Revoke</option>
          <option value="expire">Expire</option>
          <option value="update">Update</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Loading audit log...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No audit log entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Target User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Party</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Performed By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getActionBadge(entry.action)}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{entry.target_user?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{entry.target_user?.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.role_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {entry.party ? `${entry.party.abbreviation}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {entry.performer?.full_name || 'System'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {entry.details ? JSON.stringify(entry.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
