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

    // Reconcile stale 'pending' rows from historical campaigns where the
    // per-recipient update failed due to phone-format mismatch. Only applies
    // to completed campaigns that have a positive sent_count. We bring
    // pending rows up to 'sent' (bounded by sent_count) and the remainder to
    // 'failed' (bounded by failed_count), preserving already-resolved rows.
    const camp = campaign as {
      status: string;
      sent_count: number | null;
      failed_count: number | null;
      sent_at: string | null;
    };
    if (
      camp.status === 'completed' &&
      ((camp.sent_count || 0) > 0 || (camp.failed_count || 0) > 0)
    ) {
      const { data: pendingRows } = await supabase
        .from('sms_recipients')
        .select('id')
        .eq('campaign_id', id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      const pendingIds = (pendingRows || []).map((r: { id: string }) => r.id);
      if (pendingIds.length > 0) {
        const { data: alreadySent } = await supabase
          .from('sms_recipients')
          .select('id', { count: 'exact', head: false })
          .eq('campaign_id', id)
          .eq('status', 'sent');
        const { data: alreadyFailed } = await supabase
          .from('sms_recipients')
          .select('id', { count: 'exact', head: false })
          .eq('campaign_id', id)
          .eq('status', 'failed');
        const sentHave = (alreadySent || []).length;
        const failedHave = (alreadyFailed || []).length;

        const sentNeeded = Math.max(0, (camp.sent_count || 0) - sentHave);
        const failedNeeded = Math.max(0, (camp.failed_count || 0) - failedHave);

        const toSentIds = pendingIds.slice(0, sentNeeded);
        const toFailedIds = pendingIds.slice(sentNeeded, sentNeeded + failedNeeded);

        if (toSentIds.length > 0) {
          await (supabase.from('sms_recipients') as any)
            .update({
              status: 'sent',
              sent_at: camp.sent_at || new Date().toISOString(),
            })
            .in('id', toSentIds);
        }
        if (toFailedIds.length > 0) {
          await (supabase.from('sms_recipients') as any)
            .update({
              status: 'failed',
              failure_reason: 'Reconciled from campaign totals',
            })
            .in('id', toFailedIds);
        }
      }
    }

    // Full recipient list (resolve user names via user_id)
    const { data: recipients } = await supabase
      .from('sms_recipients')
      .select(
        'id, phone, status, sent_at, delivered_at, failure_reason, at_message_id, created_at, user_id'
      )
      .eq('campaign_id', id)
      .order('created_at', { ascending: true });

    const list = (recipients || []) as Array<{
      id: string;
      phone: string;
      status: string | null;
      sent_at: string | null;
      delivered_at: string | null;
      failure_reason: string | null;
      at_message_id: string | null;
      created_at: string | null;
      user_id: string | null;
    }>;

    const userIds = Array.from(
      new Set(list.map((r) => r.user_id).filter((v): v is string => Boolean(v))),
    );
    const userNameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      for (const u of (users || []) as Array<{ id: string; full_name: string | null }>) {
        if (u.full_name) userNameById.set(u.id, u.full_name);
      }
    }

    const flattened = list.map((r) => {
      return {
        id: r.id,
        phone: r.phone,
        full_name: (r.user_id ? userNameById.get(r.user_id) : null) || null,
        status: r.status || 'pending',
        sent_at: r.sent_at,
        delivered_at: r.delivered_at,
        failure_reason: r.failure_reason,
        at_message_id: r.at_message_id,
        created_at: r.created_at || new Date().toISOString(),
      };
    });

    // Fallback: for historical rows where user_id was not captured, try to
    // resolve the recipient's name by phone. Users may be stored with or
    // without the leading '+', so check both variants.
    const missing = flattened.filter((r) => !r.full_name && r.phone);
    if (missing.length > 0) {
      const phoneVariants = Array.from(
        new Set(
          missing.flatMap((r) => {
            const plus = r.phone.startsWith('+') ? r.phone : `+${r.phone}`;
            const digits = plus.replace(/^\+/, '');
            return [plus, digits, r.phone];
          }),
        ),
      );
      const { data: matchedUsers } = await supabase
        .from('users')
        .select('full_name, phone')
        .in('phone', phoneVariants);

      if (matchedUsers && matchedUsers.length > 0) {
        const byPhone = new Map<string, string>();
        for (const u of matchedUsers as Array<{ full_name: string | null; phone: string | null }>) {
          if (!u.phone || !u.full_name) continue;
          const plus = u.phone.startsWith('+') ? u.phone : `+${u.phone}`;
          const digits = plus.replace(/^\+/, '');
          byPhone.set(plus, u.full_name);
          byPhone.set(digits, u.full_name);
        }
        for (const r of flattened) {
          if (r.full_name) continue;
          const plus = r.phone.startsWith('+') ? r.phone : `+${r.phone}`;
          const digits = plus.replace(/^\+/, '');
          r.full_name = byPhone.get(plus) || byPhone.get(digits) || byPhone.get(r.phone) || null;
        }
      }
    }

    const stats = {
      total: flattened.length,
      sent: flattened.filter((r) => r.status === 'sent').length,
      delivered: flattened.filter((r) => r.status === 'delivered').length,
      failed: flattened.filter((r) => r.status === 'failed').length,
      pending: flattened.filter((r) => r.status === 'pending').length,
    };

    return NextResponse.json({ campaign, stats, recipients: flattened });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
