'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchRoles,
  assignRole,
  revokeRole,
  type RbacRole,
} from '@/lib/rbac';
import {
  Building2,
  Users,
  Shield,
  Loader2,
  UserPlus,
  Search,
  Trash2,
  Globe,
  Phone,
  Mail,
  Calendar,
  MapPin,
  BadgeCheck,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// ── Types ────────────────────────────────────────────────────────────────

interface Party {
  id: string;
  name: string;
  abbreviation: string;
  symbol_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  registration_number: string | null;
  headquarters: string | null;
  website_url: string | null;
  founded_date: string | null;
  leader_name: string | null;
  secretary_general: string | null;
  is_verified: boolean;
  verification_status: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
}

interface PartyMember {
  id: string;
  user_id: string;
  party_id: string;
  membership_number: string | null;
  role: string;
  joined_at: string;
  is_active: boolean;
  user: { id: string; full_name: string; phone: string; email: string | null } | null;
}

interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  party_id: string | null;
  is_active: boolean;
  assigned_at: string;
  role: RbacRole | null;
  user: { id: string; full_name: string; phone: string } | null;
}

// ── Component ────────────────────────────────────────────────────────────

export default function PartyPortalPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [myMemberships, setMyMemberships] = useState<(PartyMember & { party: Party })[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [partyRoles, setPartyRoles] = useState<RoleAssignment[]>([]);
  const [isPartyAdmin, setIsPartyAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Member management
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Role assignment
  const [allRoles, setAllRoles] = useState<RbacRole[]>([]);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const supabase = createClient();

  // ── Load user & memberships ──────────────────────────────────────────

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id ?? null;

      if (!userId) {
        try {
          const res = await fetch('/api/profile', { credentials: 'same-origin' });
          if (res.ok) {
            const d = await res.json();
            userId = d.profile?.id ?? null;
          }
        } catch { /* ignore */ }
      }

      setCurrentUserId(userId);
      if (!userId) { setIsLoading(false); return; }

      // Fetch my party memberships with party details
      const { data: memberships } = await supabase
        .from('party_members')
        .select('*, party:political_parties(*)')
        .eq('user_id', userId)
        .eq('is_active', true);

      const mems = (memberships ?? []) as unknown as (PartyMember & { party: Party })[];
      setMyMemberships(mems);

      // Auto-select first party
      if (mems.length > 0) {
        await selectParty(mems[0].party, userId);
      }

      // Load RBAC roles
      const { data: roles } = await fetchRoles();
      setAllRoles((roles ?? []).filter(r => r.scope_type === 'party'));
    } catch (err) {
      console.error('Failed to load party data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectParty = async (party: Party, userId?: string | null) => {
    setSelectedParty(party);
    const uid = userId ?? currentUserId;

    // Load party members
    const { data: members } = await supabase
      .from('party_members')
      .select('*, user:users(id, full_name, phone, email)')
      .eq('party_id', party.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    setPartyMembers((members ?? []) as unknown as PartyMember[]);

    // Load party role assignments
    const { data: roleAssignments } = await supabase
      .from('user_role_assignments')
      .select('*, role:roles(*), user:users(id, full_name, phone)')
      .eq('party_id', party.id)
      .eq('is_active', true);

    setPartyRoles((roleAssignments ?? []) as unknown as RoleAssignment[]);

    // Check if current user is party admin
    if (uid) {
      const { data: adminCheck } = await supabase.rpc('is_party_admin', { p_party_id: party.id, p_user_id: uid });
      setIsPartyAdmin(!!adminCheck);
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search users to add as members ───────────────────────────────────

  const handleUserSearch = async () => {
    if (!memberSearch.trim()) return;
    setIsSearching(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, phone')
        .or(`full_name.ilike.%${memberSearch}%,phone.ilike.%${memberSearch}%`)
        .limit(10);
      setSearchResults(data ?? []);
    } catch { /* ignore */ } finally {
      setIsSearching(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!selectedParty) return;
    const { error } = await supabase
      .from('party_members')
      .insert({ user_id: userId, party_id: selectedParty.id, role: 'member' });
    if (!error) {
      setSearchResults([]);
      setMemberSearch('');
      await selectParty(selectedParty);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!selectedParty) return;
    await supabase.from('party_members').update({ is_active: false }).eq('id', memberId);
    await selectParty(selectedParty);
  };

  // ── Role management ──────────────────────────────────────────────────

  const handleAssignRole = async (userId: string) => {
    if (!selectedParty || !selectedRoleId) return;
    try {
      const selectedRole = allRoles.find((r) => r.id === selectedRoleId);
      if (!selectedRole) return;

      const { data, error } = await assignRole({
        targetUserId: userId,
        roleName: selectedRole.name,
        partyId: selectedParty.id,
      });

      if (error) throw error;
      const result = data as { status?: string; message?: string } | null;
      if (result?.status === 'error') {
        throw new Error(result.message || 'Failed to assign role');
      }

      setAssigningRole(null);
      setSelectedRoleId('');
      await selectParty(selectedParty);
    } catch (err) {
      console.error('Failed to assign role:', err);
    }
  };

  const handleRevokeRole = async (assignment: RoleAssignment) => {
    try {
      if (!assignment.role?.name) return;

      const { data, error } = await revokeRole({
        targetUserId: assignment.user_id,
        roleName: assignment.role.name,
        partyId: assignment.party_id ?? undefined,
      });

      if (error) throw error;
      const result = data as { status?: string; message?: string } | null;
      if (result?.status === 'error') {
        throw new Error(result.message || 'Failed to revoke role');
      }

      if (selectedParty) await selectParty(selectedParty);
    } catch (err) {
      console.error('Failed to revoke role:', err);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (myMemberships.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Party Portal</h1>
          <p className="text-muted-foreground">Manage your political party membership</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Party Membership</h2>
            <p className="text-muted-foreground max-w-md">
              You are not currently a member of any political party.
              Contact a party official to be added as a member.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Party Portal</h1>
        <p className="text-muted-foreground">Manage your political party membership and roles</p>
      </div>

      {/* Party selector (if multiple memberships) */}
      {myMemberships.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {myMemberships.map((m) => (
            <Button
              key={m.party_id}
              variant={selectedParty?.id === m.party_id ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectParty(m.party)}
            >
              {m.party.abbreviation}
            </Button>
          ))}
        </div>
      )}

      {selectedParty && (
        <>
          {/* Party info card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="h-5 w-5" />
                    {selectedParty.name}
                    <Badge variant="outline">{selectedParty.abbreviation}</Badge>
                    {selectedParty.is_verified && (
                      <BadgeCheck className="h-5 w-5 text-blue-500" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedParty.verification_status === 'verified' ? 'Verified party' : 'Verification pending'}
                  </CardDescription>
                </div>
                {selectedParty.primary_color && (
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: selectedParty.primary_color }}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedParty.leader_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Crown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Leader:</span>
                    <span className="font-medium">{selectedParty.leader_name}</span>
                  </div>
                )}
                {selectedParty.headquarters && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">HQ:</span>
                    <span className="font-medium">{selectedParty.headquarters}</span>
                  </div>
                )}
                {selectedParty.founded_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Founded:</span>
                    <span className="font-medium">{new Date(selectedParty.founded_date).getFullYear()}</span>
                  </div>
                )}
                {selectedParty.website_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={selectedParty.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Website
                    </a>
                  </div>
                )}
                {selectedParty.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedParty.contact_phone}</span>
                  </div>
                )}
                {selectedParty.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedParty.contact_email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Party Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
                <Badge variant="secondary">{partyMembers.length}</Badge>
              </CardTitle>
              <CardDescription>Party membership roster</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add member (admin only) */}
              {isPartyAdmin && (
                <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                  <p className="text-sm font-medium">Add Member</p>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleUserSearch(); }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Search by name or phone..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" size="sm" disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </form>
                  {searchResults.length > 0 && (
                    <div className="space-y-1">
                      {searchResults.map((u) => (
                        <div key={u.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{u.full_name} ({u.phone})</span>
                          <Button size="sm" variant="ghost" onClick={() => addMember(u.id)}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Member list */}
              {partyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
              ) : (
                <div className="divide-y">
                  {partyMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-sm">{m.user?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{m.user?.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{m.role}</Badge>
                        {isPartyAdmin && m.user_id !== currentUserId && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAssigningRole(assigningRole === m.user_id ? null : m.user_id);
                                setSelectedRoleId('');
                              }}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => removeMember(m.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                      {/* Inline role assignment */}
                      {assigningRole === m.user_id && (
                        <div className="flex gap-2 ml-4">
                          <select
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                            className="rounded-md border px-2 py-1 text-sm bg-background"
                          >
                            <option value="">Select role...</option>
                            {allRoles.map((r) => (
                              <option key={r.id} value={r.id}>{r.display_name}</option>
                            ))}
                          </select>
                          <Button size="sm" disabled={!selectedRoleId} onClick={() => handleAssignRole(m.user_id)}>
                            Assign
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Party Role Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Assignments
                <Badge variant="secondary">{partyRoles.length}</Badge>
              </CardTitle>
              <CardDescription>RBAC roles assigned within this party</CardDescription>
            </CardHeader>
            <CardContent>
              {partyRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No roles assigned yet</p>
              ) : (
                <div className="divide-y">
                  {partyRoles.map((ra) => (
                    <div key={ra.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-sm">{ra.user?.full_name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{ra.user?.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{ra.role?.display_name ?? ra.role?.name ?? '—'}</Badge>
                        {isPartyAdmin && ra.user_id !== currentUserId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleRevokeRole(ra)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
