import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth/get-user';
import { chargeWalletForItem } from '@/lib/wallet';
import { findBillableItem } from '@/lib/billable-items';
import { sendSMS, normalizePhoneNumber } from '@/lib/sms/airtouch';

/** Billable item id used for voter "invite friend" SMS. Single source of truth
 *  for pricing lives in `system_settings.billable_items` (admin-managed) /
 *  `lib/billable-items.ts` (defaults). */
const INVITE_ITEM_ID = 'voter_invite_sms';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://myvote.ke';
const INVITE_SENDER_ID =
  process.env.SMS_INVITE_SENDER_ID || process.env.SMS_AIRTOUCH_SENDER_ID || 'myVote';
const MAX_PHONES_PER_REQUEST = 25;

/**
 * POST /api/following/invite
 *
 * Body: {
 *   candidateId: string,         // who they're inviting friends to follow
 *   phones: string[],            // recipient phone numbers
 *   personalMessage?: string,    // optional short note to prepend
 * }
 *
 * Charges the voter's wallet PER_SMS_PRICE per recipient and sends one SMS
 * each via the system default sender ID inviting the friend to download
 * myVote, sign up / log in, and follow the candidate.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const candidateId: string = body?.candidateId;
    const personalMessage: string = (body?.personalMessage || '').toString().trim().slice(0, 80);
    const rawPhones: unknown = body?.phones;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }
    if (!Array.isArray(rawPhones) || rawPhones.length === 0) {
      return NextResponse.json(
        { error: 'phones must be a non-empty array' },
        { status: 400 },
      );
    }

    // Normalize + dedupe phone numbers
    const phoneSet = new Set<string>();
    for (const raw of rawPhones) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      try {
        const normalized = normalizePhoneNumber(trimmed);
        if (normalized && /^\+254\d{9}$/.test(normalized)) {
          phoneSet.add(normalized);
        }
      } catch {
        // ignore invalid number
      }
    }
    const phones = Array.from(phoneSet).slice(0, MAX_PHONES_PER_REQUEST);
    if (phones.length === 0) {
      return NextResponse.json(
        { error: 'No valid Kenyan phone numbers provided' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Look up the candidate + the inviting voter for personalisation
    const { data: cand } = await admin
      .from('candidates')
      .select('id, position, user:users(full_name)')
      .eq('id', candidateId)
      .single() as { data: { id: string; position: string; user: { full_name: string | null } | null } | null; error: any };
    if (!cand) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    const candidateName = cand.user?.full_name || 'a candidate';

    const { data: me } = await admin
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single() as { data: { full_name: string | null } | null; error: any };
    const myName = me?.full_name || 'A friend';

    // Filter out anyone who has opted out of SMS
    const { data: optouts } = await admin
      .from('sms_optouts')
      .select('phone')
      .in('phone', phones) as { data: Array<{ phone: string }> | null; error: any };
    const optoutSet = new Set((optouts || []).map((o) => o.phone));
    const eligiblePhones = phones.filter((p) => !optoutSet.has(p));
    if (eligiblePhones.length === 0) {
      return NextResponse.json(
        { error: 'All recipients have opted out of SMS.' },
        { status: 400 },
      );
    }

    // Check + charge wallet via the unified billable-items pipeline so
    // every voter payment (candidates, results, invites, follows, ...)
    // flows through the same wallet with consistent pricing.
    const inviteItem = await findBillableItem(INVITE_ITEM_ID);
    if (!inviteItem) {
      return NextResponse.json(
        { error: 'Invite SMS billing not configured. Please try again later.' },
        { status: 503 },
      );
    }
    const perSmsPrice = Number(inviteItem.price);
    const totalCost = eligiblePhones.length * perSmsPrice;

    let transactionId: string;
    try {
      const result = await chargeWalletForItem(userId, INVITE_ITEM_ID, {
        quantity: eligiblePhones.length,
        description: `Invite friends to follow ${candidateName} (${eligiblePhones.length} SMS)`,
        reference: `invite-${candidateId}-${Date.now()}`,
        metadata: {
          source: 'follow_invite',
          candidate_id: candidateId,
          recipients: eligiblePhones.length,
        },
        // SMS is delivered immediately by this route, no need to grant
        // a re-usable entitlement on top of the charge.
        grantEntitlement: false,
      });
      transactionId = result.transactionId;
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_FUNDS') {
        return NextResponse.json(
          {
            error: 'Insufficient wallet balance',
            required: err.required ?? totalCost,
            available: err.available ?? 0,
            per_sms: perSmsPrice,
            recipients: eligiblePhones.length,
          },
          { status: 402 },
        );
      }
      if (err?.message === 'Wallet is frozen') {
        return NextResponse.json({ error: 'Wallet is frozen' }, { status: 403 });
      }
      throw err;
    }

    // Build the SMS body
    const link = `${APP_URL.replace(/\/$/, '')}/auth/login?follow=${candidateId}`;
    const intro = personalMessage
      ? `${personalMessage} `
      : '';
    const message =
      `${intro}${myName} is inviting you to follow ${candidateName} on myVote. ` +
      `Sign up or log in here: ${link} . Reply STOP to opt out.`;

    // Send the SMS via the system sender ID
    const result = await sendSMS({
      to: eligiblePhones,
      message,
      senderId: INVITE_SENDER_ID,
    });

    const sent =
      result.responses?.filter((r) => r.status === 'sent').length || 0;
    const failed =
      result.responses?.filter((r) => r.status === 'failed').length || 0;

    // Best-effort log of the invite for analytics
    try {
      const logRows = eligiblePhones.map((phone) => {
        const r = (result.responses || []).find(
          (x) => normalizePhoneNumber(x.phone) === phone,
        );
        return {
          inviter_id: userId,
          candidate_id: candidateId,
          phone,
          status: r?.status || 'queued',
          message_id: r?.messageId || null,
          error: r?.error || null,
        };
      });
      await (admin.from('follow_invites') as any).insert(logRows);
    } catch {
      /* table may not exist yet — non-fatal */
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      charged: totalCost,
      transactionId,
      perSms: perSmsPrice,
      recipients: eligiblePhones.length,
    });
  } catch (err) {
    console.error('[follow/invite] error', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
