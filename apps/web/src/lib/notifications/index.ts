/**
 * Centralized helpers for creating in-app notifications and dispatching
 * companion email / SMS alerts. Keeps notification semantics consistent
 * across the app (candidate approvals, agent invitations, etc.).
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, isValidEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms/airtouch';

export type AdminRole = 'admin' | 'system_admin' | 'super_admin';

export const ADMIN_ROLES: AdminRole[] = ['admin', 'system_admin', 'super_admin'];

export interface InAppNotificationInput {
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a single in-app notification. Errors are logged but not thrown so the
 * caller's primary flow is never broken by a notification failure.
 */
export async function createInAppNotification(input: InAppNotificationInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await (admin.from('notifications') as any).insert({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body,
      action_url: input.action_url ?? null,
      action_label: input.action_label ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error('[notifications] createInAppNotification failed:', err);
  }
}

/**
 * Bulk-insert in-app notifications (one row per user_id).
 */
export async function createInAppNotifications(
  userIds: string[],
  notification: Omit<InAppNotificationInput, 'user_id'>,
): Promise<void> {
  if (!userIds.length) return;
  try {
    const admin = createAdminClient();
    const rows = userIds.map((uid) => ({
      user_id: uid,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      action_url: notification.action_url ?? null,
      action_label: notification.action_label ?? null,
      metadata: notification.metadata ?? {},
    }));
    await (admin.from('notifications') as any).insert(rows);
  } catch (err) {
    console.error('[notifications] createInAppNotifications failed:', err);
  }
}

export interface AdminContact {
  id: string;
  email: string | null;
  full_name: string | null;
}

/**
 * Look up active admin / system_admin / super_admin users along with their
 * email addresses (for sending companion emails).
 */
export async function getAdminContacts(): Promise<AdminContact[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('users')
      .select('id, email, full_name, role, is_active')
      .in('role', ADMIN_ROLES);
    const rows = (data || []) as Array<{
      id: string;
      email: string | null;
      full_name: string | null;
      role: string | null;
      is_active: boolean | null;
    }>;
    return rows
      .filter((r) => r.is_active !== false)
      .map((r) => ({ id: r.id, email: r.email, full_name: r.full_name }));
  } catch (err) {
    console.error('[notifications] getAdminContacts failed:', err);
    return [];
  }
}

export interface NotifyAdminsInput {
  type: string;
  title: string;
  body: string;
  action_url?: string | null;
  action_label?: string | null;
  metadata?: Record<string, unknown>;
  email?: {
    subject: string;
    html: string;
  };
}

/**
 * Notify all platform admins via in-app notifications, and (optionally)
 * deliver a companion email to each admin's mailbox.
 */
export async function notifyAdmins(input: NotifyAdminsInput): Promise<{
  inAppCount: number;
  emailsSent: number;
  emailErrors: number;
}> {
  const admins = await getAdminContacts();
  if (!admins.length) {
    return { inAppCount: 0, emailsSent: 0, emailErrors: 0 };
  }

  await createInAppNotifications(
    admins.map((a) => a.id),
    {
      type: input.type,
      title: input.title,
      body: input.body,
      action_url: input.action_url ?? null,
      action_label: input.action_label ?? null,
      metadata: input.metadata ?? {},
    },
  );

  let emailsSent = 0;
  let emailErrors = 0;
  if (input.email) {
    const recipients = admins
      .map((a) => a.email)
      .filter((e): e is string => !!e && isValidEmail(e));
    if (recipients.length) {
      try {
        const res = await sendEmail({
          to: recipients,
          subject: input.email.subject,
          html: input.email.html,
        });
        if (res.success) emailsSent = recipients.length;
        else emailErrors = recipients.length;
      } catch (err) {
        console.error('[notifications] notifyAdmins email failed:', err);
        emailErrors = recipients.length;
      }
    }
  }

  return { inAppCount: admins.length, emailsSent, emailErrors };
}

export interface NotifyUserInput extends InAppNotificationInput {
  email?: {
    to: string | null | undefined;
    subject: string;
    html: string;
  };
  sms?: {
    to: string | null | undefined;
    message: string;
    senderId?: string;
  };
}

/**
 * Multichannel notification for a single user (in-app + optional email + SMS).
 * Returns delivery status per channel; never throws.
 */
export async function notifyUser(input: NotifyUserInput): Promise<{
  inApp: boolean;
  email: boolean;
  sms: boolean;
  errors: Record<string, string>;
}> {
  const errors: Record<string, string> = {};
  let inApp = false;
  let email = false;
  let sms = false;

  // In-app
  try {
    await createInAppNotification(input);
    inApp = true;
  } catch (err) {
    errors.inApp = err instanceof Error ? err.message : 'in-app failed';
  }

  // Email
  if (input.email && input.email.to && isValidEmail(input.email.to)) {
    try {
      const res = await sendEmail({
        to: input.email.to,
        subject: input.email.subject,
        html: input.email.html,
      });
      email = !!res.success;
      if (!res.success && res.error) errors.email = res.error;
    } catch (err) {
      errors.email = err instanceof Error ? err.message : 'email failed';
    }
  }

  // SMS
  if (input.sms && input.sms.to) {
    try {
      const res = await sendSMS({
        to: input.sms.to,
        message: input.sms.message,
        senderId: input.sms.senderId,
      });
      sms = !!res.success;
      if (!res.success && res.error) errors.sms = res.error;
    } catch (err) {
      errors.sms = err instanceof Error ? err.message : 'sms failed';
    }
  }

  return { inApp, email, sms, errors };
}
