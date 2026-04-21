import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/sms/airtouch';
import { isPhoneVerified, clearOTP } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if phone was verified via OTP (persisted in Supabase)
    if (!(await isPhoneVerified(normalizedPhone))) {
      return NextResponse.json(
        { error: 'Phone number not verified. Please request a new code and verify before signing in.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if user exists
    const { data: existingUser, error: userError } = await adminClient
      .from('users')
      .select('id, phone, full_name, role, email')
      .eq('phone', normalizedPhone)
      .single() as { data: { id: string; phone: string; full_name: string; role: string; email: string | null } | null; error: any };

    if (!existingUser) {
      return NextResponse.json(
        { 
          error: 'No account found with this phone number',
          needsRegistration: true,
        },
        { status: 404 }
      );
    }

    // Use the user's stored email so legacy @myvote.ke accounts keep working
    // alongside new @keyvote.online synthetic emails.
    const email =
      existingUser.email || `${normalizedPhone.replace('+', '')}@keyvote.online`;

    // Generate a magic link for passwordless sign-in
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('Magic link error:', linkError);
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }

    // Extract token from the magic link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    // Update last login
    await (adminClient as any)
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', existingUser.id);

    // Clear OTP
    await clearOTP(normalizedPhone);

    // Return the magic link for client-side verification
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: existingUser,
      // Return token for client to exchange for session
      verificationToken: token,
      tokenType: type,
      email,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
