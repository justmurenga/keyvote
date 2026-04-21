import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendOTP, normalizePhoneNumber } from '@/lib/sms/airtouch';
import { sendOTPEmail, isValidEmail } from '@/lib/email';
import { storeOTP, isRateLimited, trackOTPRequest } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';

type Action = 'login' | 'register';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, action: rawAction } = body as {
      phone?: string;
      email?: string;
      action?: Action;
    };

    const action: Action = rawAction === 'register' ? 'register' : 'login';

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email address is required' },
        { status: 400 }
      );
    }

    // Normalize identifier
    let identifier: string;
    let isEmailBased = false;

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }
      identifier = normalizedEmail;
      isEmailBased = true;
    } else {
      const normalizedPhone = normalizePhoneNumber(phone!);
      const phoneRegex = /^\+254[17]\d{8}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        return NextResponse.json(
          { error: 'Please enter a valid Kenyan phone number' },
          { status: 400 }
        );
      }
      identifier = normalizedPhone;
    }

    // --- Pre-flight existence check, BEFORE sending OTP ---
    // This makes the messaging consistent: we never send an OTP and *then*
    // tell the user "user not found".
    const adminClient = createAdminClient();
    const column = isEmailBased ? 'email' : 'phone';
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq(column, identifier)
      .maybeSingle();

    if (action === 'login' && !existingUser) {
      return NextResponse.json(
        {
          error: `No account found with this ${isEmailBased ? 'email address' : 'phone number'}. Please create an account first.`,
          needsRegistration: true,
        },
        { status: 404 }
      );
    }

    if (action === 'register' && existingUser) {
      return NextResponse.json(
        {
          error: `An account with this ${isEmailBased ? 'email address' : 'phone number'} already exists. Please sign in instead.`,
          userExists: true,
        },
        { status: 409 }
      );
    }

    // Rate limit
    if (await isRateLimited(identifier)) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again in an hour.' },
        { status: 429 }
      );
    }

    // Generate + store OTP (persisted in Supabase so it works across containers)
    const otp = generateOTP(6);
    await storeOTP(identifier, otp, 10);
    await trackOTPRequest(identifier);

    // Deliver OTP
    if (isEmailBased) {
      const result = await sendOTPEmail(identifier, otp);
      if (!result.success) {
        console.error('[send-otp] Failed to send OTP email:', {
          to: identifier,
          error: result.error,
        });
        const isDev = process.env.NODE_ENV !== 'production';
        return NextResponse.json(
          {
            error: isDev
              ? `Failed to send OTP email: ${result.error || 'Unknown error'}`
              : 'Failed to send OTP email. Please try again.',
            ...(isDev ? { detail: result.error, devOtp: otp } : {}),
          },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email',
        email: identifier,
        method: 'email',
      });
    }

    const result = await sendOTP(identifier, otp);
    if (!result.success) {
      console.error('Failed to send OTP:', result.error);
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      phone: identifier,
      method: 'sms',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
