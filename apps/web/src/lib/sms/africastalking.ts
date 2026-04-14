import AfricasTalking from 'africastalking';

// Check if we're in dev mode without credentials
const isDevelopment = process.env.NODE_ENV === 'development';
const apiKey = process.env.AT_API_KEY;
const username = process.env.AT_USERNAME;
// Check for real credentials (not placeholder values)
const hasCredentials = apiKey && 
                       username && 
                       !apiKey.includes('your-') && 
                       username !== 'sandbox' &&
                       username !== 'your-africastalking-username';

// Initialize Africa's Talking (only if credentials exist)
const africastalking = hasCredentials 
  ? AfricasTalking({
      apiKey: apiKey!,
      username: username!,
    })
  : null;

const sms = africastalking?.SMS;

export interface SendSMSOptions {
  to: string | string[];
  message: string;
  from?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  cost?: string;
  error?: string;
}

/**
 * Normalize phone number to E.164 format (+254...)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('254')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+254${cleaned.slice(1)}`;
  }
  if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return `+${cleaned}`;
}

/**
 * Send SMS using Africa's Talking
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSResponse> {
  try {
    const recipients = Array.isArray(options.to) 
      ? options.to.map(normalizePhoneNumber) 
      : [normalizePhoneNumber(options.to)];

    // DEV MODE: Skip actual SMS sending if no credentials
    if (isDevelopment && !hasCredentials) {
      console.log(`[DEV MODE] SMS would be sent to ${recipients.join(', ')}`);
      console.log(`[DEV MODE] Message: ${options.message}`);
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
        cost: 'KES 0.00',
      };
    }

    if (!sms) {
      return {
        success: false,
        error: 'SMS service not configured',
      };
    }

    const response = await sms.send({
      to: recipients,
      message: options.message,
      from: options.from || process.env.AT_SENDER_ID || 'MYVOTE',
    });

    const result = response.SMSMessageData.Recipients[0];
    
    if (result && result.status === 'Success') {
      return {
        success: true,
        messageId: result.messageId,
        cost: result.cost,
      };
    }

    return {
      success: false,
      error: result?.status || 'Failed to send SMS',
    };
  } catch (error) {
    console.error('Africa\'s Talking SMS Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

/**
 * Send OTP SMS
 */
export async function sendOTP(phone: string, otp: string): Promise<SMSResponse> {
  const message = `Your myVote Kenya verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;
  
  return sendSMS({
    to: phone,
    message,
  });
}

/**
 * Generate a random OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
}
