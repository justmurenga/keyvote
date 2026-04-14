'use client';

import { useAuth } from './use-auth';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions,
  type Role,
  type Permission
} from '@/lib/auth/permissions';

/**
 * Hook to check if the current user has specific permissions
 */
export function usePermissions() {
  const { profile, isLoading } = useAuth();
  const role = (profile?.role || 'voter') as Role;

  return {
    loading: isLoading,
    role,
    user: profile,
    
    /**
     * Check if user has a specific permission
     */
    can: (permission: Permission): boolean => {
      if (!profile) return false;
      return hasPermission(role, permission);
    },

    /**
     * Check if user has any of the given permissions
     */
    canAny: (permissions: Permission[]): boolean => {
      if (!profile) return false;
      return hasAnyPermission(role, permissions);
    },

    /**
     * Check if user has all of the given permissions
     */
    canAll: (permissions: Permission[]): boolean => {
      if (!profile) return false;
      return hasAllPermissions(role, permissions);
    },

    /**
     * Check if user is an admin (admin or system_admin)
     */
    isAdmin: (): boolean => {
      if (!profile) return false;
      return ['admin', 'system_admin'].includes(role);
    },

    /**
     * Check if user is a system admin
     */
    isSystemAdmin: (): boolean => {
      if (!profile) return false;
      return role === 'system_admin';
    },

    /**
     * Check if user has at least the given role level
     */
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
      return roleHierarchy[role] >= roleHierarchy[requiredRole];
    },
  };
}

export default usePermissions;
