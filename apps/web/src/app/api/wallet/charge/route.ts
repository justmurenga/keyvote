import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { getOrCreateWallet, chargeForService } from '@/lib/wallet';

// Default service pricing (fallback if not configured in system_settings)
const DEFAULT_SERVICE_PRICING: Record<string, { amount: number; description: string }> = {
  sms: { amount: 5, description: 'SMS Alert' },
  whatsapp: { amount: 3, description: 'WhatsApp Alert' },
  poll_view: { amount: 10, description: 'Poll Access' },
  result_view: { amount: 10, description: 'Election Results Access' },
  subscription: { amount: 100, description: 'Premium Subscription' },
};

// Load dynamic pricing from system_settings
async function getServicePricing(): Promise<Record<string, { amount: number; description: string }>> {
  try {
    const adminClient = createAdminClient();
    const { data: settings } = await adminClient
      .from('system_settings')
      .select('value')
      .eq('key', 'billable_items')
      .single();

    if (settings?.value && Array.isArray(settings.value)) {
      const pricing: Record<string, { amount: number; description: string }> = {};
      for (const item of settings.value) {
        if (item.is_active) {
          pricing[item.id] = { amount: item.price, description: item.name };
        }
      }
      return Object.keys(pricing).length > 0 ? pricing : DEFAULT_SERVICE_PRICING;
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_SERVICE_PRICING;
}

/**
 * POST /api/wallet/charge - Charge wallet for a service
 * 
 * Request body:
 * - serviceType: Type of service (sms, whatsapp, poll_view, result_view, subscription)
 * - reference: Optional reference for the charge
 * - customDescription: Optional custom description
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { serviceType, reference, customDescription } = body;

    // Load dynamic pricing
    const SERVICE_PRICING = await getServicePricing();

    // Validate service type
    if (!serviceType || !SERVICE_PRICING[serviceType]) {
      return NextResponse.json(
        { 
          error: 'Invalid service type',
          validTypes: Object.keys(SERVICE_PRICING),
        },
        { status: 400 }
      );
    }

    const wallet = await getOrCreateWallet(userId) as { 
      id: string; 
      balance: number; 
      is_frozen: boolean;
    };

    if (wallet.is_frozen) {
      return NextResponse.json(
        { error: 'Your wallet is frozen. Please contact support.' },
        { status: 403 }
      );
    }

    const pricing = SERVICE_PRICING[serviceType];
    const description = customDescription || pricing.description;

    // Check balance before attempting charge
    if ((wallet.balance || 0) < pricing.amount) {
      return NextResponse.json(
        { 
          error: 'Insufficient wallet balance',
          required: pricing.amount,
          available: wallet.balance || 0,
          shortfall: pricing.amount - (wallet.balance || 0),
        },
        { status: 402 }
      );
    }

    // Charge the wallet
    const result = await chargeForService(
      wallet.id,
      serviceType as 'sms' | 'whatsapp' | 'poll_view' | 'result_view' | 'subscription',
      description,
      reference
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      charged: pricing.amount,
      service: serviceType,
      description,
    });

  } catch (error) {
    console.error('[Charge] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/charge - Get service pricing
 */
export async function GET() {
  const SERVICE_PRICING = await getServicePricing();
  return NextResponse.json({
    success: true,
    pricing: Object.entries(SERVICE_PRICING).map(([type, info]) => ({
      type,
      amount: info.amount,
      description: info.description,
      currency: 'KES',
    })),
  });
}
