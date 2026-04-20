import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';
import { sendSMS, normalizePhoneNumber, calculateSMSCost } from '@/lib/sms/airtouch';

// POST /api/sms/send — Send a bulk SMS campaign
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { message, targetType, targetCountyId, targetConstituencyId, targetWardId, targetGender, targetAgeBracket, scheduledAt } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get candidate info + sender ID
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'You must be a candidate to send bulk SMS' }, { status: 403 });
    }

    // Get approved sender ID for this candidate
    const { data: senderConfig } = await supabase
      .from('sms_sender_ids')
      .select('sender_id, cost_per_sms')
      .eq('candidate_id', candidate.id)
      .eq('is_active', true)
      .eq('is_approved', true)
      .single();

    if (!senderConfig) {
      return NextResponse.json({ error: 'No approved sender ID found. Contact admin to set up your SMS sender ID.' }, { status: 403 });
    }

    // Build recipient query based on targeting
    let query = supabase
      .from('followers')
      .select('users!inner(id, phone)')
      .eq('candidate_id', candidate.id);

    // Apply targeting filters
    if (targetType === 'region') {
      if (targetWardId) {
        query = query.eq('users.ward_id', targetWardId);
      } else if (targetConstituencyId) {
        query = query.eq('users.constituency_id', targetConstituencyId);
      } else if (targetCountyId) {
        query = query.eq('users.county_id', targetCountyId);
      }
    }
    if (targetGender) {
      query = query.eq('users.gender', targetGender);
    }
    if (targetAgeBracket) {
      query = query.eq('users.age_bracket', targetAgeBracket);
    }

    // Check opt-outs
    const { data: optouts } = await supabase.from('sms_optouts').select('phone');
    const optoutSet = new Set((optouts || []).map((o: any) => o.phone));

    const { data: followers, error: followerErr } = await query;
    if (followerErr) {
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }

    const recipients = (followers || [])
      .map((f: any) => f.users?.phone)
      .filter((phone: string) => phone && !optoutSet.has(normalizePhoneNumber(phone)))
      .map((phone: string) => normalizePhoneNumber(phone));

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 });
    }

    const costPerSMS = senderConfig.cost_per_sms || 1.0;
    const totalCost = calculateSMSCost(recipients.length, costPerSMS);

    // Check wallet balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet || (wallet.balance ?? 0) < totalCost) {
      return NextResponse.json({
        error: `Insufficient wallet balance. Need KES ${totalCost.toFixed(2)}, have KES ${(wallet?.balance || 0).toFixed(2)}`,
      }, { status: 400 });
    }

    // Create campaign record
    const { data: campaign, error: campaignErr } = await supabase
      .from('sms_campaigns')
      .insert({
        sender_id: user.id,
        sender_id_name: senderConfig.sender_id,
        message,
        target_type: targetType || 'all_followers',
        target_county_id: targetCountyId || null,
        target_constituency_id: targetConstituencyId || null,
        target_ward_id: targetWardId || null,
        target_gender: targetGender || null,
        target_age_bracket: targetAgeBracket || null,
        scheduled_at: scheduledAt || null,
        total_recipients: recipients.length,
        cost_per_sms: costPerSMS,
        total_cost: totalCost,
        status: scheduledAt ? 'scheduled' : 'sending',
      })
      .select()
      .single();

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({ balance: (wallet.balance ?? 0) - totalCost })
      .eq('id', wallet.id);

    // Record wallet transaction
    await supabase.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'debit',
      amount: totalCost,
      description: `Bulk SMS campaign (${recipients.length} recipients)`,
      reference: campaign.id,
      status: 'completed',
    } as any);

    // Insert recipients
    const recipientRows = recipients.map((phone: string) => ({
      campaign_id: campaign.id,
      phone,
      status: 'pending',
    }));
    await supabase.from('sms_recipients').insert(recipientRows as any);

    // If not scheduled, send immediately
    if (!scheduledAt) {
      const result = await sendSMS({
        to: recipients,
        message,
        senderId: senderConfig.sender_id,
      });

      // Update campaign stats
      const sentCount = result.responses?.filter((r) => r.status === 'sent').length || 0;
      const failedCount = result.responses?.filter((r) => r.status === 'failed').length || 0;

      await supabase
        .from('sms_campaigns')
        .update({
          status: 'completed',
          sent_at: new Date().toISOString(),
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq('id', campaign.id);

      // Update individual recipient statuses
      if (result.responses) {
        for (const r of result.responses) {
          await supabase
            .from('sms_recipients')
            .update({
              status: r.status === 'sent' ? 'sent' : 'failed',
              sent_at: r.status === 'sent' ? new Date().toISOString() : null,
              failure_reason: r.error || null,
              at_message_id: r.messageId || null,
            })
            .eq('campaign_id', campaign.id)
            .eq('phone', r.phone);
        }
      }
    }

    return NextResponse.json({
      campaignId: campaign.id,
      recipientCount: recipients.length,
      totalCost,
      status: scheduledAt ? 'scheduled' : 'completed',
    });
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
