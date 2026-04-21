'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Send, MessageSquare, Clock, CheckCircle2, AlertCircle, Loader2,
  Users, Filter, Wallet, Info, MapPin, UserCheck, Megaphone, Hash,
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

type Position = 'president' | 'governor' | 'senator' | 'women_rep' | 'mp' | 'mca';
type AudienceType = 'followers' | 'voters' | 'agents';

const POSITION_LABELS: Record<Position, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Rep",
  mp: 'MP',
  mca: 'MCA',
};

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

const MERGE_FIELDS = [
  { token: '{{full_name}}', label: 'Full Name' },
  { token: '{{first_name}}', label: 'First Name' },
  { token: '{{phone}}', label: 'Phone' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{county}}', label: 'County' },
  { token: '{{constituency}}', label: 'Constituency' },
  { token: '{{ward}}', label: 'Ward' },
  { token: '{{polling_station}}', label: 'Polling Station' },
];

/** What region levels can the user *choose* for this position? */
function visibleLevels(pos: Position | null) {
  switch (pos) {
    case 'mca': return { county: false, constituency: false, ward: false, pollingStation: true };
    case 'mp': return { county: false, constituency: false, ward: true, pollingStation: true };
    case 'governor':
    case 'senator':
    case 'women_rep': return { county: false, constituency: true, ward: true, pollingStation: true };
    case 'president': return { county: true, constituency: true, ward: true, pollingStation: true };
    default: return { county: true, constituency: true, ward: true, pollingStation: true };
  }
}

