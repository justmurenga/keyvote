import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

// GET /api/sms/sender-ids — List sender IDs (admin: all, candidate: own)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const isAdmin = user.role === 'admin' || user.role === 'system_admin';

    let query = supabase
      .from('sms_sender_ids')
      .select('*, candidates(id, users(full_name, phone))')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      // Candidate can only see their own
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!candidate) return NextResponse.json({ senderIds: [] });
      query = query.eq('candidate_id', candidate.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ senderIds: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/sms/sender-ids — Admin creates/assigns sender ID to candidate
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { candidateId, senderId, costPerSms, notes, deactivatePrevious } = body as {
      candidateId?: string;
      senderId?: string;
      costPerSms?: number;
      notes?: string | null;
      deactivatePrevious?: boolean;
    };

    if (!candidateId || !senderId?.trim()) {
      return NextResponse.json({ error: 'candidateId and senderId are required' }, { status: 400 });
    }

    const normalizedSenderId = senderId.trim().toUpperCase();

    // Airtouch alphanumeric sender ID rules: starts with a letter, A-Z/0-9 only, 3–11 chars
    if (!/^[A-Z][A-Z0-9]{2,10}$/.test(normalizedSenderId)) {
      return NextResponse.json(
        {
          error:
            'Sender ID must be 3–11 characters, start with a letter, and contain only letters and digits.',
        },
        { status: 400 },
      );
    }

    const cost = typeof costPerSms === 'number' ? costPerSms : parseFloat(String(costPerSms ?? '1'));
    if (!Number.isFinite(cost) || cost < 0.5 || cost > 100) {
      return NextResponse.json(
        { error: 'Cost per SMS must be between 0.50 and 100.00 KES' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify candidate exists
    const { data: candidate, error: candErr } = await supabase
      .from('candidates')
      .select('id, is_active, user_id, users:users!candidates_user_id_fkey(full_name)')
      .eq('id', candidateId)
      .single();

    if (candErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    if (!candidate.is_active) {
      return NextResponse.json(
        { error: 'Candidate is inactive. Activate the candidate before assigning a sender ID.' },
        { status: 400 },
      );
    }

    // Reject if another candidate already owns this sender ID actively
    const { data: conflict } = await supabase
      .from('sms_sender_ids')
      .select('id, candidate_id')
      .eq('sender_id', normalizedSenderId)
      .eq('is_active', true)
      .eq('is_approved', true)
      .neq('candidate_id', candidateId)
      .limit(1);

    if (conflict && conflict.length > 0) {
      return NextResponse.json(
        { error: `Sender ID "${normalizedSenderId}" is already actively assigned to another candidate.` },
        { status: 409 },
      );
    }

    // Optionally deactivate this candidate's previous active sender IDs
    if (deactivatePrevious !== false) {
      await supabase
        .from('sms_sender_ids')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('candidate_id', candidateId)
        .neq('sender_id', normalizedSenderId);
    }

    const { data, error } = await supabase
      .from('sms_sender_ids')
      .upsert(
        {
          candidate_id: candidateId,
          sender_id: normalizedSenderId,
          cost_per_sms: cost,
          is_active: true,
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes: notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'candidate_id,sender_id' },
      )
      .select('*, candidates(id, users(full_name, phone))')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ senderId: data });
  } catch (error) {
    console.error('Sender ID create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sms/sender-ids — Admin deactivates a sender ID
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = createAdminClient();
    await supabase.from('sms_sender_ids').update({ is_active: false }).eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
