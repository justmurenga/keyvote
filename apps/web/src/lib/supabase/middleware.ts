import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@myvote/database';

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/callback',
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
  '/api/candidates',
  '/api/polls',
  '/api/results',
  '/candidates',
  '/polls',
  '/results',
  '/about',
  '/dashboard', // Keep public for now
];

// Routes that should redirect to dashboard if already authenticated
// DISABLED for now to prevent redirect loops
const authRoutes: string[] = [];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user: supabaseUser } } = await supabase.auth.getUser();

  // Check for custom session cookie (from OTP login)
  const sessionCookie = request.cookies.get('myvote-session')?.value;
  let customUser = null;
  
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie);
      if (session.expiresAt > Date.now()) {
        customUser = session;
      }
    } catch (e) {
      // Invalid session cookie
    }
  }

  // User is authenticated if either Supabase auth or custom session exists
  const isAuthenticated = supabaseUser || customUser;

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`) || pathname.startsWith('/api/health')
  );
  const isAuthRoute = authRoutes.some(route => pathname === route);

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to login for protected routes
  if (!isAuthenticated && !isPublicRoute) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
