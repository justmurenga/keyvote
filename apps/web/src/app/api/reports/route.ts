import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUser } from '@/lib/auth/get-user';

// GET /api/reports — List agent reports
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const isAdmin = user.role === 'admin' || user.role === 'system_admin';

    let query = supabase
      .from('agent_reports')
      .select(`
        *,
        agents(id, users(full_name, phone)),
        reviewer:users!reviewed_by(full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!isAdmin) {
      // Candidate sees reports from their agents; agent sees own reports
      const { data: candidate } = await supabase.from('candidates').select('id').eq('user_id', user.id).single();
      if (candidate) {
        const { data: agentIds } = await supabase.from('agents').select('id').eq('candidate_id', candidate.id);
        const ids = (agentIds || []).map((a: any) => a.id);
        if (ids.length > 0) query = query.in('agent_id', ids);
        else return NextResponse.json({ reports: [], total: 0 });
      } else {
        query = query.eq('submitted_by', user.id);
      }
    }

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ reports: data || [], total: count || 0, page, limit });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/reports — Submit an activity report (agent)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { reportType, title, description, photos, latitude, longitude, locationName, peopleReached, activityDate } = body;

    if (!reportType || !title?.trim()) {
      return NextResponse.json({ error: 'reportType and title are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get agent record
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'You must be an active agent to submit reports' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('agent_reports')
      .insert({
        agent_id: agent.id,
        submitted_by: user.id,
        report_type: reportType,
        title: title.trim(),
        description: description || null,
        photos: photos || [],
        latitude: latitude || null,
        longitude: longitude || null,
        location_name: locationName || null,
        people_reached: peopleReached || 0,
        activity_date: activityDate || new Date().toISOString().split('T')[0],
      } as any)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ report: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/reports — Approve/reject report (candidate or admin)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { reportId, status: newStatus, reviewNotes } = body;

    if (!reportId || !['approved', 'rejected'].includes(newStatus)) {
      return NextResponse.json({ error: 'reportId and valid status required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('agent_reports')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', reportId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
