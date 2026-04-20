import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/sms/airtouch';
import { verifyOTP as verifyStoredOTP, clearOTP } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
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

    // Verify OTP
    const verification = verifyStoredOTP(identifier, otp);
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

      let user: { id: string; phone: any; full_name: string; role: string; email: any } | null = existingUser;

      // If no user exists, auto-create one (seamless sign-up)
      if (!user) {
        console.log('[verify-otp] No user found, auto-creating account for:', identifier);

        const userEmail = isEmailBased ? identifier : `${identifier.replace('+', '')}@myvote.ke`;
        const userPhone = isEmailBased ? '' : identifier;

        // Create auth user in Supabase
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: userEmail,
          email_confirm: true,
          ...(userPhone ? { phone: userPhone, phone_confirm: true } : {}),
          user_metadata: {
            full_name: 'New User',
            ...(userPhone ? { phone: userPhone } : {}),
            email: userEmail,
          },
        });

        if (authError) {
          console.error('[verify-otp] Auth user creation error:', authError);
          return NextResponse.json(
            { error: 'Failed to create account. Please try again.' },
            { status: 500 }
          );
        }

        console.log('[verify-otp] Auth user created:', authUser.user.id);

        // Create user profile in users table
        const { error: profileError } = await (adminClient as any)
          .from('users')
          .insert({
            id: authUser.user.id,
            phone: userPhone || null,
            email: userEmail,
            full_name: 'New User',
            is_verified: true,
            role: 'voter',
          });

        if (profileError) {
          console.error('[verify-otp] Profile creation error:', profileError);
          // Rollback auth user if profile creation fails
          await adminClient.auth.admin.deleteUser(authUser.user.id);
          return NextResponse.json(
            { error: 'Failed to create user profile. Please try again.' },
            { status: 500 }
          );
        }

        console.log('[verify-otp] User profile created for:', identifier);

        user = {
          id: authUser.user.id,
          phone: userPhone,
          full_name: 'New User',
          role: 'voter',
          email: userEmail,
        };
      }

      // Update last login
      await (adminClient as any)
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Clear OTP after successful verification
      clearOTP(identifier);

      // Create session data
      const sessionData = {
        userId: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // Create response with session cookie
      const response = NextResponse.json({
        success: true,
        message: 'Login successful',
        user: user,
        isNewUser: !existingUser,
        redirectTo: !existingUser ? '/dashboard/settings' : '/dashboard',
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
