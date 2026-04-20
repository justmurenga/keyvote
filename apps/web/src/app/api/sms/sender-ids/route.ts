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
    const { candidateId, senderId, costPerSms, notes } = body;

    if (!candidateId || !senderId?.trim()) {
      return NextResponse.json({ error: 'candidateId and senderId are required' }, { status: 400 });
    }

    if (senderId.length > 11) {
      return NextResponse.json({ error: 'Sender ID must be max 11 characters' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('sms_sender_ids')
      .upsert({
        candidate_id: candidateId,
        sender_id: senderId.trim(),
        cost_per_sms: costPerSms || 1.0,
        is_active: true,
        is_approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        notes: notes || null,
      }, { onConflict: 'candidate_id,sender_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ senderId: data });
  } catch (error) {
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
