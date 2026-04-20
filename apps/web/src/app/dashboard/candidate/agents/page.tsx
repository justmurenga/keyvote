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
  id: string;
  user_id: string;
  status: string;
  region_type: string;
  mpesa_number: string | null;
  created_at: string;
  user: {
    full_name: string;
    phone: string;
    profile_photo_url: string | null;
  } | null;
  polling_station: { name: string } | null;
  ward: { name: string } | null;
  constituency: { name: string } | null;
  county: { name: string } | null;
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

  // Invite form fields
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRegionType, setInviteRegionType] = useState('polling_station');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');

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

  const handleInvite = async () => {
    if (!inviteName || !invitePhone) {
      setInviteMessage('Name and phone number are required');
      return;
    }
    setInviting(true);
    setInviteMessage('');

    try {
      const res = await fetch('/api/agents/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName,
          phone: invitePhone,
          regionType: inviteRegionType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteMessage('Invitation sent successfully!');
        setInviteName('');
        setInvitePhone('');
        fetchAgents();
        setTimeout(() => setShowInviteForm(false), 2000);
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
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowInviteForm(false)} />
          <div className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-md rounded-lg border bg-background shadow-lg">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Invite Campaign Agent</h2>
                <button onClick={() => setShowInviteForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="Agent's full name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="07XX XXX XXX"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                  />
                </div>
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
                  </select>
                </div>

                {inviteMessage && (
                  <p className={`text-sm ${inviteMessage.includes('success') ? 'text-green-600' : 'text-destructive'}`}>
                    {inviteMessage}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
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
                  {agents.map((agent) => (
                    <tr key={agent.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {agent.user?.full_name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium">{agent.user?.full_name || 'Invited'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {agent.user?.phone || '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm capitalize">{agent.region_type?.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[agent.status] || 'bg-gray-100 text-gray-800'}`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        {agent.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRevoke(agent.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
