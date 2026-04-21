import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveUserId } from '@/lib/auth/get-user';
import { isSystemAdminFromRoles, type UserRoleAssignment } from '@/lib/rbac';
import { AdminSidebar } from './admin-sidebar';

// Always evaluate per-request — auth state changes between users.
export const dynamic = 'force-dynamic';
// Avoid Edge runtime cold-start variance for the gate.
export const runtime = 'nodejs';

/**
 * Admin layout — server component.
 *
 * Performs the role check on the SERVER so unauthorized users are redirected
 * via HTTP before any HTML reaches the browser. This eliminates the
 * "Access Denied" flash users previously saw on first paint and removes a
 * full client-side render + RBAC round-trip from the critical path.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const userId = await resolveUserId(supabase);

  // Not logged in → middleware should have caught this, but be defensive.
  if (!userId) {
    redirect('/auth/login?redirect=/dashboard/admin');
  }

  // Fetch the minimum needed to gate access: legacy role + RBAC roles.
  // Run both queries in parallel to keep TTFB low.
  const [profileRes, rolesRes] = await Promise.all([
    supabase.from('users').select('role').eq('id', userId).single(),
    supabase
      .from('user_role_assignments')
      .select('role:roles(name), party_id, is_active, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  const role = (profileRes.data?.role as string | undefined) ?? 'voter';

  // Normalize RBAC assignments — match the shape `isSystemAdminFromRoles`
  // expects (it reads `assignment.role?.name`). Only the fields used by the
  // helper need to be populated for the gate check.
  const roleAssignments = ((rolesRes.data as any[]) ?? []).map((row) => ({
    role: row.role ? { name: row.role.name as string } : undefined,
    party_id: (row.party_id as string | null) ?? null,
    is_active: !!row.is_active,
    expires_at: (row.expires_at as string | null) ?? null,
  })) as unknown as UserRoleAssignment[];

  const isLegacyAdmin = role === 'admin' || role === 'system_admin';
  const isRbacAdmin = isSystemAdminFromRoles(roleAssignments);

  if (!isLegacyAdmin && !isRbacAdmin) {
    // Hard redirect — no client-side flash, no stale UI.
    redirect('/dashboard?error=access_denied');
  }

  return <AdminSidebar initialRole={role}>{children}</AdminSidebar>;
}
