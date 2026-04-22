import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { verifyMobileAccessToken } from './mobile-token';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  role: string;
  is_verified: boolean;
  profile_photo_url: string | null;
  polling_station_id: string | null;
  ward_id: string | null;
  constituency_id: string | null;
  county_id: string | null;
}

interface SessionData {
  userId: string;
  phone: string;
  fullName: string;
  role: string;
  expiresAt: number;
}

const USER_PROFILE_FIELDS = `
  id,
  phone,
  email,
  full_name,
  role,
  is_verified,
  profile_photo_url,
  polling_station_id,
  ward_id,
  constituency_id,
  county_id
`;

/**
 * Resolve the current user ID from any of:
 *   1. The mobile-app `Authorization: Bearer <token>` header
 *      (issued by `/api/auth/verify-otp`).
 *   2. Supabase auth session.
 *   3. The custom `myvote-session` cookie (web OTP login).
 *   4. (Dev only) the `x-myvote-user-id` header used by the mobile app
 *      against a local web server when no mobile token is available yet.
 *
 * Works in both page and API route contexts.
 */
export async function resolveUserId(supabase: any): Promise<string | null> {
  // 1. Mobile bearer token (works without cookies)
  try {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = verifyMobileAccessToken(authHeader.slice(7).trim());
      if (payload?.sub) return payload.sub;
    }
  } catch {
    // headers() unavailable in this context
  }

  // 2. Supabase auth
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();
  if (supabaseUser?.id) return supabaseUser.id;

  // 3. Custom session cookie (for OTP login)
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('myvote-session')?.value;
  if (sessionCookie) {
    try {
      const session: SessionData = JSON.parse(sessionCookie);
      if (session.expiresAt > Date.now()) {
        return session.userId;
      }
    } catch {
      // Invalid session
    }
  }

  // 4. Dev-only header fallback (mobile -> local web)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const headerStore = await headers();
      const headerUserId = headerStore.get('x-myvote-user-id');
      if (headerUserId && UUID_REGEX.test(headerUserId)) {
        return headerUserId;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Get the authenticated user on the server.
 * Redirects to login if not authenticated.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createClient();
  const userId = await resolveUserId(supabase);

  if (!userId) {
    redirect('/auth/login');
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select(USER_PROFILE_FIELDS)
    .eq('id', userId)
    .single();

  if (error || !profile) {
    redirect('/auth/login');
  }

  return profile as AuthenticatedUser;
}

/**
 * Get the current user without redirecting.
 * Returns null if not authenticated.
 * Works with both Supabase auth and OTP session cookies.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const userId = await resolveUserId(supabase);

  if (!userId) return null;

  const { data: profile } = await supabase
    .from('users')
    .select(USER_PROFILE_FIELDS)
    .eq('id', userId)
    .single();

  return profile as AuthenticatedUser | null;
}

/**
 * Get the current user for admin API routes (lightweight, includes role check).
 * Pass in the supabase client already created in the route handler.
 * Returns { id, role, full_name, phone } or null.
 */
export async function getApiCurrentUser(supabase: any): Promise<{
  id: string;
  role: string;
  full_name: string;
  phone: string;
} | null> {
  const userId = await resolveUserId(supabase);
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, full_name, phone')
    .eq('id', userId)
    .single();

  return profile;
}

/**
 * Check if user is authenticated (for API routes)
 */
export const getUser = getCurrentUser;

/**
 * Check if user is authenticated (for API routes)
 */
export async function isAuthenticated(): Promise<boolean> {
  const supabase = await createClient();
  const userId = await resolveUserId(supabase);
  return !!userId;
}
