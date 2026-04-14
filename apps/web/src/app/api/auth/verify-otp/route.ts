import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/sms/africastalking';
import { verifyOTP as verifyStoredOTP, clearOTP } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, action = 'login' } = body;

    console.log('[verify-otp] Received:', { phone, otp, action });

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);
    console.log('[verify-otp] Normalized phone:', normalizedPhone);

    // Verify OTP
    const verification = verifyStoredOTP(normalizedPhone, otp);
    console.log('[verify-otp] Verification result:', verification);

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    if (action === 'login') {
      // Check if user exists
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id, phone, full_name, role')
        .eq('phone', normalizedPhone)
        .single() as { data: { id: string; phone: string; full_name: string; role: string } | null; error: any };

      let user = existingUser;

      // If no user exists, auto-create one (seamless sign-up via phone)
      if (!user) {
        console.log('[verify-otp] No user found, auto-creating account for:', normalizedPhone);

        const email = `${normalizedPhone.replace('+', '')}@myvote.ke`;

        // Create auth user in Supabase
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          phone: normalizedPhone,
          phone_confirm: true,
          user_metadata: {
            full_name: 'New User',
            phone: normalizedPhone,
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
            phone: normalizedPhone,
            email,
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

        console.log('[verify-otp] User profile created for:', normalizedPhone);

        user = {
          id: authUser.user.id,
          phone: normalizedPhone,
          full_name: 'New User',
          role: 'voter',
        };
      }

      // Update last login
      await (adminClient as any)
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Clear OTP after successful verification
      clearOTP(normalizedPhone);

      // Create session data
      const sessionData = {
        userId: user.id,
        phone: user.phone,
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
      phone: normalizedPhone,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
