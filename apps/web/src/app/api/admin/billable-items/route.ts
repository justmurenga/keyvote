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

    // Validate items
    for (const item of items) {
      if (!item.id || !item.name || typeof item.price !== 'number' || item.price < 0) {
        return NextResponse.json({ error: `Invalid item: ${item.id || 'unknown'}` }, { status: 400 });
      }
    }

    // Upsert into system_settings
    const { error } = await adminClient
      .from('system_settings')
      .upsert({
        key: 'billable_items',
        value: items,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }, { onConflict: 'key' });

    if (error) {
      console.error('[BillableItems PUT] DB error:', error);
      return NextResponse.json({ error: 'Failed to save billable items' }, { status: 500 });
    }

    // Also update the wallet charge pricing to stay in sync
    const pricingMap: Record<string, number> = {};
    for (const item of items) {
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

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[BillableItems PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
