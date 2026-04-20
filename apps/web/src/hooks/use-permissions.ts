'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type Role,
  type Permission,
} from '@/lib/auth/permissions';
import {
  fetchMyRoles,
  fetchMyPermissions,
  isSystemAdminFromRoles,
  isPartyAdminFromRoles,
  hasPermissionCode,
  hasAnyPermissionCode,
  hasRoleName,
  type UserRoleAssignment,
  type UserPermissionRow,
} from '@/lib/rbac';

/**
 * Hook to check if the current user has specific permissions.
 *
 * Uses the new RBAC system (user_role_assignments + permissions tables)
 * while keeping backward compatibility with the legacy `users.role` column
 * via the original static ROLE_PERMISSIONS map.
 */
export function usePermissions() {
  const { profile, isLoading: authLoading } = useAuth();
  const legacyRole = (profile?.role || 'voter') as Role;

  // RBAC state
  const [roleAssignments, setRoleAssignments] = useState<UserRoleAssignment[]>([]);
  const [permissionRows, setPermissionRows] = useState<UserPermissionRow[]>([]);
  const [rbacLoading, setRbacLoading] = useState(true);

  const loadRbac = useCallback(async () => {
    if (!profile) {
      setRoleAssignments([]);
      setPermissionRows([]);
      setRbacLoading(false);
      return;
    }
    setRbacLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([fetchMyRoles(), fetchMyPermissions()]);
      setRoleAssignments(rolesRes.data ?? []);
      setPermissionRows(permsRes.data ?? []);
    } catch {
      // Fallback: RBAC tables might not exist yet during migration
      setRoleAssignments([]);
      setPermissionRows([]);
    } finally {
      setRbacLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadRbac();
  }, [loadRbac]);

  const loading = authLoading || rbacLoading;

  return {
    loading,
    /** Legacy role from users.role column (backward compat) */
    role: legacyRole,
    user: profile,
    /** All active RBAC role assignments for the current user */
    roleAssignments,
    /** All effective permission rows from the DB view */
    permissionRows,
    /** Reload RBAC data */
    refreshRbac: loadRbac,

    // ── Legacy permission checks (still work, use static map) ──────────

    /**
     * Check permission via static ROLE_PERMISSIONS map (legacy).
     * Prefer `canDo` for DB-backed checks.
     */
    can: (permission: Permission): boolean => {
      if (!profile) return false;
      return hasPermission(legacyRole, permission);
    },

    canAny: (permissions: Permission[]): boolean => {
      if (!profile) return false;
      return hasAnyPermission(legacyRole, permissions);
    },

    canAll: (permissions: Permission[]): boolean => {
      if (!profile) return false;
      return hasAllPermissions(legacyRole, permissions);
    },

    // ── RBAC-backed permission checks ──────────────────────────────────

    /**
     * Check a DB permission code (e.g. 'manage_party_members').
     * Optionally scoped to a party.
     */
    canDo: (permissionCode: string, partyId?: string): boolean => {
      if (!profile) return false;
      // System admins have all permissions
      if (isSystemAdminFromRoles(roleAssignments)) return true;
      return hasPermissionCode(permissionRows, permissionCode, partyId);
    },

    /** Check if user has any of the given DB permission codes */
    canDoAny: (codes: string[], partyId?: string): boolean => {
      if (!profile) return false;
      if (isSystemAdminFromRoles(roleAssignments)) return true;
      return hasAnyPermissionCode(permissionRows, codes, partyId);
    },

    /** Check if user holds a specific RBAC role name */
    hasRbacRole: (roleName: string, partyId?: string): boolean => {
      return hasRoleName(roleAssignments, roleName, partyId);
    },

    /** Is the user a system-level admin? (super_admin or system_admin) */
    isAdmin: (): boolean => {
      if (!profile) return false;
      // Check RBAC first, fall back to legacy
      if (roleAssignments.length > 0) {
        return isSystemAdminFromRoles(roleAssignments);
      }
      return ['admin', 'system_admin'].includes(legacyRole);
    },

    isSystemAdmin: (): boolean => {
      if (!profile) return false;
      if (roleAssignments.length > 0) {
        return isSystemAdminFromRoles(roleAssignments);
      }
      return legacyRole === 'system_admin';
    },

    /** Is the user an admin for a specific party? */
    isPartyAdmin: (partyId: string): boolean => {
      if (!profile) return false;
      return isPartyAdminFromRoles(roleAssignments, partyId);
    },

    /** Legacy role hierarchy check (backward compat) */
    hasRole: (requiredRole: Role): boolean => {
      if (!profile) return false;
      const roleHierarchy: Record<Role, number> = {
        voter: 1,
        agent: 2,
        candidate: 3,
        party_admin: 4,
        admin: 5,
        system_admin: 6,
      };
      return roleHierarchy[legacyRole] >= roleHierarchy[requiredRole];
    },
  };
}

export default usePermissions;
