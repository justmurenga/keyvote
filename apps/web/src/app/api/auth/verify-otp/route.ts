import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/sms/airtouch';
import { verifyOTP as verifyStoredOTP, clearOTP } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMobileAccessToken } from '@/lib/auth/mobile-token';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, otp, action = 'login' } = body;

    console.log('[verify-otp] Received:', { phone, email, otp, action });

    // Must have either phone or email, plus OTP
    if ((!phone && !email) || !otp) {
      return NextResponse.json(
        { error: 'Phone/email and OTP are required' },
        { status: 400 }
      );
    }

    // Determine the identifier used for OTP lookup
    const identifier = email
      ? email.trim().toLowerCase()
      : normalizePhoneNumber(phone);
    const isEmailBased = !!email;

    console.log('[verify-otp] Identifier:', identifier, 'isEmailBased:', isEmailBased);

    // Verify OTP (persisted in Supabase)
    const verification = await verifyStoredOTP(identifier, otp);
    console.log('[verify-otp] Verification result:', verification);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    if (action === 'login') {
      // Check if user exists — search by email or phone
      let existingUser: { id: string; phone: string; full_name: string; role: string; email?: string } | null = null;

      if (isEmailBased) {
        const { data } = await adminClient
          .from('users')
          .select('id, phone, full_name, role, email')
          .eq('email', identifier)
          .single();
        existingUser = data as typeof existingUser;
      } else {
        const { data } = await adminClient
          .from('users')
          .select('id, phone, full_name, role, email')
          .eq('phone', identifier)
          .single();
        existingUser = data as typeof existingUser;
      }

      const user: { id: string; phone: any; full_name: string; role: string; email: any } | null = existingUser;

      // No silent auto-create on login. If account doesn't exist, tell the
      // client to send the user through registration.
      if (!user) {
        console.log('[verify-otp] No user found for login:', identifier);
        return NextResponse.json(
          {
            error: `No account found with this ${isEmailBased ? 'email address' : 'phone number'}. Please create an account first.`,
            needsRegistration: true,
          },
          { status: 404 }
        );
      }

      // Update last login
      const u = user as { id: string; phone: any; full_name: string; role: string; email: any };
      await (adminClient as any)
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', u.id);

      // Clear OTP after successful verification
      await clearOTP(identifier);

      // Create session data
      const sessionData = {
        userId: u.id,
        phone: u.phone,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // Mobile access token is optional — only used by the native app.
      // If MOBILE_API_TOKEN_SECRET / NEXTAUTH_SECRET isn't configured we
      // still want web login to succeed, so swallow the error here.
      let mobileAccessToken: string | null = null;
      try {
        mobileAccessToken = createMobileAccessToken(u.id, u.role);
      } catch (err) {
        console.warn('[verify-otp] Skipping mobile token (secret not set):', (err as Error).message);
      }

      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: u,
        mobileAccessToken,
        redirectTo: '/dashboard',
      });

      // Set session cookie
      response.cookies.set('myvote-session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/',
      });

      return response;
    }

    // For registration, just verify the OTP (user creation handled separately)
    return NextResponse.json({
      success: true,
      verified: true,
      phone: phone ? normalizePhoneNumber(phone) : undefined,
      email: email ? email.trim().toLowerCase() : undefined,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
