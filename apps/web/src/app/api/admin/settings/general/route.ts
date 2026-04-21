import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET general settings
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'general')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ settings: data?.value || {} });
  } catch (error: any) {
    console.error('Failed to fetch general settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - update general settings (including social media)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // Get current settings
    const { data: currentData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'general')
      .single();

    // Merge with new settings
    const updatedValue = {
      ...(currentData?.value as Record<string, unknown> || {}),
      ...body,
    };

    // Upsert the updated settings
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'general',
        value: updatedValue,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true, settings: updatedValue });
  } catch (error: any) {
    console.error('Failed to save general settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
