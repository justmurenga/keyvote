import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

interface SessionData {
  userId: string;
  phone: string;
  fullName: string;
  role: string;
  expiresAt: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    // Check Supabase auth first
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Check custom session cookie (from OTP login)
    const sessionCookie = cookieStore.get('myvote-session')?.value;
    let customSession: SessionData | null = null;

    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie);
        if (session.expiresAt > Date.now()) {
          customSession = session;
        }
      } catch (e) {
        // Invalid session cookie
      }
    }

    // Not authenticated at all
    if (!user && !customSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile based on which auth method is active
    const userId = user?.id || customSession?.userId;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, full_name, phone, email, role, profile_photo_url, is_verified, gender, age_bracket, bio, polling_station_id')
      .eq('id', userId!)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        ...(profile as Record<string, unknown>),
        authMethod: user ? 'supabase' : 'otp-session',
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
