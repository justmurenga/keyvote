import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

// GET /api/sms/campaigns/[id] — Get campaign details with recipient stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: campaign, error } = await supabase
      .from('sms_campaigns')
      .select('*')
      .eq('id', id)
      .eq('sender_id', user.id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get recipient breakdown
    const { data: recipientStats } = await supabase
      .from('sms_recipients')
      .select('status')
      .eq('campaign_id', id);

    const stats = {
      total: recipientStats?.length || 0,
      sent: recipientStats?.filter((r: any) => r.status === 'sent').length || 0,
      delivered: recipientStats?.filter((r: any) => r.status === 'delivered').length || 0,
      failed: recipientStats?.filter((r: any) => r.status === 'failed').length || 0,
      pending: recipientStats?.filter((r: any) => r.status === 'pending').length || 0,
    };

    return NextResponse.json({ campaign, stats });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
