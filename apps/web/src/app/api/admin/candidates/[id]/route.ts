import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { hasPermission, PERMISSIONS, type Role } from '@/lib/auth/permissions';
import { notifyUser } from '@/lib/notifications';
import { generateCandidateApprovedEmailHTML } from '@/lib/email/templates/candidate-approved';

const POSITION_LABELS: Record<string, string> = {
  president: 'President',
  governor: 'Governor',
  senator: 'Senator',
  women_rep: "Women's Representative",
  mp: 'Member of Parliament',
  mca: 'Member of County Assembly',
};

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://myvote.ke';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(currentUser.role as Role, PERMISSIONS.CANDIDATES_EDIT)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const adminClient = createAdminClient();

    // Load existing record so we can detect transitions (e.g. unverified -> verified)
    const { data: existing } = await adminClient
      .from('candidates')
      .select(`
        id, user_id, position, is_verified, verification_status,
        user:users!candidates_user_id_fkey(full_name, phone, email),
        party:political_parties(name, abbreviation),
        county:counties(name),
        constituency:constituencies(name),
        ward:wards(name)
      `)
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    const updates: any = {};
    if (typeof body.is_verified === 'boolean') {
      updates.is_verified = body.is_verified;
      // Keep verification_status in sync so dashboards & emails stay accurate.
      updates.verification_status = body.is_verified ? 'verified' : 'rejected';
    }
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
    if (typeof body.verification_status === 'string') {
      updates.verification_status = body.verification_status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await (adminClient
      .from('candidates') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Candidate update error:', error);
      return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
    }

    // Detect "just approved" transition and notify the candidate via in-app + email + SMS.
    const wasVerified = !!(existing as any).is_verified;
    const nowVerified = updates.is_verified === true;
    if (!wasVerified && nowVerified) {
      try {
        const ex: any = existing;
        const candidateName: string = ex?.user?.full_name || 'Candidate';
        const phone: string | null = ex?.user?.phone || null;
        const email: string | null = ex?.user?.email || null;
        const positionLabel = POSITION_LABELS[ex.position] || ex.position;
        const regionLabel: string =
          ex?.county?.name || ex?.constituency?.name || ex?.ward?.name || 'National';
        const partyLabel: string = ex?.party?.name
          ? `${ex.party.name}${ex.party.abbreviation ? ` (${ex.party.abbreviation})` : ''}`
          : 'Independent';

        const dashboardUrl = `${APP_URL}/dashboard/candidate`;
        const inviteAgentsUrl = `${APP_URL}/dashboard/candidate/agents`;
        const publicProfileUrl = `${APP_URL}/candidates/${ex.id}`;

        const firstName = candidateName.split(' ')[0] || candidateName;
        const smsMessage =
          `myVote: Congrats ${firstName}! Your ${positionLabel} candidate ` +
          `profile is APPROVED. Start engaging voters, lobbying & inviting ` +
          `agents now: ${dashboardUrl}`;

        await notifyUser({
          user_id: ex.user_id,
          type: 'candidate_approved',
          title: '🎉 Your candidate profile is approved',
          body: `Congratulations! You're now a verified ${positionLabel} candidate. Start engaging voters, lobbying supporters and inviting campaign agents.`,
          action_url: '/dashboard/candidate',
          action_label: 'Open Candidate Dashboard',
          metadata: {
            candidate_id: ex.id,
            position: ex.position,
            region: regionLabel,
          },
          email: {
            to: email,
            subject: `✅ You're verified — start your campaign on myVote Kenya`,
            html: generateCandidateApprovedEmailHTML({
              candidateName,
              position: ex.position,
              regionLabel,
              partyLabel,
              dashboardUrl,
              inviteAgentsUrl,
              publicProfileUrl,
            }),
          },
          sms: phone ? { to: phone, message: smsMessage.slice(0, 320) } : undefined,
        });
      } catch (notifyErr) {
        console.error('[admin/candidates] approval notification failed:', notifyErr);
      }
    }

    return NextResponse.json({ candidate: data });
  } catch (error) {
    console.error('Admin candidate update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('candidates')
      .select(`
        *,
        user:users!candidates_user_id_fkey(full_name, phone, email, profile_photo_url, bio, gender, age_bracket, created_at),
        party:political_parties(id, name, abbreviation, symbol_url, primary_color, secondary_color),
        county:counties(name),
        constituency:constituencies(name),
        ward:wards(name)
      `)
      .eq('id', id)
      .single();

    if (error) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

    return NextResponse.json({ candidate: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
