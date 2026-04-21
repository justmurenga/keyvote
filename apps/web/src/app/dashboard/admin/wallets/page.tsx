'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wallet,
  Eye,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Package,
} from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  is_frozen: boolean;
  frozen_reason: string | null;
  total_credited: number;
  total_debited: number;
  created_at: string;
  user: {
    full_name: string;
    phone: string;
    email: string | null;
    role: string;
  };
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference: string | null;
  status: string;
  mpesa_receipt_number: string | null;
  created_at: string;
}

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedWallet, setSelectedWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [walletStats, setWalletStats] = useState<{
    totalWallets: number;
    totalBalance: number;
    totalCredited: number;
    totalDebited: number;
    frozenCount: number;
  } | null>(null);

  // Manual credit (Add Funds) state
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');
  const [creditReference, setCreditReference] = useState('');
  const [creditError, setCreditError] = useState('');
  const [creditSuccess, setCreditSuccess] = useState('');

  // Entitlements (services the wallet owner has prepaid for)
  interface Entitlement {
    id: string;
    item_id: string;
    item_name: string;
    category: string | null;
    quantity_remaining: number | null;
    quantity_total: number | null;
    amount_paid: number;
    status: string;
    expires_at: string | null;
    granted_at: string;
  }
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [entLoading, setEntLoading] = useState(false);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/wallets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWallets(data.wallets || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
        if (data.stats) setWalletStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const fetchTransactions = async (walletId: string) => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/admin/wallets/${walletId}/transactions`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setTxLoading(false);
    }
  };

  const openWalletDetail = async (wallet: WalletData) => {
    setSelectedWallet(wallet);
    setCreditOpen(false);
    setCreditAmount('');
    setCreditDescription('');
    setCreditReference('');
    setCreditError('');
    setCreditSuccess('');
    setEntitlements([]);
    await Promise.all([fetchTransactions(wallet.id), fetchEntitlements(wallet.id)]);
  };

  const fetchEntitlements = async (walletId: string) => {
    setEntLoading(true);
    try {
      const res = await fetch(`/api/admin/wallets/${walletId}/entitlements`);
      if (res.ok) {
        const data = await res.json();
        setEntitlements(data.entitlements || []);
      }
    } catch (error) {
      console.error('Failed to fetch entitlements:', error);
    } finally {
      setEntLoading(false);
    }
  };

  const handleAddFunds = async () => {
    if (!selectedWallet) return;
    const amt = parseFloat(creditAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setCreditError('Enter a valid amount greater than zero');
      return;
    }
    setCreditError('');
    setActionLoading(selectedWallet.id);
    try {
      const res = await fetch(`/api/admin/wallets/${selectedWallet.id}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          description: creditDescription || undefined,
          reference: creditReference || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreditError(data.error || 'Failed to credit wallet');
        return;
      }
      setCreditSuccess(`Credited KES ${amt.toLocaleString()} successfully`);
      setCreditAmount('');
      setCreditDescription('');
      setCreditReference('');
      // refresh wallet + transactions
      await fetchWallets();
      await fetchTransactions(selectedWallet.id);
      // optimistic local update
      setSelectedWallet((prev) =>
        prev
          ? {
              ...prev,
              balance: (prev.balance || 0) + amt,
              total_credited: (prev.total_credited || 0) + amt,
            }
          : prev,
      );
      setTimeout(() => setCreditSuccess(''), 4000);
    } catch (e) {
      setCreditError(e instanceof Error ? e.message : 'Failed to credit wallet');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFreeze = async (walletId: string, freeze: boolean) => {
    const reason = freeze ? prompt('Reason for freezing this wallet:') : null;
    if (freeze && !reason) return;

    setActionLoading(walletId);
    try {
      const res = await fetch(`/api/admin/wallets/${walletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_frozen: freeze,
          frozen_reason: freeze ? reason : null,
        }),
      });
      if (res.ok) {
        fetchWallets();
        if (selectedWallet?.id === walletId) {
          setSelectedWallet(prev => prev ? { ...prev, is_frozen: freeze, frozen_reason: freeze ? reason! : null } : null);
        }
      }
    } catch (error) {
      console.error('Failed to update wallet:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'credit': case 'topup': case 'mpesa_topup':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Credit</Badge>;
      case 'debit': case 'withdrawal': case 'transfer_out': case 'payment':
        return <Badge variant="destructive" className="text-xs">Debit</Badge>;
      case 'transfer_in':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Transfer In</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <PermissionGuard permission="wallet:view_all" fallback={
      <div className="text-center py-12"><p className="text-muted-foreground">You don&apos;t have permission to manage wallets.</p></div>
    }>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Wallet Management</h1>
            <p className="text-muted-foreground mt-1">Monitor and manage user wallets</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchWallets}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Stats */}
        {walletStats && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            {[
              { label: 'Total Wallets', value: walletStats.totalWallets, icon: Wallet, color: 'text-blue-500' },
              { label: 'Total Balance', value: `KES ${walletStats.totalBalance.toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
              { label: 'Total Credited', value: `KES ${walletStats.totalCredited.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Total Debited', value: `KES ${walletStats.totalDebited.toLocaleString()}`, icon: TrendingDown, color: 'text-orange-500' },
              { label: 'Frozen', value: walletStats.frozenCount, icon: AlertTriangle, color: 'text-red-500' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-lg font-bold mt-1">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by user name, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All Wallets</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Detail Modal */}
        {selectedWallet && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedWallet(null)} />
            <div className="fixed inset-x-4 top-[5%] z-50 mx-auto max-w-2xl rounded-lg border bg-background shadow-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Wallet Details</h2>
                  <button onClick={() => setSelectedWallet(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{selectedWallet.user.full_name}</span></div>
                  <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedWallet.user.phone}</span></div>
                  <div><span className="text-muted-foreground">Role:</span> <Badge variant="outline" className="capitalize text-xs">{selectedWallet.user.role}</Badge></div>
                  <div><span className="text-muted-foreground">Balance:</span> <span className="font-bold text-lg">KES {selectedWallet.balance.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Total In:</span> <span className="font-medium text-green-600">KES {selectedWallet.total_credited.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Total Out:</span> <span className="font-medium text-red-600">KES {selectedWallet.total_debited.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> {selectedWallet.is_frozen ? <Badge variant="destructive" className="text-xs">Frozen</Badge> : <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>}</div>
                  {selectedWallet.frozen_reason && <div><span className="text-muted-foreground">Freeze Reason:</span> <span className="text-sm">{selectedWallet.frozen_reason}</span></div>}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => setCreditOpen((v) => !v)}
                    disabled={selectedWallet.is_frozen}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Funds
                  </Button>
                  {selectedWallet.is_frozen ? (
                    <Button size="sm" onClick={() => handleFreeze(selectedWallet.id, false)} disabled={actionLoading === selectedWallet.id}>
                      <Unlock className="h-4 w-4 mr-1" /> Unfreeze
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => handleFreeze(selectedWallet.id, true)} disabled={actionLoading === selectedWallet.id}>
                      <Lock className="h-4 w-4 mr-1" /> Freeze
                    </Button>
                  )}
                </div>

                {/* Add Funds form */}
                {creditOpen && !selectedWallet.is_frozen && (
                  <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Manual Top-up
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Amount (KES)</label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={creditAmount}
                          onChange={(e) => setCreditAmount(e.target.value)}
                          placeholder="e.g. 500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Reference (optional)</label>
                        <Input
                          value={creditReference}
                          onChange={(e) => setCreditReference(e.target.value)}
                          placeholder="e.g. VOUCHER-123"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <Input
                          value={creditDescription}
                          onChange={(e) => setCreditDescription(e.target.value)}
                          placeholder="Manual top-up by administrator"
                        />
                      </div>
                    </div>
                    {creditError && (
                      <p className="text-xs text-red-600">{creditError}</p>
                    )}
                    {creditSuccess && (
                      <p className="text-xs text-green-700">{creditSuccess}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddFunds}
                        disabled={actionLoading === selectedWallet.id || !creditAmount}
                      >
                        Credit Wallet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setCreditOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      The amount will be added to the wallet immediately and recorded as an audited
                      transaction. The user can then spend it on billable services (SMS, polls, profile
                      boosts, subscriptions, etc.).
                    </p>
                  </div>
                )}

                {/* Prepaid services / entitlements */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" /> Prepaid Services
                  </h3>
                  {entLoading ? (
                    <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
                  ) : entitlements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No prepaid services yet. Items the user buys from their wallet will appear here.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {entitlements.map((e) => (
                        <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                          <div>
                            <p className="font-medium">{e.item_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.category || 'service'} ·{' '}
                              {e.quantity_remaining != null
                                ? `${e.quantity_remaining}/${e.quantity_total ?? '∞'} left`
                                : e.expires_at
                                  ? `expires ${new Date(e.expires_at).toLocaleDateString()}`
                                  : 'unlimited'}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={
                                e.status === 'active'
                                  ? 'bg-green-100 text-green-800 text-xs'
                                  : 'bg-muted text-xs'
                              }
                              variant={e.status === 'active' ? undefined : 'secondary'}
                            >
                              {e.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              KES {Number(e.amount_paid || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transactions */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recent Transactions</h3>
                  {txLoading ? (
                    <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                          <div className="flex items-center gap-3">
                            {getTransactionBadge(tx.type)}
                            <div>
                              <p className="font-medium">{tx.description || tx.type}</p>
                              <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${tx.type.includes('credit') || tx.type.includes('topup') || tx.type === 'transfer_in' ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.type.includes('credit') || tx.type.includes('topup') || tx.type === 'transfer_in' ? '+' : '-'}KES {tx.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Bal: KES {tx.balance_after.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Wallets Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">User</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-right p-4 font-medium">Balance</th>
                    <th className="text-right p-4 font-medium">Credited</th>
                    <th className="text-right p-4 font-medium">Debited</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">{[...Array(7)].map((_, j) => (<td key={j} className="p-4"><div className="h-4 bg-muted rounded animate-pulse w-16" /></td>))}</tr>
                    ))
                  ) : wallets.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No wallets found</td></tr>
                  ) : (
                    wallets.map(wallet => (
                      <tr key={wallet.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{wallet.user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{wallet.user.phone}</p>
                          </div>
                        </td>
                        <td className="p-4"><Badge variant="outline" className="capitalize text-xs">{wallet.user.role}</Badge></td>
                        <td className="p-4 text-right font-bold">KES {wallet.balance.toLocaleString()}</td>
                        <td className="p-4 text-right text-green-600">+{wallet.total_credited.toLocaleString()}</td>
                        <td className="p-4 text-right text-red-600">-{wallet.total_debited.toLocaleString()}</td>
                        <td className="p-4">
                          {wallet.is_frozen ? (
                            <Badge variant="destructive" className="text-xs">Frozen</Badge>
                          ) : wallet.is_active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openWalletDetail(wallet)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {wallet.is_frozen ? (
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleFreeze(wallet.id, false)} disabled={actionLoading === wallet.id}>
                                <Unlock className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleFreeze(wallet.id, true)} disabled={actionLoading === wallet.id}>
                                <Lock className="h-4 w-4" />
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
