import { NextRequest, NextResponse } from 'next/server';
import { normalizePhoneNumber } from '@/lib/sms/airtouch';
import { isPhoneVerified, clearOTP } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      phone, 
      email: rawEmail,
      idNumber, 
      firstName, 
      lastName,
      pollingStationId,
    } = body;

    // Validate required fields
    if ((!phone && !rawEmail) || !idNumber || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Determine the verified identifier (email or phone)
    const isEmailBased = !!rawEmail;
    const normalizedEmail = rawEmail ? rawEmail.trim().toLowerCase() : null;
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;
    const verifiedIdentifier = isEmailBased ? normalizedEmail! : normalizedPhone!;

    // Check if identifier was verified via OTP (persisted in Supabase)
    const verified = await isPhoneVerified(verifiedIdentifier);
    if (!verified) {
      console.log('[register] Verification check failed for:', verifiedIdentifier);
      return NextResponse.json(
        {
          error: `Your ${isEmailBased ? 'email address' : 'phone number'} has not been verified yet. Please request a new code and verify before continuing.`,
          needsVerification: true,
        },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if user already exists by phone or email
    if (normalizedPhone) {
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
    }

    if (normalizedEmail) {
      const { data: existingEmailUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (existingEmailUser) {
        return NextResponse.json(
          { error: 'An account with this email address already exists' },
          { status: 409 }
        );
      }
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

    // Create email from phone (workaround for Supabase phone auth) or use real email.
    // New phone-only accounts use the active domain (keyvote.online). Legacy accounts
    // created before the rename still have @myvote.ke addresses and must keep working.
    const email = normalizedEmail || `${normalizedPhone!.replace('+', '')}@keyvote.online`;
    const fullName = `${firstName} ${lastName}`;

    // Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      ...(normalizedPhone ? { phone: normalizedPhone, phone_confirm: true } : {}),
      user_metadata: {
        full_name: fullName,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        email,
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
      phone: normalizedPhone || null,
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
        {
          error:
            process.env.NODE_ENV === 'production'
              ? 'Failed to create user profile. Please try again.'
              : `Failed to create user profile: ${profileError.message}`,
        },
        { status: 500 }
      );
    }

    // Note: user_preferences is auto-created by the tr_create_user_preferences
    // trigger on the users table. Inserting again here would violate the UNIQUE
    // constraint on user_preferences.user_id.

    // Clear OTP after successful registration
    await clearOTP(verifiedIdentifier);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: authUser.user.id,
        phone: normalizedPhone,
        email,
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
