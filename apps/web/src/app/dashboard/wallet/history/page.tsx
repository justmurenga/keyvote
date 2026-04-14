'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2,
  Filter,
  Download,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Transaction {
  id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference: string | null;
  external_reference: string | null;
  mpesa_receipt_number: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface TransactionResult {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const TRANSACTION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'topup', label: 'M-Pesa Top Up' },
  { value: 'sms_charge', label: 'SMS Charges' },
  { value: 'whatsapp_charge', label: 'WhatsApp Charges' },
  { value: 'poll_view_charge', label: 'Poll Views' },
  { value: 'result_view_charge', label: 'Results Views' },
  { value: 'mpesa_disbursement', label: 'Withdrawals' },
  { value: 'refund', label: 'Refunds' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

export default function TransactionHistoryPage() {
  const [result, setResult] = useState<TransactionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (typeFilter && typeFilter !== 'all') {
        params.set('type', typeFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      if (startDate) {
        params.set('startDate', new Date(startDate).toISOString());
      }

      if (endDate) {
        params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());
      }

      const response = await fetch(`/api/wallet/transactions?${params}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view transactions');
          return;
        }
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
      console.error('Transactions fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, startDate, endDate]);

  // Format transaction type for display
  const formatTransactionType = (type: string): string => {
    const typeMap: Record<string, string> = {
      topup: 'M-Pesa Top Up',
      sms_charge: 'SMS Charge',
      whatsapp_charge: 'WhatsApp Charge',
      poll_view_charge: 'Poll View',
      result_view_charge: 'Results View',
      mpesa_disbursement: 'M-Pesa Withdrawal',
      subscription_charge: 'Subscription',
      refund: 'Refund',
      credit_purchase: 'Credit Purchase',
    };
    return typeMap[type] || type;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!result?.transactions.length) return;

    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After', 'Status', 'Reference'];
    const rows = result.transactions.map(tx => [
      new Date(tx.created_at).toLocaleString(),
      formatTransactionType(tx.type),
      tx.description || '',
      tx.amount.toString(),
      tx.balance_after.toString(),
      tx.status,
      tx.mpesa_receipt_number || tx.reference || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/wallet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            View and filter your wallet transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Transaction Type</Label>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {TRANSACTION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Status</Label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV}
              disabled={!result?.transactions.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {result && result.total > 0
              ? `Showing ${((page - 1) * pageSize) + 1}-${Math.min(page * pageSize, result.total)} of ${result.total} transactions`
              : 'No transactions found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-muted-foreground">
              {error}
            </div>
          ) : !result?.transactions.length ? (
            <div className="text-center py-10 text-muted-foreground">
              No transactions match your filters
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {result.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{tx.description || formatTransactionType(tx.type)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {tx.mpesa_receipt_number && (
                          <span className="ml-2 text-xs">• {tx.mpesa_receipt_number}</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} KES
                      </p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          Bal: {tx.balance_after.toLocaleString()}
                        </span>
                        <Badge 
                          variant={tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'destructive' : 'outline'} 
                          className="text-xs"
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {result.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                    disabled={page === result.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
