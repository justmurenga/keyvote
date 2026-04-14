import type { Database } from './types/database.types';
/**
 * Create a typed Supabase client
 * @param supabaseUrl - The Supabase project URL
 * @param supabaseKey - The Supabase anon/service key
 * @returns Typed Supabase client
 */
export declare function createSupabaseClient(supabaseUrl: string, supabaseKey: string): import("node_modules/@supabase/supabase-js/dist/index.cjs").SupabaseClient<Database, "public", "public", never, {
    PostgrestVersion: "12";
}>;
/**
 * Create a Supabase client for server-side usage with service role key
 * This bypasses RLS - use with caution
 */
export declare function createSupabaseAdmin(supabaseUrl: string, supabaseServiceKey: string): import("node_modules/@supabase/supabase-js/dist/index.cjs").SupabaseClient<Database, "public", "public", never, {
    PostgrestVersion: "12";
}>;
export type SupabaseClient = ReturnType<typeof createSupabaseClient>;
export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>;
//# sourceMappingURL=client.d.ts.map