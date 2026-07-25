"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { postLogout } from "../../lib/api";
import { clearSessionMarkers, hasSessionMarker } from "../../lib/session-markers";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("auth-state-changed", onStoreChange);
      return () => window.removeEventListener("auth-state-changed", onStoreChange);
    },
    hasSessionMarker,
    () => false,
  );
  const hideAuthActions =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const logout = async () => {
    try {
      // The session lives in httpOnly cookies now, which frontend JS cannot
      // read or clear itself (that's the whole point - see lib/api.ts). A
      // real logout has to ask the backend to revoke the refresh token and
      // clear the cookies via Set-Cookie; the previous client-only
      // document.cookie-clearing approach silently did nothing for these.
      await postLogout();
    } catch {
      // Best-effort: even if the request fails, still send the user to
      // /login rather than leaving them on a page that looks logged in.
    }
    clearSessionMarkers();
    try {
      sessionStorage.clear();
    } catch {}
    // Use hard replace to prevent back navigation to protected pages
    try {
      window.location.replace("/login");
      return;
    } catch {}
    router.replace("/login");
    router.refresh();
  };
  return (
    <header className="bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-neutral-900">Tiffin Mate</Link>
          <nav aria-label="Main navigation" className="hidden md:flex gap-4 text-neutral-700">
            <Link href="/" className="hover:text-neutral-900">Home</Link>
            <Link href="/menu" className="hover:text-neutral-900">Menu</Link>
            {isLoggedIn && <Link href="/bookings" className="hover:text-neutral-900">Bookings</Link>}
            <Link href="/about" className="hover:text-neutral-900">About Us</Link>
          </nav>
        </div>

        {!hideAuthActions && isLoggedIn && (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800"
            >
              <span className="inline-block w-6 h-6 rounded-full bg-white/20" aria-hidden />
              <span>Profile</span>
            </Link>
            <button
              onClick={logout}
              className="px-3 py-1 rounded-full border border-neutral-300 text-neutral-700 text-sm hover:bg-neutral-100"
            >
              Logout
            </button>
          </div>
        )}

        {!hideAuthActions && !isLoggedIn && (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-full text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-full bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
