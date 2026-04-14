'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Loader2,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  Users,
  History,
  BarChart3,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

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
  updated_at: string;
  balanceVerified?: boolean;
}

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

interface PendingTopup {
  id: string;
  amount: number;
  phone_number: string;
  checkout_request_id: string;
  status: string;
  created_at: string;
}

interface PendingWithdrawal {
  id: string;
  amount: number;
  recipient_phone: string;
  status: string;
  created_at: string;
}

interface WalletStatistics {
  period: string;
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  breakdown: {
    type: string;
    count: number;
    total: number;
  }[];
}

interface UserResult {
  id: string;
  full_name: string;
  phone_number: string;
  role: string;
}

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const WITHDRAW_PRESET_AMOUNTS = [100, 500, 1000, 2000, 5000];

export default function DashboardWalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTopups, setPendingTopups] = useState<PendingTopup[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [transactionCount, setTransactionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top-up modal state
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpStatus, setTopUpStatus] = useState<'idle' | 'initiated' | 'polling' | 'success' | 'failed'>('idle');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  // Withdraw modal state
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawPhone, setWithdrawPhone] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // Transfer modal state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferRecipient, setTransferRecipient] = useState<string>('');
  const [transferNote, setTransferNote] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<UserResult | null>(null);

  // Pay Agent modal state (for candidates)
  const [isPayAgentOpen, setIsPayAgentOpen] = useState(false);
  const [payAgentAmount, setPayAgentAmount] = useState<string>('');
  const [agentPhone, setAgentPhone] = useState<string>('');
  const [payAgentNote, setPayAgentNote] = useState<string>('');
  const [isPayingAgent, setIsPayingAgent] = useState(false);
  const [payAgentError, setPayAgentError] = useState<string | null>(null);
  const [payAgentStatus, setPayAgentStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  // Statistics state
  const [statistics, setStatistics] = useState<WalletStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // User role (to determine if candidate features should be shown)
  const [userRole, setUserRole] = useState<string>('voter');

  // Fetch wallet data
  const fetchWallet = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/wallet');
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your wallet');
          return;
        }
        throw new Error('Failed to fetch wallet data');
      }

      const data = await response.json();
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
      setPendingTopups(data.pendingTopups || []);
      setPendingWithdrawals(data.pendingWithdrawals || []);
      setTransactionCount(data.transactionCount || 0);
    } catch (err) {
      setError('Failed to load wallet. Please try again.');
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Handle Withdraw
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount < 10) {
      setWithdrawError('Minimum withdrawal amount is KES 10');
      return;
    }
    
    if (amount > 70000) {
      setWithdrawError('Maximum withdrawal amount is KES 70,000');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      setWithdrawError('Insufficient wallet balance');
      return;
    }

    if (!withdrawPhone || withdrawPhone.length < 10) {
      setWithdrawError('Please enter a valid phone number');
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError(null);

    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber: withdrawPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate withdrawal');
      }

      setWithdrawStatus('success');
      fetchWallet(); // Refresh wallet data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate withdrawal';
      setWithdrawError(errorMessage);
      setWithdrawStatus('failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Reset withdraw modal
  const resetWithdraw = () => {
    setWithdrawAmount('');
    setWithdrawError(null);
    setWithdrawStatus('idle');
  };

  // Close withdraw modal handler
  const handleCloseWithdrawModal = () => {
    setIsWithdrawOpen(false);
    resetWithdraw();
  };

  // Search for users (for transfers)
  const searchUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Transfer
  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount);

    if (!selectedRecipient) {
      setTransferError('Please select a recipient');
      return;
    }

    if (!amount || amount < 10) {
      setTransferError('Minimum transfer amount is KES 10');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      setTransferError('Insufficient wallet balance');
      return;
    }

    setIsTransferring(true);
    setTransferError(null);

    try {
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientUserId: selectedRecipient.id,
          amount,
          description: transferNote || `Transfer to ${selectedRecipient.full_name}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transfer funds');
      }

      setTransferStatus('success');
      fetchWallet();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transfer funds';
      setTransferError(errorMessage);
      setTransferStatus('failed');
    } finally {
      setIsTransferring(false);
    }
  };

  // Reset transfer modal
  const resetTransfer = () => {
    setTransferAmount('');
    setTransferRecipient('');
    setTransferNote('');
    setTransferError(null);
    setTransferStatus('idle');
    setSearchResults([]);
    setSelectedRecipient(null);
  };

  // Close transfer modal handler
  const handleCloseTransferModal = () => {
    setIsTransferOpen(false);
    resetTransfer();
  };

  // Handle Pay Agent
  const handlePayAgent = async () => {
    const amount = parseFloat(payAgentAmount);

    if (!agentPhone || agentPhone.length < 10) {
      setPayAgentError('Please enter a valid agent phone number');
      return;
    }

    if (!amount || amount < 10) {
      setPayAgentError('Minimum payment amount is KES 10');
      return;
    }

    if (amount > (wallet?.balance || 0)) {
      setPayAgentError('Insufficient wallet balance');
      return;
    }

    setIsPayingAgent(true);
    setPayAgentError(null);

    try {
      const response = await fetch('/api/wallet/pay-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentPhone,
          amount,
          description: payAgentNote || 'Agent payment',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to pay agent');
      }

      setPayAgentStatus('success');
      fetchWallet();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pay agent';
      setPayAgentError(errorMessage);
      setPayAgentStatus('failed');
    } finally {
      setIsPayingAgent(false);
    }
  };

  // Reset pay agent modal
  const resetPayAgent = () => {
    setPayAgentAmount('');
    setAgentPhone('');
    setPayAgentNote('');
    setPayAgentError(null);
    setPayAgentStatus('idle');
  };

  // Close pay agent modal handler
  const handleClosePayAgentModal = () => {
    setIsPayAgentOpen(false);
    resetPayAgent();
  };

  // Fetch statistics
  const fetchStatistics = async (period: string = 'month') => {
    setIsLoadingStats(true);
    try {
      const response = await fetch(`/api/wallet/statistics?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        // The API returns { statistics: {...}, period: '...' }
        // Map it to the expected format
        if (data.statistics) {
          setStatistics({
            period: data.period || 'month',
            totalCredits: data.statistics.totalCredits || 0,
            totalDebits: data.statistics.totalDebits || 0,
            netChange: data.statistics.netChange || 0,
            breakdown: (data.statistics.spendingByCategory || []).map((item: { type: string; amount: number; count: number }) => ({
              type: item.type,
              total: item.amount || 0,
              count: item.count || 0,
            })),
          });
        }
      }
    } catch (err) {
      console.error('Statistics fetch error:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role || 'voter');
        }
      } catch (err) {
        console.error('Failed to fetch user role:', err);
      }
    };
    fetchUserRole();
    fetchStatistics();
  }, []);

  // Handle STK push initiation
  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    
    if (!amount || amount < 10) {
      setTopUpError('Minimum top-up amount is KES 10');
      return;
    }
    
    if (amount > 150000) {
      setTopUpError('Maximum top-up amount is KES 150,000');
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setTopUpError('Please enter a valid phone number');
      return;
    }

    setIsProcessing(true);
    setTopUpError(null);
    setTopUpStatus('idle');

    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      setCheckoutRequestId(data.checkoutRequestId);
      setTopUpStatus('initiated');
      
      // Start polling for payment status
      pollPaymentStatus(data.checkoutRequestId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate payment';
      setTopUpError(errorMessage);
      setTopUpStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll for payment status
  const pollPaymentStatus = async (requestId: string) => {
    setTopUpStatus('polling');
    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 2.5 minutes

    const poll = async () => {
      attempts++;
      
      try {
        const response = await fetch('/api/wallet/topup/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutRequestId: requestId }),
        });

        const data = await response.json();

        if (data.status === 'success') {
          setTopUpStatus('success');
          fetchWallet(); // Refresh wallet data
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          setTopUpStatus('failed');
          setTopUpError(data.resultDescription || 'Payment was cancelled or failed');
          return;
        }

        // Continue polling if still pending
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setTopUpStatus('failed');
          setTopUpError('Payment timeout. Please check your wallet balance.');
        }
      } catch (err) {
        console.error('Poll error:', err);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  };

  // Reset top-up modal
  const resetTopUp = () => {
    setTopUpAmount('');
    setTopUpError(null);
    setTopUpStatus('idle');
    setCheckoutRequestId(null);
    setIsProcessing(false);
  };

  // Close modal handler
  const handleCloseModal = () => {
    if (topUpStatus !== 'polling') {
      setIsTopUpOpen(false);
      resetTopUp();
    }
  };

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

  // Render top-up status content
  const renderTopUpStatus = () => {
    switch (topUpStatus) {
      case 'initiated':
      case 'polling':
        return (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Check Your Phone</h3>
            <p className="text-muted-foreground mb-4">
              Enter your M-Pesa PIN on the prompt sent to <strong>{phoneNumber}</strong>
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for payment confirmation...
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground mb-4">
              KES {parseFloat(topUpAmount).toLocaleString()} has been added to your wallet.
            </p>
            <Button onClick={handleCloseModal}>Done</Button>
          </div>
        );

      case 'failed':
        return (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Payment Failed</h3>
            <p className="text-muted-foreground mb-4">
              {topUpError || 'The payment could not be completed. Please try again.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button onClick={resetTopUp}>Try Again</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Manage your myVote Kenya credits</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => { setIsLoading(true); fetchWallet(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your myVote Kenya credits
        </p>
      </div>

      {/* Wallet Frozen Alert */}
      {wallet?.is_frozen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet Frozen</AlertTitle>
          <AlertDescription>
            {wallet.frozen_reason || 'Your wallet has been frozen. Please contact support.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Balance Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Available Balance</CardDescription>
            <CardTitle className="text-4xl">
              KES {(wallet?.balance || 0).toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Main Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setIsTopUpOpen(true)} disabled={wallet?.is_frozen}>
                <Plus className="h-4 w-4 mr-2" />
                Top Up
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsWithdrawOpen(true)} 
                disabled={wallet?.is_frozen}
              >
                <Send className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsTransferOpen(true)} 
                disabled={wallet?.is_frozen}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Transfer
              </Button>
              {userRole === 'candidate' && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsPayAgentOpen(true)} 
                  disabled={wallet?.is_frozen}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Pay Agent
                </Button>
              )}
              <Button variant="ghost" onClick={fetchWallet}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <Link href="/dashboard/wallet/history">
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  Transaction History
                </Button>
              </Link>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Credited</p>
                  <p className="text-lg font-semibold text-green-600">
                    +KES {(wallet?.total_credited || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold text-red-600">
                    -KES {(wallet?.total_debited || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pricing</CardDescription>
            <CardTitle className="text-lg">Service Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SMS Alert</span>
              <span>KES 5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Poll Results</span>
              <span>KES 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Election Results</span>
              <span>KES 10</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Card */}
      {statistics && statistics.netChange !== undefined && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Spending Breakdown
                </CardTitle>
                <CardDescription>This {statistics.period || 'month'}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Net Change</p>
                <p className={`text-lg font-semibold ${(statistics.netChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(statistics.netChange || 0) >= 0 ? '+' : ''}KES {(statistics.netChange || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statistics.breakdown && statistics.breakdown.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statistics.breakdown.map((item) => (
                  <div key={item.type} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground capitalize">{(item.type || '').replace(/_/g, ' ')}</p>
                    <p className="text-lg font-semibold">KES {(item.total || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{item.count || 0} transaction{(item.count || 0) !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No transactions this period</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Operations */}
      {(pendingTopups.length > 0 || pendingWithdrawals.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pending Top-ups */}
          {pendingTopups.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                  Pending Top-ups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingTopups.map((topup) => (
                    <div key={topup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-600">+KES {topup.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{topup.phone_number}</p>
                      </div>
                      <Badge variant="outline">Processing</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Withdrawals */}
          {pendingWithdrawals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  Pending Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-orange-600">-KES {withdrawal.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{withdrawal.recipient_phone}</p>
                      </div>
                      <Badge variant="outline">Processing</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              {transactionCount > 0 
                ? `Showing ${Math.min(transactions.length, 20)} of ${transactionCount} transactions`
                : 'Your recent wallet activity'}
            </CardDescription>
          </div>
          {transactionCount > 20 && (
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard/wallet/history">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Top up your wallet to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4">
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
                    <Badge 
                      variant={tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'destructive' : 'outline'} 
                      className="text-xs"
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top-Up Dialog */}
      <Dialog open={isTopUpOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Wallet</DialogTitle>
            <DialogDescription>
              Add funds to your myVote Kenya wallet via M-Pesa
            </DialogDescription>
          </DialogHeader>

          {topUpStatus !== 'idle' ? (
            renderTopUpStatus()
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Preset Amounts */}
                <div>
                  <Label className="text-sm text-muted-foreground">Quick Select</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {PRESET_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        variant={topUpAmount === String(amount) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTopUpAmount(String(amount))}
                      >
                        KES {amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <Label htmlFor="amount">Amount (KES)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    min={10}
                    max={150000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Min: KES 10 • Max: KES 150,000
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <Label htmlFor="phone">M-Pesa Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the phone number registered with M-Pesa
                  </p>
                </div>

                {topUpError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{topUpError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button onClick={handleTopUp} disabled={isProcessing || !topUpAmount || !phoneNumber}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay KES {topUpAmount ? parseFloat(topUpAmount).toLocaleString() : '0'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={handleCloseWithdrawModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw to M-Pesa</DialogTitle>
            <DialogDescription>
              Send funds from your wallet to your M-Pesa account
            </DialogDescription>
          </DialogHeader>

          {withdrawStatus === 'success' ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Withdrawal Initiated!</h3>
              <p className="text-muted-foreground mb-4">
                KES {parseFloat(withdrawAmount).toLocaleString()} will be sent to {withdrawPhone}
              </p>
              <Button onClick={handleCloseWithdrawModal}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Preset Amounts */}
                <div>
                  <Label className="text-sm text-muted-foreground">Quick Select</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {WITHDRAW_PRESET_AMOUNTS.filter(a => a <= (wallet?.balance || 0)).map((amount) => (
                      <Button
                        key={amount}
                        variant={withdrawAmount === String(amount) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setWithdrawAmount(String(amount))}
                      >
                        KES {amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <Label htmlFor="withdrawAmount">Amount (KES)</Label>
                  <Input
                    id="withdrawAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min={10}
                    max={Math.min(70000, wallet?.balance || 0)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: KES {(wallet?.balance || 0).toLocaleString()} • Max: KES 70,000
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <Label htmlFor="withdrawPhone">M-Pesa Phone Number</Label>
                  <Input
                    id="withdrawPhone"
                    type="tel"
                    placeholder="0712345678"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the phone number to receive the withdrawal
                  </p>
                </div>

                {withdrawError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{withdrawError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseWithdrawModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleWithdraw} 
                  disabled={isWithdrawing || !withdrawAmount || !withdrawPhone || parseFloat(withdrawAmount) > (wallet?.balance || 0)}
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Withdraw KES {withdrawAmount ? parseFloat(withdrawAmount).toLocaleString() : '0'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={handleCloseTransferModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Send funds to another myVote Kenya user
            </DialogDescription>
          </DialogHeader>

          {transferStatus === 'success' ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Transfer Successful!</h3>
              <p className="text-muted-foreground mb-4">
                KES {parseFloat(transferAmount).toLocaleString()} sent to {selectedRecipient?.full_name}
              </p>
              <Button onClick={handleCloseTransferModal}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Recipient Search */}
                <div>
                  <Label htmlFor="recipient">Find Recipient</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recipient"
                      type="text"
                      placeholder="Search by name or phone..."
                      value={transferRecipient}
                      onChange={(e) => {
                        setTransferRecipient(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      className="pl-9"
                    />
                  </div>
                  {isSearching && (
                    <p className="text-xs text-muted-foreground mt-1">Searching...</p>
                  )}
                  {searchResults.length > 0 && !selectedRecipient && (
                    <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          className="w-full p-2 text-left hover:bg-muted flex items-center justify-between"
                          onClick={() => {
                            setSelectedRecipient(user);
                            setTransferRecipient(user.full_name);
                            setSearchResults([]);
                          }}
                        >
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.phone_number}</p>
                          </div>
                          <Badge variant="outline">{user.role}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedRecipient && (
                    <div className="mt-2 p-2 bg-muted rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedRecipient.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedRecipient.phone_number}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedRecipient(null);
                          setTransferRecipient('');
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="transferAmount">Amount (KES)</Label>
                  <Input
                    id="transferAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    min={10}
                    max={wallet?.balance || 0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: KES {(wallet?.balance || 0).toLocaleString()}
                  </p>
                </div>

                {/* Note */}
                <div>
                  <Label htmlFor="transferNote">Note (Optional)</Label>
                  <Input
                    id="transferNote"
                    type="text"
                    placeholder="What's this for?"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                  />
                </div>

                {transferError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{transferError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseTransferModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleTransfer} 
                  disabled={isTransferring || !selectedRecipient || !transferAmount || parseFloat(transferAmount) > (wallet?.balance || 0)}
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Transfer KES {transferAmount ? parseFloat(transferAmount).toLocaleString() : '0'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Agent Dialog */}
      <Dialog open={isPayAgentOpen} onOpenChange={handleClosePayAgentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Agent</DialogTitle>
            <DialogDescription>
              Send payment to one of your agents
            </DialogDescription>
          </DialogHeader>

          {payAgentStatus === 'success' ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Payment Sent!</h3>
              <p className="text-muted-foreground mb-4">
                KES {parseFloat(payAgentAmount).toLocaleString()} sent to agent {agentPhone}
              </p>
              <Button onClick={handleClosePayAgentModal}>Done</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                {/* Agent Phone */}
                <div>
                  <Label htmlFor="agentPhone">Agent Phone Number</Label>
                  <Input
                    id="agentPhone"
                    type="tel"
                    placeholder="0712345678"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the phone number of your agent
                  </p>
                </div>

                {/* Preset Amounts */}
                <div>
                  <Label className="text-sm text-muted-foreground">Quick Select</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[500, 1000, 2000, 3000, 5000, 10000].filter(a => a <= (wallet?.balance || 0)).map((amount) => (
                      <Button
                        key={amount}
                        variant={payAgentAmount === String(amount) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPayAgentAmount(String(amount))}
                      >
                        KES {amount.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <Label htmlFor="payAgentAmount">Amount (KES)</Label>
                  <Input
                    id="payAgentAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={payAgentAmount}
                    onChange={(e) => setPayAgentAmount(e.target.value)}
                    min={10}
                    max={wallet?.balance || 0}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: KES {(wallet?.balance || 0).toLocaleString()}
                  </p>
                </div>

                {/* Note */}
                <div>
                  <Label htmlFor="payAgentNote">Note (Optional)</Label>
                  <Input
                    id="payAgentNote"
                    type="text"
                    placeholder="e.g., Transport allowance"
                    value={payAgentNote}
                    onChange={(e) => setPayAgentNote(e.target.value)}
                  />
                </div>

                {payAgentError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{payAgentError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClosePayAgentModal}>
                  Cancel
                </Button>
                <Button 
                  onClick={handlePayAgent} 
                  disabled={isPayingAgent || !agentPhone || !payAgentAmount || parseFloat(payAgentAmount) > (wallet?.balance || 0)}
                >
                  {isPayingAgent ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Pay KES {payAgentAmount ? parseFloat(payAgentAmount).toLocaleString() : '0'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
