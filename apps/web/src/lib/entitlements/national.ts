/**
 * National-tier paywall helpers.
 *
 * Browsing presidential candidates, voting in / viewing national polls and
 * viewing presidential election results were historically free. The platform
 * now bills voters for accessing these high-demand "national" feeds via
 * 30-day subscription entitlements, while keeping them free for admins/staff.
 *
 * Item IDs (kept in sync with DEFAULT_BILLABLE_ITEMS):
 *   - national_candidates_access  → browse + follow presidential candidates
 *   - national_polls_access       → view + vote in national / presidential polls
 *   - national_results_access     → view national / presidential results
 */

import { NextResponse } from 'next/server';
import { hasActiveEntitlement } from '@/lib/entitlements';

export type NationalPaywallItemId =
  | 'national_candidates_access'
  | 'national_polls_access'
  | 'national_results_access';

const PAYWALL_META: Record<
  NationalPaywallItemId,
  { title: string; description: string; price: number; validity_days: number }
> = {
  national_candidates_access: {
    title: 'Access presidential & national candidates',
    description:
      'Unlock 30 days of access to browse and follow presidential / national-level candidates across Kenya.',
    price: 100,
    validity_days: 30,
  },
  national_polls_access: {
    title: 'Access national & presidential polls',
    description:
      'Unlock 30 days of access to view and vote in opinion polls scoped to the presidential / national race.',
    price: 100,
    validity_days: 30,
  },
  national_results_access: {
    title: 'View national & presidential results',
    description:
      'Unlock 30 days of access to presidential and other national-level election results and analytics.',
    price: 100,
    validity_days: 30,
  },
};

/**
 * Roles that should bypass the national paywall (internal staff & admins).
 */
const BYPASS_ROLES = new Set([
  'system_admin',
  'admin',
  'staff',
  // Candidates and party admins need to see their own race; they can still
  // be billed at the candidacy / nomination level. We let them through here
  // so they aren't blocked from operational dashboards.
  'candidate',
  'party_admin',
]);

export function bypassesNationalPaywall(role: string | null | undefined): boolean {
  return !!role && BYPASS_ROLES.has(role);
}

/**
 * Returns null if the user is allowed (admin/staff or holds an active
 * entitlement); otherwise returns a NextResponse with HTTP 402 and
 * standardized paywall payload that the client can render.
 */
export async function requireNationalEntitlement(
  userId: string,
  role: string | null | undefined,
  itemId: NationalPaywallItemId,
): Promise<NextResponse | null> {
  if (bypassesNationalPaywall(role)) return null;

  const allowed = await hasActiveEntitlement(userId, itemId);
  if (allowed) return null;

  const meta = PAYWALL_META[itemId];
  return NextResponse.json(
    {
      error: 'paywall',
      message: `${meta.title} is a paid feature.`,
      paywall: {
        itemId,
        title: meta.title,
        description: meta.description,
        price: meta.price,
        validity_days: meta.validity_days,
        topup_url: '/dashboard/wallet',
      },
    },
    { status: 402 },
  );
}

/**
 * Convenience: a poll is considered "national" if it targets the presidential
 * race OR has no county/constituency/ward scoping.
 */
export function isNationalPoll(poll: {
  position?: string | null;
  county_id?: string | null;
  constituency_id?: string | null;
  ward_id?: string | null;
}): boolean {
  if (poll.position === 'president') return true;
  return !poll.county_id && !poll.constituency_id && !poll.ward_id;
}
