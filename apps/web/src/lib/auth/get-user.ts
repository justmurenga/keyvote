import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

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
 * Resolve the current user ID from Supabase auth or OTP session cookie.
 * Works in both page and API route contexts.
 */
export async function resolveUserId(supabase: any): Promise<string | null> {
  // Try Supabase auth first
  const { data: { user: supabaseUser } } = await supabase.auth.getUser();
  if (supabaseUser?.id) return supabaseUser.id;

  // Fallback: check custom session cookie (for OTP login)
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
