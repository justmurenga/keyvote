import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants';
import * as SecureStore from 'expo-secure-store';
import type { Session, User } from '@supabase/supabase-js';
import { enableBiometricLogin, disableBiometricLogin } from '@/lib/biometric-auth';

interface UserProfile {
  id: string;
  phone: string;
  full_name: string | null;
  email: string | null;
  role: string;
  id_number: string | null;
  gender: string | null;
  age_bracket: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  polling_station_id: string | null;
  ward_id: string | null;
  constituency_id: string | null;
  county_id: string | null;
  is_verified: boolean;
  is_active: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  mobileAccessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  sendOTP: (phone: string) => Promise<{ error: string | null; devOtp?: string }>;
  verifyOTP: (phone: string, otp: string, action?: 'login' | 'register') => Promise<{ error: string | null; user?: any; isNewUser?: boolean }>;
  register: (data: {
    phone: string;
    firstName: string;
    lastName: string;
    idNumber: string;
    pollingStationId?: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: (userId?: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
  setSession: (session: Session | null) => void;
  getMobileAccessToken: () => string | null;
  enableBiometric: (phone: string, userId: string) => Promise<{ error: string | null }>;
  disableBiometric: () => Promise<{ error: string | null }>;

  // Keep for backward compat
  signInWithOTP: (phone: string) => Promise<{ error: string | null }>;
}

const SESSION_KEY = 'myvote-session';

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  mobileAccessToken: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      // First check Supabase native session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({
          session,
          user: session.user,
          isAuthenticated: true,
        });
        await get().fetchProfile();
        set({ isLoading: false });
        return;
      }

      // Fall back to custom session stored in SecureStore
      const stored = await SecureStore.getItemAsync(SESSION_KEY);
      if (stored) {
        try {
          const sessionData = JSON.parse(stored);
          if (sessionData.expiresAt > Date.now()) {
            set({
              isAuthenticated: true,
              user: { id: sessionData.userId } as any,
              mobileAccessToken: sessionData.mobileAccessToken || null,
              profile: {
                id: sessionData.userId,
                phone: sessionData.phone,
                full_name: sessionData.fullName,
                role: sessionData.role,
              } as UserProfile,
            });
            // Fetch full profile
            await get().fetchProfile(sessionData.userId);
          } else {
            await SecureStore.deleteItemAsync(SESSION_KEY);
          }
        } catch (e) {
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session || get().isAuthenticated,
      });
      if (session) {
        get().fetchProfile();
      }
    });
  },

  sendOTP: async (phone: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Failed to send OTP' };
      return { error: null, devOtp: data.devOtp };
    } catch (err: any) {
      return { error: err.message || 'Network error. Is the web server running?' };
    }
  },

  // Backward compat alias
  signInWithOTP: async (phone: string) => {
    return get().sendOTP(phone);
  },

  verifyOTP: async (phone: string, otp: string, action: 'login' | 'register' = 'login') => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, action }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Verification failed' };

      if (action === 'login' && data.user) {
        // Store session locally
        const sessionData = {
          userId: data.user.id,
          phone: data.user.phone,
          fullName: data.user.full_name,
          role: data.user.role,
          email: data.user.email,
          mobileAccessToken: data.mobileAccessToken || null,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

        set({
          isAuthenticated: true,
          user: { id: data.user.id } as any,
          mobileAccessToken: data.mobileAccessToken || null,
          profile: data.user as UserProfile,
        });

        // Fetch full profile
        await get().fetchProfile(data.user.id);
      }

      return { error: null, user: data.user, isNewUser: data.isNewUser };
    } catch (err: any) {
      return { error: err.message || 'Network error' };
    }
  },

  register: async ({ phone, firstName, lastName, idNumber, pollingStationId }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          firstName,
          lastName,
          idNumber,
          pollingStationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Registration failed' };

      // After registration, auto-login
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Network error' };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
    set({
      session: null,
      user: null,
      profile: null,
      mobileAccessToken: null,
      isAuthenticated: false,
    });
  },

  fetchProfile: async (userId?: string) => {
    const id = userId || get().user?.id;
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        set({ profile: data as UserProfile });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const id = get().user?.id || get().profile?.id;
    if (!id) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id);

      if (error) return { error: error.message };

      // Refresh profile
      await get().fetchProfile(id);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to update profile' };
    }
  },

  setSession: (session: Session | null) => {
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
    });
  },

  getMobileAccessToken: () => {
    return get().mobileAccessToken;
  },

  enableBiometric: async (phone: string, userId: string) => {
    try {
      await enableBiometricLogin({ phone, userId });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to enable biometric login' };
    }
  },

  disableBiometric: async () => {
    try {
      await disableBiometricLogin();
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to disable biometric login' };
    }
  },
}));
