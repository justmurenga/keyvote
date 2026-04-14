'use client';

import React from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission, Role } from '@/lib/auth/permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  /**
   * Single permission required
   */
  permission?: Permission;
  /**
   * Any of these permissions allows access
   */
  anyPermission?: Permission[];
  /**
   * All of these permissions required
   */
  allPermissions?: Permission[];
  /**
   * Minimum role required
   */
  role?: Role;
  /**
   * Require admin access (admin or system_admin)
   */
  requireAdmin?: boolean;
  /**
   * Require system admin access only
   */
  requireSystemAdmin?: boolean;
  /**
   * Content to show when access is denied
   */
  fallback?: React.ReactNode;
  /**
   * Loading state content
   */
  loadingFallback?: React.ReactNode;
}

/**
 * Component to conditionally render children based on user permissions
 */
export function PermissionGuard({
  children,
  permission,
  anyPermission,
  allPermissions,
  role,
  requireAdmin,
  requireSystemAdmin,
  fallback = null,
  loadingFallback = null,
}: PermissionGuardProps) {
  const { loading, can, canAny, canAll, hasRole, isAdmin, isSystemAdmin } = usePermissions();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  let hasAccess = true;

  if (permission) {
    hasAccess = hasAccess && can(permission);
  }

  if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAccess && canAny(anyPermission);
  }

  if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAccess && canAll(allPermissions);
  }

  if (role) {
    hasAccess = hasAccess && hasRole(role);
  }

  if (requireAdmin) {
    hasAccess = hasAccess && isAdmin();
  }

  if (requireSystemAdmin) {
    hasAccess = hasAccess && isSystemAdmin();
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: Omit<PermissionGuardProps, 'children'>
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGuard {...options}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

export default PermissionGuard;
