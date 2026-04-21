import type { NextRequest } from 'next/server';
import { resolveUserId } from './get-user';
import { verifyMobileAccessToken } from './mobile-token';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveMobileUserId(
  request: NextRequest,
  supabase: any
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyMobileAccessToken(token);
    if (payload?.sub) {
      return payload.sub;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const headerUserId = request.headers.get('x-myvote-user-id');
  if (headerUserId && UUID_REGEX.test(headerUserId)) {
    return headerUserId;
  }

  return resolveUserId(supabase);
}
