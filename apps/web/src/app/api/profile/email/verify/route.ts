import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidEmail } from '@/lib/email';
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
 * POST /api/profile/email/verify
 * Confirm the OTP sent by /api/profile/email/send-otp and persist the verified
 * email on the user's profile (and Supabase auth user).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { email: rawEmail, otp } = body as { email?: string; otp?: string };

    if (!rawEmail || !otp) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
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

    const verification = await verifyOTP(normalizedEmail, otp);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid verification code' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Re-check uniqueness after verifying
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser && (existingUser as { id: string }).id !== userId) {
      await clearOTP(normalizedEmail);
      return NextResponse.json(
        { error: 'This email address is already linked to another account.' },
        { status: 409 }
      );
    }

    // Persist on the users row
    const { error: updateError } = await (adminClient as any)
      .from('users')
      .update({
        email: normalizedEmail,
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[profile/email/verify] Profile update failed:', updateError);
      return NextResponse.json(
        { error: 'Failed to save email. Please try again.' },
        { status: 500 }
      );
    }

    // Best-effort sync with the Supabase auth user.
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        email: normalizedEmail,
        email_confirm: true,
      });
    } catch (err) {
      console.warn(
        '[profile/email/verify] Could not sync email to auth user:',
        (err as Error).message
      );
    }

    await clearOTP(normalizedEmail);

    // Keep the OTP-based session cookie in sync if present.
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('myvote-session')?.value;
    if (sessionCookie) {
      try {
        const session: SessionData = JSON.parse(sessionCookie);
        if (session.email !== normalizedEmail) {
          session.email = normalizedEmail;
          const response = NextResponse.json({
            success: true,
            message: 'Email verified',
            email: normalizedEmail,
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
      message: 'Email verified',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('[profile/email/verify] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
