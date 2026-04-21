import crypto from 'crypto';

// Airtouch SMS API Configuration
const AIRTOUCH_API_URL = 'https://client.airtouch.co.ke:9012/sms/api/';
const AIRTOUCH_USERNAME = process.env.SMS_AIRTOUCH_USERNAME || '';
const AIRTOUCH_API_KEY = process.env.SMS_AIRTOUCH_API_KEY || '';
const DEFAULT_SENDER_ID = process.env.SMS_AIRTOUCH_SENDER_ID || 'myVote';

// Generate MD5 hash of API key for password
function getPassword(): string {
  return crypto.createHash('md5').update(AIRTOUCH_API_KEY).digest('hex');
}

const hasCredentials = !!(AIRTOUCH_USERNAME && AIRTOUCH_API_KEY);

export interface AirtouchSendOptions {
  to: string | string[];
  message: string;
  senderId?: string;
}

export interface AirtouchResponse {
  success: boolean;
  messageId?: string;
  responses?: AirtouchRecipientResult[];
  error?: string;
}

export interface AirtouchRecipientResult {
  phone: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
}

/**
 * Normalize phone number to E.164 format (+254...)
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('254')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+254${cleaned.slice(1)}`;
  if (cleaned.length === 9) return `+254${cleaned}`;
  if (phone.startsWith('+')) return phone;
  return `+${cleaned}`;
}

/**
 * Send SMS via Airtouch API
 */
export async function sendSMS(options: AirtouchSendOptions): Promise<AirtouchResponse> {
  // Keep both forms: the digits-only form Airtouch wants on the wire,
  // and the canonical +E.164 form we use everywhere else (DB, callers).
  const rawList = Array.isArray(options.to) ? options.to : [options.to];
  const phoneMap = rawList.map((n) => {
    const plus = normalizePhoneNumber(n); // e.g. +254704353392
    return { plus, digits: plus.replace(/^\+/, '') };
  });
  const recipients = phoneMap.map((p) => p.digits);

  const senderId = options.senderId || DEFAULT_SENDER_ID;

  if (!hasCredentials) {
    return { success: false, error: 'Airtouch SMS not configured. Set SMS_AIRTOUCH_USERNAME and SMS_AIRTOUCH_API_KEY.' };
  }

  const results: AirtouchRecipientResult[] = [];
  let hasSuccess = false;

  // Airtouch supports sending to multiple numbers — send in batches of 100
  const batches: { plus: string; digits: string }[][] = [];
  for (let i = 0; i < phoneMap.length; i += 100) {
    batches.push(phoneMap.slice(i, i + 100));
  }

  for (const batch of batches) {
    try {
      const payload = {
        username: AIRTOUCH_USERNAME,
        password: getPassword(),
        issn: senderId,
        msisdn: batch.map((p) => p.digits).join(','),
        text: options.message,
      };

      console.log('[Airtouch] Sending with username:', AIRTOUCH_USERNAME, 'password (md5):', getPassword());

      const response = await fetch(AIRTOUCH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      console.log(`[Airtouch] Response: ${text}`);

      // Parse Airtouch response
      if (response.ok) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }

        // Airtouch returns status_code — "1000" means success
        if (parsed && parsed.status_code && parsed.status_code !== '1000') {
          for (const p of batch) {
            results.push({
              phone: p.plus,
              status: 'failed',
              error: `${parsed.status_code}: ${parsed.status_desc || 'Unknown error'}`,
            });
          }
        } else {
          // Airtouch often returns message_id: null even on success.
          // Generate a stable UUID-based ID so we can track delivery in our DB.
          for (const p of batch) {
            const messageId = parsed?.message_id || `at-${crypto.randomUUID()}`;
            results.push({ phone: p.plus, status: 'sent', messageId });
            hasSuccess = true;
          }
        }
      } else {
        for (const p of batch) {
          results.push({
            phone: p.plus,
            status: 'failed',
            error: `HTTP ${response.status}: ${text}`,
          });
        }
      }
    } catch (error) {
      console.error('[Airtouch] Error:', error);
      for (const p of batch) {
        results.push({
          phone: p.plus,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Network error',
        });
      }
    }
  }

  // Mark batches variable as intentionally used (recipients array kept for log parity)
  void recipients;

  return {
    success: hasSuccess,
    messageId: `campaign-${crypto.randomUUID()}`,
    responses: results,
  };
}

/**
 * Fetch remaining SMS balance from Airtouch.
 * Docs: https://client.airtouch.co.ke:9012/users/balance-api/?username=<u>&password=<md5>
 */
export interface AirtouchBalance {
  success: boolean;
  balance?: number;
  currency?: string;
  raw?: unknown;
  error?: string;
}

export async function getAirtouchBalance(): Promise<AirtouchBalance> {
  if (!hasCredentials) {
    return { success: false, error: 'Airtouch SMS not configured. Set SMS_AIRTOUCH_USERNAME and SMS_AIRTOUCH_API_KEY.' };
  }
  try {
    const url = `https://client.airtouch.co.ke:9012/users/balance-api/?username=${encodeURIComponent(
      AIRTOUCH_USERNAME,
    )}&password=${encodeURIComponent(getPassword())}`;

    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    const text = await response.text();
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON — try to parse a bare number
      const n = parseFloat(text.trim());
      if (!Number.isNaN(n)) {
        return { success: true, balance: n, raw: text };
      }
      return { success: false, error: 'Unexpected response', raw: text };
    }

    // Airtouch may return things like { status_code: "1000", balance: "123.45", currency: "KES" }
    // or { Balance: 123.45 } depending on account. Be defensive.
    const candidate =
      parsed?.balance ??
      parsed?.Balance ??
      parsed?.sms_balance ??
      parsed?.data?.balance ??
      parsed?.data?.Balance;

    const balance =
      typeof candidate === 'number'
        ? candidate
        : typeof candidate === 'string'
          ? parseFloat(candidate)
          : undefined;

    if (parsed?.status_code && parsed.status_code !== '1000' && balance === undefined) {
      return {
        success: false,
        error: `${parsed.status_code}: ${parsed.status_desc || 'Unknown error'}`,
        raw: parsed,
      };
    }

    return {
      success: balance !== undefined && !Number.isNaN(balance),
      balance: balance !== undefined && !Number.isNaN(balance) ? balance : undefined,
      currency: parsed?.currency || parsed?.Currency || 'KES',
      raw: parsed,
      error:
        balance === undefined || Number.isNaN(balance)
          ? 'Balance field not found in response'
          : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Send OTP SMS via Airtouch
 */
export async function sendOTP(phone: string, otp: string): Promise<AirtouchResponse> {
  return sendSMS({
    to: phone,
    message: `Your myVote Kenya verification code is: ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`,
    senderId: DEFAULT_SENDER_ID,
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

/**
 * Calculate SMS cost in KES
 */
export function calculateSMSCost(recipientCount: number, costPerSMS: number = 1.00): number {
  return recipientCount * costPerSMS;
}

/**
 * Get SMS character count and segment info
 */
export function getSMSSegments(message: string): { characters: number; segments: number; remaining: number } {
  const len = message.length;
  // GSM 7-bit: 160 chars per segment, 153 for multipart
  // Unicode: 70 chars per segment, 67 for multipart
  const isUnicode = /[^\x00-\x7F]/.test(message);
  const singleMax = isUnicode ? 70 : 160;
  const multiMax = isUnicode ? 67 : 153;

  if (len <= singleMax) {
    return { characters: len, segments: 1, remaining: singleMax - len };
  }
  const segments = Math.ceil(len / multiMax);
  return { characters: len, segments, remaining: segments * multiMax - len };
}
