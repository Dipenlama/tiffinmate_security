import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api',
  '/_next',
  '/assets',
  '/favicon.ico',
  '/icon.png',
  '/manifest.json',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public and static assets
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // IMPORTANT: the backend's httpOnly access_token/refresh_token cookies are
  // set by localhost:5050 and therefore live in THAT origin's cookie jar -
  // they are never attached to requests made to this frontend (localhost:3000)
  // and so can never be read here, no matter how this middleware is written.
  // (This is standard split-origin cookie scoping, not an httpOnly quirk.)
  //
  // So this middleware instead reads two small, non-secret marker cookies -
  // `logged_in` and `role` - that the frontend itself sets on ITS OWN origin
  // right after a successful login (see login/page.tsx) and clears on logout
  // (see navbar.tsx). These carry no trust: they only drive which page to
  // redirect to. Every real data request still goes through the backend's
  // httpOnly session cookie and is authorized there regardless of what these
  // markers say - a forged `logged_in=1` cookie gets you a page shell that
  // immediately 401s on its first API call, nothing more.
  const token = request.cookies.get('logged_in')?.value;
  const role = request.cookies.get('role')?.value;

  // Root route: send admins to admin dashboard, others to dashboard, unauthenticated to login
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    if (token) {
      url.pathname = role === 'admin' ? '/admin/dashboard' : '/dashboard';
    } else {
      url.pathname = '/login';
    }
    return NextResponse.redirect(url);
  }

  // Protected routes: redirect to login when no token
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // preserve intended path to return after login if needed
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Role gating: restrict admin routes to admin role when available
  if (pathname.startsWith('/admin') && role && role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Authenticated: allow
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};