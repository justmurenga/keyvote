/**
 * Persistent OTP store backed by Supabase (`otp_codes` + `otp_rate_limits`).
 *
 * Why this exists:
 *   The previous implementation used an in-memory `Map`. That works on a
 *   single Node.js process, but production runs behind a load balancer with
 *   multiple containers. An OTP stored on container A was invisible to
 *   container B, producing the very common "No OTP found. Please request a
 *   new code." error in the logs even though the user *had* just requested
 *   a code seconds earlier.
 *
 *   All functions are now async. Every caller MUST await them.
 *
 * Fallback:
 *   If Supabase isn't configured (e.g. unit tests), we fall back to a
 *   process-local Map so dev environments still work.
 */

import { createAdminClient } from '@/lib/supabase/admin';

interface OTPRow {
  key: string;
  identifier: string;
  is_email: boolean;
  otp: string;
  attempts: number;
  verified: boolean;
  expires_at: string; // ISO
}

interface RateRow {
  key: string;
  attempts: number;
  window_expires_at: string; // ISO
}

// ---------------------------------------------------------------------------
// In-memory fallback (dev/test only — used when Supabase env vars are missing)
// ---------------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __otpMemoryStore: Map<string, OTPRow> | undefined;
  // eslint-disable-next-line no-var
  var __otpRateStore: Map<string, RateRow> | undefined;
}
const memOtps = (globalThis.__otpMemoryStore ??= new Map<string, OTPRow>());
const memRates = (globalThis.__otpRateStore ??= new Map<string, RateRow>());

function hasSupabaseEnv(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeKey(identifier: string): string {
  if (identifier.includes('@')) return identifier.trim().toLowerCase();
  return identifier.replace(/\D/g, ''); // phone -> digits only
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Store (or replace) an OTP for an identifier. */
export async function storeOTP(
  identifier: string,
  otp: string,
  expiresInMinutes: number = 10
): Promise<void> {
  const key = normalizeKey(identifier);
  const isEmail = identifier.includes('@');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

  console.log('[otp-store] Storing OTP:', { identifier, key, expiresInMinutes });

  if (!hasSupabaseEnv()) {
    memOtps.set(key, {
      key,
      identifier,
      is_email: isEmail,
      otp,
      attempts: 0,
      verified: false,
      expires_at: expiresAt,
    });
    return;
  }

  const supabase = createAdminClient();
  const { error } = await (supabase as any)
    .from('otp_codes')
    .upsert(
      {
        key,
        identifier,
        is_email: isEmail,
        otp,
        attempts: 0,
        verified: false,
        expires_at: expiresAt,
        updated_at: nowIso(),
      },
      { onConflict: 'key' }
    );

  if (error) {
    console.error('[otp-store] Supabase upsert failed, falling back to memory:', error);
    memOtps.set(key, {
      key,
      identifier,
      is_email: isEmail,
      otp,
      attempts: 0,
      verified: false,
      expires_at: expiresAt,
    });
  }
}

/** Verify a submitted OTP. Marks the row as verified on success. */
export async function verifyOTP(
  identifier: string,
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  const key = normalizeKey(identifier);

  let row: OTPRow | null = null;
  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from('otp_codes')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.error('[otp-store] Supabase select failed, falling back to memory:', error);
    }
    row = (data as OTPRow | null) ?? memOtps.get(key) ?? null;
  } else {
    row = memOtps.get(key) ?? null;
  }

  console.log('[otp-store] Verifying:', {
    identifier,
    key,
    found: !!row,
    expiresAt: row?.expires_at,
    attempts: row?.attempts,
  });

  if (!row) {
    return { valid: false, error: 'No OTP found. Please request a new code.' };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await deleteOtpRow(key);
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }

  if (row.attempts >= 3) {
    await deleteOtpRow(key);
    return { valid: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  if (row.otp !== otp) {
    const newAttempts = row.attempts + 1;
    await updateOtpRow(key, { attempts: newAttempts });
    return {
      valid: false,
      error: `Invalid OTP. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? '' : 's'} remaining.`,
    };
  }

  // Success — mark verified, but keep the row briefly so the registration
  // route can call isPhoneVerified().
  await updateOtpRow(key, { verified: true });
  return { valid: true };
}

/** Has the identifier successfully verified an OTP recently? */
export async function isPhoneVerified(identifier: string): Promise<boolean> {
  const key = normalizeKey(identifier);

  let row: OTPRow | null = null;
  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from('otp_codes')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    row = (data as OTPRow | null) ?? memOtps.get(key) ?? null;
  } else {
    row = memOtps.get(key) ?? null;
  }

  if (!row) return false;
  return row.verified === true && new Date(row.expires_at).getTime() > Date.now();
}

/** Remove an OTP entry (call after successful login/registration). */
export async function clearOTP(identifier: string): Promise<void> {
  const key = normalizeKey(identifier);
  await deleteOtpRow(key);
}

/** Has the identifier hit the per-hour OTP request limit? */
export async function isRateLimited(identifier: string): Promise<boolean> {
  const key = `rate:${normalizeKey(identifier)}`;

  let row: RateRow | null = null;
  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    const { data } = await (supabase as any)
      .from('otp_rate_limits')
      .select('*')
      .eq('key', key)
      .maybeSingle();
    row = (data as RateRow | null) ?? memRates.get(key) ?? null;
  } else {
    row = memRates.get(key) ?? null;
  }

  if (!row) return false;
  if (new Date(row.window_expires_at).getTime() < Date.now()) {
    await deleteRateRow(key);
    return false;
  }
  return row.attempts >= 5;
}

