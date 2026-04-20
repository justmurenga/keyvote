'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  MapPin,
  Filter,
  BarChart3,
  Wallet,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface Campaign {
  id: string;
  message: string;
  sender_id_name: string;
  target_type: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  total_cost: number;
  status: string;
  created_at: string;
  sent_at: string | null;
  scheduled_at: string | null;
}

const AGE_BRACKETS = [
  { value: '', label: 'All Ages' },
  { value: '18-24', label: '18-24 (Youth)' },
  { value: '25-34', label: '25-34 (Young Adult)' },
  { value: '35-44', label: '35-44 (Middle Age)' },
  { value: '45-54', label: '45-54 (Mature Adult)' },
  { value: '55-64', label: '55-64 (Pre-Senior)' },
  { value: '65+', label: '65+ (Senior)' },
];

const GENDERS = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export default function CandidateSMSPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Compose form
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all_followers');
  const [targetGender, setTargetGender] = useState('');
  const [targetAgeBracket, setTargetAgeBracket] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Region targeting
  const [counties, setCounties] = useState<any[]>([]);
  const [constituencies, setConstituencies] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  // Sender ID info
  const [senderInfo, setSenderInfo] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Tab
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/sms/campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetch('/api/sms/sender-ids').then(r => r.json()).then(d => setSenderInfo(d.senderIds?.[0])),
        fetch('/api/wallet/balance').then(r => r.json()).then(d => setWalletBalance(d.balance || 0)),
        fetch('/api/regions/counties').then(r => r.json()).then(d => setCounties(d.counties || d || [])),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (!selectedCounty) { setConstituencies([]); setSelectedConstituency(''); return; }
    fetch(`/api/regions/constituencies?county_id=${selectedCounty}`).then(r => r.json()).then(d => setConstituencies(d.constituencies || d || []));
  }, [selectedCounty]);

  useEffect(() => {
    if (!selectedConstituency) { setWards([]); setSelectedWard(''); return; }
    fetch(`/api/regions/wards?constituency_id=${selectedConstituency}`).then(r => r.json()).then(d => setWards(d.wards || d || []));
  }, [selectedConstituency]);

  const charCount = message.length;
  const segments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  const handleSend = async () => {
    if (!message.trim()) { setError('Message is required'); return; }
    if (!senderInfo) { setError('No sender ID configured. Contact admin.'); return; }

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          targetType,
          targetCountyId: selectedCounty || undefined,
          targetConstituencyId: selectedConstituency || undefined,
          targetWardId: selectedWard || undefined,
          targetGender: targetGender || undefined,
          targetAgeBracket: targetAgeBracket || undefined,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`SMS sent to ${data.recipientCount} recipients! Cost: KES ${data.totalCost?.toFixed(2)}`);
      setMessage('');
      fetchCampaigns();
      // Refresh balance
      fetch('/api/wallet/balance').then(r => r.json()).then(d => setWalletBalance(d.balance || 0));
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: any) {
      setError(e.message || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { class: string; label: string }> = {
      draft: { class: 'bg-gray-100 text-gray-800', label: 'Draft' },
      scheduled: { class: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      sending: { class: 'bg-yellow-100 text-yellow-800', label: 'Sending' },
      completed: { class: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { class: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    const s = map[status] || map.draft;
    return <Badge className={`${s.class} text-xs`}>{s.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bulk SMS</h1>
          <p className="text-muted-foreground mt-1">Send SMS to your followers via Airtouch</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="font-bold text-lg">KES {walletBalance.toFixed(2)}</p>
          </div>
          {senderInfo && (
            <Badge variant="outline" className="px-3 py-1">
              Sender: <span className="font-mono font-bold ml-1">{senderInfo.sender_id}</span>
            </Badge>
          )}
        </div>
      </div>

      {!senderInfo && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">No Sender ID Configured</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Contact the admin to set up your SMS sender ID before you can send bulk SMS.
            </p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2 text-red-800 dark:text-red-200 text-sm">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'compose' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Send className="h-4 w-4 inline mr-2" />Compose
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Clock className="h-4 w-4 inline mr-2" />Campaign History ({campaigns.length})
        </button>
      </div>

      {activeTab === 'compose' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Compose */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compose Message</CardTitle>
                <CardDescription>Write your SMS message. Standard SMS is 160 characters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{charCount} characters · {segments} segment{segments > 1 ? 's' : ''}</span>
                    <span>{charCount <= 160 ? `${160 - charCount} remaining` : `${segments * 153 - charCount} remaining in segment`}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Targeting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Targeting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Target Audience</Label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                  >
                    <option value="all_followers">All Followers</option>
                    <option value="region">By Region</option>
                    <option value="demographic">By Demographics</option>
                  </select>
                </div>

                {targetType === 'region' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>County</Label>
                      <select value={selectedCounty} onChange={(e) => setSelectedCounty(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                        <option value="">All Counties</option>
                        {counties.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Constituency</Label>
                      <select value={selectedConstituency} onChange={(e) => setSelectedConstituency(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" disabled={!selectedCounty}>
                        <option value="">All Constituencies</option>
                        {constituencies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Ward</Label>
                      <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1" disabled={!selectedConstituency}>
                        <option value="">All Wards</option>
                        {wards.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Gender Filter</Label>
                    <select value={targetGender} onChange={(e) => setTargetGender(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                      {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Age Bracket</Label>
                    <select value={targetAgeBracket} onChange={(e) => setTargetAgeBracket(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                      {AGE_BRACKETS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <Label>Schedule (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave empty to send immediately</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Send Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Send Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sender ID</span>
                  <span className="font-mono font-bold">{senderInfo?.sender_id || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost per SMS</span>
                  <span>KES {(senderInfo?.cost_per_sms || 1).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">SMS Segments</span>
                  <span>{segments}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className="font-bold">KES {walletBalance.toFixed(2)}</span>
                </div>
                <hr />
                <div className="p-3 bg-muted rounded-lg text-xs flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Final cost = recipients × segments × cost/SMS. Balance is checked before sending.</span>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || !message.trim() || !senderInfo}
                  className="w-full"
                  size="lg"
                >
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {sending ? 'Sending...' : scheduledAt ? 'Schedule SMS' : 'Send Now'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardContent className="pt-6">
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No campaigns yet. Compose your first SMS above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                      <th className="text-left py-3 px-2 font-medium">Message</th>
                      <th className="text-left py-3 px-2 font-medium">Sender ID</th>
                      <th className="text-left py-3 px-2 font-medium">Recipients</th>
                      <th className="text-left py-3 px-2 font-medium">Delivery</th>
                      <th className="text-left py-3 px-2 font-medium">Cost</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}<br />
                          <span className="text-xs">{new Date(c.created_at).toLocaleTimeString()}</span>
                        </td>
                        <td className="py-3 px-2 max-w-xs truncate">{c.message}</td>
                        <td className="py-3 px-2 font-mono text-xs">{c.sender_id_name}</td>
                        <td className="py-3 px-2">{c.total_recipients}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-600">{c.sent_count} sent</span>
                            {c.failed_count > 0 && <span className="text-red-600">{c.failed_count} failed</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">KES {(c.total_cost || 0).toFixed(2)}</td>
                        <td className="py-3 px-2">{getStatusBadge(c.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
