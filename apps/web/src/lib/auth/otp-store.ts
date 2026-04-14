/**
 * In-memory OTP store with Redis-like interface
 * In production, replace with Redis or use Supabase table
 */

interface OTPData {
  otp: string;
  phone: string;
  /** The email address the OTP was sent to (if email-based) */
  email?: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

// Use globalThis to persist across hot reloads in development
declare global {
  var otpStoreInstance: Map<string, OTPData> | undefined;
}

// Store OTPs in memory (use Redis in production)
// Using globalThis ensures the store persists across Next.js hot reloads
const otpStore = globalThis.otpStoreInstance ?? new Map<string, OTPData>();
globalThis.otpStoreInstance = otpStore;

// Clean up expired OTPs every 5 minutes (only set up once)
if (typeof globalThis.otpCleanupInterval === 'undefined') {
  globalThis.otpCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStore.entries()) {
      if (data.expiresAt < now) {
        otpStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

declare global {
  var otpCleanupInterval: NodeJS.Timeout | undefined;
}

/**
 * Store OTP for a phone number or email
 */
export function storeOTP(identifier: string, otp: string, expiresInMinutes: number = 10): void {
  const key = normalizeKey(identifier);
  
  console.log('[otp-store] Storing OTP:', { identifier, key, otp, expiresInMinutes });
  
  const isEmail = identifier.includes('@');
  
  otpStore.set(key, {
    otp,
    phone: isEmail ? '' : identifier,
    email: isEmail ? identifier : undefined,
    expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
    attempts: 0,
    verified: false,
  });
}

/**
 * Verify OTP for a phone number or email
 */
export function verifyOTP(identifier: string, otp: string): { valid: boolean; error?: string } {
  const key = normalizeKey(identifier);
  const data = otpStore.get(key);

  console.log('[otp-store] Verifying:', { identifier, key, otp, storedData: data ? { otp: data.otp, expiresAt: data.expiresAt, attempts: data.attempts } : null });
  console.log('[otp-store] All keys in store:', Array.from(otpStore.keys()));

  if (!data) {
    return { valid: false, error: 'No OTP found. Please request a new code.' };
  }

  if (data.expiresAt < Date.now()) {
    otpStore.delete(key);
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }

  if (data.attempts >= 3) {
    otpStore.delete(key);
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  if (data.otp !== otp) {
    data.attempts++;
    return { valid: false, error: `Invalid OTP. ${3 - data.attempts} attempts remaining.` };
  }

  // Mark as verified but don't delete yet (needed for registration flow)
  data.verified = true;
  
  return { valid: true };
}

/**
 * Check if identifier (phone or email) has a verified OTP
 */
export function isPhoneVerified(identifier: string): boolean {
  const key = normalizeKey(identifier);
  const data = otpStore.get(key);
  
  return data?.verified === true && data.expiresAt > Date.now();
}

/**
 * Clear OTP for a phone number or email
 */
export function clearOTP(identifier: string): void {
  const key = normalizeKey(identifier);
  otpStore.delete(key);
}

/**
 * Check if rate limited
 * Dev mode: no rate limiting
 * Prod mode: 5 attempts per hour
 */
export function isRateLimited(identifier: string): boolean {
  const isDev = process.env.NODE_ENV === 'development';
  
  // In dev mode, be very lenient
  if (isDev) {
    return false; // No rate limiting in dev mode
  }
  
  // Simple rate limiting - in production, use Redis with sliding window
  const key = `rate:${normalizeKey(identifier)}`;
  const data = otpStore.get(key);
  
  if (!data) return false;
  
  // Reset after 1 hour
  if (data.expiresAt < Date.now()) {
    otpStore.delete(key);
    return false;
  }
  
  return data.attempts >= 5;
}

/**
 * Clear rate limit for an identifier (useful for testing)
 */
export function clearRateLimit(identifier: string): void {
  const key = `rate:${normalizeKey(identifier)}`;
  otpStore.delete(key);
}

/**
 * Track OTP request for rate limiting
 */
export function trackOTPRequest(identifier: string): void {
  const key = `rate:${normalizeKey(identifier)}`;
  const existing = otpStore.get(key);
  
  if (existing && existing.expiresAt > Date.now()) {
    existing.attempts++;
  } else {
    otpStore.set(key, {
      otp: '',
      phone: identifier.includes('@') ? '' : identifier,
      email: identifier.includes('@') ? identifier : undefined,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      attempts: 1,
      verified: false,
    });
  }
}

function normalizeKey(identifier: string): string {
  // If it looks like an email, lowercase it as the key
  if (identifier.includes('@')) {
    return identifier.trim().toLowerCase();
  }
  // Phone number: strip non-digits
  return identifier.replace(/\D/g, '');
}
