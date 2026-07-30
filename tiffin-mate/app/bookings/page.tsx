"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE, cancelBooking } from "../../lib/api";
import { hasSessionMarker } from "../../lib/session-markers";

type Booking = {
  _id: string;
  package: string;
  packageName?: string;
  day?: string;
  time?: string;
  address?: string;
  items?: Array<{ id?: string; name?: string; qty?: number; price?: number; subtotal?: number }>;
  total?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  meta?: { address?: string };
};

type BookingView = "active" | "accepted" | "history";

type PageData = {
  items: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// Real authorization is the backend's httpOnly session cookie, sent via
// `credentials: 'include'` below; this is only a UX shortcut to decide
// whether to bother fetching at all before the backend would 401 anyway
// (see lib/session-markers.ts).
function getToken(): string | null {
  return hasSessionMarker() ? "session" : null;
}

function getUser(): { _id?: string; role?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

// useSearchParams() opts the whole page out of static prerendering unless
// its usage is wrapped in a Suspense boundary - `next build` fails to
// prerender this route otherwise (see
// https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout).
export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsPageInner />
    </Suspense>
  );
}

function BookingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSucceeded = searchParams.get("payment") === "success";
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingView, setBookingView] = useState<BookingView>("active");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentUser = useMemo(() => getUser(), []);
  const userIdParam = searchParams.get("userId");
  const userId = userIdParam || currentUser?._id || "";

  const forbidden = useMemo(() => {
    if (!userId) return false;
    if (!currentUser) return false; // if we cannot tell, allow fetch and let server handle
    if (currentUser.role === "admin") return false;
    return currentUser._id !== userId;
  }, [currentUser, userId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent("/bookings")}`);
      return;
    }
    if (!userId) {
      setError("Missing userId");
      setLoading(false);
      return;
    }
    if (forbidden) {
      setError("Forbidden: you cannot view another user's bookings.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/bookings/user/${encodeURIComponent(userId)}?page=${page}&limit=${limit}`,
          { credentials: "include", signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) {
          if (res.status === 401 || res.status === 403) {
            setError("Unauthorized. Please login again.");
            return;
          }
          setError(json?.error?.message || json?.message || "Failed to load bookings");
          return;
        }
        const payload: PageData = json.data || { items: [], total: 0, page, limit, totalPages: 1 };
        setData(payload);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    return () => controller.abort();
  }, [page, limit, userId, router, forbidden]);

  useEffect(() => {
    if (!paymentSucceeded) return;
    try {
      sessionStorage.removeItem("bookingDraft");
    } catch {}
  }, [paymentSucceeded]);

  const onRetry = () => {
    setError(null);
    setPage(1);
    setLimit(50);
    setLoading(true);
  };

  const groupedBookings = useMemo(() => {
    const items = data?.items || [];
    return {
      active: items.filter((booking) => !["accepted", "cancelled", "deleted"].includes((booking.status || "pending").toLowerCase())),
      accepted: items.filter((booking) => (booking.status || "").toLowerCase() === "accepted"),
      history: items.filter((booking) => ["cancelled", "deleted"].includes((booking.status || "").toLowerCase())),
    };
  }, [data]);

  const visibleBookings = groupedBookings[bookingView];

  const handleCancel = async (booking: Booking) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancellingId(booking._id);
    setActionError(null);
    try {
      const result = await cancelBooking(booking._id);
      if (!result.ok) {
        const message = result.data?.error?.message || result.data?.message || "Unable to cancel booking";
        setActionError(message);
        return;
      }
      setData((current) => current ? {
        ...current,
        items: current.items.map((item) => item._id === booking._id ? { ...item, status: "cancelled" } : item),
      } : current);
      setBookingView("history");
    } catch {
      setActionError("Unable to cancel booking. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6ef]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Your bookings</p>
            <h1 className="text-2xl font-semibold text-neutral-900">Bookings</h1>
          </div>
          <div className="text-sm text-neutral-500">User: {userId || 'unknown'}</div>
        </header>

        {paymentSucceeded && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            Payment completed. Your booking has been confirmed.
          </div>
        )}

        {forbidden && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6" role="alert">
            Forbidden: you cannot view another user&apos;s bookings.
          </div>
        )}

        {error && !loading && !forbidden && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-lg p-4 mb-6" role="alert">
            <div className="font-semibold mb-1">Unable to load bookings</div>
            <div className="text-sm mb-3">{error}</div>
            <button onClick={onRetry} className="px-3 py-2 bg-neutral-900 text-white rounded text-sm">Retry</button>
          </div>
        )}

        {loading && (
          <div className="text-neutral-600">Loading bookings…</div>
        )}

        {!loading && !error && !forbidden && data && data.items.length === 0 && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 text-neutral-600">No bookings yet.</div>
        )}

        {!loading && !error && !forbidden && data && data.items.length > 0 && (
          <section>
            <div className="mb-5 flex gap-2 overflow-x-auto">
              {([
                ["active", "Bookings"],
                ["accepted", "Accepted"],
                ["history", "Canceled Booking"],
              ] as Array<[BookingView, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBookingView(key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    bookingView === key
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "border border-neutral-200 bg-white text-neutral-600 hover:border-emerald-300"
                  }`}
                >
                  {label} <span className="ml-1 opacity-75">{groupedBookings[key].length}</span>
                </button>
              ))}
            </div>

            {actionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {actionError}
              </div>
            )}

            {visibleBookings.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white px-6 py-12 text-center text-neutral-500">
                No bookings in this section.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleBookings.map((booking) => {
                  const status = (booking.status || "pending").toLowerCase();
                  const canCancel = ["pending", "accepted", "dispatched"].includes(status);
                  const statusStyle = status === "accepted"
                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200"
                    : status === "deleted"
                    ? "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200"
                    : status === "cancelled"
                    ? "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200"
                    : "bg-orange-100 text-orange-800 ring-1 ring-inset ring-orange-200";

                  return (
                    <article key={booking._id} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-neutral-900">{booking.packageName || booking.package || "Tiffin booking"}</p>
                          <p className="mt-1 text-sm text-neutral-500">
                            {[booking.day, booking.time].filter(Boolean).join(" at ") || "Schedule not available"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyle}`}>{status}</span>
                      </div>
                      <div className="mt-4 border-t border-neutral-100 pt-4 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-neutral-500">Total</span>
                          <span className="font-semibold text-neutral-900">INR {Number(booking.total || 0).toFixed(2)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-4">
                          <span className="text-neutral-500">Booked on</span>
                          <span className="text-right text-neutral-700">{booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : "Not available"}</span>
                        </div>
                        <p className="mt-3 text-neutral-600">{booking.address || booking.meta?.address || "Delivery address not available"}</p>
                        {canCancel && (
                          <div className="mt-4 border-t border-neutral-100 pt-4 text-right">
                            <button
                              type="button"
                              disabled={cancellingId === booking._id}
                              onClick={() => handleCancel(booking)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancellingId === booking._id ? "Cancelling..." : "Cancel booking"}
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {data.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-neutral-500">Page {data.page} of {data.totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50">Previous</button>
                  <button onClick={() => setPage((value) => Math.min(data.totalPages, value + 1))} disabled={page >= data.totalPages} className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
