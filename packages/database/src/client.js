"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseAdmin = exports.createSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Create a typed Supabase client
 * @param supabaseUrl - The Supabase project URL
 * @param supabaseKey - The Supabase anon/service key
 * @returns Typed Supabase client
 */
function createSupabaseClient(supabaseUrl, supabaseKey) {
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
}
exports.createSupabaseClient = createSupabaseClient;
/**
 * Create a Supabase client for server-side usage with service role key
 * This bypasses RLS - use with caution
 */
function createSupabaseAdmin(supabaseUrl, supabaseServiceKey) {
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
exports.createSupabaseAdmin = createSupabaseAdmin;
//# sourceMappingURL=client.js.map