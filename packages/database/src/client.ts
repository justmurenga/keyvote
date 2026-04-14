import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database.types';

/**
 * Create a typed Supabase client
 * @param supabaseUrl - The Supabase project URL
 * @param supabaseKey - The Supabase anon/service key
 * @returns Typed Supabase client
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string
) {
  return createClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * Create a Supabase client for server-side usage with service role key
 * This bypasses RLS - use with caution
 */
export function createSupabaseAdmin(
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Type helper for Supabase client
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>;
