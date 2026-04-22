/**
 * GET /api/admin/pending-tasks
 *
 * Returns counts of items currently waiting on admin attention so the admin
 * dashboard banner can surface a quick "things you need to action" summary.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';

const ADMIN_ROLES = ['admin', 'system_admin', 'super_admin'];

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ADMIN_ROLES.includes(currentUser.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();

    const [
      candidatesPending,
      partiesPending,
      reportsPending,
      smsSenderIdsPending,
    ] = await Promise.all([
      admin
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .or('verification_status.eq.pending,is_verified.eq.false'),
      admin
        .from('political_parties')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'pending'),
      admin
        .from('agent_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      admin
        .from('sms_sender_ids')
        .select('id', { count: 'exact', head: true })
        .eq('is_approved', false),
    ]);

    const counts = {
      candidates: candidatesPending.count || 0,
      parties: partiesPending.count || 0,
      agentReports: reportsPending.count || 0,
      smsSenderIds: smsSenderIdsPending.count || 0,
    };
    const total =
      counts.candidates + counts.parties + counts.agentReports + counts.smsSenderIds;

    return NextResponse.json({ total, counts });
  } catch (error) {
    console.error('[admin/pending-tasks] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
