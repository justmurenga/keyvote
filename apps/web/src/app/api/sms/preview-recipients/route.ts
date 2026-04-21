import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';
import { fetchRecipients, getLockedScope, type AudienceType, type CandidateScope } from '@/lib/sms/targeting';
import { calculateSMSCost, getSMSSegments } from '@/lib/sms/airtouch';

/**
 * POST /api/sms/preview-recipients
 *
 * Body: {
 *   audienceType: 'followers' | 'voters' | 'agents',
 *   countyId?, constituencyId?, wardId?, pollingStationId?,
 *   gender?, ageBracket?,
 *   message?: string  // for cost & segment estimation
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const supabase = createAdminClient();

    const { data: candidate } = await (supabase
      .from('candidates') as any)
      .select('id, user_id, position, county_id, constituency_id, ward_id')
      .eq('user_id', user.id)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate profile required' }, { status: 403 });
    }

    const candidateScope = candidate as CandidateScope;
    const locked = getLockedScope(candidateScope);

    const audienceType: AudienceType = (body.audienceType as AudienceType) || 'followers';

    let recipients = [] as Awaited<ReturnType<typeof fetchRecipients>>;
    let queryError: string | null = null;
    try {
      recipients = await fetchRecipients(supabase, candidateScope, {
        audienceType,
        countyId: body.countyId || null,
        constituencyId: body.constituencyId || null,
        wardId: body.wardId || null,
        pollingStationId: body.pollingStationId || null,
        gender: body.gender || null,
        ageBracket: body.ageBracket || null,
      });
    } catch (e: any) {
      queryError = e.message;
    }

    // Filter out opted-out numbers from estimate
    let count = recipients.length;
    if (count > 0) {
      const phones = recipients.map((r) => r.phone).filter(Boolean) as string[];
      const { data: optouts } = await (supabase
        .from('sms_optouts') as any)
        .select('phone')
        .in('phone', phones);
      const optoutSet = new Set((optouts || []).map((o: any) => o.phone));
      count = recipients.filter((r) => r.phone && !optoutSet.has(r.phone)).length;
    }

    // Get sender cost
    const { data: senderConfig } = await (supabase
      .from('sms_sender_ids') as any)
      .select('cost_per_sms')
      .eq('candidate_id', candidateScope.id)
      .eq('is_active', true)
      .eq('is_approved', true)
      .maybeSingle();

    const costPerSMS = senderConfig?.cost_per_sms || 1.0;
    const segInfo = body.message ? getSMSSegments(String(body.message)) : { segments: 1, characters: 0, remaining: 160 };
    const totalCost = calculateSMSCost(count, costPerSMS) * (segInfo.segments || 1);

    return NextResponse.json({
      count,
      costPerSMS,
      segments: segInfo.segments,
      totalCost,
      candidate: {
        position: candidateScope.position,
        county_id: candidateScope.county_id,
        constituency_id: candidateScope.constituency_id,
        ward_id: candidateScope.ward_id,
      },
      lockedScope: locked,
      sample: recipients.slice(0, 5).map((r) => ({
        full_name: r.full_name,
        phone: r.phone,
        county: r.county_name,
        constituency: r.constituency_name,
        ward: r.ward_name,
        polling_station: r.polling_station_name,
      })),
      error: queryError,
    });
  } catch (e: any) {
    console.error('SMS preview error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
