import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveMobileUserId } from '@/lib/auth/mobile-user';

const BUCKET_NAME = 'result-sheets';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const userId = await resolveMobileUserId(request, supabase);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image uploads are allowed' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    await adminClient.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    }).catch(() => null);

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
      throw uploadError;
    }

    const { data: signedData, error: signedError } = await adminClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 60 * 60 * 24 * 14);

    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error('Failed to create signed URL');
    }

    return NextResponse.json({
      success: true,
      url: signedData.signedUrl,
      path,
    });
  } catch (error) {
    console.error('Mobile evidence upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload evidence file' },
      { status: 500 }
    );
  }
}
