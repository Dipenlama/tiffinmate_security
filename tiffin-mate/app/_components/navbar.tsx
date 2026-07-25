"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
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
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-orange-200 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
                <UserRound size={19} aria-hidden="true" />
              </span>
              <span className="hidden sm:inline">My profile</span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="text-neutral-500 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)]">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Account</p>
              </div>

              <div className="my-1 border-t border-neutral-100" />

              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-orange-50 hover:text-orange-700"
              >
                <UserRound size={18} aria-hidden="true" />
                Profile settings
              </Link>
              <div className="my-1 border-t border-neutral-100" />

              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={18} aria-hidden="true" />
                Logout
              </button>
            </div>
          </details>
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
