import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendOTP, normalizePhoneNumber } from '@/lib/sms/africastalking';
import { storeOTP, isRateLimited, trackOTPRequest } from '@/lib/auth/otp-store';

const isDevelopment = process.env.NODE_ENV === 'development';
const apiKey = process.env.AT_API_KEY;
const username = process.env.AT_USERNAME;
// Check for real credentials (not placeholder values)
const hasCredentials = apiKey && 
                       username && 
                       !apiKey.includes('your-') && 
                       username !== 'sandbox' &&
                       username !== 'your-africastalking-username';

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

    // Validate Kenyan phone number
    const phoneRegex = /^\+254[17]\d{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid Kenyan phone number' },
        { status: 400 }
      );
    }

    // Check rate limiting
    if (isRateLimited(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP(6);

    // Store OTP
    storeOTP(normalizedPhone, otp, 10);

    // Track request for rate limiting
    trackOTPRequest(normalizedPhone);

    // Send OTP via Africa's Talking
    const result = await sendOTP(normalizedPhone, otp);

    if (!result.success) {
      console.error('Failed to send OTP:', result.error);
      return NextResponse.json(
        { error: 'Failed to send OTP. Please try again.' },
        { status: 500 }
      );
    }

    // In development without credentials, return the OTP for testing
    if (isDevelopment && !hasCredentials) {
      console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
        phone: normalizedPhone,
        // DEV ONLY: Include OTP in response for testing
        devOtp: otp,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      phone: normalizedPhone,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
