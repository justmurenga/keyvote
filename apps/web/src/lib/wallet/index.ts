/**
 * Wallet Service Library
 * 
 * Provides utility functions for wallet operations including:
 * - Balance calculations
 * - Transaction creation
 * - Wallet management
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { TransactionType, TransactionStatus } from '@myvote/database';

export interface WalletBalance {
  balance: number;
  totalCredited: number;
  totalDebited: number;
  pendingCredits: number;
  pendingDebits: number;
  availableBalance: number;
}

export interface CreateTransactionParams {
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string;
  reference?: string;
  externalReference?: string;
  mpesaReceiptNumber?: string;
  mpesaPhoneNumber?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionFilters {
  walletId: string;
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus | TransactionStatus[];
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface TransactionResult {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference: string | null;
  external_reference: string | null;
  status: TransactionStatus | null;
  mpesa_receipt_number: string | null;
  mpesa_transaction_date: string | null;
  mpesa_phone_number: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  completed_at: string | null;
}

/**
 * Get or create a wallet for a user
 */
export async function getOrCreateWallet(userId: string) {
  const adminClient = createAdminClient();

  // Try to get existing wallet
  const { data: existingWallet, error: findError } = await adminClient
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingWallet) {
    return existingWallet;
  }

  // Create new wallet if not found
  const { data: newWallet, error: createError } = await adminClient
    .from('wallets')
    .insert({
      user_id: userId,
      balance: 0,
      currency: 'KES',
      is_active: true,
      is_frozen: false,
      total_credited: 0,
      total_debited: 0,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('[Wallet] Failed to create wallet:', createError);
    throw new Error('Failed to create wallet');
  }

  return newWallet;
}

/**
 * Get wallet by ID
 */
export async function getWalletById(walletId: string) {
  const adminClient = createAdminClient();

  const { data: wallet, error } = await adminClient
    .from('wallets')
    .select('*')
    .eq('id', walletId)
    .single();

  if (error) {
    throw new Error('Wallet not found');
  }

  return wallet;
}

/**
 * Get wallet by user ID
 */
export async function getWalletByUserId(userId: string) {
  const adminClient = createAdminClient();

  const { data: wallet, error } = await adminClient
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return wallet;
}

/**
 * Calculate real-time wallet balance from transactions
 * This recalculates the balance based on all completed transactions
 */
export async function calculateWalletBalance(walletId: string): Promise<WalletBalance> {
  const adminClient = createAdminClient();

  // Get all transactions for calculation
  const { data: transactions, error } = await adminClient
    .from('wallet_transactions')
    .select('amount, status')
    .eq('wallet_id', walletId);

  if (error) {
    throw new Error('Failed to fetch transactions for balance calculation');
  }

  let totalCredited = 0;
  let totalDebited = 0;
  let pendingCredits = 0;
  let pendingDebits = 0;

  for (const tx of transactions || []) {
    const amount = tx.amount || 0;

    if (tx.status === 'completed') {
      if (amount > 0) {
        totalCredited += amount;
      } else {
        totalDebited += Math.abs(amount);
      }
    } else if (tx.status === 'pending') {
      if (amount > 0) {
        pendingCredits += amount;
      } else {
        pendingDebits += Math.abs(amount);
      }
    }
  }

  const balance = totalCredited - totalDebited;
  const availableBalance = balance; // Can be adjusted for pending debits if needed

  return {
    balance,
    totalCredited,
    totalDebited,
    pendingCredits,
    pendingDebits,
    availableBalance,
  };
}

/**
 * Verify and sync wallet balance with transactions
 * Updates the wallet if there's a discrepancy
 */
