import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getApiCurrentUser } from '@/lib/auth/get-user';
import { notifyAdmins, createInAppNotification } from '@/lib/notifications';
import { generateCandidatePendingApprovalEmailHTML } from '@/lib/email/templates/candidate-pending-approval';

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const currentUser = await getApiCurrentUser(supabase);

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only voters can apply to become candidates
    if (currentUser.role !== 'voter') {
      return NextResponse.json(
        { error: `You are already a ${currentUser.role}. Only voters can apply to become candidates.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      position,
      county_id,
      constituency_id,
      ward_id,
      party_id,
      is_independent,
      campaign_slogan,
      manifesto_text,
      facebook_url,
      twitter_url,
      instagram_url,
      tiktok_url,
      campaign_video_url,
    } = body;

    // Validate required fields
    if (!position) {
      return NextResponse.json({ error: 'Electoral position is required' }, { status: 400 });
    }

    const validPositions = ['president', 'governor', 'senator', 'women_rep', 'mp', 'mca'];
    if (!validPositions.includes(position)) {
      return NextResponse.json({ error: 'Invalid electoral position' }, { status: 400 });
    }

    // Validate region based on position
    if (['governor', 'senator', 'women_rep'].includes(position) && !county_id) {
      return NextResponse.json({ error: 'County is required for this position' }, { status: 400 });
    }
    if (position === 'mp' && !constituency_id) {
      return NextResponse.json({ error: 'Constituency is required for MP position' }, { status: 400 });
    }
    if (position === 'mca' && !ward_id) {
      return NextResponse.json({ error: 'Ward is required for MCA position' }, { status: 400 });
    }

    // Validate party or independent
    if (!is_independent && !party_id) {
      return NextResponse.json({ error: 'Please select a party or declare as independent' }, { status: 400 });
    }

    // Check if user already has a candidate profile
    const adminClient = createAdminClient();
    const { data: existingCandidate } = await adminClient
      .from('candidates')
      .select('id')
      .eq('user_id', currentUser.id)
      .single();

    if (existingCandidate) {
      return NextResponse.json(
        { error: 'You already have a candidate profile' },
        { status: 409 }
      );
    }

    // Build the candidate record
    const candidateData: Record<string, unknown> = {
      user_id: currentUser.id,
      position,
      is_independent: is_independent || false,
      campaign_slogan: campaign_slogan || null,
      manifesto_text: manifesto_text || null,
      facebook_url: facebook_url || null,
      twitter_url: twitter_url || null,
      instagram_url: instagram_url || null,
      tiktok_url: tiktok_url || null,
      campaign_video_url: campaign_video_url || null,
      is_verified: false,
      verification_status: 'pending',
      is_active: true,
    };

    // Set region fields based on position
    if (position === 'president') {
      candidateData.county_id = null;
      candidateData.constituency_id = null;
      candidateData.ward_id = null;
    } else if (['governor', 'senator', 'women_rep'].includes(position)) {
      candidateData.county_id = county_id;
      candidateData.constituency_id = null;
      candidateData.ward_id = null;
    } else if (position === 'mp') {
      candidateData.county_id = null;
      candidateData.constituency_id = constituency_id;
      candidateData.ward_id = null;
    } else if (position === 'mca') {
      candidateData.county_id = null;
      candidateData.constituency_id = null;
      candidateData.ward_id = ward_id;
    }

    // Set party
    if (!is_independent && party_id) {
      candidateData.party_id = party_id;
    } else {
      candidateData.party_id = null;
      candidateData.is_independent = true;
    }

    // Insert candidate record (trigger will update user role to 'candidate')
    const { data: candidate, error } = await (adminClient
      .from('candidates') as any)
      .insert(candidateData)
      .select(`
        *,
        user:users!candidates_user_id_fkey(full_name, phone, email, profile_photo_url),
        party:political_parties(id, name, abbreviation),
        county:counties(name),
        constituency:constituencies(name),
        ward:wards(name)
      `)
      .single();

    if (error) {
      console.error('Candidate creation error:', error);
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You already have a candidate profile' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create candidate profile. Please try again.' },
        { status: 500 }
      );
    }

    // ----- Notify admins (in-app + email) and confirm receipt to candidate -----
    try {
      const candidateName = candidate?.user?.full_name || 'A new candidate';
      const positionLabel = POSITION_LABELS[position] || position;
      const regionLabel =
        candidate?.county?.name ||
        candidate?.constituency?.name ||
        candidate?.ward?.name ||
        'National';
      const partyLabel = candidate?.party?.name
        ? `${candidate.party.name}${candidate.party.abbreviation ? ` (${candidate.party.abbreviation})` : ''}`
        : 'Independent';
      const reviewUrl = `${APP_URL}/dashboard/admin/candidates`;
      const appliedAt = new Date().toLocaleString('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Africa/Nairobi',
      });

      // Admin alerts (in-app to every admin + companion email)
      await notifyAdmins({
        type: 'candidate_pending_approval',
        title: 'Candidate awaiting approval',
        body: `${candidateName} applied for ${positionLabel} (${regionLabel}, ${partyLabel}). Review and verify.`,
        action_url: '/dashboard/admin/candidates',
        action_label: 'Review Candidate',
        metadata: {
          candidate_id: candidate.id,
          user_id: currentUser.id,
          position,
          region: regionLabel,
          party: partyLabel,
        },
        email: {
          subject: `Pending approval: ${candidateName} (${positionLabel})`,
          html: generateCandidatePendingApprovalEmailHTML({
            candidateName,
            candidatePhone: candidate?.user?.phone || null,
            candidateEmail: candidate?.user?.email || null,
            position,
            regionLabel,
            partyLabel,
            reviewUrl,
            appliedAt,
          }),
        },
      });

      // In-app receipt for the candidate themselves
      await createInAppNotification({
        user_id: currentUser.id,
        type: 'candidate_application_submitted',
        title: 'Application submitted',
        body: `Your candidate application for ${positionLabel} is under review. Add a verified email to receive an alert the moment you're approved.`,
        action_url: '/dashboard/candidate',
        action_label: 'Open Candidate Dashboard',
        metadata: { candidate_id: candidate.id },
      });
    } catch (notifyErr) {
      // Never fail the apply request just because notifications didn't go out.
      console.error('[candidates/apply] notification dispatch failed:', notifyErr);
    }

    return NextResponse.json(
      { candidate, message: 'Candidate profile created successfully! It will be reviewed by our admin team.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Candidate application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
