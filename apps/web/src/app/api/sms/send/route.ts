import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';
import { sendSMS, calculateSMSCost, getSMSSegments, normalizePhoneNumber } from '@/lib/sms/airtouch';
import { getOrCreateWallet, debitWallet } from '@/lib/wallet';
import {
  fetchRecipients,
  applyMergeFields,
  hasMergeFields,
  type AudienceType,
  type CandidateScope,
  type RecipientRow,
} from '@/lib/sms/targeting';

// POST /api/sms/send — Send a bulk SMS campaign
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      message,
      audienceType = 'followers',
      targetType,
      targetCountyId,
      targetConstituencyId,
      targetWardId,
      targetPollingStationId,
      targetGender,
      targetAgeBracket,
      scheduledAt,
    } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: candidate } = await (supabase
      .from('candidates') as any)
      .select('id, user_id, position, county_id, constituency_id, ward_id')
      .eq('user_id', user.id)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'You must be a candidate to send bulk SMS' }, { status: 403 });
    }
    const candidateScope = candidate as CandidateScope;

    const { data: senderConfig } = await (supabase
      .from('sms_sender_ids') as any)
      .select('sender_id, cost_per_sms')
      .eq('candidate_id', candidateScope.id)
      .eq('is_active', true)
      .eq('is_approved', true)
      .single();

    if (!senderConfig) {
      return NextResponse.json(
        { error: 'No approved sender ID found. Contact admin to set up your SMS sender ID.' },
        { status: 403 },
      );
    }

    const audience: AudienceType = (audienceType as AudienceType) || 'followers';
    const recipients: RecipientRow[] = await fetchRecipients(supabase, candidateScope, {
      audienceType: audience,
      countyId: targetCountyId || null,
      constituencyId: targetConstituencyId || null,
      wardId: targetWardId || null,
      pollingStationId: targetPollingStationId || null,
      gender: targetGender || null,
      ageBracket: targetAgeBracket || null,
    });

    const phones = recipients.map((r) => r.phone).filter(Boolean) as string[];
    const { data: optouts } = await (supabase
      .from('sms_optouts') as any)
      .select('phone')
      .in('phone', phones);
    const optoutSet = new Set((optouts || []).map((o: any) => o.phone));
    const eligible = recipients.filter((r) => r.phone && !optoutSet.has(r.phone));

    if (eligible.length === 0) {
      return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 });
    }

    const costPerSMS = senderConfig.cost_per_sms || 1.0;
    const usesMergeFields = hasMergeFields(message);

    let totalSegments = 0;
    if (usesMergeFields) {
      for (const r of eligible) {
        totalSegments += getSMSSegments(applyMergeFields(message, r)).segments;
      }
    } else {
      totalSegments = eligible.length * getSMSSegments(message).segments;
    }
    const totalCost = calculateSMSCost(totalSegments, costPerSMS);

    // Use the unified wallet so this candidate's bulk-SMS spend is
    // debited from the same wallet as every other billable item in
    // myVote (top-ups, invites, results access, agent payments, ...).
    const wallet = (await getOrCreateWallet(user.id)) as {
      id: string;
      balance: number;
      is_frozen: boolean;
    };

    if (wallet.is_frozen) {
      return NextResponse.json(
        { error: 'Your wallet is frozen. Please contact support.' },
        { status: 403 },
      );
    }

    if ((wallet.balance ?? 0) < totalCost) {
      return NextResponse.json({
        error: `Insufficient wallet balance. Need KES ${totalCost.toFixed(2)}, have KES ${(wallet?.balance || 0).toFixed(2)}`,
      }, { status: 402 });
    }

    const { data: campaign, error: campaignErr } = await (supabase
      .from('sms_campaigns') as any)
      .insert({
        sender_id: user.id,
        sender_id_name: senderConfig.sender_id,
        message,
        target_type: targetType || audience,
        target_county_id: targetCountyId || null,
        target_constituency_id: targetConstituencyId || null,
        target_ward_id: targetWardId || null,
        target_gender: targetGender || null,
        target_age_bracket: targetAgeBracket || null,
        scheduled_at: scheduledAt || null,
        total_recipients: eligible.length,
        cost_per_sms: costPerSMS,
        total_cost: totalCost,
        status: scheduledAt ? 'scheduled' : 'sending',
      })
      .select()
      .single();

    if (campaignErr || !campaign) {
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    try {
      await debitWallet({
        walletId: wallet.id,
        type: 'sms_charge',
        amount: totalCost,
        description: `Bulk SMS campaign (${eligible.length} recipients)`,
        reference: campaign.id,
        metadata: {
          source: 'sms_campaign',
          campaign_id: campaign.id,
          candidate_id: candidateScope.id,
          recipients: eligible.length,
          segments: totalSegments,
          cost_per_sms: costPerSMS,
        },
      });
    } catch (chargeErr: any) {
      // Roll the campaign back so it isn't left in a 'sending' state
      // with no debit recorded against it.
      await (supabase.from('sms_campaigns') as any)
        .update({ status: 'failed', failure_reason: chargeErr?.message || 'Wallet debit failed' })
        .eq('id', campaign.id);
      return NextResponse.json(
        { error: chargeErr?.message || 'Failed to charge wallet for SMS campaign' },
        { status: 402 },
      );
    }

    const recipientRows = eligible.map((r) => ({
      campaign_id: campaign.id,
      user_id: r.user_id || null,
      phone: normalizePhoneNumber(r.phone!),
      status: 'pending',
    }));
    await (supabase.from('sms_recipients') as any).insert(recipientRows);

    if (!scheduledAt) {
      // Group recipients by their resolved (rendered) message so we can batch-send.
      const groups = new Map<string, RecipientRow[]>();
      for (const r of eligible) {
        const text = usesMergeFields ? applyMergeFields(message, r) : message;
        const arr = groups.get(text) || [];
        arr.push(r);
        groups.set(text, arr);
      }

      let totalSent = 0;
      let totalFailed = 0;

      for (const [text, group] of groups) {
        const result = await sendSMS({
          to: group.map((g) => g.phone!).filter(Boolean),
          message: text,
          senderId: senderConfig.sender_id,
        });

        const sent = result.responses?.filter((r) => r.status === 'sent').length || 0;
        const failed = result.responses?.filter((r) => r.status === 'failed').length || 0;
        totalSent += sent;
        totalFailed += failed;

        if (result.responses) {
          for (const r of result.responses) {
            // Match on both the normalized (+E.164) form and the digits-only
            // form — be defensive against historic rows inserted either way.
            const plus = normalizePhoneNumber(r.phone);
            const digits = plus.replace(/^\+/, '');
            await (supabase
              .from('sms_recipients') as any)
              .update({
                status: r.status === 'sent' ? 'sent' : 'failed',
                sent_at: r.status === 'sent' ? new Date().toISOString() : null,
                failure_reason: r.error || null,
                at_message_id: r.messageId || null,
              })
              .eq('campaign_id', campaign.id)
              .in('phone', [plus, digits, r.phone]);
          }
        }
      }

      await (supabase.from('sms_campaigns') as any)
        .update({
          status: 'completed',
          sent_at: new Date().toISOString(),
          sent_count: totalSent,
          failed_count: totalFailed,
        })
        .eq('id', campaign.id);
    }

    return NextResponse.json({
      campaignId: campaign.id,
      recipientCount: eligible.length,
      totalCost,
      personalized: usesMergeFields,
      status: scheduledAt ? 'scheduled' : 'completed',
    });
  } catch (error: any) {
    console.error('SMS send error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
