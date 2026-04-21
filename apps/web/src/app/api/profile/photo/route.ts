import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveUserId } from '@/lib/auth';

const BUCKET_NAME = 'avatars';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function ensureBucket(adminClient: ReturnType<typeof createAdminClient>) {
  // Idempotent — ignore "already exists" errors
  await adminClient.storage
    .createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ALLOWED_TYPES,
    })
    .catch(() => null);
}

/**
 * POST /api/profile/photo — upload a new profile photo for the current user.
 * Accepts multipart/form-data with a `file` field.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'A file is required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, WEBP or GIF images are allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Image must be 5 MB or smaller' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    await ensureBucket(adminClient);

    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await adminClient.storage
      .from(BUCKET_NAME)
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = adminClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { error: 'Could not resolve uploaded image URL' },
        { status: 500 }
      );
    }

    // Fetch existing photo so we can clean it up after a successful update
    const { data: existing } = await (adminClient as any)
      .from('users')
      .select('profile_photo_url')
      .eq('id', userId)
      .single();

    const { data: updated, error: updateError } = await (adminClient as any)
      .from('users')
      .update({
        profile_photo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, profile_photo_url')
      .single();

    if (updateError) {
      console.error('Avatar persist error:', updateError);
      // Best-effort cleanup of the orphaned file
      await adminClient.storage.from(BUCKET_NAME).remove([path]).catch(() => null);
      return NextResponse.json(
        { error: 'Failed to save profile photo' },
        { status: 500 }
      );
    }

    // Best-effort cleanup of the previous avatar (only if hosted in our bucket)
    const previousUrl = existing?.profile_photo_url as string | null | undefined;
    if (previousUrl && previousUrl !== publicUrl) {
      const marker = `/object/public/${BUCKET_NAME}/`;
      const idx = previousUrl.indexOf(marker);
      if (idx !== -1) {
        const previousPath = previousUrl.slice(idx + marker.length);
        await adminClient.storage
          .from(BUCKET_NAME)
          .remove([previousPath])
          .catch(() => null);
      }
    }

    return NextResponse.json({
      success: true,
      profile_photo_url: updated.profile_photo_url,
    });
  } catch (error) {
    console.error('Profile photo POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profile/photo — remove the current user's profile photo.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const userId = await resolveUserId(supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: existing } = await (adminClient as any)
      .from('users')
      .select('profile_photo_url')
      .eq('id', userId)
      .single();

    const { error: updateError } = await (adminClient as any)
      .from('users')
      .update({
        profile_photo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Avatar delete persist error:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove profile photo' },
        { status: 500 }
      );
    }

    const previousUrl = existing?.profile_photo_url as string | null | undefined;
    if (previousUrl) {
      const marker = `/object/public/${BUCKET_NAME}/`;
      const idx = previousUrl.indexOf(marker);
      if (idx !== -1) {
        const previousPath = previousUrl.slice(idx + marker.length);
        await adminClient.storage
          .from(BUCKET_NAME)
          .remove([previousPath])
          .catch(() => null);
      }
    }

    return NextResponse.json({ success: true, profile_photo_url: null });
  } catch (error) {
    console.error('Profile photo DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
