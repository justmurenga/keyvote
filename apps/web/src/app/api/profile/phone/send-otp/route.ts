import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendOTP, normalizePhoneNumber } from '@/lib/sms/airtouch';
import { storeOTP, isRateLimited, trackOTPRequest, resolveUserId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/profile/phone/send-otp
 * Send a one-time code to a phone number the signed-in user wants to add /
 * verify on their profile. Used from the dashboard "Account" tab so that
 * users who registered with email can complete the phone-verified portion of
 * their profile.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawPhone = (body as { phone?: string }).phone;
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const phoneRegex = /^\+254[17]\d{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid Kenyan phone number' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Make sure the phone isn't already attached to another account
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingUser && (existingUser as { id: string }).id !== userId) {
      return NextResponse.json(
        { error: 'This phone number is already linked to another account.' },
        { status: 409 }
      );
    }

    if (await isRateLimited(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in an hour.' },
        { status: 429 }
      );
    }

    const otp = generateOTP(6);
    await storeOTP(normalizedPhone, otp, 10);
    await trackOTPRequest(normalizedPhone);

    const result = await sendOTP(normalizedPhone, otp);
    if (!result.success) {
      console.error('[profile/phone/send-otp] Failed to send SMS:', result.error);
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      phone: normalizedPhone,
    });
  } catch (error) {
    console.error('[profile/phone/send-otp] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
