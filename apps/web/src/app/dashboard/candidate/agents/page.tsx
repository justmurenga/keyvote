'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Shield,
  UserPlus,
  Search,
  Phone,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';

interface Agent {
  // Primary id (RPC returns agent_id, fallback flatten also uses agent_id;
  // the system-admin branch returns nested rows with `id`)
  agent_id?: string;
  id?: string;
  user_id: string;
  status: string;

  // Flat fields from RPC / fallback
  full_name?: string | null;
  phone_number?: string | null;
  profile_photo_url?: string | null;
  assigned_region_type?: string | null;
  region_name?: string | null;
  mpesa_number?: string | null;
  invited_phone?: string | null;
  invited_name?: string | null;
  invitation_token?: string | null;
  total_reports?: number;
  total_results_submitted?: number;
  total_payments_received?: number;
  invited_at?: string | null;
  accepted_at?: string | null;
  revoked_at?: string | null;
  created_at: string;

  // Nested fields (system-admin branch)
  users?: {
    id: string;
    full_name: string | null;
    phone: string | null;
    profile_photo_url: string | null;
  } | null;
  assigned_polling_station?: { id: string; display_name: string } | null;
  assigned_ward?: { id: string; name: string } | null;
  assigned_constituency?: { id: string; name: string } | null;
  assigned_county?: { id: string; name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  invited: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  revoked: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function CandidateAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Invite form fields (search-driven)
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<Array<{
    id: string;
    full_name: string;
    phone_number: string | null;
    email: string | null;
    role: string;
    profile_photo_url: string | null;
    is_verified: boolean;
  }>>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    full_name: string;
    phone_number: string | null;
    email: string | null;
  } | null>(null);
  const [inviteRegionType, setInviteRegionType] = useState('polling_station');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

