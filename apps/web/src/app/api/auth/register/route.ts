import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/sms/africastalking';
import { isPhoneVerified, clearOTP } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phone, 
      idNumber, 
      firstName, 
      lastName,
      pollingStationId,
    } = body;

    // Validate required fields
    if (!phone || !idNumber || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check if phone was verified via OTP
    if (!isPhoneVerified(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Phone number not verified. Please verify your phone first.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this phone number already exists' },
        { status: 409 }
      );
    }

    // Check if ID number is already registered
    const { data: existingIdUser } = await adminClient
      .from('users')
      .select('id')
      .eq('id_number', idNumber)
      .single();

    if (existingIdUser) {
      return NextResponse.json(
        { error: 'This ID number is already registered' },
        { status: 409 }
      );
    }

    // Create email from phone (workaround for Supabase phone auth)
    const email = `${normalizedPhone.replace('+', '')}@myvote.ke`;
    const fullName = `${firstName} ${lastName}`;

    // Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      phone: normalizedPhone,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: normalizedPhone,
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // Create user profile in users table
    const userInsert: Record<string, unknown> = {
      id: authUser.user.id,
      phone: normalizedPhone,
      email,
      full_name: fullName,
      id_number: idNumber,
      is_verified: true,
      role: 'voter',
    };

    // Add polling station if provided (triggers location auto-populate)
    if (pollingStationId) {
      userInsert.polling_station_id = pollingStationId;
    }

    const { error: profileError } = await (adminClient as any)
      .from('users')
      .insert(userInsert);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Rollback auth user if profile creation fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      );
    }

    // Create user preferences
    await (adminClient as any)
      .from('user_preferences')
      .insert({
        user_id: authUser.user.id,
        sms_notifications: true,
        push_notifications: true,
      });

    // Clear OTP after successful registration
    clearOTP(normalizedPhone);

    // Generate session for the new user
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: authUser.user.id,
        phone: normalizedPhone,
        fullName,
      },
      redirectTo: '/auth/login?registered=true',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