/** Reset rate limit (mostly for tests/admin). */
export async function clearRateLimit(identifier: string): Promise<void> {
  const key = `rate:${normalizeKey(identifier)}`;
  await deleteRateRow(key);
}

/** Increment the rolling OTP request counter for rate limiting. */
export async function trackOTPRequest(identifier: string): Promise<void> {
  const key = `rate:${normalizeKey(identifier)}`;
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  if (!hasSupabaseEnv()) {
    const existing = memRates.get(key);
    if (existing && new Date(existing.window_expires_at).getTime() > Date.now()) {
      existing.attempts += 1;
    } else {
      memRates.set(key, { key, attempts: 1, window_expires_at: oneHourFromNow });
    }
    return;
  }

  const supabase = createAdminClient();
  const { data: existing } = await (supabase as any)
    .from('otp_rate_limits')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  const stillInWindow =
    !!existing && new Date((existing as RateRow).window_expires_at).getTime() > Date.now();

  const next: RateRow = stillInWindow
    ? {
        key,
        attempts: (existing as RateRow).attempts + 1,
        window_expires_at: (existing as RateRow).window_expires_at,
      }
    : { key, attempts: 1, window_expires_at: oneHourFromNow };

  const { error } = await (supabase as any)
    .from('otp_rate_limits')
    .upsert({ ...next, updated_at: nowIso() }, { onConflict: 'key' });

  if (error) {
    console.error('[otp-store] Rate-limit upsert failed:', error);
    memRates.set(key, next);
  }
}

// ---------------------------------------------------------------------------
// Internal write helpers
// ---------------------------------------------------------------------------
async function updateOtpRow(key: string, patch: Partial<OTPRow>): Promise<void> {
  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    const { error } = await (supabase as any)
      .from('otp_codes')
      .update({ ...patch, updated_at: nowIso() })
      .eq('key', key);
    if (error) console.error('[otp-store] update failed:', error);
  }
  const memRow = memOtps.get(key);
  if (memRow) memOtps.set(key, { ...memRow, ...patch });
}

async function deleteOtpRow(key: string): Promise<void> {
  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    await (supabase as any).from('otp_codes').delete().eq('key', key);
  }
  memOtps.delete(key);
}

async function deleteRateRow(key: string): Promise<void> {
  if (hasSupabaseEnv()) {
    const supabase = createAdminClient();
    await (supabase as any).from('otp_rate_limits').delete().eq('key', key);
  }
  memRates.delete(key);
}
