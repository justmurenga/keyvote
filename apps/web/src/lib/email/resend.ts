import { Resend } from 'resend';
import { generateOTPEmailHTML } from './templates/otp';

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_FROM = process.env.EMAIL_FROM || 'myVote Kenya <noreply@myvote.ke>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResponse> {
  try {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    if (!resend) {
      console.error('[email] Resend not configured — missing RESEND_API_KEY');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const { data, error } = await resend.emails.send({
      from: options.from || DEFAULT_FROM,
      to: recipients,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[email] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(email: string, otp: string): Promise<EmailResponse> {
  const html = generateOTPEmailHTML(otp);

  return sendEmail({
    to: email,
    subject: `${otp} — Your myVote Kenya verification code`,
    html,
  });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
