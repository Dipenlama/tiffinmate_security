import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Framework, API, and static paths never participate in page role routing.
const BYPASS_PATHS = [
  '/api',
  '/_next',
  '/assets',
  '/favicon.ico',
  '/icon.png',
  '/manifest.json',
];

// Routes that unauthenticated visitors can access.
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/menu',
  '/about',
  '/browse',
  '/browseMenu',
  '/packages',
];

// Only account, ordering, and administration routes require a session.
const PROTECTED_PATHS = [
  '/dashboard',
  '/bookings',
  '/checkout',
  '/orders',
  '/profile',
  '/admin',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('logged_in')?.value;
  const sessionVersion = request.cookies.get('session_version')?.value;
  const role = request.cookies.get('role')?.value;
  const hasCurrentSession = token === '1' && sessionVersion === '2';

  // Admin accounts have a dedicated experience. They cannot enter customer
  // landing, menu, booking, checkout, profile, or authentication pages.
  if (hasCurrentSession && role === 'admin' && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Booking confirmation creates/uses private booking data even though the
  // package catalogue itself is public.
  const isProtectedConfirmation = pathname.startsWith('/packages/confirm');

  // Allow the landing page, public content, auth pages, and static assets.
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    if (!isProtectedConfirmation) return NextResponse.next();
  }

  const isProtected =
    isProtectedConfirmation ||
    PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Unknown/non-sensitive routes can render normally (including Next's 404).
  if (!isProtected) {
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
  // Protected routes: redirect to login when no token
  if (!hasCurrentSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // preserve intended path to return after login if needed
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Role gating: restrict admin routes to admin role when available
  if (pathname.startsWith('/admin') && role !== 'admin') {
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
