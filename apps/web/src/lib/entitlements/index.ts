/**
 * Entitlement helpers
 *
 * Thin wrapper around the `user_entitlements` table that lets API routes
 * easily check whether a user has paid for (and currently holds) a given
 * billable item — typically a time-bounded subscription such as
 * `outside_region_candidates` or `outside_region_results`.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface ActiveEntitlement {
  id: string;
  item_id: string;
  item_name: string;
  category: string | null;
  quantity_remaining: number | null;
  quantity_total: number | null;
  granted_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Returns the most recently granted active entitlement for the given item,
 * or null if the user does not currently have one.
 *
 * "Active" = status='active' AND (expires_at IS NULL OR expires_at > now())
 *            AND (quantity_remaining IS NULL OR quantity_remaining > 0).
 */
export async function getActiveEntitlement(
  userId: string,
  itemId: string,
): Promise<ActiveEntitlement | null> {
  if (!userId || !itemId) return null;
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from('user_entitlements')
    .select(
      'id, item_id, item_name, category, quantity_remaining, quantity_total, granted_at, expires_at, metadata',
    )
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('granted_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[getActiveEntitlement] error', error);
    return null;
  }

  const row = (data || [])[0] as ActiveEntitlement | undefined;
  if (!row) return null;

  // Quantity check (NULL = unlimited)
  if (row.quantity_remaining != null && row.quantity_remaining <= 0) {
    return null;
  }
  return row;
}

export async function hasActiveEntitlement(
  userId: string,
  itemId: string,
): Promise<boolean> {
  return (await getActiveEntitlement(userId, itemId)) != null;
}
