import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { normalizePhoneNumber } from '@/lib/sms/airtouch';
import { verifyOTP, clearOTP, resolveUserId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface SessionData {
  userId: string;
  phone: string;
  fullName: string;
  role: string;
  email?: string;
  expiresAt: number;
}

/**
 * POST /api/profile/phone/verify
 * Confirm the OTP sent by /api/profile/phone/send-otp and persist the verified
 * phone number on the user's profile (and Supabase auth user).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { phone: rawPhone, otp } = body as { phone?: string; otp?: string };

    if (!rawPhone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
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

    const verification = await verifyOTP(normalizedPhone, otp);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid verification code' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Re-check uniqueness after verifying (someone could have claimed it
    // between send-otp and verify).
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingUser && (existingUser as { id: string }).id !== userId) {
      await clearOTP(normalizedPhone);
      return NextResponse.json(
        { error: 'This phone number is already linked to another account.' },
        { status: 409 }
      );
    }

    // Persist on the users row
    const { error: updateError } = await (adminClient as any)
      .from('users')
      .update({
        phone: normalizedPhone,
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[profile/phone/verify] Profile update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to save phone number. Please try again.' },
        { status: 500 }
      );
    }

    // Best-effort sync with the Supabase auth user (so phone-based auth works
    // later). Failures here are non-fatal — the profile already has the phone.
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        phone: normalizedPhone,
        phone_confirm: true,
      });
    } catch (err) {
      console.warn(
        '[profile/phone/verify] Could not sync phone to auth user:',
        (err as Error).message
      );
    }

    await clearOTP(normalizedPhone);

    // Keep the OTP-based session cookie in sync if present.
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('myvote-session')?.value;
    if (sessionCookie) {
      try {
        const session: SessionData = JSON.parse(sessionCookie);
        if (session.phone !== normalizedPhone) {
          session.phone = normalizedPhone;
          const response = NextResponse.json({
            success: true,
            message: 'Phone number verified',
            phone: normalizedPhone,
          });
          response.cookies.set('myvote-session', JSON.stringify(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: Math.max(
              0,
              Math.floor((session.expiresAt - Date.now()) / 1000)
            ),
            path: '/',
          });
          return response;
        }
      } catch {
        // Invalid session cookie, ignore.
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number verified',
      phone: normalizedPhone,
    });
  } catch (error) {
    console.error('[profile/phone/verify] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
