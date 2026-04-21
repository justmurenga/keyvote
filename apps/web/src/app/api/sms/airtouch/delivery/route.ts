import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhoneNumber } from '@/lib/sms/airtouch';

/**
 * Airtouch Delivery Report (DLR) webhook.
 *
 * Configure Airtouch to POST delivery reports to:
 *   https://keyvote.online/api/sms/airtouch/delivery
 *   (or `${NEXT_PUBLIC_APP_URL}/api/sms/airtouch/delivery` in non-prod)
 *
 * Airtouch historically POSTs either JSON or form-urlencoded with fields
 * similar to (names vary by account):
 *   - msisdn / destination / phone
 *   - message_id / messageId / id
 *   - status / delivery_status / dlr_status
 *   - status_desc / reason / error
 *   - delivered_at / timestamp
 *
 * This handler is permissive: it normalizes the payload, matches the
 * recipient by message_id first (preferred) and falls back to phone within
 * the most recent campaign, then updates the corresponding sms_recipients
 * row and recomputes the parent campaign's delivered_count / failed_count.
 */

type Normalized = {
  messageId?: string;
  phone?: string;
  status?: string;
  reason?: string;
  timestamp?: string;
};

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return undefined;
}

function mapStatus(raw: string | undefined): 'delivered' | 'failed' | 'sent' | 'pending' | null {
  if (!raw) return null;
  const s = raw.toString().trim().toLowerCase();
  if (['delivrd', 'delivered', 'success', 'dlvrd', 'completed', '1'].includes(s)) return 'delivered';
  if (
    ['undeliv', 'undelivered', 'failed', 'expired', 'rejected', 'deleted', 'unknown', '0', '2', '4', '5', '8'].includes(
      s,
    )
  )
    return 'failed';
  if (['enroute', 'accepted', 'sent', 'submitted', 'pending'].includes(s)) return 'sent';
  // Airtouch numeric codes sometimes appear: 1000 = accepted
  if (s === '1000') return 'sent';
  return null;
}

function parseNormalized(raw: any): Normalized {
  // Some Airtouch deployments wrap in { data: {...} } or { dlr: {...} }
  const src = raw?.data ?? raw?.dlr ?? raw ?? {};
  return {
    messageId: firstString(
      src.message_id,
      src.messageId,
      src.messageID,
      src.id,
      src.msg_id,
      src.reference,
      src.external_id,
    ),
    phone: firstString(
      src.msisdn,
      src.destination,
      src.destination_addr,
      src.phone,
      src.to,
      src.recipient,
    ),
    status: firstString(
      src.status,
      src.delivery_status,
      src.dlr_status,
      src.state,
      src.status_code,
    ),
    reason: firstString(src.status_desc, src.reason, src.error, src.error_code, src.error_desc),
    timestamp: firstString(src.delivered_at, src.timestamp, src.done_date, src.date),
  };
}

async function readBody(request: NextRequest): Promise<any[]> {
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const json = await request.json();
      return Array.isArray(json) ? json : [json];
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData();
      const obj: Record<string, string> = {};
      form.forEach((v, k) => {
        obj[k] = typeof v === 'string' ? v : String(v);
      });
      return [obj];
    }

    // Fallback: try query string on the URL (some providers send GET-style DLR on POST)
    const text = await request.text();
    if (text) {
      try {
        const json = JSON.parse(text);
        return Array.isArray(json) ? json : [json];
      } catch {
        const params = new URLSearchParams(text);
        const obj: Record<string, string> = {};
        params.forEach((v, k) => (obj[k] = v));
        if (Object.keys(obj).length > 0) return [obj];
      }
    }
  } catch {
    // fall through
  }
  return [];
}

async function processOne(supabase: ReturnType<typeof createAdminClient>, raw: any) {
  const n = parseNormalized(raw);
  const mapped = mapStatus(n.status);
  if (!mapped) {
    return { ok: false, reason: 'Unknown status', input: n };
  }

  const phonePlus = n.phone ? normalizePhoneNumber(n.phone) : undefined;
  const phoneDigits = phonePlus?.replace(/^\+/, '');

  const nowIso = (() => {
    if (!n.timestamp) return new Date().toISOString();
    const d = new Date(n.timestamp);
    return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
  })();

  // Match primarily on at_message_id; fall back to phone on the most recent row
  let targetId: string | null = null;
  if (n.messageId) {
    const { data } = await supabase
      .from('sms_recipients')
      .select('id')
      .eq('at_message_id', n.messageId)
      .limit(1)
      .maybeSingle();
    if (data?.id) targetId = data.id;
  }

  if (!targetId && (phonePlus || phoneDigits)) {
    const candidates = [phonePlus, phoneDigits, n.phone].filter(Boolean) as string[];
    const { data } = await supabase
      .from('sms_recipients')
      .select('id, created_at')
      .in('phone', candidates)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id) targetId = data.id;
  }

  if (!targetId) {
    return { ok: false, reason: 'Recipient not found', input: n };
  }

  const updates: Record<string, unknown> = { status: mapped };
  if (mapped === 'delivered') updates.delivered_at = nowIso;
  if (mapped === 'sent') updates.sent_at = nowIso;
  if (mapped === 'failed') updates.failure_reason = n.reason || 'Delivery failed';

  const { data: updatedRow, error: updErr } = await (supabase.from('sms_recipients') as any)
    .update(updates)
    .eq('id', targetId)
    .select('id, campaign_id')
    .single();

  if (updErr || !updatedRow) {
    return { ok: false, reason: updErr?.message || 'Update failed' };
  }

  // Recompute the parent campaign aggregates so the dashboard stays accurate
  await recomputeCampaignCounts(supabase, updatedRow.campaign_id);

  return { ok: true, recipientId: updatedRow.id, status: mapped };
}

async function recomputeCampaignCounts(
  supabase: ReturnType<typeof createAdminClient>,
  campaignId: string,
) {
  const { data: rows } = await supabase
    .from('sms_recipients')
    .select('status')
    .eq('campaign_id', campaignId);

  const list = (rows || []) as { status: string }[];
  const delivered = list.filter((r) => r.status === 'delivered').length;
  const failed = list.filter((r) => r.status === 'failed').length;
  const sent = list.filter((r) => r.status === 'sent' || r.status === 'delivered').length;

  await (supabase.from('sms_campaigns') as any)
    .update({
      delivered_count: delivered,
      failed_count: failed,
      sent_count: sent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);
}

export async function POST(request: NextRequest) {
  try {
    // Optional shared-secret verification
    const expected = process.env.SMS_AIRTOUCH_DLR_SECRET;
    if (expected) {
      const provided =
        request.headers.get('x-airtouch-secret') ||
        request.headers.get('x-webhook-secret') ||
        new URL(request.url).searchParams.get('secret');
      if (provided !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payloads = await readBody(request);
    if (payloads.length === 0) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const results = [];
    for (const raw of payloads) {
      results.push(await processOne(supabase, raw));
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('[Airtouch DLR] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Some providers ping the callback URL with GET to verify it's reachable.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'myVote Airtouch DLR webhook',
    accepts: ['POST application/json', 'POST application/x-www-form-urlencoded'],
  });
}
