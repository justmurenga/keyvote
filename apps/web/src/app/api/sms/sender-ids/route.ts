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

    // Preserve the case the admin typed; the SMS provider treats sender IDs
    // case-insensitively but we let users see / store mixed case if they want.
    const normalizedSenderId = senderId.trim();

    // Airtouch alphanumeric sender ID rules: starts with a letter, A-Z/a-z/0-9 only, 3–11 chars
    if (!/^[A-Za-z][A-Za-z0-9]{2,10}$/.test(normalizedSenderId)) {
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

    // Reject if another candidate already owns this sender ID actively (case-insensitive)
    const { data: conflict } = await supabase
      .from('sms_sender_ids')
      .select('id, candidate_id, sender_id')
      .ilike('sender_id', normalizedSenderId)
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

// PATCH /api/sms/sender-ids — Admin edits an existing sender ID record
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      senderId,
      costPerSms,
      notes,
      isActive,
    } = body as {
      id?: string;
      senderId?: string;
      costPerSms?: number | string;
      notes?: string | null;
      isActive?: boolean;
    };

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = createAdminClient();

    // Load existing record to get candidate_id for conflict checks
    const { data: existing, error: existingErr } = await supabase
      .from('sms_sender_ids')
      .select('id, candidate_id, sender_id')
      .eq('id', id)
      .single();

    if (existingErr || !existing) {
      return NextResponse.json({ error: 'Sender ID not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Sender ID string update
    if (typeof senderId === 'string') {
      const normalized = senderId.trim();
      if (!/^[A-Za-z][A-Za-z0-9]{2,10}$/.test(normalized)) {
        return NextResponse.json(
          {
            error:
              'Sender ID must be 3–11 characters, start with a letter, and contain only letters and digits.',
          },
          { status: 400 },
        );
      }

      if (normalized.toLowerCase() !== existing.sender_id.toLowerCase()) {
        // Conflict check: another candidate must not own it actively
        const { data: conflict } = await supabase
          .from('sms_sender_ids')
          .select('id, candidate_id')
          .ilike('sender_id', normalized)
          .eq('is_active', true)
          .eq('is_approved', true)
          .neq('id', id)
          .neq('candidate_id', existing.candidate_id)
          .limit(1);

        if (conflict && conflict.length > 0) {
          return NextResponse.json(
            {
              error: `Sender ID "${normalized}" is already actively assigned to another candidate.`,
            },
            { status: 409 },
          );
        }
      }

      updates.sender_id = normalized;
    }

    // Cost update
    if (costPerSms !== undefined) {
      const cost =
        typeof costPerSms === 'number' ? costPerSms : parseFloat(String(costPerSms));
      if (!Number.isFinite(cost) || cost < 0.5 || cost > 100) {
        return NextResponse.json(
          { error: 'Cost per SMS must be between 0.50 and 100.00 KES' },
          { status: 400 },
        );
      }
      updates.cost_per_sms = cost;
    }

    // Notes update (allow clearing)
    if (notes !== undefined) {
      updates.notes = notes === '' ? null : notes;
    }

    // Active toggle — when activating, also ensure approved
    if (typeof isActive === 'boolean') {
      updates.is_active = isActive;
      if (isActive) {
        updates.is_approved = true;
        updates.approved_by = user.id;
        updates.approved_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('sms_sender_ids')
      .update(updates)
      .eq('id', id)
      .select('*, candidates(id, users(full_name, phone))')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ senderId: data });
  } catch (error) {
    console.error('Sender ID update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sms/sender-ids — Admin deactivates (soft) or permanently removes a sender ID
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user || (user.role !== 'admin' && user.role !== 'system_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hard = searchParams.get('hard') === 'true';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = createAdminClient();

    if (hard) {
      const { error } = await supabase.from('sms_sender_ids').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, mode: 'deleted' });
    }

    const { error } = await supabase
      .from('sms_sender_ids')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, mode: 'deactivated' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
