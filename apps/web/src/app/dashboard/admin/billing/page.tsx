'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import {
  DollarSign,
  Save,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  FileText,
  Crown,
  Briefcase,
  Loader2,
  AlertCircle,
  Users,
  Building2,
  UserCheck,
} from 'lucide-react';

interface BillableItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_active: boolean;
  // NEW: which roles are allowed to purchase / consume this item
  roles?: string[];
  // NEW: number of units granted per purchase (null/undefined = unlimited until expiry)
  quantity?: number | null;
  // NEW: validity (days) and grace period (days) after expiry
  validity_days?: number | null;
  grace_period_days?: number | null;
  // NEW: lifecycle flags + terms text
  auto_renew?: boolean;
  requires_approval?: boolean;
  terms?: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'voter', label: 'Voter' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'agent', label: 'Agent' },
  { value: 'party_admin', label: 'Party Admin' },
  { value: 'system_admin', label: 'System Admin' },
];

interface PositionFee {
  id: string;
  position: string;
  fee_amount: number;
  description: string;
  is_active: boolean;
}

interface FeePayment {
  id: string;
  fee_type: string;
  position: string;
  amount: number;
  status: string;
  paid_at: string | null;
}

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: 'Women Representative',
  mp: 'Member of Parliament',
  mca: 'MCA (Ward Rep)',
};

const POSITION_ORDER = ['president', 'governor', 'senator', 'women_rep', 'mp', 'mca'];

