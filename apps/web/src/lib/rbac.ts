/**
 * RBAC Client Helpers
 * Query the database RBAC system (roles, permissions, user_role_assignments)
 * from the client side via Supabase.
 */

import { createClient } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RbacRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  scope_type: 'global' | 'party' | 'region';
  is_system: boolean;
}

export interface RbacPermission {
  id: string;
  code: string;
  description: string | null;
  category: string;
}

export interface UserRoleAssignment {
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
  // Joined fields
  role?: RbacRole;
  party?: { id: string; name: string; abbreviation: string } | null;
}

export interface UserPermissionRow {
  user_id: string;
  full_name: string;
  role_name: string;
  role_display_name: string;
  scope_type: string;
  party_id: string | null;
  party_name: string | null;
  permission_code: string;
  permission_description: string | null;
  permission_category: string;
  is_active: boolean;
  expires_at: string | null;
  assigned_at: string;
}

// ── Queries ────────────────────────────────────────────────────────────────

/** Fetch all available roles */
export async function fetchRoles() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('is_active', true)
    .order('name');
  return { data: data as RbacRole[] | null, error };
}

/** Fetch all permissions */
export async function fetchPermissions() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('category, code');
  return { data: data as RbacPermission[] | null, error };
}

/** Fetch role assignments for a specific user */
export async function fetchUserRoles(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_role_assignments')
    .select(`
      *,
      role:roles(*),
      party:political_parties(id, name, abbreviation)
    `)
    .eq('user_id', userId)
    .eq('is_active', true);
  return { data: data as UserRoleAssignment[] | null, error };
}

/** Fetch the effective permissions for a user (via the view) */
export async function fetchUserPermissions(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_permissions_view')
    .select('*')
    .eq('user_id', userId);
  return { data: data as UserPermissionRow[] | null, error };
}

/** Fetch the current user's own permissions */
export async function fetchMyPermissions() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  return fetchUserPermissions(user.id);
}

/** Fetch the current user's role assignments */
export async function fetchMyRoles() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  return fetchUserRoles(user.id);
}

// ── Mutations (call DB functions) ──────────────────────────────────────────

/** Assign a role to a user */
export async function assignRole(params: {
  targetUserId: string;
  roleName: string;
  partyId?: string;
  regionType?: string;
  regionId?: string;
  notes?: string;
  expiresAt?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('assign_user_role', {
    p_target_user_id: params.targetUserId,
    p_role_name: params.roleName,
    p_party_id: params.partyId,
    p_region_type: params.regionType as any,
    p_region_id: params.regionId,
    p_notes: params.notes,
    p_expires_at: params.expiresAt,
  });
  return { data, error };
}

/** Revoke a role from a user */
export async function revokeRole(params: {
  targetUserId: string;
  roleName: string;
  partyId?: string;
  reason?: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('revoke_user_role', {
    p_target_user_id: params.targetUserId,
    p_role_name: params.roleName,
    p_party_id: params.partyId,
    p_reason: params.reason,
  });
  return { data, error };
}

// ── Client-side permission check helpers ───────────────────────────────────

/** Check if a set of permission rows includes a specific permission code */
export function hasPermissionCode(
  permissions: UserPermissionRow[],
  code: string,
  partyId?: string
): boolean {
  return permissions.some(
    (p) =>
      p.permission_code === code &&
      p.is_active &&
      (!p.expires_at || new Date(p.expires_at) > new Date()) &&
      // If partyId filter is specified, match it (global roles have null party_id)
      (partyId === undefined || p.party_id === null || p.party_id === partyId)
  );
}

/** Check if user has any of the given permission codes */
export function hasAnyPermissionCode(
  permissions: UserPermissionRow[],
  codes: string[],
  partyId?: string
): boolean {
  return codes.some((code) => hasPermissionCode(permissions, code, partyId));
}

/** Check if user has a specific role */
export function hasRoleName(
  assignments: UserRoleAssignment[],
  roleName: string,
  partyId?: string
): boolean {
  return assignments.some(
    (a) =>
      a.role?.name === roleName &&
      a.is_active &&
      (!a.expires_at || new Date(a.expires_at) > new Date()) &&
      (partyId === undefined || a.party_id === null || a.party_id === partyId)
  );
}

/** Check if user is a system admin based on their role assignments */
export function isSystemAdminFromRoles(assignments: UserRoleAssignment[]): boolean {
  return hasRoleName(assignments, 'super_admin') || hasRoleName(assignments, 'system_admin');
}

/** Check if user is a party admin for a specific party */
export function isPartyAdminFromRoles(assignments: UserRoleAssignment[], partyId: string): boolean {
  return (
    isSystemAdminFromRoles(assignments) ||
    hasRoleName(assignments, 'party_leader', partyId) ||
    hasRoleName(assignments, 'party_chairman', partyId) ||
    hasRoleName(assignments, 'party_secretary', partyId)
  );
}