  // Region cascade state
  const [counties, setCounties] = useState<Array<{ id: string; name: string }>>([]);
  const [constituencies, setConstituencies] = useState<Array<{ id: string; name: string }>>([]);
  const [wards, setWards] = useState<Array<{ id: string; name: string }>>([]);
  const [pollingStations, setPollingStations] = useState<Array<{ id: string; display_name: string; name?: string }>>([]);
  const [selectedCountyId, setSelectedCountyId] = useState('');
  const [selectedConstituencyId, setSelectedConstituencyId] = useState('');
  const [selectedWardId, setSelectedWardId] = useState('');
  const [selectedPollingStationId, setSelectedPollingStationId] = useState('');
  const [loadingRegions, setLoadingRegions] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/agents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      } else {
        setError('Failed to load agents');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Debounced auto-search by phone, email, or name
  useEffect(() => {
    if (!showInviteForm) return;
    if (selectedUser) return; // don't search after a user is selected
    const q = inviteQuery.trim();
    if (q.length < 3) {
      setInviteResults([]);
      setSearchingUsers(false);
      return;
    }
    setSearchingUsers(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/lookup?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setInviteResults(data.users || []);
        } else {
          setInviteResults([]);
        }
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') setInviteResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [inviteQuery, showInviteForm, selectedUser]);

  const resetInviteForm = () => {
    setInviteQuery('');
    setInviteResults([]);
    setSelectedUser(null);
    setInviteRegionType('polling_station');
    setInviteMessage('');
    setSelectedCountyId('');
    setSelectedConstituencyId('');
    setSelectedWardId('');
    setSelectedPollingStationId('');
    setConstituencies([]);
    setWards([]);
    setPollingStations([]);
  };

  // Load counties once the invite form opens (and when needed)
  useEffect(() => {
    if (!showInviteForm) return;
    if (inviteRegionType === 'national') return;
    if (counties.length > 0) return;
    setLoadingRegions(true);
    fetch('/api/regions/counties')
      .then((r) => r.json())
      .then((d) => setCounties(d.counties || []))
      .catch(() => setCounties([]))
      .finally(() => setLoadingRegions(false));
  }, [showInviteForm, inviteRegionType, counties.length]);

  // Cascade: load constituencies when county changes
  useEffect(() => {
    setConstituencies([]);
    setSelectedConstituencyId('');
    setWards([]);
    setSelectedWardId('');
    setPollingStations([]);
    setSelectedPollingStationId('');
    if (!selectedCountyId) return;
    if (inviteRegionType === 'county' || inviteRegionType === 'national') return;
    fetch(`/api/regions/constituencies?county_id=${selectedCountyId}`)
      .then((r) => r.json())
      .then((d) => setConstituencies(d.constituencies || []))
      .catch(() => setConstituencies([]));
  }, [selectedCountyId, inviteRegionType]);

  // Cascade: load wards when constituency changes
  useEffect(() => {
    setWards([]);
    setSelectedWardId('');
    setPollingStations([]);
    setSelectedPollingStationId('');
    if (!selectedConstituencyId) return;
    if (inviteRegionType === 'constituency') return;
    fetch(`/api/regions/wards?constituency_id=${selectedConstituencyId}`)
      .then((r) => r.json())
      .then((d) => setWards(d.wards || []))
      .catch(() => setWards([]));
  }, [selectedConstituencyId, inviteRegionType]);

  // Cascade: load polling stations when ward changes
  useEffect(() => {
    setPollingStations([]);
    setSelectedPollingStationId('');
    if (!selectedWardId) return;
    if (inviteRegionType !== 'polling_station') return;
    fetch(`/api/regions/polling-stations?ward_id=${selectedWardId}`)
      .then((r) => r.json())
      .then((d) => setPollingStations(d.polling_stations || []))
      .catch(() => setPollingStations([]));
  }, [selectedWardId, inviteRegionType]);

  // Reset selected region when region type changes
  useEffect(() => {
    setSelectedCountyId('');
    setSelectedConstituencyId('');
    setSelectedWardId('');
    setSelectedPollingStationId('');
  }, [inviteRegionType]);

  const handleInvite = async () => {
    if (!selectedUser) {
      setInviteMessage('Search and select a registered user first');
      return;
    }
    // Client-side validation for region selection
    if (inviteRegionType === 'county' && !selectedCountyId) {
      setInviteMessage('Please select a county');
      return;
    }
    if (inviteRegionType === 'constituency' && !selectedConstituencyId) {
      setInviteMessage('Please select a constituency');
      return;
    }
    if (inviteRegionType === 'ward' && !selectedWardId) {
      setInviteMessage('Please select a ward');
      return;
    }
    if (inviteRegionType === 'polling_station' && !selectedPollingStationId) {
      setInviteMessage('Please select a polling station');
      return;
    }
    setInviting(true);
    setInviteMessage('');

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          name: selectedUser.full_name,
          phone: selectedUser.phone_number,
          regionType: inviteRegionType,
          countyId: selectedCountyId || null,
          constituencyId: selectedConstituencyId || null,
          wardId: selectedWardId || null,
          pollingStationId: selectedPollingStationId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteMessage(
          data.notified
            ? `Invitation sent to ${selectedUser.full_name}. They have been alerted in-app.`
            : 'Invitation created successfully!',
        );
        fetchAgents();
        setTimeout(() => {
          setShowInviteForm(false);
          resetInviteForm();
        }, 1800);
      } else {
        setInviteMessage(data.error || 'Failed to send invitation');
      }
    } catch (e) {
      setInviteMessage('Network error');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (agentId: string) => {
    if (!confirm('Are you sure you want to revoke this agent?')) return;

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' }),
      });
      if (res.ok) {
        fetchAgents();
      }
    } catch (e) {
      console.error('Failed to revoke agent:', e);
    }
  };

  const activeCount = agents.filter((a) => a.status === 'active').length;
  const pendingCount = agents.filter((a) => ['pending', 'invited'].includes(a.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/candidate')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold mt-2">Agent Management</h1>
          <p className="text-muted-foreground">
            Manage your campaign agents across regions
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{agents.length}</p>
              <p className="text-xs text-muted-foreground">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Shield className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Loader2 className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Invitations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Agent Dialog */}
      {showInviteForm && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => {
              setShowInviteForm(false);
              resetInviteForm();
            }}
          />
          <div className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-md rounded-lg border bg-background shadow-lg">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Invite Campaign Agent</h2>
                <button
                  onClick={() => {
                    setShowInviteForm(false);
                    resetInviteForm();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Search for a registered myVote user by phone number, email, or name. They
                must already have an account on the platform.
              </p>

              <div className="space-y-3">
                {/* Search input or selected user card */}
                {selectedUser ? (
                  <div className="flex items-center gap-3 p-3 rounded-md border bg-primary/5">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {selectedUser.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedUser.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedUser.phone_number || selectedUser.email || ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null);
                        setInviteQuery('');
                        setInviteResults([]);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Search Agent</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Phone, email, or name (min 3 chars)"
                        value={inviteQuery}
                        onChange={(e) => setInviteQuery(e.target.value)}
                        className="pl-10"
                      />
                      {searchingUsers && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Live results */}
                    {inviteQuery.trim().length >= 3 && (
                      <div className="mt-2 max-h-56 overflow-y-auto rounded-md border">
                        {inviteResults.length === 0 && !searchingUsers ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No registered users match "{inviteQuery}". They must sign up first.
                          </div>
                        ) : (
                          inviteResults.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => setSelectedUser({
                                id: u.id,
                                full_name: u.full_name,
                                phone_number: u.phone_number,
                                email: u.email,
                              })}
                              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 border-b last:border-b-0"
                            >
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {u.full_name?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{u.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {u.phone_number || u.email || u.role}
                                </p>
                              </div>
                              {u.is_verified && (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <Label>Assignment Level</Label>
                  <select
                    value={inviteRegionType}
                    onChange={(e) => setInviteRegionType(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="polling_station">Polling Station</option>
                    <option value="ward">Ward</option>
                    <option value="constituency">Constituency</option>
                    <option value="county">County</option>
                    <option value="national">National</option>
                  </select>
                </div>

                {/* Cascading region selectors */}
                {inviteRegionType !== 'national' && (
                  <div className="space-y-1">
                    <Label>County</Label>
                    <select
                      value={selectedCountyId}
                      onChange={(e) => setSelectedCountyId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      disabled={loadingRegions}
                    >
                      <option value="">{loadingRegions ? 'Loading…' : 'Select county'}</option>
                      {counties.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(inviteRegionType === 'constituency' ||
                  inviteRegionType === 'ward' ||
                  inviteRegionType === 'polling_station') && selectedCountyId && (
                  <div className="space-y-1">
                    <Label>Constituency</Label>
                    <select
                      value={selectedConstituencyId}
                      onChange={(e) => setSelectedConstituencyId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">
                        {constituencies.length === 0 ? 'Loading…' : 'Select constituency'}
                      </option>
                      {constituencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(inviteRegionType === 'ward' || inviteRegionType === 'polling_station') &&
                  selectedConstituencyId && (
                    <div className="space-y-1">
                      <Label>Ward</Label>
                      <select
                        value={selectedWardId}
                        onChange={(e) => setSelectedWardId(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">
                          {wards.length === 0 ? 'Loading…' : 'Select ward'}
                        </option>
                        {wards.map((w) => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                {inviteRegionType === 'polling_station' && selectedWardId && (
                  <div className="space-y-1">
                    <Label>Polling Station</Label>
                    <select
                      value={selectedPollingStationId}
                      onChange={(e) => setSelectedPollingStationId(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">
                        {pollingStations.length === 0 ? 'Loading…' : 'Select polling station'}
                      </option>
                      {pollingStations.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name || p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {inviteMessage && (
                  <p className={`text-sm ${inviteMessage.toLowerCase().includes('sent') || inviteMessage.toLowerCase().includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                    {inviteMessage}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteForm(false);
                    resetInviteForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting || !selectedUser}>
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Search + Refresh */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchAgents}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Agents List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Agents Yet</p>
              <p className="text-sm">Invite campaign agents to help manage your campaign</p>
              <Button className="mt-4" onClick={() => setShowInviteForm(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Your First Agent
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Agent</th>
                    <th className="text-left p-4 font-medium">Phone</th>
                    <th className="text-left p-4 font-medium">Region</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const rowId = agent.agent_id || agent.id || `${agent.user_id}-${agent.created_at}`;
                    const displayName =
                      agent.full_name ||
                      agent.users?.full_name ||
                      agent.invited_name ||
                      'Invited';
                    const displayPhone =
                      agent.phone_number ||
                      agent.users?.phone ||
                      agent.invited_phone ||
                      '-';
                    const regionType = agent.assigned_region_type || '';
                    const regionName =
                      agent.region_name ||
                      agent.assigned_polling_station?.display_name ||
                      agent.assigned_ward?.name ||
                      agent.assigned_constituency?.name ||
                      agent.assigned_county?.name ||
                      (regionType === 'national' ? 'National' : '—');

                    return (
                      <tr key={rowId} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                              {agent.profile_photo_url || agent.users?.profile_photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={agent.profile_photo_url || agent.users?.profile_photo_url || ''}
                                  alt={displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                displayName?.charAt(0).toUpperCase() || '?'
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{displayName}</span>
                              {agent.mpesa_number && (
                                <span className="text-xs text-muted-foreground">
                                  M-Pesa: {agent.mpesa_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{displayPhone}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="text-sm">{regionName}</span>
                              {regionType && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  {regionType.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              STATUS_COLORS[agent.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {agent.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground text-xs">
                          {agent.created_at
                            ? new Date(agent.created_at).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="p-4">
                          {agent.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevoke(rowId)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(agent.status === 'pending' || agent.status === 'invited') &&
                            agent.invitation_token && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const url = `${window.location.origin}/agents/accept/${agent.invitation_token}`;
                                  navigator.clipboard?.writeText(url);
                                }}
                                title="Copy invitation link"
                              >
                                Copy link
                              </Button>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
