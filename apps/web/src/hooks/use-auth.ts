'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  phone: string;
  email: string | null;
  full_name: string;
  role: string;
  is_verified: boolean;
  profile_photo_url: string | null;
  gender: string | null;
  age_bracket: string | null;
  bio: string | null;
  polling_station_id: string | null;
}

interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Module-level cache so all hook instances share the same data
let cachedProfile: UserProfile | null = null;
let cachedUser: User | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [isLoading, setIsLoading] = useState(!cachedProfile && !cachedUser);
  const router = useRouter();
  const supabase = createClient();
  const fetchingRef = useRef(false);

  const fetchUserAndProfile = useCallback(async (force = false) => {
    // Skip if already fetching or cache is fresh
    if (fetchingRef.current) return;
    if (!force && cachedProfile && (Date.now() - cacheTimestamp < CACHE_TTL)) {
      setUser(cachedUser);
      setProfile(cachedProfile);
      setIsLoading(false);
      return;
    }

    fetchingRef.current = true;
    try {
      // First try Supabase auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      cachedUser = authUser;

      if (authUser) {
        const { data: profileData } = await supabase
          .from('users')
          .select('id, phone, email, full_name, role, is_verified, profile_photo_url, gender, age_bracket, bio, polling_station_id')
          .eq('id', authUser.id)
          .single();
        const p = profileData as UserProfile | null;
        setProfile(p);
        cachedProfile = p;
        cacheTimestamp = Date.now();
      } else {
        // Fallback: check custom session via /api/auth/me (for OTP login)
        try {
          const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              const p: UserProfile = {
                id: data.user.id,
                phone: data.user.phone,
                email: data.user.email,
                full_name: data.user.full_name,
                role: data.user.role,
                is_verified: data.user.is_verified ?? false,
                profile_photo_url: data.user.profile_photo_url,
                gender: data.user.gender ?? null,
                age_bracket: data.user.age_bracket ?? null,
                bio: data.user.bio ?? null,
                polling_station_id: data.user.polling_station_id ?? null,
              };
              setProfile(p);
              cachedProfile = p;
              cacheTimestamp = Date.now();
            } else {
              setProfile(null);
              cachedProfile = null;
            }
          } else {
            setProfile(null);
            cachedProfile = null;
          }
        } catch {
          setProfile(null);
          cachedProfile = null;
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      setProfile(null);
      cachedUser = null;
      cachedProfile = null;
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    fetchUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          if (session?.user) {
            const { data: profileData } = await supabase
              .from('users')
              .select('id, phone, email, full_name, role, is_verified, profile_photo_url, gender, age_bracket, bio, polling_station_id')
              .eq('id', session.user.id)
              .single();
            setProfile(profileData as UserProfile | null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserAndProfile, supabase]);

  const signOut = async () => {
    try {
      // Clear custom session cookie + Supabase session
      await fetch('/api/auth/logout', { method: 'POST' });
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refresh = async () => {
    setIsLoading(true);
    await fetchUserAndProfile();
  };

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user || !!profile,
    signOut,
    refresh,
  };
}
