import { NextRequest, NextResponse } from 'next/server';
import { sendOTPEmail, isValidEmail } from '@/lib/email';
import { generateOTP } from '@/lib/sms/airtouch';
import { storeOTP, isRateLimited, trackOTPRequest, resolveUserId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/profile/email/send-otp
 * Send a one-time code to an email address the signed-in user wants to add /
 * verify on their profile.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawEmail = (body as { email?: string }).email;
    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail) || normalizedEmail.endsWith('@myvote.ke') || normalizedEmail.endsWith('@keyvote.online')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Make sure the email isn't already attached to another account
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser && (existingUser as { id: string }).id !== userId) {
      return NextResponse.json(
        { error: 'This email address is already linked to another account.' },
        { status: 409 }
      );
    }

    if (await isRateLimited(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in an hour.' },
        { status: 429 }
      );
    }

    const otp = generateOTP(6);
    await storeOTP(normalizedEmail, otp, 10);
    await trackOTPRequest(normalizedEmail);

    const result = await sendOTPEmail(normalizedEmail, otp);
    if (!result.success) {
      console.error('[profile/email/send-otp] Failed to send email:', result.error);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('[profile/email/send-otp] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
