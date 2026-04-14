import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendOTP, normalizePhoneNumber } from '@/lib/sms/africastalking';
import { sendOTPEmail, isValidEmail } from '@/lib/email';
import { storeOTP, isRateLimited, trackOTPRequest } from '@/lib/auth/otp-store';

const isDevelopment = process.env.NODE_ENV === 'development';
const apiKey = process.env.AT_API_KEY;
const username = process.env.AT_USERNAME;
// Check for real credentials (not placeholder values)
const hasATCredentials = apiKey && 
                       username && 
                       !apiKey.includes('your-') && 
                       username !== 'sandbox' &&
                       username !== 'your-africastalking-username';
const hasResendCredentials = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your-');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email } = body;

    // Must provide either phone or email
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email address is required' },
        { status: 400 }
      );
    }

    // --- EMAIL-BASED OTP ---
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!isValidEmail(normalizedEmail)) {
        return NextResponse.json(
          { error: 'Please enter a valid email address' },
          { status: 400 }
        );
      }

      // Check rate limiting
      if (isRateLimited(normalizedEmail)) {
        return NextResponse.json(
          { error: 'Too many OTP requests. Please try again later.' },
          { status: 429 }
        );
      }

      // Generate OTP
      const otp = generateOTP(6);

      // Store OTP keyed by email
      storeOTP(normalizedEmail, otp, 10);

      // Track request for rate limiting
      trackOTPRequest(normalizedEmail);

      // Send OTP via Resend email
      const result = await sendOTPEmail(normalizedEmail, otp);

      if (!result.success) {
        console.error('Failed to send OTP email:', result.error);
        return NextResponse.json(
          { error: 'Failed to send OTP email. Please try again.' },
          { status: 500 }
        );
      }

      // In development without credentials, return the OTP for testing
      if (isDevelopment && !hasResendCredentials) {
        console.log(`[DEV] OTP for ${normalizedEmail}: ${otp}`);
        return NextResponse.json({
          success: true,
          message: 'OTP sent to your email',
          email: normalizedEmail,
          method: 'email',
          // DEV ONLY: Include OTP in response for testing
          devOtp: otp,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email',
        email: normalizedEmail,
        method: 'email',
      });
    }

    // --- PHONE-BASED OTP (existing flow) ---
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
    if (isDevelopment && !hasATCredentials) {
      console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully',
        phone: normalizedPhone,
        method: 'sms',
        // DEV ONLY: Include OTP in response for testing
        devOtp: otp,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      phone: normalizedPhone,
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
