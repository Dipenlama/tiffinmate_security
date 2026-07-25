"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { postLogout } from "../../lib/api";
import { clearSessionMarkers, getSessionRole, hasSessionMarker } from "../../lib/session-markers";

function subscribeToAuthState(onStoreChange: () => void) {
  window.addEventListener("auth-state-changed", onStoreChange);
  return () => window.removeEventListener("auth-state-changed", onStoreChange);
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isLoggedIn = useSyncExternalStore(
    subscribeToAuthState,
    hasSessionMarker,
    () => false,
  );
  const sessionRole = useSyncExternalStore(
    subscribeToAuthState,
    getSessionRole,
    () => null,
  );
  const isAdmin = isLoggedIn && sessionRole === "admin";
  const hideAuthActions =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const navClass = (href: string) => {
    const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    return `rounded-full px-3 py-1.5 font-medium transition ${
      isActive
        ? "bg-emerald-100 text-emerald-800"
        : "text-neutral-700 hover:bg-emerald-50 hover:text-emerald-800"
    }`;
  };

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
    <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-[#fffef9]/90 shadow-[0_8px_30px_-24px_rgba(6,78,59,0.6)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={isAdmin ? "/admin/dashboard" : "/"} className="text-xl font-extrabold tracking-tight text-emerald-950">
            Tiffin <span className="bg-gradient-to-r from-emerald-600 via-orange-500 to-rose-600 bg-clip-text text-transparent">Mate</span>
          </Link>
          {isAdmin ? (
            <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 md:inline-flex">
              Admin dashboard
            </span>
          ) : (
            <nav aria-label="Main navigation" className="hidden items-center gap-1 text-sm md:flex">
              <Link href="/" className={navClass("/")} aria-current={pathname === "/" ? "page" : undefined}>Home</Link>
              <Link href="/menu" className={navClass("/menu")} aria-current={pathname.startsWith("/menu") ? "page" : undefined}>Menu</Link>
              {isLoggedIn && <Link href="/bookings" className={navClass("/bookings")} aria-current={pathname.startsWith("/bookings") ? "page" : undefined}>Bookings</Link>}
              <Link href="/about" className={navClass("/about")} aria-current={pathname.startsWith("/about") ? "page" : undefined}>About Us</Link>
            </nav>
          )}
        </div>

        {!hideAuthActions && isLoggedIn && (
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-neutral-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 via-orange-500 to-rose-500 text-white shadow-sm">
                <UserRound size={19} aria-hidden="true" />
              </span>
              <span className="hidden sm:inline">{isAdmin ? "Admin" : "My profile"}</span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="text-neutral-500 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)]">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Account</p>
              </div>

              <div className="my-1 border-t border-neutral-100" />

              {!isAdmin && (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <UserRound size={18} aria-hidden="true" />
                    Profile settings
                  </Link>
                  <div className="my-1 border-t border-neutral-100" />
                </>
              )}

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
              className="px-4 py-2 rounded-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