export default function CandidateSMSPage() {
  const { user: _user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('followers');
  const [targetGender, setTargetGender] = useState('');
  const [targetAgeBracket, setTargetAgeBracket] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Geographic state
  const [counties, setCounties] = useState<any[]>([]);
  const [constituencies, setConstituencies] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [pollingStations, setPollingStations] = useState<any[]>([]);
  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedPollingStation, setSelectedPollingStation] = useState('');

  const [senderInfo, setSenderInfo] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Candidate scope (position & locked region)
  const [candidate, setCandidate] = useState<{
    position: Position | null;
    county_id: string | null;
    constituency_id: string | null;
    ward_id: string | null;
    county_name?: string;
    constituency_name?: string;
    ward_name?: string;
  }>({ position: null, county_id: null, constituency_id: null, ward_id: null });

  // Live preview
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCost, setPreviewCost] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewTimer = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

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
        fetch('/api/candidates/me').then(r => r.json()).then(d => {
          if (d?.candidate) {
            const c = d.candidate;
            setCandidate({
              position: c.position,
              county_id: c.county_id,
              constituency_id: c.constituency_id,
              ward_id: c.ward_id,
              county_name: c.county?.name,
              constituency_name: c.constituency?.name,
              ward_name: c.ward?.name,
            });
          }
        }).catch(() => {}),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchCampaigns]);

  // Effective region IDs (user picks merged with candidate's locked scope)
  const effective = useMemo(() => {
    const lockedCounty = candidate.position && candidate.position !== 'president' ? candidate.county_id : null;
    const lockedConstituency = ['mp', 'mca'].includes(candidate.position || '') ? candidate.constituency_id : null;
    const lockedWard = candidate.position === 'mca' ? candidate.ward_id : null;
    return {
      countyId: lockedCounty || selectedCounty || '',
      constituencyId: lockedConstituency || selectedConstituency || '',
      wardId: lockedWard || selectedWard || '',
      pollingStationId: selectedPollingStation || '',
    };
  }, [candidate, selectedCounty, selectedConstituency, selectedWard, selectedPollingStation]);

  // Cascade — load constituencies whenever county changes
  useEffect(() => {
    const cId = effective.countyId;
    if (!cId) { setConstituencies([]); return; }
    fetch(`/api/regions/constituencies?county_id=${cId}`)
      .then(r => r.json()).then(d => setConstituencies(d.constituencies || d || []));
  }, [effective.countyId]);

  useEffect(() => {
    const cId = effective.constituencyId;
    if (!cId) { setWards([]); return; }
    fetch(`/api/regions/wards?constituency_id=${cId}`)
      .then(r => r.json()).then(d => setWards(d.wards || d || []));
  }, [effective.constituencyId]);

  useEffect(() => {
    const wId = effective.wardId;
    if (!wId) { setPollingStations([]); return; }
    fetch(`/api/regions/polling-stations?ward_id=${wId}`)
      .then(r => r.json()).then(d => setPollingStations(d.polling_stations || []));
  }, [effective.wardId]);

  // Live preview (debounced)
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/sms/preview-recipients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audienceType,
            countyId: effective.countyId || null,
            constituencyId: effective.constituencyId || null,
            wardId: effective.wardId || null,
            pollingStationId: effective.pollingStationId || null,
            gender: targetGender || null,
            ageBracket: targetAgeBracket || null,
            message,
          }),
        });
        const d = await res.json();
        if (res.ok) {
          setPreviewCount(d.count ?? 0);
          setPreviewCost(d.totalCost ?? 0);
        } else {
          setPreviewCount(0);
          setPreviewCost(0);
        }
      } catch {
        setPreviewCount(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 350);
    return () => previewTimer.current && clearTimeout(previewTimer.current);
  }, [audienceType, effective.countyId, effective.constituencyId, effective.wardId, effective.pollingStationId, targetGender, targetAgeBracket, message]);

  const charCount = message.length;
  const segments = charCount === 0 ? 0 : (charCount <= 160 ? 1 : Math.ceil(charCount / 153));

  const insertMergeField = (token: string) => {
    const ta = messageRef.current;
    if (!ta) { setMessage(m => m + token); return; }
    const start = ta.selectionStart ?? message.length;
    const end = ta.selectionEnd ?? message.length;
    const next = message.slice(0, start) + token + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  };

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
          audienceType,
          targetCountyId: effective.countyId || undefined,
          targetConstituencyId: effective.constituencyId || undefined,
          targetWardId: effective.wardId || undefined,
          targetPollingStationId: effective.pollingStationId || undefined,
          targetGender: targetGender || undefined,
          targetAgeBracket: targetAgeBracket || undefined,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`SMS sent to ${data.recipientCount} recipients! Cost: KES ${data.totalCost?.toFixed(2)}${data.personalized ? ' (personalized)' : ''}`);
      setMessage('');
      fetchCampaigns();
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

  const levels = visibleLevels(candidate.position);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bulk SMS</h1>
          <p className="text-muted-foreground mt-1">Send personalized SMS to your followers, voters or agents via Airtouch</p>
        </div>
        <div className="flex items-center gap-3">
          {candidate.position && (
            <Badge variant="outline" className="px-3 py-1">
              <Megaphone className="h-3 w-3 mr-1" />
              {POSITION_LABELS[candidate.position]}
              {candidate.ward_name && ` · ${candidate.ward_name}`}
              {!candidate.ward_name && candidate.constituency_name && ` · ${candidate.constituency_name}`}
              {!candidate.constituency_name && candidate.county_name && ` · ${candidate.county_name}`}
            </Badge>
          )}
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
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compose Message</CardTitle>
                <CardDescription>Write your SMS. Use merge fields below to personalize per recipient.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Textarea
                    ref={messageRef}
                    placeholder="Type your message here. e.g. Hi {{first_name}}, vote on Aug 9!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="resize-none font-mono text-sm"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{charCount} characters · {segments} segment{segments === 1 ? '' : 's'}</span>
                    <span>{charCount <= 160 ? `${160 - charCount} remaining` : `${segments * 153 - charCount} remaining in segment`}</span>
                  </div>
                </div>

                {/* Merge fields */}
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-2">
                    <Hash className="h-3 w-3" /> Merge Fields
                    <span className="font-normal text-muted-foreground ml-1">(click to insert)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MERGE_FIELDS.map((f) => (
                      <button
                        key={f.token}
                        type="button"
                        onClick={() => insertMergeField(f.token)}
                        className="text-xs px-2 py-1 rounded border bg-muted hover:bg-primary hover:text-primary-foreground transition-colors font-mono"
                        title={`Insert ${f.token}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Note: personalized messages may produce more SMS segments per recipient and increase total cost.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Targeting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Targeting</CardTitle>
                <CardDescription>
                  {candidate.position
                    ? <>Targeting is scoped to your <strong>{POSITION_LABELS[candidate.position]}</strong> jurisdiction. Drill down further as needed.</>
                    : <>Choose who receives this campaign.</>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audience type */}
                <div>
                  <Label className="mb-2 block">Audience</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: 'followers', label: 'Followers', icon: Users, desc: 'People who follow you' },
                      { v: 'voters', label: 'Voters', icon: UserCheck, desc: 'Registered voters in scope' },
                      { v: 'agents', label: 'Agents', icon: Megaphone, desc: 'Your campaign agents' },
                    ] as const).map((opt) => {
                      const Icon = opt.icon;
                      const active = audienceType === opt.v;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setAudienceType(opt.v)}
                          className={`text-left rounded-lg border p-3 transition-colors ${active ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted'}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Locked scope chips */}
                {candidate.position && candidate.position !== 'president' && (
                  <div className="text-xs text-muted-foreground bg-muted/50 border border-dashed rounded-md p-2 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>
                      Locked to{' '}
                      {candidate.county_name && <strong>{candidate.county_name}</strong>}
                      {candidate.constituency_name && <> › <strong>{candidate.constituency_name}</strong></>}
                      {candidate.ward_name && <> › <strong>{candidate.ward_name}</strong></>}
                    </span>
                  </div>
                )}

                {/* Hierarchy pickers (top → down) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {levels.county && (
                    <div>
                      <Label>County</Label>
                      <select value={selectedCounty} onChange={(e) => { setSelectedCounty(e.target.value); setSelectedConstituency(''); setSelectedWard(''); setSelectedPollingStation(''); }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                        <option value="">All Counties</option>
                        {counties.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {levels.constituency && (
                    <div>
                      <Label>Constituency</Label>
                      <select value={selectedConstituency} onChange={(e) => { setSelectedConstituency(e.target.value); setSelectedWard(''); setSelectedPollingStation(''); }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                        disabled={!effective.countyId}>
                        <option value="">All Constituencies</option>
                        {constituencies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  {levels.ward && (
                    <div>
                      <Label>Ward</Label>
                      <select value={selectedWard} onChange={(e) => { setSelectedWard(e.target.value); setSelectedPollingStation(''); }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                        disabled={!effective.constituencyId}>
                        <option value="">All Wards</option>
                        {wards.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                  )}
                  {levels.pollingStation && (
                    <div>
                      <Label>Polling Station</Label>
                      <select value={selectedPollingStation} onChange={(e) => setSelectedPollingStation(e.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                        disabled={!effective.wardId}>
                        <option value="">All Polling Stations</option>
                        {pollingStations.map((p: any) => <option key={p.id} value={p.id}>{p.display_name || p.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Demographics */}
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
                <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Send Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Live recipient count */}
                <div className="rounded-lg border p-3 bg-muted/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Estimated Recipients
                    </span>
                    {previewLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <div className="text-2xl font-bold">
                    {previewCount === null ? '—' : previewCount.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {audienceType === 'followers' && 'Followers matching filters'}
                    {audienceType === 'voters' && 'Registered voters matching filters'}
                    {audienceType === 'agents' && 'Active agents matching filters'}
                  </p>
                </div>

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
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-bold text-primary">KES {previewCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className="font-bold">KES {walletBalance.toFixed(2)}</span>
                </div>
                <hr />
                <div className="p-3 bg-muted rounded-lg text-xs flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Final cost = recipients × segments × cost/SMS. Personalized messages may use extra segments. Wallet is checked before sending.</span>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={sending || !message.trim() || !senderInfo || (previewCount !== null && previewCount === 0)}
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
