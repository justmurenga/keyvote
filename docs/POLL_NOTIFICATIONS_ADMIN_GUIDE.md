# Poll Notifications - Quick Reference for Admins

## What Happens When You Create a Poll

When you create or activate a poll on the admin dashboard:

1. **Choose poll scope** (optional):
   - Leave blank for **national poll** → All verified users notified
   - Select **county** → Only users in that county notified
   - Select **constituency** → Only users in that constituency notified
   - Select **ward** → Only users in that ward notified

2. **Set status**:
   - `Draft` → No notifications sent
   - `Scheduled` → Notifications sent immediately ✓
   - `Active` → Notifications sent immediately ✓

3. **Users receive in-app notification**:
   - Title: "New Poll: [Your Poll Title]"
   - Message: "A new poll on [position] in your [region] is now open. Tap to vote!"
   - Action button: "Vote Now" (takes them to polls page)

## Example Scenarios

### Scenario 1: National Poll on Presidential Race
```
Admin creates:
- Title: "Who would you vote for as President?"
- Position: President
- Region: (left blank for national)
- Status: Active

Result: ALL verified users nationwide receive notification
```

### Scenario 2: County-Level Poll for Governor
```
Admin creates:
- Title: "Governor Race - Nairobi County"
- Position: Governor
- Region: Nairobi County
- Status: Scheduled (scheduled to start later)

Result: ONLY verified users in Nairobi County receive notification
        when the poll transitions to active
```

### Scenario 3: Activating a Draft Poll
```
Admin has draft poll on MP race for Westlands constituency
Admin clicks "Activate Now"

Result: Notifications sent to all verified users in Westlands
        Users are encouraged to vote before poll ends
```

## Features

### ✓ Smart Targeting
- Users only see polls relevant to their region
- Reduces notification fatigue
- Improves voting engagement

### ✓ No Duplicates
- Users won't receive multiple notifications for the same poll
- System tracks who's already been notified

### ✓ Verified Users Only
- Only active, verified accounts receive notifications
- Ensures notifications reach real users

### ✓ Context-Aware Messages
- Messages mention the specific region where relevant
- National polls mention nationwide scope

## Best Practices

1. **Schedule in advance**: Create polls with "Scheduled" status to notify users when you're ready
2. **Regional targeting**: Use regional polls to encourage local participation
3. **Clear titles**: Use descriptive poll titles so users understand what they're voting on
4. **Timing**: Consider timing polls during peak hours for better engagement
5. **Follow-up**: Consider re-running polls in different regions to build comprehensive feedback

## Troubleshooting

### "Users aren't getting notifications"
- Check that poll status is "Active" or "Scheduled"
- Verify users have verified accounts (`is_verified = TRUE`)
- Check that users are in the correct region
- Ensure notification preferences allow poll notifications

### "Too many notifications sent"
- This shouldn't happen - duplicates are prevented
- If it does, check poll_notifications_sent table for history

### "Wrong users were notified"
- Verify poll region settings were correct
- Check users' registered locations match the poll region

## Notification Appearance

### Mobile (Push Notification)
```
┌─────────────────────────────┐
│ My Vote                     │
├─────────────────────────────┤
│ New Poll: Who would you     │
│ vote for as President?      │
│                             │
│ A new poll on president     │
│ nationwide is now open.     │
│ Tap to vote!                │
│                             │
│  [Vote Now]                 │
└─────────────────────────────┘
```

### Web (In-App Notification)
```
Notification Icon
└─ New Poll: Who would you vote for as President?
   A new poll on president nationwide is now open. 
   Tap to vote!
   [Vote Now]
```

## Feedback & Support

For questions about poll notifications, contact the development team or check `docs/POLL_NOTIFICATIONS_FEATURE.md` for technical details.