export async function syncWalletBalance(walletId: string): Promise<void> {
  const adminClient = createAdminClient();

  const calculated = await calculateWalletBalance(walletId);

  // Update wallet with calculated values
  const { error } = await adminClient
    .from('wallets')
    .update({
      balance: calculated.balance,
      total_credited: calculated.totalCredited,
      total_debited: calculated.totalDebited,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId);

  if (error) {
    console.error('[Wallet] Failed to sync balance:', error);
    throw new Error('Failed to sync wallet balance');
  }
}

/**
 * Credit wallet (add funds)
 */
export async function creditWallet(params: CreateTransactionParams): Promise<string> {
  const adminClient = createAdminClient();
  const amount = Math.abs(params.amount); // Ensure positive for credits

  // Get current balance with lock
  const { data: wallet, error: walletError } = await adminClient
    .from('wallets')
    .select('balance, total_credited, is_frozen')
    .eq('id', params.walletId)
    .single();

  if (walletError || !wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.is_frozen) {
    throw new Error('Wallet is frozen');
  }

  const balanceBefore = wallet.balance || 0;
  const balanceAfter = balanceBefore + amount;

  // Create transaction
  const { data: transaction, error: txError } = await adminClient
    .from('wallet_transactions')
    .insert({
      wallet_id: params.walletId,
      type: params.type,
      amount: amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: params.description,
      reference: params.reference,
      external_reference: params.externalReference,
      mpesa_receipt_number: params.mpesaReceiptNumber,
      mpesa_phone_number: params.mpesaPhoneNumber,
      metadata: params.metadata ? params.metadata : null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (txError || !transaction) {
    throw new Error('Failed to create transaction');
  }

  // Update wallet balance
  const { error: updateError } = await adminClient
    .from('wallets')
    .update({
      balance: balanceAfter,
      total_credited: (wallet.total_credited || 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.walletId);

  if (updateError) {
    // TODO: Consider rolling back the transaction
    console.error('[Wallet] Failed to update balance after credit:', updateError);
  }

  return transaction.id;
}

/**
 * Debit wallet (remove funds)
 */
export async function debitWallet(params: CreateTransactionParams): Promise<string> {
  const adminClient = createAdminClient();
  const amount = Math.abs(params.amount); // Ensure positive for calculation

  // Get current balance with lock
  const { data: wallet, error: walletError } = await adminClient
    .from('wallets')
    .select('balance, total_debited, is_frozen')
    .eq('id', params.walletId)
    .single();

  if (walletError || !wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.is_frozen) {
    throw new Error('Wallet is frozen');
  }

  const balanceBefore = wallet.balance || 0;

  // Check sufficient balance
  if (balanceBefore < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const balanceAfter = balanceBefore - amount;

  // Create transaction with negative amount
  const { data: transaction, error: txError } = await adminClient
    .from('wallet_transactions')
    .insert({
      wallet_id: params.walletId,
      type: params.type,
      amount: -amount, // Negative for debits
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: params.description,
      reference: params.reference,
      external_reference: params.externalReference,
      metadata: params.metadata ? params.metadata : null,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (txError || !transaction) {
    throw new Error('Failed to create transaction');
  }

  // Update wallet balance
  const { error: updateError } = await adminClient
    .from('wallets')
    .update({
      balance: balanceAfter,
      total_debited: (wallet.total_debited || 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.walletId);

  if (updateError) {
    console.error('[Wallet] Failed to update balance after debit:', updateError);
  }

  return transaction.id;
}

/**
 * Charge wallet for a service (SMS, poll view, etc.)
 */
export async function chargeForService(
  walletId: string,
  serviceType: 'sms' | 'whatsapp' | 'poll_view' | 'result_view' | 'subscription',
  description: string,
  reference?: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Service pricing
  const pricing: Record<string, { amount: number; type: TransactionType }> = {
    sms: { amount: 5, type: 'sms_charge' },
    whatsapp: { amount: 3, type: 'whatsapp_charge' },
    poll_view: { amount: 10, type: 'poll_view_charge' },
    result_view: { amount: 10, type: 'result_view_charge' },
    subscription: { amount: 100, type: 'subscription_charge' },
  };

  const service = pricing[serviceType];
  if (!service) {
    return { success: false, error: 'Invalid service type' };
  }

  try {
    const transactionId = await debitWallet({
      walletId,
      type: service.type,
      amount: service.amount,
      description,
      reference,
    });

    return { success: true, transactionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to charge wallet';
    return { success: false, error: message };
  }
}

/**
 * Get wallet transactions with filtering and pagination
 */
export async function getWalletTransactions(
  filters: TransactionFilters
): Promise<TransactionResult> {
  const adminClient = createAdminClient();
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // Build query
  let query = adminClient
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('wallet_id', filters.walletId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.type) {
    if (Array.isArray(filters.type)) {
      query = query.in('type', filters.type);
    } else {
      query = query.eq('type', filters.type);
    }
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  if (filters.minAmount !== undefined) {
    query = query.gte('amount', filters.minAmount);
  }

  if (filters.maxAmount !== undefined) {
    query = query.lte('amount', filters.maxAmount);
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data: transactions, error, count } = await query;

  if (error) {
    throw new Error('Failed to fetch transactions');
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    transactions: (transactions || []) as WalletTransaction[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get wallet statistics for a period
 */
export async function getWalletStatistics(
  walletId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
  averageTransaction: number;
  largestCredit: number;
  largestDebit: number;
  transactionsByType: Record<string, { count: number; total: number }>;
}> {
  const adminClient = createAdminClient();

  let query = adminClient
    .from('wallet_transactions')
    .select('type, amount, status')
    .eq('wallet_id', walletId)
    .eq('status', 'completed');

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data: transactions, error } = await query;

  if (error) {
    throw new Error('Failed to fetch transactions for statistics');
  }

  let totalCredits = 0;
  let totalDebits = 0;
  let largestCredit = 0;
  let largestDebit = 0;
  const transactionsByType: Record<string, { count: number; total: number }> = {};

  for (const tx of transactions || []) {
    const amount = tx.amount || 0;
    const type = tx.type;

    // Initialize type bucket if needed
    if (!transactionsByType[type]) {
      transactionsByType[type] = { count: 0, total: 0 };
    }

    transactionsByType[type].count++;
    transactionsByType[type].total += Math.abs(amount);

    if (amount > 0) {
      totalCredits += amount;
      if (amount > largestCredit) largestCredit = amount;
    } else {
      totalDebits += Math.abs(amount);
      if (Math.abs(amount) > largestDebit) largestDebit = Math.abs(amount);
    }
  }

  const transactionCount = transactions?.length || 0;
  const totalValue = totalCredits + totalDebits;
  const averageTransaction = transactionCount > 0 ? totalValue / transactionCount : 0;

  return {
    totalCredits,
    totalDebits,
    transactionCount,
    averageTransaction,
    largestCredit,
    largestDebit,
    transactionsByType,
  };
}

/**
 * Freeze wallet
 */
export async function freezeWallet(walletId: string, reason: string): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('wallets')
    .update({
      is_frozen: true,
      frozen_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId);

  if (error) {
    throw new Error('Failed to freeze wallet');
  }
}

/**
 * Unfreeze wallet
 */
export async function unfreezeWallet(walletId: string): Promise<void> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('wallets')
    .update({
      is_frozen: false,
      frozen_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId);

  if (error) {
    throw new Error('Failed to unfreeze wallet');
  }
}
