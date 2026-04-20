import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET all settings (admin only)
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value');

    if (error) throw error;

    // Convert array of { key, value } into a single object
    const settings: Record<string, any> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - save settings (admin only)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // Update each settings category
    const updates = Object.entries(body).map(([key, value]) => {
      const row = { key, value: value as any, updated_at: new Date().toISOString() };
      return supabase
        .from('system_settings')
        .upsert(row, { onConflict: 'key' });
    });

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
