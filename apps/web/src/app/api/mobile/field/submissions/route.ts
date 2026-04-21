import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveMobileUserId } from '@/lib/auth/mobile-user';
import type { ElectoralPosition } from '@myvote/database';

interface SubmissionTally {
  candidate_id?: string;
  candidate_name?: string;
  votes: number;
}

interface SubmissionPayload {
  polling_station_code: string;
  position: string;
  official_form_reference: string;
  announced_at?: string;
  evidence_url: string;
  notes?: string;
  tallies: SubmissionTally[];
}

const ELECTORAL_POSITIONS: ElectoralPosition[] = [
  'president',
  'governor',
  'senator',
  'women_rep',
  'mp',
  'mca',
];

function toSubmissionStatus(isVerified: boolean, verificationNotes?: string | null) {
  if (isVerified) return 'approved';
  if (verificationNotes?.toLowerCase().startsWith('[rejected]')) return 'rejected';
  if (verificationNotes) return 'flagged';
  return 'submitted';
}

async function resolveCandidateId(
  adminClient: ReturnType<typeof createAdminClient>,
  position: ElectoralPosition,
  tally: SubmissionTally
): Promise<string | null> {
  if (tally.candidate_id) {
    return tally.candidate_id;
  }

  if (!tally.candidate_name) {
    return null;
  }

  const { data: users } = await adminClient
    .from('users')
    .select('id')
    .ilike('full_name', `%${tally.candidate_name}%`)
    .limit(1);

  const userId = users?.[0]?.id;
  if (!userId) {
    return null;
  }

  const { data: candidate } = await adminClient
    .from('candidates')
    .select('id')
    .eq('user_id', userId)
    .eq('position', position)
    .single();

  return candidate?.id || null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveMobileUserId(request, supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('election_result_submissions')
      .select(`
        id,
        position,
        submitted_at,
        is_verified,
        verified_at,
        verification_notes,
        result_sheet_url,
        polling_station:polling_station_id(code)
      `)
      .eq('submitted_by', userId)
      .order('submitted_at', { ascending: false })
      .limit(80);

    if (error) {
      throw error;
    }

    const submissions = (data || []).map((row: any) => ({
      status: toSubmissionStatus(row.is_verified, row.verification_notes),
      id: row.id,
      assignment_id: null,
      polling_station_code: row.polling_station?.code || 'N/A',
      position: row.position,
      official_form_reference: '',
      evidence_url: row.result_sheet_url || '',
      announced_at: row.submitted_at,
      reviewer_comments: row.verification_notes || null,
      timeline: [
        {
          status: 'submitted',
          at: row.submitted_at,
          comment: null,
        },
        ...(row.verification_notes
          ? [
              {
                status: toSubmissionStatus(row.is_verified, row.verification_notes),
                at: row.verified_at || row.submitted_at,
                comment: row.verification_notes,
              },
            ]
          : []),
      ],
      created_at: row.submitted_at,
    }));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Mobile field submissions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveMobileUserId(request, supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SubmissionPayload;

    if (
      !body.polling_station_code ||
      !body.position ||
      !body.official_form_reference ||
      !body.evidence_url ||
      !Array.isArray(body.tallies) ||
      body.tallies.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required submission fields' },
        { status: 400 }
      );
    }

    if (!ELECTORAL_POSITIONS.includes(body.position as ElectoralPosition)) {
      return NextResponse.json(
        { error: 'Invalid position provided' },
        { status: 400 }
      );
    }

    const position = body.position as ElectoralPosition;

    const adminClient = createAdminClient();

    const { data: station } = await adminClient
      .from('polling_stations')
      .select('id, code')
      .eq('code', body.polling_station_code)
      .limit(1)
      .single();

    if (!station?.id) {
      return NextResponse.json(
        { error: 'Polling station not found for code provided' },
        { status: 404 }
      );
    }

    const rowsToInsert: Array<{
      polling_station_id: string;
      position: ElectoralPosition;
      candidate_id: string;
      votes: number;
      submitted_by: string;
      submitted_at: string;
      result_sheet_url: string;
      submission_source: string;
    }> = [];

    for (const tally of body.tallies) {
      if (typeof tally.votes !== 'number' || tally.votes < 0) {
        continue;
      }

      const candidateId = await resolveCandidateId(adminClient, position, tally);
      if (!candidateId) {
        continue;
      }

      rowsToInsert.push({
        polling_station_id: station.id,
        position,
        candidate_id: candidateId,
        votes: tally.votes,
        submitted_by: userId,
        submitted_at: body.announced_at || new Date().toISOString(),
        result_sheet_url: body.evidence_url,
        submission_source: 'android',
      });
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        { error: 'No valid candidate tallies could be resolved' },
        { status: 400 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('election_result_submissions')
      .insert(rowsToInsert)
      .select('id, submitted_at');

    if (insertError) {
      throw insertError;
    }

    await adminClient.from('result_sheets').insert({
      polling_station_id: station.id,
      position,
      image_url: body.evidence_url,
      uploaded_by: userId,
      uploaded_at: body.announced_at || new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Polling station result submitted',
      submissionCount: inserted?.length || 0,
      submissionIds: (inserted || []).map((row) => row.id),
    });
  } catch (error) {
    console.error('Mobile field submissions POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit polling station result' },
      { status: 500 }
    );
  }
}
