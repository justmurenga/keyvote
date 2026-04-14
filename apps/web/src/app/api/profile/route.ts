import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';
import { z } from 'zod';

// Valid DB enum values (must match 0005_create_enums.sql)
const DB_GENDERS = ['male', 'female', 'prefer_not_to_say'] as const;
const DB_AGE_BRACKETS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'] as const;

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(200).optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .optional()
    .nullable(),
  gender: z.enum(DB_GENDERS).optional().nullable(),
  age_bracket: z.enum(DB_AGE_BRACKETS).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  polling_station_id: z.string().uuid().optional().nullable(),
});

interface SessionData {
  userId: string;
  phone: string;
  fullName: string;
  role: string;
  expiresAt: number;
}

/**
 * GET /api/profile — Fetch full profile for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('users')
      .select('id, phone, email, full_name, gender, age_bracket, id_number, bio, profile_photo_url, role, is_verified, polling_station_id, ward_id, constituency_id, county_id, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    const profile = data as Record<string, any>;

    // Fetch location names for display
    let locationNames: Record<string, string | null> = {
      polling_station_name: null,
      ward_name: null,
      constituency_name: null,
      county_name: null,
    };

    if (profile.polling_station_id) {
      const { data: ps } = await adminClient
        .from('polling_stations')
        .select('display_name')
        .eq('id', profile.polling_station_id)
        .single();
      locationNames.polling_station_name = (ps as any)?.display_name ?? null;
    }

    if (profile.ward_id) {
      const { data: ward } = await adminClient
        .from('wards')
        .select('name')
        .eq('id', profile.ward_id)
        .single();
      locationNames.ward_name = (ward as any)?.name ?? null;
    }

    if (profile.constituency_id) {
      const { data: constituency } = await adminClient
        .from('constituencies')
        .select('name')
        .eq('id', profile.constituency_id)
        .single();
      locationNames.constituency_name = (constituency as any)?.name ?? null;
    }

    if (profile.county_id) {
      const { data: county } = await adminClient
        .from('counties')
        .select('name')
        .eq('id', profile.county_id)
        .single();
      locationNames.county_name = (county as any)?.name ?? null;
    }

    // Calculate profile completeness
    const requiredFields = [
      'full_name',
      'phone',
      'gender',
      'age_bracket',
      'polling_station_id',
    ];
    const optionalFields = ['email', 'bio'];

    const completedRequired = requiredFields.filter(
      (f) => profile[f as keyof typeof profile] != null
    ).length;
    const completedOptional = optionalFields.filter(
      (f) => profile[f as keyof typeof profile] != null
    ).length;
    const totalFields = requiredFields.length + optionalFields.length;
    const completedFields = completedRequired + completedOptional;
    const completionPercentage = Math.round(
      (completedFields / totalFields) * 100
    );

    const missingFields = [
      ...requiredFields.filter(
        (f) => profile[f as keyof typeof profile] == null
      ),
      ...optionalFields.filter(
        (f) => profile[f as keyof typeof profile] == null
      ),
    ];

    return NextResponse.json({
      profile: {
        ...profile,
        ...locationNames,
      },
      completion: {
        percentage: completionPercentage,
        completedFields,
        totalFields,
        missingFields,
        isComplete: completionPercentage === 100,
      },
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile — Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    const adminClient = createAdminClient();

    // If email is being changed, check uniqueness (skip auto-generated ones)
    if (updates.email) {
      const { data: existingEmail } = await adminClient
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', userId)
        .single();

      if (existingEmail) {
        return NextResponse.json(
          { error: 'This email address is already in use' },
          { status: 409 }
        );
      }
    }

    // Build update payload (only include provided fields)
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
    if (updates.email !== undefined) updatePayload.email = updates.email;
    if (updates.gender !== undefined) updatePayload.gender = updates.gender;
    if (updates.age_bracket !== undefined) updatePayload.age_bracket = updates.age_bracket;
    if (updates.bio !== undefined) updatePayload.bio = updates.bio;
    if (updates.polling_station_id !== undefined) {
      updatePayload.polling_station_id = updates.polling_station_id;
      // The DB trigger tr_populate_user_location will auto-populate ward, constituency, county
    }

    const { data: updatedProfile, error: updateError } = await (adminClient as any)
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, phone, email, full_name, gender, age_bracket, id_number, bio, profile_photo_url, role, is_verified, polling_station_id, ward_id, constituency_id, county_id, updated_at')
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Update session cookie if name or role changed so the header/layout stay in sync
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('myvote-session')?.value;
    if (sessionCookie) {
      try {
        const session: SessionData = JSON.parse(sessionCookie);
        let needsUpdate = false;
        if (updatedProfile.full_name && session.fullName !== updatedProfile.full_name) {
          session.fullName = updatedProfile.full_name;
          needsUpdate = true;
        }
        if (updatedProfile.role && session.role !== updatedProfile.role) {
          session.role = updatedProfile.role;
          needsUpdate = true;
        }
        if (needsUpdate) {
          const response = NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedProfile,
          });
          response.cookies.set('myvote-session', JSON.stringify(session), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
            path: '/',
          });
          return response;
        }
      } catch {
        // Invalid session cookie, continue without updating it
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
