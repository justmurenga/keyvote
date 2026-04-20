'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchRoles,
  fetchPermissions,
  assignRole,
  revokeRole,
  type RbacRole,
  type RbacPermission,
  type UserRoleAssignment,
} from '@/lib/rbac';
import { Shield, Plus, Trash2, Search, ChevronDown, ChevronRight, Clock, Users, KeyRound } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────

interface UserSearchResult {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface RoleAssignmentRow {
  id: string;
  user_id: string;
  role_id: string;
  party_id: string | null;
  region_type: string | null;
  region_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
  notes: string | null;
  user: { id: string; full_name: string; phone: string } | null;
  role: RbacRole | null;
  party: { id: string; name: string; abbreviation: string } | null;
  assigned_by_user: { id: string; full_name: string } | null;
}

interface Party {
  id: string;
  name: string;
  abbreviation: string;
}

// ── Component ────────────────────────────────────────────────────────────

export default function RolesManagementPage() {
  // Data
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignmentRow[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [rolePermissionMap, setRolePermissionMap] = useState<Record<string, string[]>>({});

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'assignments' | 'roles'>('assignments');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Filters
  const [filterRole, setFilterRole] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    targetUserId: '',
    roleName: '',
    partyId: '',
    regionType: '',
    regionId: '',
    notes: '',
    expiresAt: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Revoke Modal
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<RoleAssignmentRow | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revoking, setRevoking] = useState(false);

  // ── Data Loading ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Load roles, permissions, parties in parallel
      const [rolesRes, permsRes, partiesRes] = await Promise.all([
        fetchRoles(),
        fetchPermissions(),
        supabase.from('political_parties').select('id, name, abbreviation').order('name'),
      ]);

      if (rolesRes.data) setRoles(rolesRes.data);
      if (permsRes.data) setPermissions(permsRes.data);
      if (partiesRes.data) setParties(partiesRes.data as Party[]);

      // Load role→permission mapping
      const { data: rpData } = await supabase
        .from('role_permissions')
        .select('role_id, permission:permissions(code)');
      if (rpData) {
        const map: Record<string, string[]> = {};
        for (const rp of rpData as any[]) {
          if (!map[rp.role_id]) map[rp.role_id] = [];
          if (rp.permission?.code) map[rp.role_id].push(rp.permission.code);
        }
        setRolePermissionMap(map);
      }

      // Load assignments
      await loadAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAssignments = async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('user_role_assignments')
      .select(`
        *,
        user:users!user_role_assignments_user_id_fkey(id, full_name, phone),
        role:roles(*),
        party:political_parties(id, name, abbreviation),
        assigned_by_user:users!user_role_assignments_assigned_by_fkey(id, full_name)
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (err) {
      console.error('Failed to load assignments:', err);
    } else {
      setAssignments((data as unknown as RoleAssignmentRow[]) || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── User Search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!userSearch || userSearch.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('users')
        .select('id, full_name, phone, email')
        .or(`full_name.ilike.%${userSearch}%,phone.ilike.%${userSearch}%,email.ilike.%${userSearch}%`)
        .limit(10);
      setUserResults((data as UserSearchResult[]) || []);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!assignForm.targetUserId || !assignForm.roleName) {
      setError('Please select a user and role');
      return;
    }
    setAssigning(true);
    setError('');
    try {
      const { data, error: err } = await assignRole({
        targetUserId: assignForm.targetUserId,
        roleName: assignForm.roleName,
        partyId: assignForm.partyId || undefined,
        regionType: assignForm.regionType || undefined,
        regionId: assignForm.regionId || undefined,
        notes: assignForm.notes || undefined,
        expiresAt: assignForm.expiresAt || undefined,
      });

      if (err) throw err;

      const result = data as any;
      if (result?.status === 'error') {
        throw new Error(result.message || 'Failed to assign role');
      }

      setSuccess(`Role "${assignForm.roleName}" assigned successfully`);
      setShowAssignModal(false);
      resetAssignForm();
      await loadAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to assign role');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setError('');
    try {
      const { data, error: err } = await revokeRole({
        targetUserId: revokeTarget.user_id,
        roleName: revokeTarget.role?.name || '',
        partyId: revokeTarget.party_id || undefined,
        reason: revokeReason || undefined,
      });

      if (err) throw err;

      const result = data as any;
      if (result?.status === 'error') {
        throw new Error(result.message || 'Failed to revoke role');
      }

      setSuccess(`Role revoked successfully`);
      setShowRevokeModal(false);
      setRevokeTarget(null);
      setRevokeReason('');
      await loadAssignments();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke role');
    } finally {
      setRevoking(false);
    }
  };

  const resetAssignForm = () => {
    setAssignForm({ targetUserId: '', roleName: '', partyId: '', regionType: '', regionId: '', notes: '', expiresAt: '' });
    setUserSearch('');
    setUserResults([]);
    setSelectedUser(null);
  };

  // ── Filtered Assignments ─────────────────────────────────────────────

  const filteredAssignments = assignments.filter((a) => {
    if (filterRole !== 'all' && a.role?.name !== filterRole) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const matchesUser = a.user?.full_name?.toLowerCase().includes(q) || a.user?.phone?.includes(q);
      const matchesRole = a.role?.display_name?.toLowerCase().includes(q);
      const matchesParty = a.party?.name?.toLowerCase().includes(q);
      if (!matchesUser && !matchesRole && !matchesParty) return false;
    }
    return true;
  });

  // ── Selected role scope ──────────────────────────────────────────────

  const selectedRoleObj = roles.find((r) => r.name === assignForm.roleName);

  // ── Permission grouping ──────────────────────────────────────────────

  const groupedPermissions = permissions.reduce<Record<string, RbacPermission[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  // ── Helpers ──────────────────────────────────────────────────────────

  const getScopeBadge = (role: RbacRole) => {
    const colors: Record<string, string> = {
      global: 'bg-red-100 text-red-700',
      party: 'bg-blue-100 text-blue-700',
      region: 'bg-amber-100 text-amber-700',
    };
    return colors[role.scope_type] || 'bg-gray-100 text-gray-700';
  };

  const clearAlerts = () => { setError(''); setSuccess(''); };

  // Auto-clear alerts
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading role management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground">Assign and revoke roles using the RBAC system</p>
        </div>
        <button
          onClick={() => { clearAlerts(); setShowAssignModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Assign Role
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-destructive/70 hover:text-destructive">×</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex justify-between items-center dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'assignments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            User Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="h-4 w-4 inline mr-2" />
            Roles & Permissions ({roles.length})
          </button>
        </div>
      </div>

      {/* ─── Tab: Assignments ──────────────────────────────────────────── */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by user, role, or party..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>{r.display_name}</option>
              ))}
            </select>
          </div>

          {/* Assignments Table */}
          <div className="bg-card border rounded-lg overflow-hidden">
            {filteredAssignments.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No role assignments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Scope</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Expires</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{a.user?.full_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{a.user?.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getScopeBadge(a.role!)}`}>
                            {a.role?.display_name || a.role?.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {a.party ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="font-medium">{a.party.abbreviation}</span>
                              <span className="text-xs">({a.party.name})</span>
                            </span>
                          ) : a.region_type ? (
                            <span>{a.region_type}: {a.region_id}</span>
                          ) : (
                            <span className="text-xs italic">Global</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-muted-foreground">
                            {new Date(a.assigned_at).toLocaleDateString()}
                          </div>
                          {a.assigned_by_user && (
                            <div className="text-xs text-muted-foreground">
                              by {a.assigned_by_user.full_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {a.expires_at ? (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock className="h-3 w-3" />
                              {new Date(a.expires_at).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              clearAlerts();
                              setRevokeTarget(a);
                              setShowRevokeModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            title="Revoke Role"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Roles & Permissions ──────────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {roles.map((role) => {
            const isExpanded = expandedRole === role.id;
            const perms = rolePermissionMap[role.id] || [];
            const assignmentCount = assignments.filter((a) => a.role_id === role.id).length;

            return (
              <div key={role.id} className="bg-card border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                  className="w-full px-4 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <div className="font-medium">{role.display_name}</div>
                      <div className="text-xs text-muted-foreground">{role.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScopeBadge(role)}`}>
                      {role.scope_type}
                    </span>
                    <span className="text-xs text-muted-foreground">{assignmentCount} users</span>
                    <span className="text-xs text-muted-foreground">{perms.length} permissions</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t">
                    <div className="pt-4 space-y-4">
                      {/* Permissions grouped by category */}
                      {Object.entries(groupedPermissions).map(([category, catPerms]) => {
                        const activePerms = catPerms.filter((p) => perms.includes(p.code));
                        if (activePerms.length === 0) return null;
                        return (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              {category.replace(/_/g, ' ')}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {activePerms.map((p) => (
                                <span
                                  key={p.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                                  title={p.description || ''}
                                >
                                  <KeyRound className="h-3 w-3 text-primary" />
                                  {p.code.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {perms.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No permissions assigned to this role.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Assign Role Modal ─────────────────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Assign Role to User</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Search for a user and assign them a role with optional scoping.
              </p>
            </div>
            <div className="p-6 space-y-5">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium mb-1.5">User *</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{selectedUser.full_name}</div>
                      <div className="text-xs text-muted-foreground">{selectedUser.phone}</div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setAssignForm((f) => ({ ...f, targetUserId: '' }));
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {searchingUsers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      </div>
                    )}
                    {userResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {userResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setAssignForm((f) => ({ ...f, targetUserId: u.id }));
                              setUserSearch('');
                              setUserResults([]);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-muted text-sm flex justify-between"
                          >
                            <span className="font-medium">{u.full_name}</span>
                            <span className="text-muted-foreground">{u.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Role *</label>
                <select
                  value={assignForm.roleName}
                  onChange={(e) => setAssignForm((f) => ({ ...f, roleName: e.target.value, partyId: '', regionType: '', regionId: '' }))}
                  className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select a role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.display_name} ({r.scope_type})
                    </option>
                  ))}
                </select>
                {selectedRoleObj?.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedRoleObj.description}</p>
                )}
              </div>

              {/* Party (if party-scoped) */}
              {selectedRoleObj?.scope_type === 'party' && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Political Party *</label>
                  <select
                    value={assignForm.partyId}
                    onChange={(e) => setAssignForm((f) => ({ ...f, partyId: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select a party...</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Region (if region-scoped) */}
              {selectedRoleObj?.scope_type === 'region' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Region Type</label>
                    <select
                      value={assignForm.regionType}
                      onChange={(e) => setAssignForm((f) => ({ ...f, regionType: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">Select type...</option>
                      <option value="county">County</option>
                      <option value="constituency">Constituency</option>
                      <option value="ward">Ward</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Region ID</label>
                    <input
                      type="text"
                      value={assignForm.regionId}
                      onChange={(e) => setAssignForm((f) => ({ ...f, regionId: e.target.value }))}
                      placeholder="Enter region ID"
                      className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </>
              )}

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={assignForm.expiresAt}
                  onChange={(e) => setAssignForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes (optional)</label>
                <textarea
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Reason for assignment..."
                  className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => { setShowAssignModal(false); resetAssignForm(); }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !assignForm.targetUserId || !assignForm.roleName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Assign Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Revoke Role Modal ─────────────────────────────────────────── */}
      {showRevokeModal && revokeTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-destructive">Revoke Role</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{revokeTarget.user?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{revokeTarget.role?.display_name}</span>
                </div>
                {revokeTarget.party && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Party</span>
                    <span className="font-medium">{revokeTarget.party.name}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Reason (optional)</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for revoking this role..."
                  className="w-full px-4 py-2 border rounded-lg bg-background text-sm focus:ring-2 focus:ring-destructive/20 focus:border-destructive resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This action will be logged in the audit trail.
              </p>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => { setShowRevokeModal(false); setRevokeTarget(null); setRevokeReason(''); }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-sm font-medium disabled:opacity-50"
              >
                {revoking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive-foreground" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Revoke Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
