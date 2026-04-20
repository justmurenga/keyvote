import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET public settings (contact info for sidebar, etc.) — no auth required
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'general')
      .single();

    if (error) throw error;

    // Only expose safe public fields
    const settings = (data?.value ?? {}) as Record<string, string>;
    const { supportPhone, ussdCode, supportEmail, siteName } = settings;

    return NextResponse.json({
      supportPhone: supportPhone || '+254 700 000 000',
      ussdCode: ussdCode || '*123#',
      supportEmail: supportEmail || 'support@myvote.co.ke',
      siteName: siteName || 'myVote Kenya',
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Failed to fetch public settings:', error);
    // Return defaults on error so the sidebar never breaks
    return NextResponse.json({
      supportPhone: '+254 700 000 000',
      ussdCode: '*123#',
      supportEmail: 'support@myvote.co.ke',
      siteName: 'myVote Kenya',
    });
  }
}
