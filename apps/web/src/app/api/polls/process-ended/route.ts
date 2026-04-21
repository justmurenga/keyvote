import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/polls/process-ended
 *
 * Finds polls that are still marked `active` but whose `end_time` has
 * passed, marks them as `completed`, and pushes an in-app notification
 * to every voter who participated in each newly-closed poll so they
 * know the results are now available.
 *
 * This endpoint is designed to be safe to call repeatedly — both as a
 * scheduled cron job and opportunistically from the dashboard polls
 * page when a voter loads it.
 */
async function processEndedPolls() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Find expired-but-still-active polls
  const { data: expired, error } = await (admin
    .from('polls') as any)
    .select('id, title, end_time')
    .eq('status', 'active')
    .lt('end_time', nowIso)
    .limit(50);

  if (error) {
    console.error('[process-ended polls] fetch error:', error);
    return { processed: 0, notified: 0, error: error.message };
  }
  if (!expired || expired.length === 0) {
    return { processed: 0, notified: 0 };
  }

  let totalNotified = 0;
  const closedIds: string[] = [];

  for (const poll of expired) {
    // 2. Close the poll
    const { error: updErr } = await (admin
      .from('polls') as any)
      .update({ status: 'completed', updated_at: nowIso })
      .eq('id', poll.id)
      .eq('status', 'active'); // race-safe

    if (updErr) {
      console.error('[process-ended polls] close error:', poll.id, updErr);
      continue;
    }
    closedIds.push(poll.id);

    // 3. Notify all voters who participated
    const { data: voters } = await (admin
      .from('poll_votes') as any)
      .select('voter_id')
      .eq('poll_id', poll.id);

    const voterIds = Array.from(
      new Set((voters || []).map((v: any) => v.voter_id).filter(Boolean)),
    ) as string[];

    if (voterIds.length === 0) continue;

    // Skip duplicate notifications: only notify users who don't already
    // have a poll_ended notification for this poll.
    const { data: existing } = await (admin
      .from('notifications') as any)
      .select('user_id')
      .eq('type', 'poll_ended')
      .contains('metadata', { poll_id: poll.id });
    const alreadyNotified = new Set(
      (existing || []).map((r: any) => r.user_id),
    );

    const toInsert = voterIds
      .filter((uid) => !alreadyNotified.has(uid))
      .map((uid) => ({
        user_id: uid,
        type: 'poll_ended',
        title: 'Poll closed — results are in',
        body: `The opinion poll "${poll.title}" has just ended. Tap to see the final results.`,
        action_url: `/dashboard/polls`,
        action_label: 'View Results',
        metadata: {
          poll_id: poll.id,
          poll_title: poll.title,
          ended_at: poll.end_time,
        },
      }));

    if (toInsert.length > 0) {
      const { error: notifErr } = await (admin
        .from('notifications') as any)
        .insert(toInsert);
      if (notifErr) {
        console.error(
          '[process-ended polls] notify error:',
          poll.id,
          notifErr,
        );
      } else {
        totalNotified += toInsert.length;
      }
    }
  }

  return {
    processed: closedIds.length,
    notified: totalNotified,
    closedPollIds: closedIds,
  };
}

export async function POST() {
  try {
    const result = await processEndedPolls();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[process-ended polls] unexpected:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Allow GET as well so it can be hit by simple cron / browser
export async function GET() {
  return POST();
}
