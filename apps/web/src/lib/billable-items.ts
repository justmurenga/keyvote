/**
 * Billable Items Catalog
 * --------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for everything that costs money in
 * myVote. Every paywall / charge / SMS / entitlement route MUST
 * resolve its price through this module so that:
 *
 *   1. Voters always pay from the same wallet.
 *   2. Pricing is consistent across the app.
 *   3. Admin price changes (system_settings.billable_items)
 *      flow into every route automatically.
 *
 * Categories drive the wallet `transaction_type` enum:
 *    messaging     -> sms_charge
 *    subscription  -> subscription_charge
 *    content       -> poll_view_charge / result_view_charge
 *    services      -> sms_charge (generic; safe within enum)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { TransactionType } from '@myvote/database';

export interface BillableItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_active?: boolean;
  /** Roles allowed to purchase / view this item. Empty/undefined = all roles. */
  roles?: string[];
  /** Optional: number of units this purchase grants (default 1) */
  quantity?: number | null;
  /** Optional: validity in days (e.g. for subscriptions) */
  validity_days?: number | null;
  /** Optional: grace period in days after expiry. */
  grace_period_days?: number;
  /** Optional: human-readable terms / notes shown to the user. */
  terms?: string;
  auto_renew?: boolean;
  requires_approval?: boolean;
}

/**
 * Default catalog used when system_settings.billable_items has not
 * been seeded. Keep this list in sync with the admin UI defaults.
 */
export const DEFAULT_BILLABLE_ITEMS: BillableItem[] = [
  { id: 'sms', name: 'SMS Alert', price: 5, category: 'messaging', is_active: true, quantity: 1 },
  { id: 'whatsapp', name: 'WhatsApp Alert', price: 3, category: 'messaging', is_active: true, quantity: 1 },
  { id: 'poll_view', name: 'Poll Access', price: 10, category: 'content', is_active: true, quantity: 1 },
  { id: 'result_view', name: 'Election Results Access', price: 10, category: 'content', is_active: true, quantity: 1 },
  { id: 'subscription', name: 'Premium Subscription', price: 100, category: 'subscription', is_active: true, validity_days: 30 },
  { id: 'agent_registration', name: 'Agent Registration', price: 50, category: 'services', is_active: true, quantity: 1 },
  { id: 'candidate_profile', name: 'Candidate Profile Boost', price: 500, category: 'services', is_active: true, validity_days: 7 },
  { id: 'bulk_sms_10', name: 'Bulk SMS (10 pack)', price: 40, category: 'messaging', is_active: true, quantity: 10 },
  { id: 'bulk_sms_50', name: 'Bulk SMS (50 pack)', price: 175, category: 'messaging', is_active: true, quantity: 50 },
  { id: 'bulk_sms_100', name: 'Bulk SMS (100 pack)', price: 300, category: 'messaging', is_active: true, quantity: 100 },
  // ---- Voter "outside region" subscriptions (1 month) ----
  {
    id: 'outside_region_candidates',
    name: 'Candidates: Outside Region (30 days)',
    description:
      'Browse candidates from any county, constituency or ward in Kenya — not just your registered region. Valid for 30 days.',
    price: 100,
    category: 'subscription',
    is_active: true,
    validity_days: 30,
  },
  {
    id: 'outside_region_results',
    name: 'Results: Outside Region (30 days)',
    description:
      'View opinion poll results, election results and followership analytics for any region in Kenya. Valid for 30 days.',
    price: 100,
    category: 'subscription',
    is_active: true,
    validity_days: 30,
  },
  // ---- Voter "invite friends" SMS (per message) ----
  // NOTE: price is the unified per-SMS price (KES 1). Setting price to 0
  // here (or via system_settings.billable_items) means invites are free —
  // no wallet charge is required and the SMS is sent at no cost to the voter.
  {
    id: 'voter_invite_sms',
    name: 'Invite Friend SMS',
    description:
      'A single SMS sent from the system sender ID inviting a friend to follow your candidate.',
    price: 1,
    category: 'messaging',
    is_active: true,
    quantity: 1,
  },
  // ---- National / presidential tier (30-day subscriptions) ----
  {
    id: 'national_candidates_access',
    name: 'National Candidates Access (30 days)',
    description:
      'Browse and follow presidential / national-level candidates across Kenya. Valid for 30 days.',
    price: 100,
    category: 'subscription',
    is_active: true,
    validity_days: 30,
  },
  {
    id: 'national_polls_access',
    name: 'National Polls Access (30 days)',
    description:
      'View and vote in opinion polls scoped to the presidential / national race. Valid for 30 days.',
    price: 100,
    category: 'subscription',
    is_active: true,
    validity_days: 30,
  },
  {
    id: 'national_results_access',
    name: 'National Results Access (30 days)',
    description:
      'View presidential and other national-level election results and analytics. Valid for 30 days.',
    price: 100,
    category: 'subscription',
    is_active: true,
    validity_days: 30,
  },
];

/**
 * Load the live billable items catalog from system_settings,
 * falling back to DEFAULT_BILLABLE_ITEMS if it is missing.
 *
 * Admin-saved overrides are MERGED on top of the defaults (matched by id)
 * rather than replacing them, so removing the row in the admin UI never
 * accidentally takes a critical billable item (e.g. `voter_invite_sms`)
 * offline platform-wide.
 */
export async function getBillableItems(): Promise<BillableItem[]> {
  try {
    const adminClient = createAdminClient();
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'billable_items')
      .single();
    if (settings?.value && Array.isArray(settings.value)) {
      const overrides = settings.value as unknown as BillableItem[];
      if (overrides.length > 0) {
        const byId = new Map<string, BillableItem>();
        // Seed with defaults so anything the admin didn't override is still available.
        for (const item of DEFAULT_BILLABLE_ITEMS) byId.set(item.id, item);
        // Apply admin overrides (price, name, is_active, etc.) on top.
        for (const item of overrides) {
          if (item && typeof item.id === 'string') {
            byId.set(item.id, { ...byId.get(item.id), ...item } as BillableItem);
          }
        }
        return Array.from(byId.values());
      }
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_BILLABLE_ITEMS;
}

/**
 * Look up a single billable item by id. Returns null if missing or inactive.
 * Falls back to the default catalog if the live settings don't include the id,
 * so newly-introduced items work even before admins re-save settings.
 */
export async function findBillableItem(itemId: string): Promise<BillableItem | null> {
  const items = await getBillableItems();
  let item = items.find((i) => i.id === itemId && i.is_active !== false);
  if (!item) {
    const fallback = DEFAULT_BILLABLE_ITEMS.find(
      (i) => i.id === itemId && i.is_active !== false,
    );
    if (fallback) item = fallback;
  }
  return item || null;
}

/**
 * Map a billable item's category to the wallet transaction enum.
 * Every billable charge MUST go through this mapping so we don't end
 * up writing free-form `type` values into wallet_transactions.
 */
export function transactionTypeForItem(item: BillableItem): TransactionType {
  switch (item.category) {
    case 'messaging':
      return 'sms_charge';
    case 'subscription':
      return 'subscription_charge';
    case 'content':
      // Distinguish polls vs results when we can.
      if (item.id.startsWith('result')) return 'result_view_charge';
      if (item.id.startsWith('poll')) return 'poll_view_charge';
      return 'poll_view_charge';
    case 'services':
    default:
      // 'sms_charge' is the safest in-enum default for misc paid services
      // (anything not matching an explicit type). It will show up under
      // "SMS Alerts" in the wallet activity feed, which is acceptable
      // until a more granular enum value exists.
      return 'sms_charge';
  }
}
