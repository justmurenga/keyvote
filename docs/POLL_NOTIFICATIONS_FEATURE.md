# Poll Notification Feature Implementation

## Overview
When an admin initiates a poll (creates it with 'active' or 'scheduled' status, or activates a draft poll), in-app notifications are automatically sent to all verified users within that poll's geographic region, encouraging them to take the poll.

## How It Works

### 1. **Geographic Targeting**
The system matches users' location to the poll's geographic scope:
- **National polls** (no region specified): Notify all verified users nationwide
- **County-level polls**: Notify users in that specific county
- **Constituency-level polls**: Notify users in that specific constituency  
- **Ward-level polls**: Notify users in that specific ward

### 2. **User Eligibility**
Notifications are sent to users who meet these criteria:
- Account is **verified** (`users.is_verified = TRUE`)
- Account is **active** (`users.is_active = TRUE`)
- User has not already been notified about this specific poll (tracked to prevent duplicates)

### 3. **Notification Content**
Each notification includes:
- **Title**: "New Poll: [Poll Title]"
- **Body**: "A new poll on [position] in your [region] is now open. Tap to vote!"
- **Action URL**: `/polls` (takes user to polls page)
- **Action Label**: "Vote Now"
- **Metadata**: Contains `poll_id`, `position`, and `region_level` for analytics

### 4. **When Notifications Are Sent**
Notifications are triggered in two scenarios:

#### Scenario A: Creating a new poll with immediate publication
```
Admin creates a poll with status = 'active' or 'scheduled'
→ Notifications sent immediately after poll creation
```

#### Scenario B: Activating a draft poll
```
Admin changes poll status from 'draft' → 'active' or 'scheduled'
→ Notifications sent immediately after status update
```

## Database Changes

### New Tables
- **`poll_notifications_sent`**: Tracks which users have been notified about each poll
  - Prevents duplicate notifications
  - Stores the notification_id for audit purposes
  - Unique constraint on (poll_id, user_id, notification_type)

### New Functions
- **`send_poll_initiation_notifications(p_poll_id, p_notification_type)`**: 
  - Core function that queries target users by geographic scope
  - Creates notifications in the notifications table
  - Tracks sent notifications to prevent duplicates
  - Returns count of users notified and notification IDs

- **`trigger_poll_notifications()`**: 
  - Trigger function that automatically calls `send_poll_initiation_notifications()`
  - Fires on INSERT or UPDATE of poll status
  - Only sends notifications when status transitions to 'active' or 'scheduled'

### New Indexes
- Index on `poll_notifications_sent(poll_id)` for quick lookups
- Index on `poll_notifications_sent(user_id)` for user history
- Index on notifications with poll_initiated type for analytics

## API Changes

### POST `/api/admin/polls`
When creating a poll, after successful insertion:
```typescript
if (requestedStatus === 'active' || requestedStatus === 'scheduled') {
  await adminDb.rpc('send_poll_initiation_notifications', {
    p_poll_id: poll.id,
    p_notification_type: 'poll_initiated',
  });
}
```

### PATCH `/api/admin/polls/[id]`
When updating poll status, after successful update:
```typescript
if ((status === 'active' || status === 'scheduled') && status !== existingPoll.status) {
  await adminDb.rpc('send_poll_initiation_notifications', {
    p_poll_id: id,
    p_notification_type: 'poll_initiated',
  });
}
```

## Migration
Database migration file: `0036_poll_notifications_on_initiate.sql`

This migration:
1. Creates the `poll_notifications_sent` tracking table
2. Defines the `send_poll_initiation_notifications()` function
3. Defines the `trigger_poll_notifications()` trigger
4. Creates necessary indexes
5. Is fully idempotent (safe to re-run)

## Implementation Files

### Modified Files
1. **`/apps/web/src/app/api/admin/polls/route.ts`**
   - Added `createAdminClient` import
   - Added notification trigger in POST handler

2. **`/apps/web/src/app/api/admin/polls/[id]/route.ts`**
   - Added `createAdminClient` import
   - Added notification trigger in PATCH handler when status changes

### New Files
1. **`/supabase/migrations/0036_poll_notifications_on_initiate.sql`**
   - Complete migration with all database changes

## Example Flow

### User Story: Admin Activates County-Level Poll
1. Admin navigates to admin polls page
2. Admin clicks "Activate Now" on a draft poll for a specific county
3. Frontend calls `PATCH /api/admin/polls/{pollId}` with `status: 'active'`
4. Backend:
   - Updates poll status to 'active'
   - Detects status change to 'active'
   - Calls `send_poll_initiation_notifications(pollId, 'poll_initiated')`
5. Database function:
   - Finds all verified, active users in that county
   - Excludes users already notified about this poll
   - Creates notifications for each user
   - Tracks notifications in `poll_notifications_sent`
6. Users receive in-app notifications encouraging them to vote

## Testing Checklist

- [ ] Create a test poll for a specific county
- [ ] Verify notifications appear for users in that county
- [ ] Verify notifications do NOT appear for users in other counties
- [ ] Activate a draft poll and verify new notifications are sent
- [ ] Re-activate the same poll and verify notifications are NOT duplicated
- [ ] Create a national poll and verify all verified users are notified
- [ ] Verify notification metadata is correct
- [ ] Check notification appears at correct time on mobile and web

## Future Enhancements

1. **Custom notification messages** - Allow admins to customize the notification text
2. **Notification scheduling** - Send notifications at specific times (e.g., peak hours)
3. **Notification preferences** - Respect user notification preferences from `user_preferences` table
4. **A/B testing** - Different notification messages to different user segments
5. **Notification analytics** - Track notification open rates, click-through rates
6. **Retargeting** - Re-notify users who haven't voted after a set time period
