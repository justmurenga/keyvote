import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

// Default billable items (used as fallback)
const DEFAULT_BILLABLE_ITEMS = [
  { id: 'sms', name: 'SMS Alert', description: 'Send an SMS notification to a user', price: 5, category: 'messaging', is_active: true },
  { id: 'whatsapp', name: 'WhatsApp Alert', description: 'Send a WhatsApp notification to a user', price: 3, category: 'messaging', is_active: true },
  { id: 'poll_view', name: 'Poll Access', description: 'Access to view and participate in a poll', price: 10, category: 'content', is_active: true },
  { id: 'result_view', name: 'Election Results Access', description: 'Access to view detailed election results', price: 10, category: 'content', is_active: true },
  { id: 'subscription', name: 'Premium Subscription', description: 'Monthly premium subscription with all features', price: 100, category: 'subscription', is_active: true },
  { id: 'agent_registration', name: 'Agent Registration', description: 'Register as an election agent for a candidate', price: 50, category: 'services', is_active: true },
  { id: 'candidate_profile', name: 'Candidate Profile Boost', description: 'Boost candidate profile visibility for 7 days', price: 500, category: 'services', is_active: true },
  { id: 'bulk_sms_10', name: 'Bulk SMS (10 pack)', description: 'Send 10 SMS messages at a discounted rate', price: 40, category: 'messaging', is_active: true },
  { id: 'bulk_sms_50', name: 'Bulk SMS (50 pack)', description: 'Send 50 SMS messages at a discounted rate', price: 175, category: 'messaging', is_active: true },
  { id: 'bulk_sms_100', name: 'Bulk SMS (100 pack)', description: 'Send 100 SMS messages at a discounted rate', price: 300, category: 'messaging', is_active: true },
  // ---- National / presidential tier (30-day subscriptions) ----
  { id: 'national_candidates_access', name: 'National Candidates Access (30 days)', description: 'Browse and follow presidential / national-level candidates for 30 days.', price: 100, category: 'subscription', is_active: true },
  { id: 'national_polls_access', name: 'National Polls Access (30 days)', description: 'View and vote in opinion polls scoped to the presidential / national race for 30 days.', price: 100, category: 'subscription', is_active: true },
  { id: 'national_results_access', name: 'National Results Access (30 days)', description: 'View presidential and other national-level election results and analytics for 30 days.', price: 100, category: 'subscription', is_active: true },
];

/**
 * GET /api/admin/billable-items - Get all billable items with pricing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check if user is admin
    const { data: user } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || !user.role || !['admin', 'system_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Try to get billable items from system_settings
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'billable_items')
      .single();

    const items = settings?.value || DEFAULT_BILLABLE_ITEMS;

    return NextResponse.json({ 
      success: true, 
      items,
      categories: ['messaging', 'content', 'subscription', 'services'],
    });
  } catch (error) {
    console.error('[BillableItems GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/billable-items - Update billable items and pricing
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check if user is admin
    const { data: user } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user || !user.role || !['admin', 'system_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Items must be an array' }, { status: 400 });
    }

    const ALLOWED_ROLES = [
      'voter',
      'candidate',
      'agent',
      'party_admin',
      'system_admin',
    ];

    // Validate + normalize items
    const normalized = [] as any[];
    for (const raw of items) {
      if (!raw.id || !raw.name || typeof raw.price !== 'number' || raw.price < 0) {
        return NextResponse.json(
          { error: `Invalid item: ${raw.id || 'unknown'}` },
          { status: 400 },
        );
      }

      // Allowed roles — default to all roles if not provided
      let roles: string[] = Array.isArray(raw.roles) ? raw.roles : ALLOWED_ROLES;
      roles = roles.filter((r: any) => ALLOWED_ROLES.includes(r));
      if (roles.length === 0) roles = ALLOWED_ROLES;

      const intOr = (v: any, fallback: number | null) => {
        const n = typeof v === 'number' ? v : parseInt(String(v ?? ''));
        return Number.isFinite(n) && n >= 0 ? n : fallback;
      };

      normalized.push({
        id: String(raw.id),
        name: String(raw.name),
        description: raw.description || '',
        price: Number(raw.price),
        category: raw.category || 'services',
        is_active: raw.is_active !== false,
        // NEW — access control
        roles,
        // NEW — prepaid pool sizing
        quantity: intOr(raw.quantity, null), // null = unlimited / time-bound
        // NEW — lifecycle
        validity_days: intOr(raw.validity_days ?? raw.duration_days, null),
        grace_period_days: intOr(raw.grace_period_days, 0) ?? 0,
        auto_renew: !!raw.auto_renew,
        requires_approval: !!raw.requires_approval,
        // NEW — terms text shown to user before purchase
        terms: raw.terms ? String(raw.terms) : '',
      });
    }

    // Upsert into system_settings
    const { error } = await adminClient
      .from('system_settings')
      .upsert({
        key: 'billable_items',
        value: normalized,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }, { onConflict: 'key' });

    if (error) {
      console.error('[BillableItems PUT] DB error:', error);
      return NextResponse.json({ error: 'Failed to save billable items' }, { status: 500 });
    }

    // Also update the wallet charge pricing to stay in sync
    const pricingMap: Record<string, number> = {};
    for (const item of normalized) {
      pricingMap[item.id] = item.price;
    }

    await adminClient
      .from('system_settings')
      .upsert({
        key: 'service_pricing',
        value: pricingMap,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }, { onConflict: 'key' });

    return NextResponse.json({ success: true, items: normalized });
  } catch (error) {
    console.error('[BillableItems PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