// Use JSX.Element instead of React.ReactNode to avoid a type clash between
// the multiple @types/react versions hoisted in this monorepo (React 18.2 vs
// 18.3). React.ReactNode in 18.3 includes `bigint`, which the Button child
// slot typed against 18.2 doesn't accept, breaking `next build` type-check.
const categoryIcons: Record<string, JSX.Element> = {
  messaging: <MessageSquare className="h-4 w-4" />,
  content: <FileText className="h-4 w-4" />,
  subscription: <Crown className="h-4 w-4" />,
  services: <Briefcase className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  messaging: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  content: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  subscription: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  services: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export default function BillableItemsPage() {
  const [items, setItems] = useState<BillableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BillableItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BillableItem>>({
    id: '',
    name: '',
    description: '',
    price: 0,
    category: 'services',
    is_active: true,
    roles: ['voter', 'candidate', 'agent', 'party_admin', 'system_admin'],
    quantity: 1,
    validity_days: null,
    grace_period_days: 0,
    auto_renew: false,
    requires_approval: false,
    terms: '',
  });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'billable' | 'vying' | 'nomination'>('billable');
  const [vyingFees, setVyingFees] = useState<PositionFee[]>([]);
  const [nominationFees, setNominationFees] = useState<PositionFee[]>([]);
  const [recentPayments, setRecentPayments] = useState<FeePayment[]>([]);
  const [feesLoading, setFeesLoading] = useState(true);
  const [feesSaving, setFeesSaving] = useState(false);
  const [editingFeePosition, setEditingFeePosition] = useState<string | null>(null);
  const [editingFeeAmount, setEditingFeeAmount] = useState<number>(0);
  const { toast } = useToast();
  const { isAdmin } = usePermissions();

  useEffect(() => {
    fetchItems();
    fetchCandidateFees();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/admin/billable-items');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch billable items:', error);
      toast({ title: 'Error', description: 'Failed to load billable items', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateFees = async () => {
    try {
      const res = await fetch('/api/admin/candidate-fees');
      if (res.ok) {
        const data = await res.json();
        setVyingFees(data.vyingFees || []);
        setNominationFees(data.nominationFees || []);
        setRecentPayments(data.recentPayments || []);
      }
    } catch (error) {
      console.error('Failed to fetch candidate fees:', error);
    } finally {
      setFeesLoading(false);
    }
  };

  const saveFee = async (feeType: 'vying' | 'nomination', position: string, feeAmount: number) => {
    setFeesSaving(true);
    try {
      const res = await fetch('/api/admin/candidate-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeType,
          fees: [{ position, fee_amount: feeAmount }],
        }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: `${feeType === 'vying' ? 'Vying' : 'Nomination'} fee updated` });
        const setter = feeType === 'vying' ? setVyingFees : setNominationFees;
        setter(prev => prev.map(f => f.position === position ? { ...f, fee_amount: feeAmount } : f));
        setEditingFeePosition(null);
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save fee', variant: 'destructive' });
    } finally {
      setFeesSaving(false);
    }
  };

  const toggleFeeActive = async (feeType: 'vying' | 'nomination', position: string, currentActive: boolean) => {
    setFeesSaving(true);
    try {
      const fees = feeType === 'vying' ? vyingFees : nominationFees;
      const fee = fees.find(f => f.position === position);
      if (!fee) return;
      const res = await fetch('/api/admin/candidate-fees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeType,
          fees: [{ position, fee_amount: fee.fee_amount, is_active: !currentActive }],
        }),
      });
      if (res.ok) {
        const setter = feeType === 'vying' ? setVyingFees : setNominationFees;
        setter(prev => prev.map(f => f.position === position ? { ...f, is_active: !currentActive } : f));
        toast({ title: 'Success', description: `Fee ${!currentActive ? 'activated' : 'deactivated'}` });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle fee', variant: 'destructive' });
    } finally {
      setFeesSaving(false);
    }
  };

  const formatKES = (amount: number) => {
    return new Intl.NumberFormat('en-KE').format(amount);
  };

  const saveItems = async (updatedItems: BillableItem[]) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/billable-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      });
      if (res.ok) {
        setItems(updatedItems);
        toast({ title: 'Success', description: 'Billable items saved successfully' });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save billable items', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, is_active: !item.is_active } : item
    );
    saveItems(updated);
  };

  const handleStartEdit = (item: BillableItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name || editForm.price === undefined) return;
    const updated = items.map(item =>
      item.id === editingId ? { ...item, ...editForm } as BillableItem : item
    );
    saveItems(updated);
    setEditingId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleAddItem = () => {
    if (!newItem.id || !newItem.name || !newItem.price) {
      toast({ title: 'Validation Error', description: 'ID, name, and price are required', variant: 'destructive' });
      return;
    }
    if (items.find(i => i.id === newItem.id)) {
      toast({ title: 'Validation Error', description: 'An item with this ID already exists', variant: 'destructive' });
      return;
    }
    const updated = [...items, newItem as BillableItem];
    saveItems(updated);
    setNewItem({
      id: '',
      name: '',
      description: '',
      price: 0,
      category: 'services',
      is_active: true,
      roles: ['voter', 'candidate', 'agent', 'party_admin', 'system_admin'],
      quantity: 1,
      validity_days: null,
      grace_period_days: 0,
      auto_renew: false,
      requires_approval: false,
      terms: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    saveItems(updated);
  };

  const filteredItems = filterCategory === 'all'
    ? items
    : items.filter(item => item.category === filterCategory);

  const totalRevenuePotential = items
    .filter(i => i.is_active)
    .reduce((sum, item) => sum + item.price, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading billable items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Fee Management</h1>
          <p className="text-muted-foreground">
            Manage service pricing, candidate vying fees, and party nomination fees.
          </p>
        </div>
        {activeTab === 'billable' && (
          <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={activeTab === 'billable' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('billable')}
          className="gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Billable Items
        </Button>
        <Button
          variant={activeTab === 'vying' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('vying')}
          className="gap-2"
        >
          <UserCheck className="h-4 w-4" />
          Candidate Vying Fees
        </Button>
        <Button
          variant={activeTab === 'nomination' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('nomination')}
          className="gap-2"
        >
          <Building2 className="h-4 w-4" />
          Party Nomination Fees
        </Button>
      </div>

      {/* ====== CANDIDATE VYING FEES TAB ====== */}
      {activeTab === 'vying' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium">Candidate Vying Fees</p>
              <p className="mt-1">
                Candidates must pay a vying fee to register their candidacy. Fees differ by position level —
                higher offices attract higher fees. Fees are deducted from the candidate&apos;s wallet.
              </p>
            </div>
          </div>

          {/* Vying Fee Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Positions</p>
                    <p className="text-2xl font-bold">{vyingFees.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Fees</p>
                    <p className="text-2xl font-bold">{vyingFees.filter(f => f.is_active).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fee Range</p>
                    <p className="text-lg font-bold">
                      {vyingFees.length > 0
                        ? `KES ${formatKES(Math.min(...vyingFees.map(f => f.fee_amount)))} – ${formatKES(Math.max(...vyingFees.map(f => f.fee_amount)))}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vying Fee Table */}
          <Card>
            <CardHeader>
              <CardTitle>Vying Fees by Position</CardTitle>
              <CardDescription>Set the fee each candidate must pay to vie for a specific position</CardDescription>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {POSITION_ORDER.map((pos) => {
                    const fee = vyingFees.find(f => f.position === pos);
                    if (!fee) return null;
                    const isEditing = editingFeePosition === `vying-${pos}`;
                    return (
                      <div key={pos} className={`flex items-center justify-between p-4 border rounded-lg ${!fee.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{POSITION_LABELS[pos] || pos}</p>
                            <p className="text-sm text-muted-foreground">{fee.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">KES</span>
                              <Input
                                type="number"
                                min={0}
                                className="w-40"
                                value={editingFeeAmount}
                                onChange={(e) => setEditingFeeAmount(Number(e.target.value))}
                              />
                              <Button size="sm" onClick={() => saveFee('vying', pos, editingFeeAmount)} disabled={feesSaving}>
                                {feesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingFeePosition(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="text-lg font-bold text-primary">KES {formatKES(fee.fee_amount)}</p>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingFeePosition(`vying-${pos}`); setEditingFeeAmount(fee.fee_amount); }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleFeeActive('vying', pos, fee.is_active)}>
                                {fee.is_active ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Vying Fee Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Fee Payments</CardTitle>
              <CardDescription>Latest candidate fee transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.filter(p => p.fee_type === 'vying').length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No vying fee payments yet</p>
              ) : (
                <div className="space-y-2">
                  {recentPayments.filter(p => p.fee_type === 'vying').map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{POSITION_LABELS[p.position] || p.position}</p>
                        <p className="text-sm text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'Pending'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge>
                        <p className="font-bold">KES {formatKES(p.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== PARTY NOMINATION FEES TAB ====== */}
      {activeTab === 'nomination' && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-indigo-800 dark:text-indigo-300">
              <p className="font-medium">Party Nomination Fees</p>
              <p className="mt-1">
                Political parties charge nomination fees to candidates seeking party tickets. These fees
                vary by position level and are collected by the party during the nomination process.
              </p>
            </div>
          </div>

          {/* Nomination Fee Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Positions</p>
                    <p className="text-2xl font-bold">{nominationFees.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Active Fees</p>
                    <p className="text-2xl font-bold">{nominationFees.filter(f => f.is_active).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Fee Range</p>
                    <p className="text-lg font-bold">
                      {nominationFees.length > 0
                        ? `KES ${formatKES(Math.min(...nominationFees.map(f => f.fee_amount)))} – ${formatKES(Math.max(...nominationFees.map(f => f.fee_amount)))}`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nomination Fee Table */}
          <Card>
            <CardHeader>
              <CardTitle>Nomination Fees by Position</CardTitle>
              <CardDescription>Set the fee parties charge candidates for nomination tickets</CardDescription>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="space-y-2">
                  {POSITION_ORDER.map((pos) => {
                    const fee = nominationFees.find(f => f.position === pos);
                    if (!fee) return null;
                    const isEditing = editingFeePosition === `nomination-${pos}`;
                    return (
                      <div key={pos} className={`flex items-center justify-between p-4 border rounded-lg ${!fee.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{POSITION_LABELS[pos] || pos}</p>
                            <p className="text-sm text-muted-foreground">{fee.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">KES</span>
                              <Input
                                type="number"
                                min={0}
                                className="w-40"
                                value={editingFeeAmount}
                                onChange={(e) => setEditingFeeAmount(Number(e.target.value))}
                              />
                              <Button size="sm" onClick={() => saveFee('nomination', pos, editingFeeAmount)} disabled={feesSaving}>
                                {feesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingFeePosition(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <p className="text-lg font-bold text-primary">KES {formatKES(fee.fee_amount)}</p>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingFeePosition(`nomination-${pos}`); setEditingFeeAmount(fee.fee_amount); }}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleFeeActive('nomination', pos, fee.is_active)}>
                                {fee.is_active ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-green-500" />}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Nomination Fee Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Nomination Payments</CardTitle>
              <CardDescription>Latest party nomination fee transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.filter(p => p.fee_type === 'nomination').length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No nomination fee payments yet</p>
              ) : (
                <div className="space-y-2">
                  {recentPayments.filter(p => p.fee_type === 'nomination').map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{POSITION_LABELS[p.position] || p.position}</p>
                        <p className="text-sm text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'Pending'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge>
                        <p className="font-bold">KES {formatKES(p.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== BILLABLE ITEMS TAB ====== */}
      {activeTab === 'billable' && (<>
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{items.filter(i => i.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{items.filter(i => !i.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Price Range</p>
                <p className="text-2xl font-bold">
                  KES {Math.min(...items.map(i => i.price))} - {Math.max(...items.map(i => i.price))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium">How billing works</p>
          <p className="mt-1">
            Active items are automatically charged to users&apos; wallets when they use the corresponding service.
            Users must have sufficient wallet balance. Top-ups are available via M-Pesa.
            Deactivating an item makes the service free for all users.
          </p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterCategory('all')}
        >
          All ({items.length})
        </Button>
        {['messaging', 'content', 'subscription', 'services'].map(cat => (
          <Button
            key={cat}
            variant={filterCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(cat)}
          >
            {categoryIcons[cat]}
            <span className="ml-1 capitalize">{cat}</span>
            <span className="ml-1">({items.filter(i => i.category === cat).length})</span>
          </Button>
        ))}
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">Add New Billable Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">ID (unique key)</label>
                <Input
                  placeholder="e.g. premium_report"
                  value={newItem.id || ''}
                  onChange={(e) => setNewItem({ ...newItem, id: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  placeholder="e.g. Premium Report"
                  value={newItem.name || ''}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Price (KES)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={newItem.price || ''}
                  onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={newItem.category || 'services'}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="messaging">Messaging</option>
                  <option value="content">Content</option>
                  <option value="subscription">Subscription</option>
                  <option value="services">Services</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  placeholder="Brief description of this service"
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>

              {/* Role-level access */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium mb-1 block">
                  Available to roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((r) => {
                    const checked = (newItem.roles || []).includes(r.value);
                    return (
                      <label
                        key={r.value}
                        className={`px-3 py-1 rounded-full border text-xs cursor-pointer select-none ${
                          checked ? 'bg-primary/10 border-primary' : 'bg-background'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={checked}
                          onChange={(e) => {
                            const cur = new Set(newItem.roles || []);
                            if (e.target.checked) cur.add(r.value);
                            else cur.delete(r.value);
                            setNewItem({ ...newItem, roles: Array.from(cur) });
                          }}
                        />
                        {r.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Units per purchase</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="1 (blank = unlimited)"
                  value={newItem.quantity ?? ''}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      quantity: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Validity (days)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 30 (blank = no expiry)"
                  value={newItem.validity_days ?? ''}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      validity_days: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Grace period (days)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={newItem.grace_period_days ?? 0}
                  onChange={(e) =>
                    setNewItem({ ...newItem, grace_period_days: Number(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center gap-4 md:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!newItem.auto_renew}
                    onChange={(e) => setNewItem({ ...newItem, auto_renew: e.target.checked })}
                  />
                  Auto-renew on expiry
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!newItem.requires_approval}
                    onChange={(e) =>
                      setNewItem({ ...newItem, requires_approval: e.target.checked })
                    }
                  />
                  Requires admin approval after purchase
                </label>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium mb-1 block">Terms &amp; conditions</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[60px]"
                  placeholder="Shown to the user before purchase. e.g. Non-refundable. Valid only for the active election cycle."
                  value={newItem.terms || ''}
                  onChange={(e) => setNewItem({ ...newItem, terms: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleAddItem} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <Card key={item.id} className={!item.is_active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              {editingId === item.id ? (
                // Edit mode
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-4 items-end">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Name</label>
                      <Input
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Price (KES)</label>
                      <Input
                        type="number"
                        min={0}
                        value={editForm.price ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Description</label>
                      <Input
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4 items-end">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Units / purchase</label>
                      <Input
                        type="number"
                        min={0}
                        value={editForm.quantity ?? ''}
                        placeholder="blank = unlimited"
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            quantity: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Validity (days)</label>
                      <Input
                        type="number"
                        min={0}
                        value={editForm.validity_days ?? ''}
                        placeholder="blank = no expiry"
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            validity_days: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Grace (days)</label>
                      <Input
                        type="number"
                        min={0}
                        value={editForm.grace_period_days ?? 0}
                        onChange={(e) =>
                          setEditForm({ ...editForm, grace_period_days: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!editForm.auto_renew}
                          onChange={(e) =>
                            setEditForm({ ...editForm, auto_renew: e.target.checked })
                          }
                        />
                        Auto-renew
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!editForm.requires_approval}
                          onChange={(e) =>
                            setEditForm({ ...editForm, requires_approval: e.target.checked })
                          }
                        />
                        Requires approval
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Available to roles</label>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((r) => {
                        const checked = (editForm.roles || []).includes(r.value);
                        return (
                          <label
                            key={r.value}
                            className={`px-2.5 py-1 rounded-full border text-xs cursor-pointer select-none ${
                              checked ? 'bg-primary/10 border-primary' : 'bg-background'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={(e) => {
                                const cur = new Set(editForm.roles || []);
                                if (e.target.checked) cur.add(r.value);
                                else cur.delete(r.value);
                                setEditForm({ ...editForm, roles: Array.from(cur) });
                              }}
                            />
                            {r.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Terms &amp; conditions</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md bg-background text-sm min-h-[60px]"
                      value={editForm.terms || ''}
                      onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${categoryColors[item.category] || 'bg-muted'}`}>
                      {categoryIcons[item.category] || <DollarSign className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="outline" className="text-xs">{item.id}</Badge>
                        {!item.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {(item.roles && item.roles.length > 0
                          ? item.roles
                          : ROLE_OPTIONS.map((r) => r.value)
                        ).map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {r.replace('_', ' ')}
                          </Badge>
                        ))}
                        {item.quantity != null && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {item.quantity} unit{item.quantity === 1 ? '' : 's'}/buy
                          </Badge>
                        )}
                        {item.validity_days != null && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {item.validity_days}d valid
                            {item.grace_period_days
                              ? ` +${item.grace_period_days}d grace`
                              : ''}
                          </Badge>
                        )}
                        {item.auto_renew && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            auto-renew
                          </Badge>
                        )}
                        {item.requires_approval && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            needs approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">KES {item.price}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(item)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(item.id)}
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {item.is_active ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No billable items found</p>
          <p className="text-sm">
            {filterCategory !== 'all' ? 'Try a different category filter or ' : ''}
            Click &quot;Add Item&quot; to create one.
          </p>
        </div>
      )}
      </>)}
    </div>
  );
}
