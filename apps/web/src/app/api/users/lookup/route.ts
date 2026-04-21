import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

/**
 * GET /api/users/lookup?q=<phone|email|name>
 *
 * Lookup endpoint used by the candidate "Invite Agent" flow.
 * Returns ONLY existing registered users.
 *
 * Schema reminder: public.users has columns `phone`, `email`, `full_name`
 * (no `first_name` / `last_name` / `phone_number`). The response exposes
 * `phone_number` so the UI is decoupled from the column name.
 *
 * Search strategy: build one combined OR-filter that simultaneously checks
 * email (ilike), full_name (ilike) and phone (exact variants + suffix), so
 * that a query like "habank502@gmail.com", "0712345678", "+254712345678"
 * or just "habakuk" all resolve to a real user when present.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQ = (searchParams.get('q') || '').trim();
    if (rawQ.length < 3) {
      return NextResponse.json({ users: [] });
    }

    const adminClient = createAdminClient();

    // Phone variants (Kenyan +254 convention)
    const digits = rawQ.replace(/\D/g, '');
    const tail9 = digits.slice(-9);
    const phoneVariants = new Set<string>();
    if (digits.length >= 3) {
      phoneVariants.add(rawQ);
      phoneVariants.add(digits);
      phoneVariants.add(`+${digits}`);
      if (tail9.length === 9) {
        phoneVariants.add(`+254${tail9}`);
        phoneVariants.add(`254${tail9}`);
        phoneVariants.add(`0${tail9}`);
        phoneVariants.add(tail9);
      }
    }

    // Sanitize for PostgREST or-filter (commas/parentheses break it)
    const safeQ = rawQ.replace(/[(),]/g, ' ');

    const orParts: string[] = [
      `full_name.ilike.%${safeQ}%`,
      `email.ilike.%${safeQ}%`,
    ];
    for (const v of phoneVariants) {
      if (v.length >= 3) orParts.push(`phone.eq.${v}`);
    }
    if (tail9.length >= 4) {
      orParts.push(`phone.ilike.%${tail9}`);
    } else if (digits.length >= 3) {
      orParts.push(`phone.ilike.%${digits}%`);
    }

    const { data, error } = await (adminClient
      .from('users') as any)
      .select('id, full_name, phone, email, role, profile_photo_url, is_verified, is_active')
      .neq('id', userId)
      .eq('is_active', true)
      .neq('role', 'system_admin')
      .or(orParts.join(','))
      .limit(10);

    if (error) {
      console.error('User lookup error:', error, { rawQ, orParts });
      return NextResponse.json(
        { error: 'Failed to search users', details: error.message },
        { status: 500 },
      );
    }

    const isEmail = rawQ.includes('@');
    const isPhone = !isEmail && digits.length >= 3 && digits.length / Math.max(rawQ.length, 1) > 0.6;

    return NextResponse.json({
      users: (data || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        phone_number: u.phone, // stable client-facing alias
        email: u.email,
        role: u.role,
        profile_photo_url: u.profile_photo_url,
        is_verified: u.is_verified,
      })),
      query: rawQ,
      matchedBy: isEmail ? 'email' : isPhone ? 'phone' : 'name',
    });
  } catch (error: any) {
    console.error('User lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 },
    );
  }
}
